import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SESSION_TIME_MAX,
  SESSION_TIME_MIN,
  SPAWN_TIME_MAX,
  SPAWN_TIME_MIN,
  type PlayerOptions,
} from '../config/gameConfig'
import { Button } from '../components/Button'
import { ScreenShell } from '../components/ScreenShell'
import { loadPlayerOptions, savePlayerOptions } from '../storage/optionsStorage'

type FormErrors = {
  sessionTimeSeconds?: string
  enemySpawnTimeSeconds?: string
}

function validateOptions(options: PlayerOptions): FormErrors {
  const errors: FormErrors = {}

  if (
    !Number.isFinite(options.sessionTimeSeconds) ||
    options.sessionTimeSeconds < SESSION_TIME_MIN ||
    options.sessionTimeSeconds > SESSION_TIME_MAX
  ) {
    errors.sessionTimeSeconds = `Session time must be between ${SESSION_TIME_MIN} and ${SESSION_TIME_MAX} seconds.`
  }

  if (
    !Number.isFinite(options.enemySpawnTimeSeconds) ||
    options.enemySpawnTimeSeconds < SPAWN_TIME_MIN ||
    options.enemySpawnTimeSeconds > SPAWN_TIME_MAX
  ) {
    errors.enemySpawnTimeSeconds = `Enemy spawn time must be between ${SPAWN_TIME_MIN} and ${SPAWN_TIME_MAX} seconds.`
  }

  return errors
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const [options, setOptions] = useState<PlayerOptions>(loadPlayerOptions)
  const [errors, setErrors] = useState<FormErrors>({})
  const [savedMessage, setSavedMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateOptions(options)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSavedMessage('')
      return
    }

    savePlayerOptions(options)
    setSavedMessage('Options saved. New matches will use these values.')
  }

  return (
    <ScreenShell title="Options">
      <section className="panel options-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Options</h1>
            <p className="muted">
              These values are saved in this browser and applied when a new match
              starts.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="session-time">Game session time (seconds)</label>
            <input
              id="session-time"
              data-testid="session-time"
              name="sessionTimeSeconds"
              type="number"
              min={SESSION_TIME_MIN}
              max={SESSION_TIME_MAX}
              value={options.sessionTimeSeconds}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  sessionTimeSeconds: Number(event.target.value),
                }))
              }
              aria-invalid={Boolean(errors.sessionTimeSeconds)}
              aria-describedby="session-time-help session-time-error"
            />
            <p id="session-time-help" className="field-help">
              Allowed range: {SESSION_TIME_MIN} to {SESSION_TIME_MAX}.
            </p>
            {errors.sessionTimeSeconds ? (
              <p id="session-time-error" className="field-error" role="alert">
                {errors.sessionTimeSeconds}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="spawn-time">Enemy spawn time (seconds)</label>
            <input
              id="spawn-time"
              data-testid="spawn-time"
              name="enemySpawnTimeSeconds"
              type="number"
              min={SPAWN_TIME_MIN}
              max={SPAWN_TIME_MAX}
              step="0.5"
              value={options.enemySpawnTimeSeconds}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  enemySpawnTimeSeconds: Number(event.target.value),
                }))
              }
              aria-invalid={Boolean(errors.enemySpawnTimeSeconds)}
              aria-describedby="spawn-time-help spawn-time-error"
            />
            <p id="spawn-time-help" className="field-help">
              Allowed range: {SPAWN_TIME_MIN} to {SPAWN_TIME_MAX}. Must be
              positive.
            </p>
            {errors.enemySpawnTimeSeconds ? (
              <p id="spawn-time-error" className="field-error" role="alert">
                {errors.enemySpawnTimeSeconds}
              </p>
            ) : null}
          </div>

          <div className="btn-row">
            <Button data-testid="save-options" type="submit">
              Save options
            </Button>
            <Button
              data-testid="options-main-menu"
              variant="secondary"
              type="button"
              onClick={() => navigate('/')}
            >
              Main menu
            </Button>
          </div>

          {savedMessage ? (
            <p className="status-box" role="status" style={{ marginTop: '1rem' }}>
              {savedMessage}
            </p>
          ) : null}
        </form>
      </section>
    </ScreenShell>
  )
}
