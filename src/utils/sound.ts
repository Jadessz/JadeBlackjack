export type SoundName =
  | 'chip'
  | 'deal'
  | 'flip'
  | 'button'
  | 'win'
  | 'blackjack'
  | 'lose'
  | 'bust'
  | 'push'
  | 'shuffle'
  | 'insider'
  | 'caught'

const MUTE_KEY = 'blackjack-line-muted'

// Real recorded samples for a few key sounds. Everything else stays synthesized.
// Paths are served from /public at the site root by Vite.
const SAMPLE_FILES: Partial<Record<SoundName, string>> = {
  chip: '/sounds/GAMEMisc_Poker chips 3 (ID 0944)_BigSoundBank.com.mp3',
  deal: '/sounds/playing-card-flipped-over-epic-stock-media-1-00-00.mp3',
  flip: '/sounds/playing-card-flipped-over-epic-stock-media-1-00-00.mp3',
  shuffle: '/sounds/freesound_community-shuffling-cards-01-86984.mp3',
}

// Per-sample playback gain so the recordings sit at a comfortable level.
const SAMPLE_GAIN: Partial<Record<SoundName, number>> = {
  chip: 0.35,
  deal: 0.4,
  flip: 0.4,
  shuffle: 0.45,
}

let audioContext: AudioContext | null = null
let muted = loadMuted()
const sampleBuffers = new Map<string, AudioBuffer>()
const sampleLoads = new Map<string, Promise<AudioBuffer | null>>()
// Currently-playing sample sources, keyed by sound name, so a long sample (like
// the shuffle) can be stopped on demand — e.g. when its animation ends.
const activeSampleSources = new Map<SoundName, { source: AudioBufferSourceNode; amp: GainNode }>()
// Raw encoded bytes fetched ahead of any user gesture so decoding can start the
// instant we're allowed to create an AudioContext (i.e. on the first click).
const sampleData = new Map<string, Promise<ArrayBuffer | null>>()

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

