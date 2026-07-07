import { drawCard, createShoeWithCut } from './shoe'
import {
  canSplitHand,
  handIsComplete,
  isBlackjack,
  isBust,
  isPairOfAces,
  isTwentyOne,
} from './hand'
import {
  calculateHandPayout,
  calculateInsurancePayout,
  dealerShouldHit,
  formatHandTotal,
  resolveHandOutcome,
} from './rules'
import { formatDealerOutcome } from './dealerDialogue'
import {
  canChangeSettingsInPlace,
  getStartingBankroll,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type GameSettings,
} from './settings'
import { breakdownAmountIntoChips } from '../utils/betChips'
import {
  MAX_BET,
  MAX_SPLITS,
  MIN_BET,
  MAX_SUSPICION,
  SUSPICION_BASE_GAIN,
  SUSPICION_BET_GAIN,
  SUSPICION_DECAY,
  DEALER_HOLE_CARD_INDEX,
  type AvailableActions,
  type Card,
  type GameState,
  type PlayerHand,
  type RoundResult,
  type SessionStats,
} from './types'

const CUT_CARD_MESSAGE = 'The cut card is out. The dealer will shuffle after this hand.'

function createEmptyStats(bankroll: number): SessionStats {
  return {
    handsPlayed: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
    netProfit: 0,
    bestBankroll: bankroll,
  }
}

export function createInitialState(settings: GameSettings = loadSettings()): GameState {
  const normalized = normalizeSettings(settings)
  const setup = createShoeWithCut(normalized.deckCount)
  const startingBankroll = getStartingBankroll(normalized.difficulty)

  return {
    phase: 'betting',
    settings: normalized,
    shoe: setup.shoe,
    totalShoeSize: setup.totalShoeSize,
    shuffleCutAt: setup.shuffleCutAt,
    cardsDealtThisShoe: 0,
    dealtCardsThisShoe: [],
    revealedCardsThisShoe: [],
    reshufflePending: false,
    startingBankroll,
    dealerHand: [],
    dealerHoleHidden: true,
    dealerHiddenIndices: [],
    dealerAnimatingIndex: -1,
    dealerAnimPhase: 'none',
    playerHands: [],
    activeHandIndex: 0,
    pendingBet: 0,
    pendingBetChips: [],
    lastBet: 0,
    insuranceBet: 0,
    insuranceTaken: false,
    bankroll: startingBankroll,
    stats: createEmptyStats(startingBankroll),
    message: 'Place your bet and deal.',
    lastRoundResults: [],
    suspicion: 0,
    insiderUsedThisHand: false,
    gameOverReason: 'bankrupt',
  }
}

function drawFromShoe(
  state: GameState,
  revealForCount = true,
): { state: GameState; card: GameState['shoe'][number] } {
  const draw = drawCard(state.shoe)
  const cardsDealtThisShoe = state.cardsDealtThisShoe + 1
  let reshufflePending = state.reshufflePending
  let message = state.message

  if (state.shuffleCutAt !== null && !reshufflePending && cardsDealtThisShoe >= state.shuffleCutAt) {
    reshufflePending = true
    message = CUT_CARD_MESSAGE
  }

  return {
    state: {
      ...state,
      shoe: draw.shoe,
      cardsDealtThisShoe,
      dealtCardsThisShoe: [...state.dealtCardsThisShoe, draw.card],
      revealedCardsThisShoe: revealForCount
        ? [...state.revealedCardsThisShoe, draw.card]
        : state.revealedCardsThisShoe,
      reshufflePending,
      message,
    },
    card: draw.card,
  }
}

function revealDealerCardForCount(state: GameState, cardIndex: number): GameState {
  const card = state.dealerHand[cardIndex]
  if (!card) {
    return state
  }

  return {
    ...state,
    revealedCardsThisShoe: [...state.revealedCardsThisShoe, card],
  }
}

