import { useState } from 'react'
import {
  formatRunningCount,
  formatTrueCount,
  getCountTone,
  getShoeCountSnapshot,
} from '../game/cardCounting'
import type { GameState } from '../game/types'
import { ShoeInspector } from './ShoeInspector'

interface ShoeDisplayProps {
  state: GameState
}

export function ShoeDisplay({ state }: ShoeDisplayProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false)

  if (!state.settings.easy21Mode || state.settings.difficulty === 'hard') {
    return null
  }

  const shoeCardsRemaining = state.shoe.length
  const cardsDealt = state.totalShoeSize - shoeCardsRemaining
  const singleDeck = state.settings.deckCount === 1
  const cutAt = state.shuffleCutAt
  const cardsUntilCut =
    cutAt !== null ? Math.max(0, cutAt - state.cardsDealtThisShoe) : null
  const shoeProgress = state.totalShoeSize > 0 ? (cardsDealt / state.totalShoeSize) * 100 : 0
  const cutPosition = cutAt !== null && state.totalShoeSize > 0 ? (cutAt / state.totalShoeSize) * 100 : 0

  const count = getShoeCountSnapshot(state.revealedCardsThisShoe, shoeCardsRemaining)
  const countTone = getCountTone(count.trueCount)

  return (
    <aside className="shoe-display" aria-label="Shoe tracker">
      <header className="shoe-display__header">
        <span className="shoe-display__eyebrow">Easy 21 Mode</span>
        <h3 className="shoe-display__title">Shoe Tracker</h3>
      </header>

      <div className="shoe-display__count">
        <strong className="shoe-display__count-value">{shoeCardsRemaining}</strong>
        <span className="shoe-display__count-label">cards remaining</span>
      </div>

      <button
        type="button"
        className="btn btn--secondary shoe-display__details-btn"
        onClick={() => setInspectorOpen(true)}
      >
        View shoe details
      </button>

      <section className="shoe-display__counting" aria-label="Card counting">
        <div className="shoe-display__section-head">
          <span>Hi-Lo Count</span>
          <span className="shoe-display__decks-left">{count.decksRemaining.toFixed(1)} decks left</span>
        </div>

        <div className={`shoe-display__hilo shoe-display__hilo--${countTone}`}>
          <div className="shoe-display__hilo-stat">
            <span className="shoe-display__hilo-label">Running</span>
            <strong className="shoe-display__hilo-value">{formatRunningCount(count.runningCount)}</strong>
          </div>
          <div className="shoe-display__hilo-divider" aria-hidden="true" />
          <div className="shoe-display__hilo-stat shoe-display__hilo-stat--true">
            <span className="shoe-display__hilo-label">True</span>
            <strong className="shoe-display__hilo-value">{formatTrueCount(count.trueCount)}</strong>
          </div>
        </div>

        <div className="shoe-display__key-cards">
          <div className="shoe-display__key-card">
            <span className="shoe-display__key-label">Aces</span>
            <strong className="shoe-display__key-value">{count.acesDealt}</strong>
          </div>
          <div className="shoe-display__key-card">
            <span className="shoe-display__key-label">10-Value</span>
            <strong className="shoe-display__key-value">{count.tenValueDealt}</strong>
          </div>
          <div className="shoe-display__key-card">
            <span className="shoe-display__key-label">Low (2–6)</span>
            <strong className="shoe-display__key-value">{count.lowCardsDealt}</strong>
          </div>
        </div>

        <p className="shoe-display__hilo-legend">
          Hi-Lo: 2–6 +1 · 7–9 0 · 10-A −1 · True = running ÷ decks remaining
        </p>
      </section>

      {singleDeck ? (
        <p className="shoe-display__status shoe-display__status--muted">
          Single deck — reshuffles after every hand.
        </p>
      ) : (
        <>
          <div className="shoe-display__metrics">
            <div className="shoe-display__metric">
              <span className="shoe-display__metric-label">Dealt this shoe</span>
              <strong className="shoe-display__metric-value">{cardsDealt}</strong>
            </div>
            <div className="shoe-display__metric">
              <span className="shoe-display__metric-label">Cut card at</span>
              <strong className="shoe-display__metric-value">{cutAt ?? '—'}</strong>
            </div>
          </div>

          <div className="shoe-display__meter">
            <div className="shoe-display__meter-header">
              <span>Shoe depth</span>
              <span>{Math.round(shoeProgress)}% dealt</span>
            </div>
            <div className="shoe-display__track" role="presentation">
              <div className="shoe-display__track-fill" style={{ width: `${shoeProgress}%` }} />
              {cutAt !== null && (
                <div
                  className="shoe-display__cut-marker"
                  style={{ left: `${cutPosition}%` }}
                  title={`Shuffle card after ${cutAt} cards dealt`}
                >
                  <span className="shoe-display__cut-flag" />
                </div>
              )}
            </div>
            <div className="shoe-display__track-scale">
              <span>Full shoe</span>
              <span>Empty</span>
            </div>
          </div>

          <p
            className={`shoe-display__status${
              state.reshufflePending ? ' shoe-display__status--alert' : ''
            }`}
          >
            {state.reshufflePending
              ? 'Cut card is out — new shoe after this hand.'
              : cardsUntilCut !== null
                ? `${cardsUntilCut} card${cardsUntilCut === 1 ? '' : 's'} until the cut.`
                : 'Cut card position unknown.'}
          </p>
        </>
      )}

      {inspectorOpen && <ShoeInspector state={state} onClose={() => setInspectorOpen(false)} />}
    </aside>
  )
}
