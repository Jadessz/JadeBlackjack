import type { AvailableActions } from '../game/types'

interface ActionBarProps {
  actions: AvailableActions
  lastBet: number
  bankroll: number
  onHit: () => void
  onStand: () => void
  onDoubleDown: () => void
  onSplit: () => void
  onTakeInsurance: () => void
  onDeclineInsurance: () => void
  onNextRound: () => void
  onRepeatBet: () => void
  phase: string
}

export function ActionBar({
  actions,
  lastBet,
  bankroll,
  onHit,
  onStand,
  onDoubleDown,
  onSplit,
  onTakeInsurance,
  onDeclineInsurance,
  onNextRound,
  onRepeatBet,
  phase,
}: ActionBarProps) {
  if (phase === 'insurance') {
    return (
      <div className="action-bar">
        <button type="button" className="btn btn--gold" disabled={!actions.takeInsurance} onClick={onTakeInsurance}>
          Take Insurance
        </button>
        <button type="button" className="btn btn--secondary" disabled={!actions.declineInsurance} onClick={onDeclineInsurance}>
          No Thanks
        </button>
      </div>
    )
  }

  if (phase === 'settling') {
    return (
      <div className="action-bar">
        {actions.repeatBet && (
          <button type="button" className="btn btn--gold" onClick={onRepeatBet}>
            Repeat ${Math.min(lastBet, bankroll)}
          </button>
        )}
        <button type="button" className="btn btn--primary" disabled={!actions.nextRound} onClick={onNextRound}>
          Change Bet
        </button>
      </div>
    )
  }

  if (phase !== 'playerTurn') {
    return null
  }

  return (
    <div className="action-bar">
      <button type="button" className="btn btn--primary" disabled={!actions.hit} onClick={onHit}>
        Hit
      </button>
      <button type="button" className="btn btn--secondary" disabled={!actions.stand} onClick={onStand}>
        Stand
      </button>
      <button type="button" className="btn btn--gold" disabled={!actions.doubleDown} onClick={onDoubleDown}>
        Double
      </button>
      <button type="button" className="btn btn--gold" disabled={!actions.split} onClick={onSplit}>
        Split
      </button>
    </div>
  )
}