function needsShoeReshuffle(state: GameState): boolean {
  return state.settings.deckCount === 1 || state.reshufflePending
}

function maybeReshuffleShoe(state: GameState): GameState {
  const singleDeck = state.settings.deckCount === 1
  if (!singleDeck && !state.reshufflePending) {
    return state
  }

  const setup = createShoeWithCut(state.settings.deckCount)
  return {
    ...state,
    shoe: setup.shoe,
    totalShoeSize: setup.totalShoeSize,
    shuffleCutAt: setup.shuffleCutAt,
    cardsDealtThisShoe: 0,
    dealtCardsThisShoe: [],
    revealedCardsThisShoe: [],
    reshufflePending: false,
    message: singleDeck ? 'Place your bet and deal.' : 'New shoe. Place your bet and deal.',
  }
}

export function applySettings(state: GameState, settings: GameSettings): GameState {
  if (!canChangeSettingsInPlace(state)) {
    return state
  }

  const normalized = normalizeSettings(settings)
  saveSettings(normalized)
  return createInitialState(normalized)
}

export function startNewGameWithSettings(_state: GameState, settings: GameSettings): GameState {
  const normalized = normalizeSettings(settings)
  saveSettings(normalized)
  return createInitialState(normalized)
}

function createPlayerHand(cards: PlayerHand['cards'], bet: number, splitFromAces = false): PlayerHand {
  return {
    cards,
    bet,
    doubled: false,
    splitFromAces,
    stood: false,
    busted: false,
    outcome: 'pending',
    payout: 0,
  }
}

function getActiveHand(state: GameState): PlayerHand | undefined {
  return state.playerHands[state.activeHandIndex]
}

function allPlayerHandsComplete(hands: PlayerHand[]): boolean {
  return hands.every(handIsComplete)
}

function findNextActiveHandIndex(hands: PlayerHand[], fromIndex: number): number {
  for (let i = fromIndex; i < hands.length; i += 1) {
    if (!handIsComplete(hands[i])) {
      return i
    }
  }
  return -1
}

function playerHasBlackjack(state: GameState): boolean {
  return state.playerHands.length === 1 && isBlackjack(state.playerHands[0].cards)
}

function dealerShowsAce(state: GameState): boolean {
  return state.dealerHand.length > 0 && state.dealerHand[0].rank === 'A'
}

function dealerPeeksForBlackjack(state: GameState): boolean {
  return isBlackjack(state.dealerHand) && dealerShowsAce(state)
}

function dealerBlackjackAfterInsuranceMessage(state: GameState): string {
  return playerHasBlackjack(state)
    ? 'Dealer has a blackjack. You got a push!'
    : 'Dealer has a blackjack. You lost!'
}

function isDealerBlackjackAfterInsurancePeek(state: GameState): boolean {
  return (
    dealerPeeksForBlackjack(state) &&
    state.playerHands.every((hand) => hand.cards.length === 2 && !hand.busted)
  )
}

function formatDealerBlackjackAfterInsuranceSummary(
  state: GameState,
  insurancePayout: number,
  insuranceBet: number,
): string {
  const parts = [dealerBlackjackAfterInsuranceMessage(state)]

  if (insuranceBet > 0) {
    parts.push(insurancePayout > 0 ? 'Insurance pays 2:1.' : 'Insurance lost.')
  }

  return parts.join(' ')
}

function maxAllowedBet(state: GameState): number {
  return Math.min(MAX_BET, state.bankroll)
}

function updateBestBankroll(stats: SessionStats, bankroll: number): SessionStats {
  return {
    ...stats,
    bestBankroll: Math.max(stats.bestBankroll, bankroll),
  }
}