// Fetching does not require a user gesture, so we can pull the audio files down
// as soon as this module loads. This removes the first-click race where the
// sample wasn't ready yet and we fell back to the synthesized sound.
function prefetchSampleData() {
  if (typeof fetch === 'undefined') {
    return
  }

  for (const url of new Set(Object.values(SAMPLE_FILES))) {
    if (!url || sampleData.has(url)) {
      continue
    }

    const bytes = fetch(encodeURI(url))
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${url}: ${res.status}`)
        }
        return res.arrayBuffer()
      })
      .catch(() => null)

    sampleData.set(url, bytes)
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) {
    return null
  }

  if (!audioContext) {
    audioContext = new Ctor()
    preloadSamples(audioContext)
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }

  return audioContext
}

function loadSample(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = sampleLoads.get(url)
  if (cached) {
    return cached
  }

  const bytes = sampleData.get(url) ?? Promise.resolve(null)
  const promise = bytes
    .then((data) => {
      if (!data) {
        throw new Error(`No audio data for ${url}`)
      }
      // decodeAudioData detaches the buffer, so hand it a copy in case we ever
      // need the original bytes again.
      return ctx.decodeAudioData(data.slice(0))
    })
    .then((buffer) => {
      sampleBuffers.set(url, buffer)
      return buffer
    })
    .catch(() => null)

  sampleLoads.set(url, promise)
  return promise
}

function preloadSamples(ctx: AudioContext) {
  for (const url of new Set(Object.values(SAMPLE_FILES))) {
    if (url) {
      void loadSample(ctx, url)
    }
  }
}

function startBuffer(ctx: AudioContext, buffer: AudioBuffer, gain: number, name: SoundName) {
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const amp = ctx.createGain()
  amp.gain.value = gain

  source.connect(amp)
  amp.connect(ctx.destination)

  activeSampleSources.set(name, { source, amp })
  source.onended = () => {
    if (activeSampleSources.get(name)?.source === source) {
      activeSampleSources.delete(name)
    }
  }

  source.start(ctx.currentTime)
}

// The browser can auto-suspend the AudioContext between sounds (e.g. after a
// stretch with no audio, or on tab visibility changes). resume() is async, so
// starting a buffer while the context is still suspended can drop the sound —
// this is why a later shuffle would go silent even though the first one played.
// Wait for the context to actually be running before starting playback.
function playBuffer(ctx: AudioContext, buffer: AudioBuffer, gain: number, name: SoundName) {
  if (ctx.state === 'running') {
    startBuffer(ctx, buffer, gain, name)
    return
  }

  void ctx.resume().then(() => {
    if (!muted) {
      startBuffer(ctx, buffer, gain, name)
    }
  })
}

// Stops a currently-playing sample with a short fade to avoid a click. Used to
// cut the shuffle sound off exactly when its animation finishes.
export function stopSound(name: SoundName) {
  const active = activeSampleSources.get(name)
  if (!active || !audioContext) {
    return
  }

  activeSampleSources.delete(name)
  const { source, amp } = active
  const now = audioContext.currentTime

  try {
    amp.gain.cancelScheduledValues(now)
    amp.gain.setValueAtTime(amp.gain.value, now)
    amp.gain.linearRampToValueAtTime(0.0001, now + 0.06)
    source.stop(now + 0.08)
  } catch {
    // Source may have already stopped; ignore.
  }
}

// Returns true when this sound is backed by a real sample (so the caller should
// not play the synthesized version). If the buffer isn't decoded yet, it plays
// as soon as decoding finishes rather than falling back to the synth sound.
function playSample(ctx: AudioContext, name: SoundName): boolean {
  const url = SAMPLE_FILES[name]
  if (!url) {
    return false
  }

  const gain = SAMPLE_GAIN[name] ?? 0.8
  const buffer = sampleBuffers.get(url)
  if (buffer) {
    playBuffer(ctx, buffer, gain, name)
    return true
  }

  void loadSample(ctx, url).then((decoded) => {
    if (decoded && !muted) {
      playBuffer(ctx, decoded, gain, name)
    }
  })
  return true
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, String(next))
  } catch {
    // ignore persistence failures
  }
}

interface ToneOptions {
  freq: number
  type?: OscillatorType
  start?: number
  duration?: number
  gain?: number
  freqEnd?: number
}

function playTone(ctx: AudioContext, options: ToneOptions) {
  const { freq, type = 'sine', start = 0, duration = 0.15, gain = 0.14, freqEnd } = options
  const now = ctx.currentTime + start

  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration)
  }

  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function playNoise(ctx: AudioContext, start: number, duration: number, gain: number, highpass = 1200) {
  const now = ctx.currentTime + start
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = highpass

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, now)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(amp)
  amp.connect(ctx.destination)
  source.start(now)
  source.stop(now + duration + 0.02)
}

interface FilteredNoiseOptions {
  start?: number
  duration: number
  gain: number
  freq: number
  q?: number
  type?: BiquadFilterType
  freqEnd?: number
  attack?: number
}

// A short burst of band-limited noise — the building block for physical,
// non-musical sounds like chip clinks and card/paper movement.
function playFilteredNoise(ctx: AudioContext, options: FilteredNoiseOptions) {
  const { start = 0, duration, gain, freq, q = 6, type = 'bandpass', freqEnd, attack = 0.002 } = options
  const now = ctx.currentTime + start
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i += 1) {
    data[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(freq, now)
  filter.Q.value = q
  if (freqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freqEnd), now + duration)
  }

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.linearRampToValueAtTime(gain, now + attack)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(amp)
  amp.connect(ctx.destination)
  source.start(now)
  source.stop(now + duration + 0.02)
}

// A single chip "clack" — a couple of tight resonant noise transients.
function playChipClack(ctx: AudioContext, start: number, gain = 0.16) {
  playFilteredNoise(ctx, { start, duration: 0.035, gain, freq: 2600, q: 9 })
  playFilteredNoise(ctx, { start: start + 0.006, duration: 0.05, gain: gain * 0.7, freq: 1500, q: 5 })
}

export function playSound(name: SoundName) {
  if (muted) {
    return
  }

  const ctx = getContext()
  if (!ctx) {
    return
  }

  // Prefer the real recorded sample when one exists and has finished loading;
  // otherwise fall through to the synthesized version below.
  if (playSample(ctx, name)) {
    return
  }

  switch (name) {
    case 'chip':
      // Two clay chips clacking together as one drops onto the stack.
      playChipClack(ctx, 0)
      playChipClack(ctx, 0.05, 0.11)
      break
    case 'deal':
      // Card sliding off the shoe: a short paper "fwip" that sweeps downward.
      playFilteredNoise(ctx, { duration: 0.14, gain: 0.12, freq: 3200, freqEnd: 900, q: 1.2, type: 'bandpass' })
      break
    case 'flip':
      // Crisp paper snap as a card turns face up.
      playFilteredNoise(ctx, { duration: 0.07, gain: 0.13, freq: 2400, freqEnd: 1500, q: 1, type: 'bandpass' })
      break
    case 'button':
      playTone(ctx, { freq: 520, type: 'triangle', duration: 0.06, gain: 0.08 })
      break
    case 'win':
      playTone(ctx, { freq: 523.25, type: 'triangle', start: 0, duration: 0.16, gain: 0.13 })
      playTone(ctx, { freq: 659.25, type: 'triangle', start: 0.1, duration: 0.16, gain: 0.13 })
      playTone(ctx, { freq: 783.99, type: 'triangle', start: 0.2, duration: 0.22, gain: 0.13 })
      break
    case 'blackjack':
      playTone(ctx, { freq: 523.25, type: 'square', start: 0, duration: 0.14, gain: 0.1 })
      playTone(ctx, { freq: 659.25, type: 'square', start: 0.09, duration: 0.14, gain: 0.1 })
      playTone(ctx, { freq: 783.99, type: 'square', start: 0.18, duration: 0.14, gain: 0.1 })
      playTone(ctx, { freq: 1046.5, type: 'triangle', start: 0.27, duration: 0.3, gain: 0.12 })
      break
    case 'lose':
      playTone(ctx, { freq: 349.23, type: 'sawtooth', start: 0, duration: 0.18, gain: 0.1, freqEnd: 262 })
      playTone(ctx, { freq: 262, type: 'sawtooth', start: 0.14, duration: 0.26, gain: 0.1, freqEnd: 180 })
      break
    case 'bust':
      playTone(ctx, { freq: 200, type: 'sawtooth', start: 0, duration: 0.35, gain: 0.12, freqEnd: 80 })
      playNoise(ctx, 0, 0.2, 0.06, 600)
      break
    case 'push':
      playTone(ctx, { freq: 440, type: 'sine', duration: 0.18, gain: 0.09 })
      break
    case 'shuffle': {
      // Riffle: a rapid run of tiny paper ticks, twice (the bridge).
      for (let i = 0; i < 18; i += 1) {
        playFilteredNoise(ctx, { start: i * 0.018, duration: 0.02, gain: 0.05, freq: 2200 + Math.random() * 800, q: 2 })
      }
      for (let i = 0; i < 14; i += 1) {
        playFilteredNoise(ctx, { start: 0.4 + i * 0.02, duration: 0.02, gain: 0.045, freq: 1900 + Math.random() * 700, q: 2 })
      }
      break
    }
    case 'insider':
      playTone(ctx, { freq: 660, type: 'sine', start: 0, duration: 0.12, gain: 0.07, freqEnd: 990 })
      playTone(ctx, { freq: 990, type: 'sine', start: 0.09, duration: 0.14, gain: 0.06 })
      break
    case 'caught':
      playTone(ctx, { freq: 160, type: 'square', start: 0, duration: 0.5, gain: 0.14, freqEnd: 70 })
      playTone(ctx, { freq: 120, type: 'square', start: 0.25, duration: 0.5, gain: 0.12, freqEnd: 55 })
      break
    default:
      break
  }
}

// Start downloading the sample files immediately on page load so they're ready
// (or nearly ready) by the time the user first interacts.
prefetchSampleData()
