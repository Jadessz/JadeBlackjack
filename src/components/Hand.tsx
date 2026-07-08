import { formatHandTotal } from '../game/rules'
import type { Card as CardType, HandOutcome } from '../game/types'
import { breakdownAmountIntoChips, getChipStackHeight, getChipStackStep } from '../utils/betChips'
import { formatCurrency } from '../utils/cardImage'
import { getChipImagePath } from '../utils/chipImage'
import { Card } from './Card'

interface HandProps {
  cards: CardType[]
  label: string
  total?: string
  hiddenIndices?: number[]
  revealIndex?: number
  dealingIndex?: number
  outcome?: HandOutcome
  bet?: number
  isActive?: boolean
}

const outcomeLabels: Record<HandOutcome, string> = {
  pending: '',
  win: 'Win',
  lose: 'Lose',
  push: 'Push',
  blackjack: 'Blackjack!',
  bust: 'Bust',
}

export function Hand({
  cards,
  label,
  total,
  hiddenIndices = [],
  revealIndex = -1,
  dealingIndex = -1,
  outcome = 'pending',
  bet,
  isActive = false,
}: HandProps) {
  const hiddenSet = new Set(hiddenIndices)
  const displayTotal = total ?? formatHandTotal(cards, hiddenIndices)
  const betChips = bet !== undefined && bet > 0 ? breakdownAmountIntoChips(bet) : []
  const chipStackStep = getChipStackStep(betChips.length)
  const chipStackHeight = getChipStackHeight(betChips.length, 2.1)

  return (
    <div className={`hand${isActive ? ' hand--active' : ''}`}>
      <div className="hand__header">
        <span className="hand__label">{label}</span>
        <div className="hand__badges">
          {displayTotal && <span className="hand__badge hand__badge--total">{displayTotal}</span>}
          {outcome !== 'pending' && (
            <span className={`hand__badge hand__badge--${outcome}`}>{outcomeLabels[outcome]}</span>
          )}
        </div>
      </div>
      <div className={`hand__cards${cards.length > 3 ? ` hand__cards--many hand__cards--${Math.min(cards.length, 8)}` : ''}`}>
        {cards.map((card, index) => (
          <Card
            key={`${card.rank}-${card.suit}-${index}`}
            card={card}
            faceDown={hiddenSet.has(index) && index !== revealIndex}
            revealing={index === revealIndex}
            dealing={index === dealingIndex}
            delay={dealingIndex === index ? 0 : index * 80}
          />
        ))}
      </div>
      {betChips.length > 0 && (
        <div className="hand__bet" aria-label={`Bet ${formatCurrency(bet ?? 0)}`}>
          <div
            className="hand__bet-stack"
            style={{ height: `${chipStackHeight}rem` }}
          >
            {betChips.map((value, index) => (
              <img
                key={`${value}-${index}`}
                className="hand__bet-chip"
                src={getChipImagePath(value)}
                alt=""
                draggable={false}
                style={{ bottom: `${chipStackStep * index}rem` }}
              />
            ))}
          </div>
          <span className="hand__bet-amount">{formatCurrency(bet ?? 0)}</span>
        </div>
      )}
    </div>
  )
}