function settleRound(state: GameState): GameState {
  const dealerHoleHidden = false
  let currentState = state
  let dealerHand = [...state.dealerHand]

  const allBusted = state.playerHands.every((hand) => hand.busted)
  const dealerHasNatural = isBlackjack(dealerHand)

  if (!allBusted && !dealerHasNatural) {
    while (dealerShouldHit(dealerHand)) {
      const draw = drawFromShoe(currentState)
      currentState = draw.state
      dealerHand = [...dealerHand, draw.card]
    }
  }

  let bankroll = currentState.bankroll
  let stats = { ...currentState.stats }
  const lastRoundResults: RoundResult[] = []

  const insurancePayout = calculateInsurancePayout(currentState.insuranceBet, dealerHand)
  bankroll += insurancePayout

  const updatedHands = currentState.playerHands.map((hand, index) => {
    const outcome = resolveHandOutcome(hand, dealerHand, dealerHoleHidden)
    const payout = calculateHandPayout(hand, dealerHand, dealerHoleHidden)
    bankroll += payout

    lastRoundResults.push({
      handIndex: index,
      outcome,
      payout,
      bet: hand.bet,
    })

    if (outcome === 'win' || outcome === 'blackjack') {
      stats.wins += 1
    } else if (outcome === 'lose' || outcome === 'bust') {
      stats.losses += 1
    } else if (outcome === 'push') {
      stats.pushes += 1
    }

    if (outcome === 'blackjack') {
      stats.blackjacks += 1
    }

    return {
      ...hand,
      outcome,
      payout,
    }
  })

  stats.handsPlayed += updatedHands.length
  stats.netProfit = bankroll - currentState.startingBankroll
  stats = updateBestBankroll(stats, bankroll)

  // Playing a full hand without leaning on the insider cools the pit boss down a bit.
  const suspicion = currentState.insiderUsedThisHand
    ? currentState.suspicion
    : Math.max(0, currentState.suspicion - SUSPICION_DECAY)

  const summary = isDealerBlackjackAfterInsurancePeek(state)
    ? formatDealerBlackjackAfterInsuranceSummary(state, insurancePayout, currentState.insuranceBet)
    : summarizeRound(lastRoundResults, dealerHand, insurancePayout, currentState.insuranceBet)

  if (bankroll <= 0) {
    return {
      ...currentState,
      phase: 'gameOver',
      gameOverReason: 'bankrupt',
      dealerHand,
      dealerHoleHidden,
      dealerHiddenIndices: [],
      dealerAnimatingIndex: -1,
      dealerAnimPhase: 'none',
      playerHands: updatedHands,
      bankroll: 0,
      stats,
      message: summary,
      lastRoundResults,
    }
  }

  return {
    ...currentState,
    phase: 'settling',
    dealerHand,
    dealerHoleHidden,
    dealerHiddenIndices: [],
    dealerAnimatingIndex: -1,
    dealerAnimPhase: 'none',
    playerHands: updatedHands,
    bankroll,
    stats,
    suspicion,
    message: summary,
    lastRoundResults,
  }
}

function summarizeRound(
  results: RoundResult[],
  dealerCards: Card[],
  insurancePayout: number,
  insuranceBet: number,
): string {
  const parts = [formatDealerOutcome(dealerCards, results)]

  if (insuranceBet > 0) {
    parts.push(insurancePayout > 0 ? 'Insurance pays 2:1.' : 'Insurance lost.')
  }

  return parts.join(' ')
}

function autoStandIfTwentyOne(hand: PlayerHand): PlayerHand {
  if (isTwentyOne(hand.cards) && !hand.busted) {
    return { ...hand, stood: true }
  }
  return hand
}

function applyAutoStandToHands(hands: PlayerHand[]): PlayerHand[] {
  return hands.map(autoStandIfTwentyOne)
}

function dealerHitCard(state: GameState): GameState {
  const draw = drawFromShoe(state, false)
  const newIndex = state.dealerHand.length

  return {
    ...draw.state,
    dealerHand: [...state.dealerHand, draw.card],
    dealerHiddenIndices: [...state.dealerHiddenIndices, newIndex],
    dealerAnimatingIndex: newIndex,
    dealerAnimPhase: 'deal',
    message: draw.state.message === CUT_CARD_MESSAGE ? draw.state.message : 'Dealer hits...',
  }
}

