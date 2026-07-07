import { getHandValue } from './hand'
import type { Card } from './types'

export type StrategyAction = 'hit' | 'stand' | 'double' | 'split' | 'decline-insurance' | 'surrender'

export interface StrategyContext {
  playerCards: Card[]
  dealerUpcard: Card
  canDouble: boolean
  canSplit: boolean
  canSurrender?: boolean
  isInsuranceOffer?: boolean
}

export interface StrategyRecommendation {
  action: StrategyAction
  advice: string
  chartLabel: string
}

type ChartMove = 'H' | 'S' | 'D' | 'Ds' | 'Y' | 'N' | 'Y/N' | 'SUR'

const DEALER_COLUMNS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const

const HARD_TOTALS: Record<number, ChartMove[]> = {
  17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  11: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
  10: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
  9: ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  8: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
}

const SOFT_TOTALS: Record<string, ChartMove[]> = {
  'A,9': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  'A,8': ['S', 'S', 'S', 'S', 'Ds', 'S', 'S', 'S', 'S', 'S'],
  'A,7': ['Ds', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
  'A,6': ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A,5': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A,4': ['H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A,3': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
  'A,2': ['H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
}

const PAIRS: Record<string, ChartMove[]> = {
  'A,A': ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  'T,T': ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
  '9,9': ['Y', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y', 'N', 'N'],
  '8,8': ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
  '7,7': ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N', 'N'],
  '6,6': ['Y/N', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N', 'N', 'N'],
  '5,5': ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
  '4,4': ['N', 'N', 'N', 'Y/N', 'Y/N', 'N', 'N', 'N', 'N', 'N'],
  '3,3': ['Y/N', 'Y/N', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N', 'N'],
  '2,2': ['Y/N', 'Y/N', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N', 'N'],
}

function getDealerColumn(dealerUpcard: Card): number {
  if (dealerUpcard.rank === 'A') {
    return 9
  }

  if (dealerUpcard.rank === '10' || dealerUpcard.rank === 'J' || dealerUpcard.rank === 'Q' || dealerUpcard.rank === 'K') {
    return 8
  }

  return parseInt(dealerUpcard.rank, 10) - 2
}

function getPairKey(cards: Card[]): string | null {
  if (cards.length !== 2 || cards[0].rank !== cards[1].rank) {
    return null
  }

  const rank = cards[0].rank
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') {
    return 'T,T'
  }

  return `${rank},${rank}`
}

function getSoftKey(cards: Card[]): string | null {
  const { total, soft } = getHandValue(cards)
  if (!soft || cards.length < 2) {
    return null
  }

  const nonAceTotal = total - 11
  return `A,${nonAceTotal}`
}

function getSurrenderMove(playerCards: Card[], dealerUpcard: Card): ChartMove | null {
  if (playerCards.length !== 2) {
    return null
  }

  const { total } = getHandValue(playerCards)
  const dealerRank = dealerUpcard.rank
  const dealerIsTen =
    dealerRank === '10' || dealerRank === 'J' || dealerRank === 'Q' || dealerRank === 'K'
  const dealerIsNine = dealerRank === '9'
  const dealerIsAce = dealerRank === 'A'

  if (total === 16 && (dealerIsNine || dealerIsTen || dealerIsAce)) {
    return 'SUR'
  }

  if (total === 15 && dealerIsTen) {
    return 'SUR'
  }

  return null
}

function lookupChartMove(context: StrategyContext): ChartMove {
  const column = getDealerColumn(context.dealerUpcard)
  const { playerCards } = context

  // Pairs and soft hands are decided before the hard-total surrender rule, so
  // hands like 8,8 (which total 16) still follow the pair-splitting chart.
  const pairKey = getPairKey(playerCards)
  if (pairKey && PAIRS[pairKey]) {
    return PAIRS[pairKey][column]
  }

  const softKey = getSoftKey(playerCards)
  if (softKey && SOFT_TOTALS[softKey]) {
    return SOFT_TOTALS[softKey][column]
  }

  const surrender = getSurrenderMove(playerCards, context.dealerUpcard)
  if (surrender) {
    return surrender
  }

  const { total } = getHandValue(playerCards)
  const clampedTotal = Math.max(8, Math.min(17, total))
  return HARD_TOTALS[clampedTotal][column]
}

function chartMoveToAction(
  move: ChartMove,
  context: StrategyContext,
): { action: StrategyAction; chartLabel: string } {
  switch (move) {
    case 'H':
      return { action: 'hit', chartLabel: 'Hit' }
    case 'S':
      return { action: 'stand', chartLabel: 'Stand' }
    case 'D':
      if (context.canDouble) {
        return { action: 'double', chartLabel: 'Double' }
      }
      return { action: 'hit', chartLabel: 'Double (else Hit)' }
    case 'Ds':
      if (context.canDouble) {
        return { action: 'double', chartLabel: 'Double' }
      }
      return { action: 'stand', chartLabel: 'Double (else Stand)' }
    case 'Y':
      if (context.canSplit) {
        return { action: 'split', chartLabel: 'Split' }
      }
      return chartMoveToAction('H', { ...context, canSplit: false })
    case 'Y/N':
      if (context.canSplit) {
        return { action: 'split', chartLabel: 'Split (DAS)' }
      }
      return chartMoveToAction('H', { ...context, canSplit: false })
    case 'N': {
      const { total } = getHandValue(context.playerCards)
      if (total > 17) {
        return { action: 'stand', chartLabel: 'Stand' }
      }
      if (total >= 8 && HARD_TOTALS[total]) {
        return chartMoveToAction(HARD_TOTALS[total][getDealerColumn(context.dealerUpcard)], {
          ...context,
          canSplit: false,
        })
      }
      return { action: 'hit', chartLabel: 'Hit' }
    }
    case 'SUR':
      if (context.canSurrender) {
        return { action: 'surrender', chartLabel: 'Surrender' }
      }
      return { action: 'hit', chartLabel: 'Surrender (else Hit)' }
    default:
      return { action: 'stand', chartLabel: 'Stand' }
  }
}

const DEALER_WEAK_UPCARDS = new Set(['2', '3', '4', '5', '6'])

function getPairRankLabel(cards: Card[]): string | null {
  if (cards.length !== 2 || cards[0].rank !== cards[1].rank) {
    return null
  }

  const rank = cards[0].rank
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') {
    return '10'
  }
  if (rank === 'A') {
    return 'Ace'
  }
  return rank
}

function standAdvice(total: number, dealerWeak: boolean, upcard: string): string {
  if (total >= 19) {
    return `Stand — ${total} is a strong hand, don't risk it.`
  }
  if (total >= 17) {
    return `Stand — you'd bust too often by hitting ${total}.`
  }
  if (dealerWeak) {
    return `Stand — let the dealer's weak ${upcard} take the bust risk.`
  }
  return `Stand — the book holds on ${total} here.`
}

function hitAdvice(total: number, soft: boolean, upcard: string): string {
  if (soft) {
    return `Hit — a soft ${total} can't bust, so improve it.`
  }
  if (total <= 11) {
    return `Hit — ${total} can't bust, so always take a card.`
  }
  return `Hit — ${total} is too weak vs the dealer's ${upcard}.`
}

function doubleAdvice(total: number, soft: boolean, upcard: string): string {
  if (soft) {
    return `Double — soft ${total} is strong vs the ${upcard}; take one card.`
  }
  return `Double — ${total} beats the dealer's ${upcard}; take one card.`
}

function splitAdvice(cards: Card[], upcard: string): string {
  const pairRank = getPairRankLabel(cards)
  if (pairRank === 'Ace') {
    return `Split Aces — always; each gets a shot at 21.`
  }
  if (pairRank === '8') {
    return `Split 8s — always; break up the hard 16.`
  }
  if (pairRank) {
    return `Split ${pairRank}s — two hands beat one vs the ${upcard}.`
  }
  return `Split — two hands play better than one vs the ${upcard}.`
}

export function getBasicStrategyRecommendation(context: StrategyContext): StrategyRecommendation {
  const upcard = getDealerUpcardLabel(context.dealerUpcard)
  const dealerWeak = DEALER_WEAK_UPCARDS.has(upcard)
  const { total, soft } = getHandValue(context.playerCards)

  if (context.isInsuranceOffer) {
    return {
      action: 'decline-insurance',
      chartLabel: "Don't Take Insurance",
      advice: 'Decline insurance. It is a side bet that loses money over time, so the book says never take it.',
    }
  }

  const chartMove = lookupChartMove(context)
  const { action, chartLabel } = chartMoveToAction(chartMove, context)

  let advice: string
  switch (action) {
    case 'stand':
      advice = standAdvice(total, dealerWeak, upcard)
      break
    case 'hit':
      advice = hitAdvice(total, soft, upcard)
      break
    case 'double':
      advice = doubleAdvice(total, soft, upcard)
      break
    case 'split':
      advice = splitAdvice(context.playerCards, upcard)
      break
    case 'surrender':
      advice = `Surrender — hard ${total} vs the ${upcard} loses too often.`
      break
    default:
      advice = 'Play it by the book.'
  }

  if (chartMove === 'SUR' && !context.canSurrender) {
    advice = `You'd surrender vs the ${upcard}, but it's not offered — hit instead.`
  }
  if ((chartMove === 'D' || chartMove === 'Ds') && !context.canDouble) {
    advice =
      action === 'stand'
        ? `Would double vs the ${upcard}, but can't now — so stand.`
        : `Would double vs the ${upcard}, but can't now — so hit.`
  }

  return { action, chartLabel, advice }
}

export function getDealerUpcardLabel(dealerUpcard: Card): string {
  const column = getDealerColumn(dealerUpcard)
  return DEALER_COLUMNS[column]
}
