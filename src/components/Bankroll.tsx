import { useState } from 'react'
import { formatCurrency } from '../utils/cardImage'
import { isMuted, playSound, setMuted } from '../utils/sound'

interface BankrollProps {
  bankroll: number
  onOpenSettings: () => void
  canOpenSettings: boolean
}

export function Bankroll({
  bankroll,
  onOpenSettings,
  canOpenSettings,
}: BankrollProps) {
  const [muted, setMutedState] = useState(isMuted())

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) {
      playSound('button')
    }
  }

  return (
    <header className="bankroll">
      <div className="bankroll__brand">
        <h1>Jade Blackjack</h1>
      </div>

      <div className="bankroll__balance-card">
        <span className="bankroll__balance-label">Bankroll</span>
        <strong className="bankroll__balance-value">{formatCurrency(bankroll)}</strong>
      </div>

      <div className="bankroll__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          {muted ? 'Sound: Off' : 'Sound: On'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onOpenSettings}
          disabled={!canOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  )
}