function beginDealerTurn(state: GameState, message = 'Dealer reveals...'): GameState {
  const stoodHands = applyAutoStandToHands(state.playerHands)
  const shouldRevealHole = state.dealerHoleHidden && state.dealerHand.length > 1

  return {
    ...state,
    phase: 'dealerTurn',
    playerHands: stoodHands,
    dealerHiddenIndices: shouldRevealHole ? [DEALER_HOLE_CARD_INDEX] : [],
    dealerAnimatingIndex: shouldRevealHole ? DEALER_HOLE_CARD_INDEX : -1,
    dealerAnimPhase: shouldRevealHole ? 'flip' : 'none',
    message,
  }
}

export function advanceDealerTurn(state: GameState): GameState {
  if (state.phase !== 'dealerTurn') {
    return state
  }

  const { dealerAnimPhase, dealerAnimatingIndex } = state

  if (dealerAnimPhase === 'deal') {
    return {
      ...state,
      dealerAnimPhase: 'flip',
    }
  }

  if (dealerAnimPhase === 'flip') {
    const newHidden = state.dealerHiddenIndices.filter((index) => index !== dealerAnimatingIndex)
    const holeHidden =
      dealerAnimatingIndex === DEALER_HOLE_CARD_INDEX ? false : state.dealerHoleHidden

    const nextState: GameState = revealDealerCardForCount(
      {
        ...state,
        dealerHiddenIndices: newHidden,
        dealerHoleHidden: holeHidden,
        dealerAnimatingIndex: -1,
        dealerAnimPhase: 'none',
      },
      dealerAnimatingIndex,
    )

    const allBusted = nextState.playerHands.every((hand) => hand.busted)
    if (allBusted || isBlackjack(nextState.dealerHand)) {
      return settleRound({
        ...nextState,
        dealerHoleHidden: false,
        dealerHiddenIndices: [],
      })
    }

    if (dealerShouldHit(nextState.dealerHand)) {
      return dealerHitCard(nextState)
    }

    return settleRound({
      ...nextState,
      dealerHoleHidden: false,
      dealerHiddenIndices: [],
    })
  }

  if (dealerAnimPhase === 'none') {
    const allBusted = state.playerHands.every((hand) => hand.busted)
    if (allBusted || isBlackjack(state.dealerHand)) {
      return settleRound({
        ...state,
        dealerHoleHidden: false,
        dealerHiddenIndices: [],
      })
    }

    if (dealerShouldHit(state.dealerHand)) {
      return dealerHitCard(state)
    }

    return settleRound({
      ...state,
      dealerHoleHidden: false,
      dealerHiddenIndices: [],
    })
  }

  return state
}

function afterPlayerAction(state: GameState, updatedHands: PlayerHand[]): GameState {
  let nextState: GameState = {
    ...state,
    playerHands: updatedHands,
  }

  const activeHand = updatedHands[nextState.activeHandIndex]
  if (activeHand && isBust(activeHand.cards)) {
    updatedHands[nextState.activeHandIndex] = {
      ...activeHand,
      busted: true,
      outcome: 'bust',
    }
    nextState = { ...nextState, playerHands: updatedHands }
  }

  if (allPlayerHandsComplete(updatedHands)) {
    const reachedTwentyOne = updatedHands.some((hand) => isTwentyOne(hand.cards) && !hand.busted)
    return beginDealerTurn(
      nextState,
      reachedTwentyOne ? '21!' : 'Dealer reveals...',
    )
  }

  const nextIndex = findNextActiveHandIndex(updatedHands, nextState.activeHandIndex)
  if (nextIndex === -1) {
    return beginDealerTurn(nextState)
  }

  return {
    ...nextState,
    activeHandIndex: nextIndex,
    message: `Playing hand ${nextIndex + 1} of ${updatedHands.length}.`,
  }
}

