import { useCallback, useEffect, useRef, useState } from 'react'
import { playSound, stopSound } from '../utils/sound'
import {
  addChip,
  advanceDealerTurn,
  applySettings,
  betAll,
  completeShuffle,
  clearBet,
  deal,
  declineInsurance,
  doubleDown,
  getAvailableActions,
  hit,
  nextRound,
  registerInsiderUse,
  repeatBet,
  restartGame,
  split,
  stand,
  startNewGameWithSettings,
  takeInsurance,
  createInitialState,
} from '../game/engine'
import { getBasicStrategyRecommendation, type StrategyContext } from '../game/basicStrategy'
import { getInsiderTip, type InsiderContext } from '../game/insider'
import type { GameSettings } from '../game/settings'
import {
  DEALER_CARD_DEAL_MS,
  DEALER_HOLE_CARD_INDEX,
  DEALER_REVEAL_MS,
  SHUFFLE_MS,
  type GameState,
} from '../game/types'

const STATS_KEY = 'blackjack-line-stats'
const SESSION_KEY = 'blackjack-line-session-started'

function loadPersistedStats(): Partial<GameState['stats']> | null {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as Partial<GameState['stats']>
  } catch {
    return null
  }
}

function saveStats(stats: GameState['stats']) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

function hasSessionStarted(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true'
}

function markSessionStarted() {
  localStorage.setItem(SESSION_KEY, 'true')
}

function buildHintContext(state: GameState): StrategyContext | null {
  if (state.phase === 'insurance' && state.dealerHand[0]) {
    return {
      playerCards: state.playerHands[0]?.cards ?? [],
      dealerUpcard: state.dealerHand[0],
      canDouble: false,
      canSplit: false,
      canSurrender: false,
      isInsuranceOffer: true,
    }
  }

  if (state.phase !== 'playerTurn') {
    return null
  }

  const activeHand = state.playerHands[state.activeHandIndex]
  const dealerUpcard = state.dealerHand[0]
  if (!activeHand || !dealerUpcard) {
    return null
  }

  const actions = getAvailableActions(state)

  return {
    playerCards: activeHand.cards,
    dealerUpcard,
    canDouble: actions.doubleDown,
    canSplit: actions.split,
    canSurrender: false,
    isInsuranceOffer: false,
  }
}

function outcomeSound(results: GameState['lastRoundResults']): 'blackjack' | 'win' | 'push' | 'bust' | 'lose' {
  if (results.length === 0) {
    return 'lose'
  }
  if (results.some((r) => r.outcome === 'blackjack')) {
    return 'blackjack'
  }
  if (results.some((r) => r.outcome === 'win')) {
    return 'win'
  }
  if (results.every((r) => r.outcome === 'push')) {
    return 'push'
  }
  if (results.every((r) => r.outcome === 'bust')) {
    return 'bust'
  }
  return 'lose'
}

function buildInsiderContext(state: GameState): InsiderContext | null {
  if (state.phase === 'insurance' && state.dealerHand.length >= 2) {
    return {
      playerCards: state.playerHands[0]?.cards ?? [],
      dealerCards: state.dealerHand,
      holeCardIndex: DEALER_HOLE_CARD_INDEX,
      canDouble: false,
      canSplit: false,
      isInsuranceOffer: true,
    }
  }

  if (state.phase !== 'playerTurn') {
    return null
  }

  const activeHand = state.playerHands[state.activeHandIndex]
  if (!activeHand || state.dealerHand.length < 2) {
    return null
  }

  const actions = getAvailableActions(state)

  return {
    playerCards: activeHand.cards,
    dealerCards: state.dealerHand,
    holeCardIndex: DEALER_HOLE_CARD_INDEX,
    canDouble: actions.doubleDown,
    canSplit: actions.split,
    isInsuranceOffer: false,
  }
}

