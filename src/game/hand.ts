import type { Card, PlayerHand } from './types'

export interface HandValue {
  total: number
  soft: boolean
}

const RANK_VALUES: Record<Card['rank'], number> = {
  A: 11,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
}

export function getHandValue(cards: Card[]): HandValue {
  let total = 0
  let aces = 0

  for (const card of cards) {
    total += RANK_VALUES[card.rank]
    if (card.rank === 'A') {
      aces += 1
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }

  const soft = aces > 0 && total <= 21
  return { total, soft }
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && getHandValue(cards).total === 21
}

export function isBust(cards: Card[]): boolean {
  return getHandValue(cards).total > 21
}

export function canSplitHand(hand: PlayerHand, handCount: number, maxSplits: number): boolean {
  if (handCount > maxSplits) {
    return false
  }

  if (hand.cards.length !== 2 || hand.doubled || hand.splitFromAces) {
    return false
  }

  return hand.cards[0].rank === hand.cards[1].rank
}

export function isPairOfAces(hand: PlayerHand): boolean {
  return hand.cards.length === 2 && hand.cards[0].rank === 'A' && hand.cards[1].rank === 'A'
}

export function isTwentyOne(cards: Card[]): boolean {
  return getHandValue(cards).total === 21
}

export function handIsComplete(hand: PlayerHand): boolean {
  return (
    hand.stood ||
    hand.busted ||
    hand.doubled ||
    (hand.splitFromAces && hand.cards.length >= 2) ||
    isTwentyOne(hand.cards)
  )
}