function dealInitialCards(state: GameState): GameState {
  if (state.pendingBet < MIN_BET || state.pendingBet > maxAllowedBet(state)) {
    return { ...state, message: `Bet must be between ${MIN_BET} and ${maxAllowedBet(state)}.` }
  }

  if (state.pendingBet > state.bankroll) {
    return { ...state, message: 'Insufficient bankroll for that bet.' }
  }

  let currentState = state
  const draw1 = drawFromShoe(currentState)
  currentState = draw1.state
  const draw2 = drawFromShoe(currentState)
  currentState = draw2.state
  const draw3 = drawFromShoe(currentState)
  currentState = draw3.state
  const draw4 = drawFromShoe(currentState, false)
  currentState = draw4.state

  const playerCards = [draw1.card, draw3.card]
  const dealerCards = [draw2.card, draw4.card]

  const bet = state.pendingBet
  const bankroll = currentState.bankroll - bet

  const playerHand = createPlayerHand(playerCards, bet)
  const playerHands = [playerHand]

  let nextState: GameState = {
    ...currentState,
    dealerHand: dealerCards,
    dealerHoleHidden: true,
    playerHands,
    activeHandIndex: 0,
    pendingBet: 0,
    pendingBetChips: [],
    lastBet: bet,
    insuranceBet: 0,
    insuranceTaken: false,
    insiderUsedThisHand: false,
    bankroll,
    lastRoundResults: [],
    message: currentState.message === CUT_CARD_MESSAGE ? currentState.message : 'Your turn.',
  }

  if (dealerShowsAce(nextState) && !playerHasBlackjack(nextState)) {
    return {
      ...nextState,
      phase: 'insurance',
      message: 'Insurance? Dealer shows an Ace.',
    }
  }

  if (playerHasBlackjack(nextState)) {
    return beginDealerTurn(nextState, 'Checking for blackjack...')
  }

  // Ten-value upcard + hole-card blackjack: dealer peeks but lets players act first.
  const stoodHands = applyAutoStandToHands(playerHands)
  if (stoodHands.every(handIsComplete)) {
    return beginDealerTurn(
      { ...nextState, playerHands: stoodHands },
      stoodHands[0] && isTwentyOne(stoodHands[0].cards) ? '21!' : 'Dealer reveals...',
    )
  }

  return {
    ...nextState,
    playerHands: stoodHands,
    phase: 'playerTurn',
  }
}

export function addChip(state: GameState, amount: number): GameState {
  if (state.phase !== 'betting') {
    return state
  }

  const nextBet = state.pendingBet + amount
  if (nextBet > maxAllowedBet(state)) {
    return { ...state, message: `Maximum bet is ${maxAllowedBet(state)}.` }
  }

  return {
    ...state,
    pendingBet: nextBet,
    pendingBetChips: breakdownAmountIntoChips(nextBet),
    message: `Bet: $${nextBet}`,
  }
}

export function clearBet(state: GameState): GameState {
  if (state.phase !== 'betting') {
    return state
  }

  return {
    ...state,
    pendingBet: 0,
    pendingBetChips: [],
    message: 'Bet cleared.',
  }
}

function currentInsiderBet(state: GameState): number {
  if (state.phase === 'playerTurn') {
    return getActiveHand(state)?.bet ?? 0
  }
  if (state.phase === 'insurance') {
    return state.playerHands[0]?.bet ?? 0
  }
  return 0
}

export function suspicionGainForBet(bet: number): number {
  const scaled = SUSPICION_BASE_GAIN + SUSPICION_BET_GAIN * (bet / MAX_BET)
  return Math.round(scaled)
}

