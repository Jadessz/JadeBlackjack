import type { GameSettings } from './settings'

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]

export interface Card {
  rank: Rank
  suit: Suit
}

export type GamePhase =
  | 'betting'
  | 'insurance'
  | 'playerTurn'
  | 'dealerTurn'
  | 'settling'
  | 'shuffling'
  | 'gameOver'

export type HandOutcome = 'win' | 'lose' | 'push' | 'blackjack' | 'bust' | 'pending'

export interface PlayerHand {
  cards: Card[]
  bet: number
  doubled: boolean
  splitFromAces: boolean
  stood: boolean
  busted: boolean
  outcome: HandOutcome
  payout: number
}

export interface RoundResult {
  handIndex: number
  outcome: HandOutcome
  payout: number
  bet: number
}

export interface SessionStats {
  handsPlayed: number
  wins: number
  losses: number
  pushes: number
  blackjacks: number
  netProfit: number
  bestBankroll: number
}

export interface GameState {
  phase: GamePhase
  settings: GameSettings
  shoe: Card[]
  totalShoeSize: number
  shuffleCutAt: number | null
  cardsDealtThisShoe: number
  dealtCardsThisShoe: Card[]
  revealedCardsThisShoe: Card[]
  reshufflePending: boolean
  startingBankroll: number
  dealerHand: Card[]
  dealerHoleHidden: boolean
  dealerHiddenIndices: number[]
  dealerAnimatingIndex: number
  dealerAnimPhase: 'none' | 'deal' | 'flip'
  playerHands: PlayerHand[]
  activeHandIndex: number
  pendingBet: number
  pendingBetChips: number[]
  lastBet: number
  insuranceBet: number
  insuranceTaken: boolean
  bankroll: number
  stats: SessionStats
  message: string
  lastRoundResults: RoundResult[]
  suspicion: number
  insiderUsedThisHand: boolean
  gameOverReason: GameOverReason
}

export type GameOverReason = 'bankrupt' | 'caught'

export const MIN_BET = 5
export const MAX_BET = 500
export const MAX_SUSPICION = 100
// Suspicion gained per insider request. A flat base plus a bet-scaled amount so
// that leaning on the insider for big bets fills the meter far faster.
export const SUSPICION_BASE_GAIN = 5
export const SUSPICION_BET_GAIN = 30
// Suspicion recovered when a full hand is played without asking the insider.
export const SUSPICION_DECAY = 4
export const CHIP_DENOMINATIONS = [1, 5, 25, 100, 500] as const
export const MAX_SPLITS = 3
export const DEALER_HOLE_CARD_INDEX = 1
export const DEALER_CARD_DEAL_MS = 400
export const DEALER_REVEAL_MS = 650
export const SHUFFLE_MS = 4200

export type GameAction =
  | 'addChip'
  | 'clearBet'
  | 'repeatBet'
  | 'deal'
  | 'takeInsurance'
  | 'declineInsurance'
  | 'hit'
  | 'stand'
  | 'doubleDown'
  | 'split'
  | 'nextRound'
  | 'restart'

export interface AvailableActions {
  addChip: boolean
  clearBet: boolean
  repeatBet: boolean
  deal: boolean
  takeInsurance: boolean
  declineInsurance: boolean
  hit: boolean
  stand: boolean
  doubleDown: boolean
  split: boolean
  nextRound: boolean
  restart: boolean
}
