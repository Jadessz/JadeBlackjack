import { getHandValue, isBlackjack } from './hand'
import { dealerShouldHit } from './rules'
import { getBasicStrategyRecommendation, type StrategyContext } from './basicStrategy'
import type { Card } from './types'

const RANK_WORDS: Record<Card['rank'], string> = {
  A: 'Ace',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
}

const INSIDER_MOVE: Record<string, string> = {
  hit: 'Take a hit.',
  stand: 'Stand.',
  double: 'Double down on me.',
  split: 'Split them.',
  surrender: 'Take a hit.',
  'decline-insurance': "Don't buy insurance.",
}

export interface InsiderContext {
  playerCards: Card[]
  dealerCards: Card[]
  holeCardIndex: number
  canDouble: boolean
  canSplit: boolean
  isInsuranceOffer?: boolean
}

export function getInsiderTip(context: InsiderContext): string {
  const holeCard = context.dealerCards[context.holeCardIndex]
  if (!holeCard) {
    return "I haven't got a card to show you yet — hang tight."
  }

  const holeLabel = RANK_WORDS[holeCard.rank]
  const dealerTotal = getHandValue(context.dealerCards).total

  if (context.isInsuranceOffer) {
    if (isBlackjack(context.dealerCards)) {
      return `My hole card's a ${holeLabel} — I've got blackjack. Take the insurance.`
    }
    return `My hole card's a ${holeLabel} — no blackjack here. Don't buy insurance.`
  }

  const playerTotal = getHandValue(context.playerCards).total

  if (!dealerShouldHit(context.dealerCards)) {
    if (playerTotal > dealerTotal) {
      return `My hole card's a ${holeLabel}, so I'm sitting on ${dealerTotal}. You've got me beat — stand.`
    }
    if (playerTotal === dealerTotal) {
      return `My hole card's a ${holeLabel}, so I'm on ${dealerTotal}. We'd tie — stand and take the push.`
    }
    return `My hole card's a ${holeLabel}, so I'm on ${dealerTotal}. You're short — take a hit.`
  }

  const strategyContext: StrategyContext = {
    playerCards: context.playerCards,
    dealerUpcard: context.dealerCards[0],
    canDouble: context.canDouble,
    canSplit: context.canSplit,
    canSurrender: false,
  }
  const recommendation = getBasicStrategyRecommendation(strategyContext)
  const move = INSIDER_MOVE[recommendation.action] ?? 'play it smart.'

  return `My hole card's a ${holeLabel}, so I'm on ${dealerTotal} and I'll have to draw — I could bust. ${move}`
}