// Insider help is verbal — the dealer tells you the hole card's rank but you
// haven't seen it dealt. It does not enter the shoe tracker or Hi-Lo count.
export function registerInsiderUse(state: GameState): GameState {
  if (state.phase !== 'playerTurn' && state.phase !== 'insurance') {
    return state
  }

  const gain = suspicionGainForBet(currentInsiderBet(state))
  const suspicion = Math.min(MAX_SUSPICION, state.suspicion + gain)

  if (suspicion >= MAX_SUSPICION) {
    return {
      ...state,
      phase: 'gameOver',
      gameOverReason: 'caught',
      suspicion: MAX_SUSPICION,
      insiderUsedThisHand: true,
      bankroll: 0,
      dealerHoleHidden: false,
      dealerHiddenIndices: [],
      stats: {
        ...state.stats,
        netProfit: -state.startingBankroll,
        bestBankroll: state.stats.bestBankroll,
      },
      message: 'Caught cheating with the insider dealer.',
    }
  }

  return { ...state, suspicion, insiderUsedThisHand: true }
}

export function repeatBet(state: GameState): GameState {
  if (state.phase !== 'betting' || state.lastBet <= 0) {
    return state
  }

  const desiredBet = Math.min(state.lastBet, maxAllowedBet(state))

  if (desiredBet < MIN_BET || desiredBet > state.bankroll) {
    return { ...state, message: 'Not enough bankroll to repeat that bet.' }
  }

  return {
    ...state,
    pendingBet: desiredBet,
    pendingBetChips: breakdownAmountIntoChips(desiredBet),
    message: `Bet: $${desiredBet}`,
  }
}

export function betAll(state: GameState): GameState {
  if (state.phase !== 'betting' || state.bankroll <= 0) {
    return state
  }

  const pendingBetChips = breakdownAmountIntoChips(state.bankroll)

  return {
    ...state,
    pendingBet: state.bankroll,
    pendingBetChips,
    message: `Bet: $${state.bankroll}`,
  }
}

export function deal(state: GameState): GameState {
  if (state.phase !== 'betting') {
    return state
  }

  return dealInitialCards(state)
}

export function takeInsurance(state: GameState): GameState {
  if (state.phase !== 'insurance') {
    return state
  }

  const maxInsurance = Math.floor(state.playerHands[0].bet / 2)
  const insuranceBet = Math.min(maxInsurance, state.bankroll)

  if (insuranceBet <= 0) {
    return declineInsurance(state)
  }

  return finishInsurancePhase({
    ...state,
    insuranceBet,
    insuranceTaken: true,
    bankroll: state.bankroll - insuranceBet,
  }, `Insurance bet: $${insuranceBet}. Your turn.`)
}

export function declineInsurance(state: GameState): GameState {
  if (state.phase !== 'insurance') {
    return state
  }

  return finishInsurancePhase(
    {
      ...state,
      insuranceBet: 0,
      insuranceTaken: false,
    },
    "Dealer doesn't have a Blackjack. Make your call!",
  )
}

function finishInsurancePhase(state: GameState, continueMessage: string): GameState {
  if (dealerPeeksForBlackjack(state)) {
    return beginDealerTurn(state, dealerBlackjackAfterInsuranceMessage(state))
  }

  const nextState: GameState = {
    ...state,
    phase: 'playerTurn',
    message: continueMessage,
  }

  if (playerHasBlackjack(nextState)) {
    return beginDealerTurn(nextState, 'Blackjack!')
  }

  const stoodHands = applyAutoStandToHands(nextState.playerHands)
  if (stoodHands.every(handIsComplete)) {
    return beginDealerTurn({ ...nextState, playerHands: stoodHands }, '21!')
  }

  return { ...nextState, playerHands: stoodHands }
}

