import { formatCurrency } from '../utils/cardImage'
import { MAX_SUSPICION, type SessionStats } from '../game/types'

interface SessionSidebarProps {
  stats: SessionStats
  teacherDealerMode: boolean
  insiderDealerMode: boolean
  hintAvailable: boolean
  dealerAdvice: string | null
  suspicion: number
  onHint: () => void
  onResetStats: () => void
}

export function SessionSidebar({
  stats,
  teacherDealerMode,
  insiderDealerMode,
  hintAvailable,
  dealerAdvice,
  suspicion,
  onHint,
  onResetStats,
}: SessionSidebarProps) {
  const suspicionPct = Math.round((suspicion / MAX_SUSPICION) * 100)
  const suspicionLevel = suspicionPct >= 70 ? 'high' : suspicionPct >= 35 ? 'medium' : 'low'
  return (
    <aside className="session-sidebar">
      <div className="session-sidebar__panel">
        <header className="session-sidebar__header">
          <h2 className="session-sidebar__title">Session</h2>
          <button type="button" className="btn btn--ghost session-sidebar__reset" onClick={onResetStats}>
            Reset
          </button>
        </header>

        <dl className="session-sidebar__stats">
          <div className="session-sidebar__stat">
            <dt>Wins</dt>
            <dd>{stats.wins}</dd>
          </div>
          <div className="session-sidebar__stat">
            <dt>Losses</dt>
            <dd>{stats.losses}</dd>
          </div>
          <div className="session-sidebar__stat">
            <dt>Pushes</dt>
            <dd>{stats.pushes}</dd>
          </div>
          <div className="session-sidebar__stat">
            <dt>BJ</dt>
            <dd>{stats.blackjacks}</dd>
          </div>
          <div className="session-sidebar__stat session-sidebar__stat--wide">
            <dt>Net</dt>
            <dd className={stats.netProfit >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(stats.netProfit)}
            </dd>
          </div>
          <div className="session-sidebar__stat session-sidebar__stat--wide">
            <dt>Best</dt>
            <dd>{formatCurrency(stats.bestBankroll)}</dd>
          </div>
        </dl>
      </div>

      {teacherDealerMode && (
        <div className="session-sidebar__panel session-sidebar__panel--insider">
          <span className="session-sidebar__eyebrow">Teacher Dealer</span>
          <header className="session-sidebar__header session-sidebar__header--insider">
            <h2 className="session-sidebar__title">Strategy Coach</h2>
          </header>

          <p className="session-sidebar__insider-note">
            The dealer suggests the textbook basic-strategy play — best odds long term, never a promise
            on any single hand.
          </p>

          <button
            type="button"
            className="btn btn--gold session-sidebar__hint-btn"
            disabled={!hintAvailable}
            onClick={onHint}
          >
            Hint
          </button>

          <div className="session-sidebar__advice-area">
            {dealerAdvice ? (
              <div className="session-sidebar__whisper" role="status" aria-live="polite">
                <span className="session-sidebar__whisper-label">Dealer teaches</span>
                <p className="session-sidebar__whisper-text">{dealerAdvice}</p>
              </div>
            ) : (
              <p className="session-sidebar__whisper-placeholder">
                {hintAvailable
                  ? 'Tap Hint for the recommended play.'
                  : 'Hints appear on your turn or an insurance offer.'}
              </p>
            )}
          </div>
        </div>
      )}

      {insiderDealerMode && (
        <div className="session-sidebar__panel session-sidebar__panel--insider">
          <span className="session-sidebar__eyebrow session-sidebar__eyebrow--danger">Insider Dealer</span>
          <header className="session-sidebar__header session-sidebar__header--insider">
            <h2 className="session-sidebar__title">Inside Tip</h2>
          </header>

          <p className="session-sidebar__insider-note">
            Leaks the hole card and best move. Each peek raises suspicion — faster on bigger bets.
          </p>

          <button
            type="button"
            className="btn btn--gold session-sidebar__hint-btn"
            disabled={!hintAvailable}
            onClick={onHint}
          >
            Ask the Insider
          </button>

          <div className="session-sidebar__advice-area">
            {dealerAdvice ? (
              <div className="session-sidebar__whisper" role="status" aria-live="polite">
                <span className="session-sidebar__whisper-label">Dealer leaks</span>
                <p className="session-sidebar__whisper-text">{dealerAdvice}</p>
              </div>
            ) : (
              <p className="session-sidebar__whisper-placeholder">
                {hintAvailable
                  ? 'Tap to peek at the hole card and best move.'
                  : 'Tips appear on your turn or an insurance offer.'}
              </p>
            )}
          </div>

          <div className={`suspicion suspicion--${suspicionLevel}`}>
            <div className="suspicion__header">
              <span className="suspicion__label">Suspicion</span>
              <span className="suspicion__value">{suspicionPct}%</span>
            </div>
            <div
              className="suspicion__track"
              role="progressbar"
              aria-valuenow={suspicionPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="suspicion__fill" style={{ width: `${suspicionPct}%` }} />
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
