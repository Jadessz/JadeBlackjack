import { getHandValue, isBlackjack, isBust } from './hand'
import type { Card, HandOutcome, PlayerHand } from './types'

export function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = getHandValue(cards)
  if (total < 17) {
    return true
  }
  if (total === 17 && soft) {
    return true
  }
  return false
}

export function resolveHandOutcome(
  playerHand: PlayerHand,
  dealerCards: Card[],
  dealerHoleHidden: boolean,
): HandOutcome {
  if (playerHand.busted) {
    return 'bust'
  }

  const playerValue = getHandValue(playerHand.cards)
  const dealerValue = getHandValue(dealerCards)

  if (!dealerHoleHidden && isBlackjack(playerHand.cards) && !isBlackjack(dealerCards)) {
    return 'blackjack'
  }

  if (!dealerHoleHidden && isBust(dealerCards)) {
    return 'win'
  }

  if (!dealerHoleHidden && playerValue.total > dealerValue.total) {
    return 'win'
  }

  if (!dealerHoleHidden && playerValue.total < dealerValue.total) {
    return 'lose'
  }

  if (!dealerHoleHidden) {
    return 'push'
  }

  return 'pending'
}

export function calculateHandPayout(
  hand: PlayerHand,
  dealerCards: Card[],
  dealerHoleHidden: boolean,
): number {
  const outcome = resolveHandOutcome(hand, dealerCards, dealerHoleHidden)
  const bet = hand.bet

  switch (outcome) {
    case 'blackjack':
      return bet + bet * 1.5
    case 'win':
      return bet * 2
    case 'push':
      return bet
    case 'bust':
    case 'lose':
      return 0
    default:
      return 0
  }
}

export function calculateInsurancePayout(insuranceBet: number, dealerCards: Card[]): number {
  if (insuranceBet <= 0) {
    return 0
  }

  if (isBlackjack(dealerCards)) {
    return insuranceBet * 3
  }

  return 0
}

export function formatHandTotal(cards: Card[], hiddenIndices: number | number[] = -1): string {
  const hiddenSet = new Set(Array.isArray(hiddenIndices) ? hiddenIndices : hiddenIndices >= 0 ? [hiddenIndices] : [])
  const visible =
    hiddenSet.size > 0 ? cards.filter((_, index) => !hiddenSet.has(index)) : cards

  if (visible.length === 0) {
    return '?'
  }

  if (isBlackjack(visible)) {
    return 'Blackjack'
  }

  const { total, soft } = getHandValue(visible)
  return soft ? `${total} (soft)` : String(total)
}