export function useBlackjack() {
  const [settingsOpen, setSettingsOpen] = useState(() => !hasSessionStarted())
  const [dealerAdvice, setDealerAdvice] = useState<string | null>(null)
  const [state, setState] = useState<GameState>(() => {
    const initial = createInitialState()
    const persisted = loadPersistedStats()
    if (persisted) {
      return {
        ...initial,
        stats: {
          ...initial.stats,
          ...persisted,
        },
      }
    }
    return initial
  })

  useEffect(() => {
    saveStats(state.stats)
  }, [state.stats])

  useEffect(() => {
    if (state.phase !== 'dealerTurn') {
      return
    }

    if (state.dealerAnimPhase === 'none' && state.dealerAnimatingIndex < 0) {
      const timer = window.setTimeout(() => {
        setState((current) => advanceDealerTurn(current))
      }, 0)
      return () => window.clearTimeout(timer)
    }

    const delay = state.dealerAnimPhase === 'deal' ? DEALER_CARD_DEAL_MS : DEALER_REVEAL_MS
    const timer = window.setTimeout(() => {
      setState((current) => advanceDealerTurn(current))
    }, delay)

    return () => window.clearTimeout(timer)
  }, [state.phase, state.dealerAnimPhase, state.dealerAnimatingIndex, state.dealerHand.length])

  useEffect(() => {
    if (state.phase !== 'shuffling') {
      return
    }

    const timer = window.setTimeout(() => {
      // Cut the shuffle sound off exactly when the animation finishes so it
      // doesn't bleed into the next round (the sample is longer than SHUFFLE_MS).
      stopSound('shuffle')
      setState((current) => completeShuffle(current))
    }, SHUFFLE_MS)

    return () => {
      window.clearTimeout(timer)
      // Also stop if we leave the shuffling phase early for any other reason.
      stopSound('shuffle')
    }
  }, [state.phase])

  const prevPhaseRef = useRef<GameState['phase']>(state.phase)
  const prevDealerCountRef = useRef(state.dealerHand.length)

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = state.phase

    if (state.phase === prevPhase) {
      return
    }

    if (state.phase === 'shuffling') {
      playSound('shuffle')
    } else if (state.phase === 'gameOver') {
      playSound(state.gameOverReason === 'caught' ? 'caught' : 'lose')
    } else if (state.phase === 'settling') {
      playSound(outcomeSound(state.lastRoundResults))
    }
  }, [state.phase, state.gameOverReason, state.lastRoundResults])

  useEffect(() => {
    const prevCount = prevDealerCountRef.current
    prevDealerCountRef.current = state.dealerHand.length
    if (state.phase === 'dealerTurn' && state.dealerHand.length > prevCount) {
      playSound('flip')
    }
  }, [state.phase, state.dealerHand.length])

  const actions = getAvailableActions(state)
  const teacherActive = state.settings.teacherDealerMode
  const insiderActive = state.settings.insiderDealerMode
  const hintAvailable = teacherActive
    ? buildHintContext(state) !== null
    : insiderActive
      ? buildInsiderContext(state) !== null
      : false

  useEffect(() => {
    setDealerAdvice(null)
  }, [
    state.phase,
    state.activeHandIndex,
    state.playerHands.length,
    state.playerHands[state.activeHandIndex]?.cards.length,
  ])

  const onHint = useCallback(() => {
    if (state.settings.teacherDealerMode) {
      const context = buildHintContext(state)
      if (!context) {
        return
      }
      setDealerAdvice(getBasicStrategyRecommendation(context).advice)
      return
    }

    if (state.settings.insiderDealerMode) {
      const context = buildInsiderContext(state)
      if (!context) {
        return
      }
      setDealerAdvice(getInsiderTip(context))
      playSound('insider')
      setState((current) => registerInsiderUse(current))
    }
  }, [state])

  const onAddChip = useCallback((amount: number) => {
    playSound('chip')
    setState((current) => addChip(current, amount))
  }, [])

  const onClearBet = useCallback(() => {
    playSound('button')
    setState((current) => clearBet(current))
  }, [])

  const onBetAll = useCallback(() => {
    playSound('chip')
    setState((current) => betAll(current))
  }, [])

  const onRepeatBet = useCallback(() => {
    setState((current) => repeatBet(current))
  }, [])

  const onRepeatBetAndDeal = useCallback(() => {
    markSessionStarted()
    setSettingsOpen(false)
    playSound('deal')
    setState((current) => {
      const advanced = current.phase === 'settling' ? nextRound(current) : current
      if (advanced.phase !== 'betting') {
        return advanced
      }
      const withBet = repeatBet(advanced)
      if (withBet.pendingBet <= 0) {
        return withBet
      }
      return deal(withBet)
    })
  }, [])

  const onDeal = useCallback(() => {
    markSessionStarted()
    setSettingsOpen(false)
    playSound('deal')
    setState((current) => deal(current))
  }, [])

  const onTakeInsurance = useCallback(() => {
    playSound('chip')
    setState((current) => takeInsurance(current))
  }, [])

  const onDeclineInsurance = useCallback(() => {
    playSound('button')
    setState((current) => declineInsurance(current))
  }, [])

  const onHit = useCallback(() => {
    playSound('deal')
    setState((current) => hit(current))
  }, [])

  const onStand = useCallback(() => {
    playSound('button')
    setState((current) => stand(current))
  }, [])

  const onDoubleDown = useCallback(() => {
    playSound('chip')
    setState((current) => doubleDown(current))
  }, [])

  const onSplit = useCallback(() => {
    playSound('chip')
    setState((current) => split(current))
  }, [])

  const onNextRound = useCallback(() => {
    playSound('button')
    setState((current) => nextRound(current))
  }, [])

  const onRestart = useCallback(() => {
    localStorage.removeItem(STATS_KEY)
    localStorage.removeItem(SESSION_KEY)
    setSettingsOpen(true)
    setState(restartGame())
  }, [])

  const onResetStats = useCallback(() => {
    setState((current) => ({
      ...current,
      stats: {
        handsPlayed: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        blackjacks: 0,
        netProfit: current.bankroll - current.startingBankroll,
        bestBankroll: current.bankroll,
      },
    }))
    localStorage.removeItem(STATS_KEY)
  }, [])

  const onOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const onCloseSettings = useCallback(() => {
    if (hasSessionStarted()) {
      setSettingsOpen(false)
    }
  }, [])

  const onApplySettings = useCallback((settings: GameSettings) => {
    markSessionStarted()
    setSettingsOpen(false)
    setState((current) => applySettings(current, settings))
  }, [])

  const onStartNewGameWithSettings = useCallback((settings: GameSettings) => {
    markSessionStarted()
    setSettingsOpen(false)
    setState((current) => startNewGameWithSettings(current, settings))
  }, [])

  return {
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
  }
}
