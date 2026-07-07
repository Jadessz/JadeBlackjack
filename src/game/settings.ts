export type DeckCount = 1 | 5 | 6 | 8
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GameSettings {
  deckCount: DeckCount
  difficulty: Difficulty
  easy21Mode: boolean
  teacherDealerMode: boolean
  insiderDealerMode: boolean
}

export const STARTING_BANKROLLS: Record<Difficulty, number> = {
  easy: 2000,
  medium: 1000,
  hard: 500,
}

export const DEFAULT_SETTINGS: GameSettings = {
  deckCount: 6,
  difficulty: 'medium',
  easy21Mode: false,
  teacherDealerMode: false,
  insiderDealerMode: false,
}

const SETTINGS_KEY = 'blackjack-line-settings'

export function normalizeSettings(settings: GameSettings): GameSettings {
  return {
    ...settings,
    easy21Mode: settings.difficulty === 'hard' ? false : settings.easy21Mode,
    // Teacher and Insider modes can never be active together; Insider wins if both are set.
    teacherDealerMode: settings.insiderDealerMode ? false : settings.teacherDealerMode,
  }
}

export function getStartingBankroll(difficulty: Difficulty): number {
  return STARTING_BANKROLLS[difficulty]
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return DEFAULT_SETTINGS
    }
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)))
}

export function canChangeSettingsInPlace(state: {
  phase: string
  playerHands: unknown[]
  stats: { handsPlayed: number }
}): boolean {
  return (
    state.stats.handsPlayed === 0 &&
    state.playerHands.length === 0 &&
    state.phase === 'betting'
  )
}
