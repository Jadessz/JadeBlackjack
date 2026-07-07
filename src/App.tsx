import { Table } from './components/Table'
import { useBlackjack } from './hooks/useBlackjack'
import './App.css'

function App() {
  const {
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
  } = useBlackjack()

  return (
    <Table
      state={state}
      actions={actions}
      settingsOpen={settingsOpen}
      dealerAdvice={dealerAdvice}
      hintAvailable={hintAvailable}
      onHint={onHint}
      onAddChip={onAddChip}
      onBetAll={onBetAll}
      onRepeatBet={onRepeatBet}
      onRepeatBetAndDeal={onRepeatBetAndDeal}
      onClearBet={onClearBet}
      onDeal={onDeal}
      onTakeInsurance={onTakeInsurance}
      onDeclineInsurance={onDeclineInsurance}
      onHit={onHit}
      onStand={onStand}
      onDoubleDown={onDoubleDown}
      onSplit={onSplit}
      onNextRound={onNextRound}
      onRestart={onRestart}
      onResetStats={onResetStats}
      onOpenSettings={onOpenSettings}
      onCloseSettings={onCloseSettings}
      onApplySettings={onApplySettings}
      onStartNewGameWithSettings={onStartNewGameWithSettings}
    />
  )
}

export default App
