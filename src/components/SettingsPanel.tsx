import { useEffect, useState } from 'react'
import type { DeckCount, Difficulty, GameSettings } from '../game/settings'
import { normalizeSettings } from '../game/settings'

interface SettingsPanelProps {
  open: boolean
  settings: GameSettings
  canApply: boolean
  onApply: (settings: GameSettings) => void
  onStartNewGame: (settings: GameSettings) => void
  onClose: () => void
}

const DECK_OPTIONS: DeckCount[] = [1, 5, 6, 8]
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; bankroll: string }[] = [
  { value: 'easy', label: 'Easy', bankroll: '$2,000' },
  { value: 'medium', label: 'Medium', bankroll: '$1,000' },
  { value: 'hard', label: 'Hard', bankroll: '$500' },
]

export function SettingsPanel({
  open,
  settings,
  canApply,
  onApply,
  onStartNewGame,
  onClose,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<GameSettings>(settings)
  const [configuringNewGame, setConfiguringNewGame] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(settings)
      setConfiguringNewGame(false)
    }
  }, [open, settings])

  if (!open) {
    return null
  }

  const hardMode = draft.difficulty === 'hard'
  const settingsLocked = !canApply && !configuringNewGame

  function updateDraft(partial: Partial<GameSettings>) {
    if (settingsLocked) {
      return
    }
    setDraft((current) => normalizeSettings({ ...current, ...partial }))
  }

  function handleClose() {
    setConfiguringNewGame(false)
    onClose()
  }

  const intro = configuringNewGame
    ? 'Choose the settings you want for your new game.'
    : 'Choose your deck, difficulty, and optional modes.'

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <header className="settings-panel__header">
          <h2>{configuringNewGame ? 'New Game' : 'Table Settings'}</h2>
          <p className="settings-panel__intro">{intro}</p>
        </header>

        <div className="settings-panel__body">
          <div className="settings-panel__column">
            <label className="settings-field">
              <span>Decks in shoe</span>
              <div className="settings-options">
                {DECK_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`settings-option${draft.deckCount === count ? ' settings-option--active' : ''}`}
                    disabled={settingsLocked}
                    onClick={() => updateDraft({ deckCount: count })}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </label>

            <label className="settings-field">
              <span>Difficulty</span>
              <div className="settings-options settings-options--difficulty">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-option settings-option--difficulty${
                      draft.difficulty === option.value ? ' settings-option--active' : ''
                    }`}
                    disabled={settingsLocked}
                    onClick={() => updateDraft({ difficulty: option.value })}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.bankroll}</span>
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="settings-panel__column settings-panel__column--modes">
            <span className="settings-field__label">Advantages</span>

            <label className={`settings-toggle${hardMode ? ' settings-toggle--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={draft.easy21Mode}
                disabled={settingsLocked || hardMode}
                onChange={(event) => updateDraft({ easy21Mode: event.target.checked })}
              />
              <span>
                <strong>Easy 21 Mode</strong>
                <small>
                  {hardMode
                    ? 'Not available on Hard difficulty.'
                    : 'See cards remaining and shuffle card position.'}
                </small>
              </span>
            </label>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={draft.teacherDealerMode}
                disabled={settingsLocked}
                onChange={(event) =>
                  updateDraft({
                    teacherDealerMode: event.target.checked,
                    insiderDealerMode: event.target.checked ? false : draft.insiderDealerMode,
                  })
                }
              />
              <span>
                <strong>Teacher Dealer</strong>
                <small>
                  Dealer coaches you with textbook basic-strategy plays. Best odds long term — not a
                  guarantee on any single hand.
                </small>
              </span>
            </label>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={draft.insiderDealerMode}
                disabled={settingsLocked}
                onChange={(event) =>
                  updateDraft({
                    insiderDealerMode: event.target.checked,
                    teacherDealerMode: event.target.checked ? false : draft.teacherDealerMode,
                  })
                }
              />
              <span>
                <strong>Insider Dealer</strong>
                <small>
                  Dealer leaks their hole card and the winning move. Each tip raises suspicion — faster
                  on bigger bets. Max it out and the casino seizes everything.
                </small>
              </span>
            </label>
          </div>
        </div>

        {settingsLocked && (
          <p className="settings-panel__note settings-panel__note--midgame">
            Start a new game to change settings.
          </p>
        )}

        {configuringNewGame && (
          <p className="settings-panel__note settings-panel__note--midgame">
            Your current hand will be abandoned.
          </p>
        )}

        <div className="settings-panel__actions">
          {configuringNewGame ? (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setConfiguringNewGame(false)}
            >
              Back
            </button>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={handleClose}>
              Cancel
            </button>
          )}
          {canApply ? (
            <button type="button" className="btn btn--primary" onClick={() => onApply(draft)}>
              Apply
            </button>
          ) : configuringNewGame ? (
            <button type="button" className="btn btn--primary" onClick={() => onStartNewGame(draft)}>
              Start game
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setConfiguringNewGame(true)}>
              Start a new game
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
