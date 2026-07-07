import { canChangeSettingsInPlace, canOpenSettings, getVisibleDealerTotal } from '../game/engine'
import { getDealerPrompt } from '../game/dealerDialogue'
import { formatHandTotal } from '../game/rules'
import { DEALER_HOLE_CARD_INDEX, type GameState } from '../game/types'
import type { GameSettings } from '../game/settings'
import { ActionBar } from './ActionBar'
import { Bankroll } from './Bankroll'
import { ChipTray } from './ChipTray'
import { GameOver } from './GameOver'
import { Hand } from './Hand'
import { SessionSidebar } from './SessionSidebar'
import { SettingsPanel } from './SettingsPanel'
import { ShoeDisplay } from './ShoeDisplay'
import { ShuffleOverlay } from './ShuffleOverlay'

interface TableProps {
  state: GameState
  actions: ReturnType<typeof import('../game/engine').getAvailableActions>
  settingsOpen: boolean
  dealerAdvice: string | null
  hintAvailable: boolean
  onHint: () => void
  onAddChip: (amount: number) => void
  onBetAll: () => void
  onRepeatBet: () => void
  onRepeatBetAndDeal: () => void
  onClearBet: () => void
  onDeal: () => void
  onTakeInsurance: () => void
  onDeclineInsurance: () => void
  onHit: () => void
  onStand: () => void
  onDoubleDown: () => void
  onSplit: () => void
  onNextRound: () => void
  onRestart: () => void
  onResetStats: () => void
  onOpenSettings: () => void
  onCloseSettings: () => void
  onApplySettings: (settings: GameSettings) => void
  onStartNewGameWithSettings: (settings: GameSettings) => void
}

export function Table({
  state,
  actions,
  settingsOpen,
  dealerAdvice,
  hintAvailable,
  onHint,
  onAddChip,
  onBetAll,
  onRepeatBet,
  onRepeatBetAndDeal,
  onClearBet,
  onDeal,
  onTakeInsurance,
  onDeclineInsurance,
  onHit,
  onStand,
  onDoubleDown,
  onSplit,
  onNextRound,
  onRestart,
  onResetStats,
  onOpenSettings,
  onCloseSettings,
  onApplySettings,
  onStartNewGameWithSettings,
}: TableProps) {
  const dealerHiddenIndices =
    state.phase === 'dealerTurn'
      ? state.dealerHiddenIndices
      : state.dealerHoleHidden
        ? [DEALER_HOLE_CARD_INDEX]
        : []
  const dealerRevealIndex =
    state.phase === 'dealerTurn' && state.dealerAnimPhase === 'flip' ? state.dealerAnimatingIndex : -1
  const dealerDealingIndex =
    state.phase === 'dealerTurn' && state.dealerAnimPhase === 'deal' ? state.dealerAnimatingIndex : -1
  const dealerTotal = getVisibleDealerTotal(state)
  const dealerPrompt = getDealerPrompt(state)
  const settingsEditable = canChangeSettingsInPlace(state)
  const settingsButtonEnabled = canOpenSettings(state)
  const showEasy21Sidebar =
    state.settings.easy21Mode && state.settings.difficulty !== 'hard'
  const layoutClasses = [
    'table-layout',
    showEasy21Sidebar ? 'table-layout--with-left-sidebar' : '',
    'table-layout--with-right-sidebar',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app">
      <Bankroll
        bankroll={state.bankroll}
        onOpenSettings={onOpenSettings}
        canOpenSettings={settingsButtonEnabled}
      />

      <main className={layoutClasses}>
        {showEasy21Sidebar && (
          <aside className="table-layout__sidebar table-layout__sidebar--left">
            <ShoeDisplay state={state} />
          </aside>
        )}

        <div className="table">
          <div className="table__felt">
            <section className="table__zone table__zone--dealer">
              <Hand
                cards={state.dealerHand}
                label="Dealer"
                total={dealerTotal}
                hiddenIndices={dealerHiddenIndices}
                revealIndex={dealerRevealIndex}
                dealingIndex={dealerDealingIndex}
              />
            </section>

            <div className="table__banner">
              {state.message && <p className="table__message">{state.message}</p>}
              {dealerPrompt && <p className="table__dealer-voice">Dealer: {dealerPrompt}</p>}
              {state.insuranceTaken && state.insuranceBet > 0 && (
                <p className="table__insurance">Insurance: ${state.insuranceBet}</p>
              )}
            </div>

            <section className="table__zone table__zone--player">
              {state.playerHands.length === 0 ? (
                <div className="table__placeholder">
                  <span className="table__placeholder-icon" aria-hidden="true">♠</span>
                  <p>Place your bet to begin</p>
                </div>
              ) : (
                <div className={`table__hands table__hands--${state.playerHands.length}`}>
                  {state.playerHands.map((hand, index) => (
                    <Hand
                      key={`player-hand-${index}`}
                      cards={hand.cards}
                      label={state.playerHands.length > 1 ? `Hand ${index + 1}` : 'You'}
                      total={formatHandTotal(hand.cards)}
                      outcome={hand.outcome}
                      bet={hand.bet}
                      isActive={state.phase === 'playerTurn' && index === state.activeHandIndex}
                    />
                  ))}
                </div>
              )}
            </section>

            <footer className="table__controls">
              <div className="table__controls-divider" aria-hidden="true" />
              {state.phase === 'betting' && (
                <ChipTray
                  bankroll={state.bankroll}
                  pendingBet={state.pendingBet}
                  pendingBetChips={state.pendingBetChips}
                  disabled={!actions.addChip}
                  lastBet={state.lastBet}
                  onAddChip={onAddChip}
                  onBetAll={onBetAll}
                  onRepeatBet={onRepeatBet}
                  onClearBet={onClearBet}
                  onDeal={onDeal}
                  canDeal={actions.deal}
                  canClear={actions.clearBet}
                  canRepeatBet={actions.repeatBet}
                />
              )}

              <ActionBar
                actions={actions}
                phase={state.phase}
                lastBet={state.lastBet}
                bankroll={state.bankroll}
                onHit={onHit}
                onStand={onStand}
                onDoubleDown={onDoubleDown}
                onSplit={onSplit}
                onTakeInsurance={onTakeInsurance}
                onDeclineInsurance={onDeclineInsurance}
                onNextRound={onNextRound}
                onRepeatBet={onRepeatBetAndDeal}
              />
            </footer>
          </div>
        </div>

        <aside className="table-layout__sidebar table-layout__sidebar--right">
          <SessionSidebar
            stats={state.stats}
            teacherDealerMode={state.settings.teacherDealerMode}
            insiderDealerMode={state.settings.insiderDealerMode}
            hintAvailable={hintAvailable}
            dealerAdvice={dealerAdvice}
            suspicion={state.suspicion}
            onHint={onHint}
            onResetStats={onResetStats}
          />
        </aside>
      </main>

      <SettingsPanel
        open={settingsOpen}
        settings={state.settings}
        canApply={settingsEditable}
        onApply={onApplySettings}
        onStartNewGame={onStartNewGameWithSettings}
        onClose={onCloseSettings}
      />

      {state.phase === 'shuffling' && <ShuffleOverlay />}

      {state.phase === 'gameOver' && (
        <GameOver
          stats={{
            handsPlayed: state.stats.handsPlayed,
            wins: state.stats.wins,
            losses: state.stats.losses,
            netProfit: state.stats.netProfit,
          }}
          reason={state.gameOverReason}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
