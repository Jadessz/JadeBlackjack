import type { Card } from '../game/types'

export function getCardImagePath(card: Card): string {
  return `/cards/${card.rank}_of_${card.suit}.png`
}

export const CARD_BACK_IMAGE = '/cards/Backside.png'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
