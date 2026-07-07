import { RANKS, SUITS, type Card } from './types'
import type { DeckCount } from './settings'

function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function createShuffledShoe(deckCount: DeckCount): Card[] {
  const shoe: Card[] = []
  for (let i = 0; i < deckCount; i += 1) {
    shoe.push(...createDeck())
  }
  return shuffle(shoe)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function calculateShuffleCutAt(deckCount: DeckCount): number | null {
  if (deckCount === 1) {
    return null
  }

  const totalCards = deckCount * 52
  const minCut = Math.floor(totalCards / 2)
  const maxCut = totalCards - 2 * 52
  return randomInt(minCut, maxCut)
}

export interface ShoeSetup {
  shoe: Card[]
  shuffleCutAt: number | null
  totalShoeSize: number
}

export function createShoeWithCut(deckCount: DeckCount): ShoeSetup {
  const shoe = createShuffledShoe(deckCount)
  return {
    shoe,
    shuffleCutAt: calculateShuffleCutAt(deckCount),
    totalShoeSize: shoe.length,
  }
}

export function drawCard(shoe: Card[]): { shoe: Card[]; card: Card } {
  if (shoe.length === 0) {
    throw new Error('Cannot draw from an empty shoe')
  }

  const [card, ...rest] = shoe
  return { shoe: rest, card }
}
