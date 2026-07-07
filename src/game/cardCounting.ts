import type { Card, Rank } from './types'

export interface ShoeCountSnapshot {
  acesDealt: number
  tenValueDealt: number
  lowCardsDealt: number
  runningCount: number
  trueCount: number
  decksRemaining: number
}

const CARDS_PER_DECK = 52
const MIN_DECKS_REMAINING = 0.25
const TEN_VALUE_RANKS = new Set<Rank>(['10', 'J', 'Q', 'K'])
const LOW_CARD_RANKS = new Set<Rank>(['2', '3', '4', '5', '6'])

/** Undealt cards still in the shoe, expressed as decks (not decks dealt). */
export function getDecksRemaining(shoeCardsRemaining: number): number {
  return Math.max(shoeCardsRemaining / CARDS_PER_DECK, MIN_DECKS_REMAINING)
}

export function isTenValueRank(rank: Rank): boolean {
  return TEN_VALUE_RANKS.has(rank)
}

export function isLowCardRank(rank: Rank): boolean {
  return LOW_CARD_RANKS.has(rank)
}

export function getHiLoValue(rank: Rank): number {
  if (rank === 'A' || isTenValueRank(rank)) {
    return -1
  }

  if (rank === '2' || rank === '3' || rank === '4' || rank === '5' || rank === '6') {
    return 1
  }

  return 0
}

export function getShoeCountSnapshot(
  revealedCards: Card[],
  shoeCardsRemaining: number,
): ShoeCountSnapshot {
  let acesDealt = 0
  let tenValueDealt = 0
  let lowCardsDealt = 0
  let runningCount = 0

  for (const card of revealedCards) {
    if (card.rank === 'A') {
      acesDealt += 1
    }

    if (isTenValueRank(card.rank)) {
      tenValueDealt += 1
    }

    if (isLowCardRank(card.rank)) {
      lowCardsDealt += 1
    }

    runningCount += getHiLoValue(card.rank)
  }

  const decksRemaining = getDecksRemaining(shoeCardsRemaining)
  const trueCount = runningCount / decksRemaining

  return {
    acesDealt,
    tenValueDealt,
    lowCardsDealt,
    runningCount,
    trueCount,
    decksRemaining,
  }
}

export function formatRunningCount(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

export function formatTrueCount(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return value > 0 ? `+${text}` : text
}

export function getCountTone(trueCount: number): 'hot' | 'cold' | 'neutral' {
  if (trueCount >= 2) {
    return 'hot'
  }

  if (trueCount <= -2) {
    return 'cold'
  }

  return 'neutral'
}
