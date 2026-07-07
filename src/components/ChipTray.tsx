import { CHIP_DENOMINATIONS, MAX_BET } from '../game/types'
import { getChipStackHeight, getChipStackStep } from '../utils/betChips'
import { formatCurrency } from '../utils/cardImage'
import { getChipImagePath } from '../utils/chipImage'

interface ChipTrayProps {
  bankroll: number
  pendingBet: number
  pendingBetChips: number[]
  lastBet: number
  disabled: boolean
  onAddChip: (amount: number) => void
  onBetAll: () => void
  onRepeatBet: () => void
  onClearBet: () => void
  onDeal: () => void
  canDeal: boolean
  canClear: boolean
  canRepeatBet: boolean
}

export function ChipTray({
  bankroll,
  pendingBet,
  pendingBetChips,
  lastBet,
  disabled,
  onAddChip,
  onBetAll,
  onRepeatBet,
  onClearBet,
  onDeal,
  canDeal,
  canClear,
  canRepeatBet,
}: ChipTrayProps) {
  const showBetAll = bankroll > 0 && bankroll < MAX_BET
  const chipsIdle = pendingBet === 0 && !disabled
  const stackStep = getChipStackStep(pendingBetChips.length)
  const stackHeight = getChipStackHeight(pendingBetChips.length)

  return (
    <div className="chip-tray">
      <div className="chip-tray__bet-area">
        <div
          className={`chip-tray__bet-spot${pendingBetChips.length > 0 ? ' chip-tray__bet-spot--filled' : ''}`}
          aria-label={`Current bet ${formatCurrency(pendingBet)}`}
        >
          {pendingBetChips.length === 0 ? (
            <span className="chip-tray__bet-empty">Bet</span>
          ) : (
            <div className="chip-tray__stack" style={{ height: `${stackHeight}rem` }}>
              {pendingBetChips.map((value, index) => (
                <img
                  key={`${value}-${index}`}
                  className="chip-tray__stacked-chip"
                  src={getChipImagePath(value)}
                  alt=""
                  draggable={false}
                  style={{ bottom: `${stackStep * index}rem` }}
                />
              ))}
            </div>
          )}
        </div>
        <span
          className="chip-tray__bet-total"
          style={{ visibility: pendingBet > 0 ? 'visible' : 'hidden' }}
        >
          {formatCurrency(pendingBet > 0 ? pendingBet : 0)}
        </span>
      </div>

      <div className="chip-tray__chips">
        {CHIP_DENOMINATIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip${chipsIdle ? ' chip--idle' : ''}`}
            disabled={disabled}
            onClick={() => onAddChip(value)}
            aria-label={`Add ${formatCurrency(value)} chip`}
          >
            <img src={getChipImagePath(value)} alt="" draggable={false} />
          </button>
        ))}
        {showBetAll && (
          <button
            type="button"
            className="chip chip--bet-all"
            disabled={disabled}
            onClick={onBetAll}
            aria-label={`Bet all ${formatCurrency(bankroll)}`}
          >
            Bet All
          </button>
        )}
      </div>
      <div className="chip-tray__actions">
        {canRepeatBet && (
          <button type="button" className="btn btn--secondary" onClick={onRepeatBet}>
            Repeat ${Math.min(lastBet, bankroll)}
          </button>
        )}
        <button type="button" className="btn btn--secondary" disabled={!canClear} onClick={onClearBet}>
          Clear
        </button>
        <button type="button" className="btn btn--primary" disabled={!canDeal} onClick={onDeal}>
          Deal
        </button>
      </div>
    </div>
  )
}