export function hit(state: GameState): GameState {
  if (state.phase !== 'playerTurn') {
    return state
  }

  const activeHand = getActiveHand(state)
  if (!activeHand || handIsComplete(activeHand)) {
    return state
  }

  const draw = drawFromShoe(state)
  const updatedHand: PlayerHand = {
    ...activeHand,
    cards: [...activeHand.cards, draw.card],
  }

  const updatedHands = [...state.playerHands]
  updatedHands[state.activeHandIndex] = updatedHand

  if (isBust(updatedHand.cards)) {
    updatedHands[state.activeHandIndex] = {
      ...updatedHand,
      busted: true,
      outcome: 'bust',
    }
  }

  if (activeHand.splitFromAces) {
    updatedHands[state.activeHandIndex] = {
      ...updatedHands[state.activeHandIndex],
      stood: true,
    }
  }

  updatedHands[state.activeHandIndex] = autoStandIfTwentyOne(updatedHands[state.activeHandIndex])

  const message =
    draw.state.message === CUT_CARD_MESSAGE
      ? draw.state.message
      : isTwentyOne(updatedHands[state.activeHandIndex].cards)
        ? '21!'
        : state.message

  return afterPlayerAction(
    {
      ...draw.state,
      message,
    },
    updatedHands,
  )
}

export function stand(state: GameState): GameState {
  if (state.phase !== 'playerTurn') {
    return state
  }

  const activeHand = getActiveHand(state)
  if (!activeHand || handIsComplete(activeHand)) {
    return state
  }

  const updatedHands = [...state.playerHands]
  updatedHands[state.activeHandIndex] = {
    ...activeHand,
    stood: true,
  }

  return afterPlayerAction(state, updatedHands)
}

export function doubleDown(state: GameState): GameState {
  if (state.phase !== 'playerTurn') {
    return state
  }

  const activeHand = getActiveHand(state)
  if (!activeHand || activeHand.cards.length !== 2 || activeHand.doubled) {
    return state
  }

  if (activeHand.bet > state.bankroll) {
    return { ...state, message: 'Not enough bankroll to double down.' }
  }

  const draw = drawFromShoe(state)
  const updatedHand: PlayerHand = {
    ...activeHand,
    bet: activeHand.bet * 2,
    doubled: true,
    stood: true,
    cards: [...activeHand.cards, draw.card],
    busted: isBust([...activeHand.cards, draw.card]),
    outcome: isBust([...activeHand.cards, draw.card]) ? 'bust' : 'pending',
  }

  const updatedHands = [...state.playerHands]
  updatedHands[state.activeHandIndex] = updatedHand

  return afterPlayerAction(
    {
      ...draw.state,
      bankroll: state.bankroll - activeHand.bet,
    },
    updatedHands,
  )
}

export function split(state: GameState): GameState {
  if (state.phase !== 'playerTurn') {
    return state
  }

  const activeHand = getActiveHand(state)
  if (!activeHand || !canSplitHand(activeHand, state.playerHands.length, MAX_SPLITS)) {
    return state
  }

  if (activeHand.bet > state.bankroll) {
    return { ...state, message: 'Not enough bankroll to split.' }
  }

  const splittingAces = isPairOfAces(activeHand)
  const draw1 = drawFromShoe(state)
  const draw2 = drawFromShoe(draw1.state)

  const handA = autoStandIfTwentyOne(
    createPlayerHand([activeHand.cards[0], draw1.card], activeHand.bet, splittingAces),
  )
  const handB = autoStandIfTwentyOne(
    createPlayerHand([activeHand.cards[1], draw2.card], activeHand.bet, splittingAces),
  )

  if (splittingAces) {
    handA.stood = true
    handB.stood = true
  }

  const updatedHands = [...state.playerHands]
  updatedHands[state.activeHandIndex] = handA
  updatedHands.splice(state.activeHandIndex + 1, 0, handB)

  const nextState: GameState = {
    ...draw2.state,
    playerHands: updatedHands,
    bankroll: state.bankroll - activeHand.bet,
    message: `Split! Playing hand ${state.activeHandIndex + 1}.`,
  }

  if (splittingAces || updatedHands.every(handIsComplete)) {
    return afterPlayerAction(nextState, updatedHands)
  }

  const message =
    isTwentyOne(handA.cards) || isTwentyOne(handB.cards)
      ? '21!'
      : `Split! Playing hand ${state.activeHandIndex + 1}.`

  return { ...nextState, message }
}

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'settling') {
    return state
  }

  const cleared: GameState = {
    ...state,
    phase: needsShoeReshuffle(state) ? 'shuffling' : 'betting',
    dealerHand: [],
    dealerHoleHidden: true,
    dealerHiddenIndices: [],
    dealerAnimatingIndex: -1,
    dealerAnimPhase: 'none',
    playerHands: [],
    activeHandIndex: 0,
    pendingBet: 0,
    pendingBetChips: [],
    insuranceBet: 0,
    insuranceTaken: false,
    lastRoundResults: [],
    message: needsShoeReshuffle(state) ? 'Shuffling cards...' : 'Place your bet and deal.',
  }

  if (cleared.phase === 'shuffling') {
    return cleared
  }

  return cleared
}

