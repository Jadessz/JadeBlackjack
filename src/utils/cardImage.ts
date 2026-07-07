import type { Card } from '../game/types'
import { assetUrl } from './asset'

export function getCardImagePath(card: Card): string {
  return assetUrl(`cards/${card.rank}_of_${card.suit}.png`)
}

export const CARD_BACK_IMAGE = assetUrl('cards/Backside.png')

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
