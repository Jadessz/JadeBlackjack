import { formatCurrency } from '../utils/cardImage'
import type { GameOverReason } from '../game/types'

interface GameOverProps {
  stats: {
    handsPlayed: number
    wins: number
    losses: number
    netProfit: number
  }
  reason: GameOverReason
  onRestart: () => void
}

const REASON_COPY: Record<GameOverReason, { title: string; subtitle: string; finePrint: string }> = {
  bankrupt: {
    title: 'You ran out of money!',
    subtitle: 'The Casino kicked you out...',
    finePrint: "That's why you shouldn't gamble.",
  },
  caught: {
    title: 'Busted for cheating!',
    subtitle: 'The pit boss caught you and the insider dealer working together and seized every last chip.',
    finePrint: 'Cheaters never prosper — the house always finds out.',
  },
}

export function GameOver({ stats, reason, onRestart }: GameOverProps) {
  const copy = REASON_COPY[reason]

  return (
    <div className="game-over">
      <div className="game-over__panel">
        <h2 className="game-over__title">{copy.title}</h2>
        <p className="game-over__subtitle">
          <em>{copy.subtitle}</em>
        </p>

        <dl className="game-over__summary">
          <div className="game-over__stat">
            <dt>Hands Played</dt>
            <dd>{stats.handsPlayed}</dd>
          </div>
          <div className="game-over__stat">
            <dt>Record</dt>
            <dd>
              {stats.wins}W – {stats.losses}L
            </dd>
          </div>
          <div className="game-over__stat">
            <dt>Net Profit</dt>
            <dd className={stats.netProfit >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(stats.netProfit)}
            </dd>
          </div>
        </dl>

        <button type="button" className="btn btn--primary game-over__action" onClick={onRestart}>
          New Session
        </button>

        <p className="game-over__fine-print">{copy.finePrint}</p>
      </div>
    </div>
  )
}
