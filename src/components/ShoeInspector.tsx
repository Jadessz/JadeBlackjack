import { createPortal } from 'react-dom'
import { RANKS, SUITS, type Card, type GameState, type Rank } from '../game/types'

interface ShoeInspectorProps {
  state: GameState
  onClose: () => void
}

const SUIT_GLYPH: Record<Card['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const RANK_LABEL: Record<Rank, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
}

function countByRank(cards: Card[]): Record<Rank, number> {
  const counts = Object.fromEntries(RANKS.map((rank) => [rank, 0])) as Record<Rank, number>
  for (const card of cards) {
    counts[card.rank] += 1
  }
  return counts
}

export function ShoeInspector({ state, onClose }: ShoeInspectorProps) {
  const perRankTotal = state.settings.deckCount * SUITS.length
  // Only cards physically seen on the table — face-down dealer cards stay hidden
  // until the dealer flips them. Insider help is verbal and does not count here.
  const seenCards = state.revealedCardsThisShoe
  const dealtByRank = countByRank(seenCards)
  const remainingByRank = Object.fromEntries(
    RANKS.map((rank) => [rank, perRankTotal - dealtByRank[rank]]),
  ) as Record<Rank, number>
  const totalDealt = seenCards.length
  const totalRemaining = state.totalShoeSize - totalDealt

  return createPortal(
    <div className="settings-overlay" onClick={onClose}>
      <div className="shoe-inspector" onClick={(event) => event.stopPropagation()}>
        <header className="shoe-inspector__header">
          <div>
            <span className="shoe-display__eyebrow">Easy 21 Mode</span>
            <h2 className="shoe-inspector__title">Shoe Details</h2>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="shoe-inspector__summary">
          {totalRemaining} of {state.totalShoeSize} cards left in the shoe · {totalDealt} dealt this shoe
        </p>

        <div className="shoe-inspector__body">
          <section className="shoe-inspector__section">
            <h3 className="shoe-inspector__section-title">Cards remaining by rank</h3>
            <div className="shoe-inspector__grid">
              <div className="shoe-inspector__grid-head">
                <span>Rank</span>
                <span>Left</span>
                <span>Dealt</span>
              </div>
              {RANKS.map((rank) => {
                const remaining = remainingByRank[rank]
                const dealt = dealtByRank[rank]
                const depleted = remaining === 0
                return (
                  <div
                    key={rank}
                    className={`shoe-inspector__row${depleted ? ' shoe-inspector__row--empty' : ''}`}
                  >
                    <span className="shoe-inspector__rank">{RANK_LABEL[rank]}</span>
                    <span className="shoe-inspector__remaining">
                      {remaining}
                      <span className="shoe-inspector__of"> / {perRankTotal}</span>
                    </span>
                    <span className="shoe-inspector__dealt">{dealt}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="shoe-inspector__section">
            <h3 className="shoe-inspector__section-title">
              Dealt cards ({totalDealt})
            </h3>
            {totalDealt === 0 ? (
              <p className="shoe-inspector__empty-note">No cards dealt from this shoe yet.</p>
            ) : (
              <ol className="shoe-inspector__dealt-list">
                {seenCards.map((card, index) => (
                  <li
                    key={`${card.rank}-${card.suit}-${index}`}
                    className={`shoe-inspector__chip shoe-inspector__chip--${
                      card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
                    }`}
                  >
                    <span className="shoe-inspector__chip-rank">{RANK_LABEL[card.rank]}</span>
                    <span className="shoe-inspector__chip-suit">{SUIT_GLYPH[card.suit]}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
