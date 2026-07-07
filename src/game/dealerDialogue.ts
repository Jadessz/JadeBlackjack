import { getHandValue, handIsComplete, isBlackjack, isBust } from './hand'
import { formatHandTotal } from './rules'
import type { Card, GameState, RoundResult } from './types'

function withScore(cards: GameState['playerHands'][number]['cards'], prompt: string): string {
  return `Your score is ${formatHandTotal(cards)}. ${prompt}`
}

export function formatDealerOutcome(dealerCards: Card[], results: RoundResult[]): string {
  const allBusted = results.length > 0 && results.every((result) => result.outcome === 'bust')

  if (allBusted) {
    return 'Player Bust. Dealer wins!'
  }

  if (isBlackjack(dealerCards)) {
    return 'Dealer has blackjack.'
  }

  if (isBust(dealerCards)) {
    return 'Dealer busts. You win!'
  }

  const score = formatHandTotal(dealerCards)
  const hasPlayerWin = results.some((result) => result.outcome === 'win' || result.outcome === 'blackjack')
  const hasPlayerLoss = results.some((result) => result.outcome === 'lose' || result.outcome === 'bust')
  const allPush = results.every((result) => result.outcome === 'push')

  if (allPush) {
    return `Dealer's score is ${score}. Push.`
  }

  if (hasPlayerWin && !hasPlayerLoss) {
    return `Dealer's score is ${score}. You won.`
  }

  if (hasPlayerLoss && !hasPlayerWin) {
    return `Dealer's score is ${score}. Dealer won.`
  }

  return `Dealer's score is ${score}.`
}

export function getDealerPrompt(state: GameState): string | null {
  if (state.phase !== 'playerTurn') {
    return null
  }

  const hand = state.playerHands[state.activeHandIndex]
  if (!hand || handIsComplete(hand)) {
    return null
  }

  const { cards } = hand

  if (cards.length === 2 && cards[0].rank === cards[1].rank) {
    const rank = cards[0].rank
    if (rank === 'A' || rank === '8') {
      return withScore(cards, 'Would you like to split?')
    }
  }

  const { total } = getHandValue(cards)

  if (total <= 10) {
    return withScore(cards, 'Would you like to hit?')
  }

  if (total === 11) {
    return withScore(cards, 'Would you like to double down?')
  }

  if (total >= 12 && total <= 17) {
    return withScore(cards, 'What would you like to do?')
  }

  if (total >= 18) {
    return withScore(cards, 'Would you like to stand?')
  }

  return null
}