export function completeShuffle(state: GameState): GameState {
  if (state.phase !== 'shuffling') {
    return state
  }

  const cleared: GameState = {
    ...state,
    phase: 'betting',
    message: 'Place your bet and deal.',
  }

  return maybeReshuffleShoe(cleared)
}

export function restartGame(settings?: GameSettings): GameState {
  return createInitialState(settings ?? loadSettings())
}

export function getAvailableActions(state: GameState): AvailableActions {
  const activeHand = getActiveHand(state)
  const canDouble =
    !!activeHand &&
    activeHand.cards.length === 2 &&
    !activeHand.doubled &&
    !activeHand.splitFromAces &&
    activeHand.bet <= state.bankroll

  const canSplit =
    !!activeHand &&
    canSplitHand(activeHand, state.playerHands.length, MAX_SPLITS) &&
    activeHand.bet <= state.bankroll

  return {
    addChip: state.phase === 'betting',
    clearBet: state.phase === 'betting' && state.pendingBet > 0,
    repeatBet:
      (state.phase === 'betting' || state.phase === 'settling') &&
      state.pendingBet === 0 &&
      state.lastBet > 0 &&
      Math.min(state.lastBet, maxAllowedBet(state)) >= MIN_BET &&
      Math.min(state.lastBet, maxAllowedBet(state)) <= state.bankroll,
    deal: state.phase === 'betting' && state.pendingBet >= MIN_BET && state.pendingBet <= maxAllowedBet(state),
    takeInsurance: state.phase === 'insurance' && state.bankroll > 0,
    declineInsurance: state.phase === 'insurance',
    hit:
      state.phase === 'playerTurn' &&
      !!activeHand &&
      !handIsComplete(activeHand) &&
      !isTwentyOne(activeHand.cards) &&
      !(activeHand.splitFromAces && activeHand.cards.length >= 2),
    stand:
      state.phase === 'playerTurn' &&
      !!activeHand &&
      !handIsComplete(activeHand) &&
      !isTwentyOne(activeHand.cards),
    doubleDown:
      state.phase === 'playerTurn' && canDouble && !isTwentyOne(activeHand?.cards ?? []),
    split:
      state.phase === 'playerTurn' && canSplit && !isTwentyOne(activeHand?.cards ?? []),
    nextRound: state.phase === 'settling',
    restart: state.phase === 'gameOver',
  }
}

export function getVisibleDealerTotal(state: GameState): string {
  const hiddenIndices =
    state.phase === 'dealerTurn'
      ? state.dealerHiddenIndices
      : state.dealerHoleHidden
        ? [DEALER_HOLE_CARD_INDEX]
        : []

  return formatHandTotal(state.dealerHand, hiddenIndices)
}

export function canOpenSettings(_state: GameState): boolean {
  return true
}

export { canChangeSettingsInPlace } from './settings'
