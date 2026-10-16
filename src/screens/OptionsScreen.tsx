import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  setGameMusicVolume,
  setMenuMusicVolume,
  setSfxVolume,
  startMenuAmbience,
} from '../audio/uiAudio'
import {
  MUSIC_VOLUME_MAX,
  MUSIC_VOLUME_MIN,
  SESSION_TIME_MAX,
  SESSION_TIME_MIN,
  SPAWN_TIME_MAX,
  SPAWN_TIME_MIN,
  type PlayerOptions,
} from '../config/gameConfig'
import { ScreenShell } from '../components/ScreenShell'
import { WoodBrand } from '../components/WoodBrand'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import { ZoomBackdrop } from '../components/ZoomBackdrop'
import { resetMockData } from '../mocks/data'
import {
  NETWORK_SCENARIOS,
  loadNetworkScenario,
  saveNetworkScenario,
  type NetworkScenario,
} from '../mocks/networkScenario'
import { loadPlayerOptions, savePlayerOptions } from '../storage/optionsStorage'

type FormErrors = {
  sessionTimeSeconds?: string
  enemySpawnTimeSeconds?: string
}

function validatePartial(options: PlayerOptions): FormErrors {
  const errors: FormErrors = {}

  if (
    !Number.isFinite(options.sessionTimeSeconds) ||
    options.sessionTimeSeconds < SESSION_TIME_MIN ||
    options.sessionTimeSeconds > SESSION_TIME_MAX
  ) {
    errors.sessionTimeSeconds = `Entre ${SESSION_TIME_MIN} e ${SESSION_TIME_MAX}s.`
  }

  if (
    !Number.isFinite(options.enemySpawnTimeSeconds) ||
    options.enemySpawnTimeSeconds < SPAWN_TIME_MIN ||
    options.enemySpawnTimeSeconds > SPAWN_TIME_MAX
  ) {
    errors.enemySpawnTimeSeconds = `Entre ${SPAWN_TIME_MIN} e ${SPAWN_TIME_MAX}s.`
  }

  return errors
}

function VolumeSlider({
  id,
  label,
  value,
  testId,
  onChange,
}: {
  id: string
  label: string
  value: number
  testId: string
  onChange: (value: number) => void
}) {
  const percent = Math.round(value * 100)
  return (
    <div className="settings-slider">
      <div className="settings-slider__head">
        <label htmlFor={id}>{label}</label>
        <span>{percent}%</span>
      </div>
      <div className="settings-slider__track-wrap">
        <div
          className="settings-slider__fill"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
        <input
          id={id}
          data-testid={testId}
          className="settings-slider__input"
          type="range"
          min={MUSIC_VOLUME_MIN}
          max={MUSIC_VOLUME_MAX}
          step={0.01}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  )
}

export function OptionsScreen() {
  const navigate = useNavigate()
  const [options, setOptions] = useState<PlayerOptions>(loadPlayerOptions)
  const [scenario, setScenario] = useState<NetworkScenario>(loadNetworkScenario)
  const [errors, setErrors] = useState<FormErrors>({})
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    startMenuAmbience()
    setMenuMusicVolume(options.musicVolume)
    setGameMusicVolume(options.gameMusicVolume)
    setSfxVolume(options.sfxVolume)
  }, [options.musicVolume, options.gameMusicVolume, options.sfxVolume])

  useEffect(() => {
    const nextErrors = validatePartial(options)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      savePlayerOptions(options)
      setMenuMusicVolume(options.musicVolume)
      setGameMusicVolume(options.gameMusicVolume)
      setSfxVolume(options.sfxVolume)
    }, 120)

    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [options])

  function patch(partial: Partial<PlayerOptions>) {
    setOptions((current) => ({ ...current, ...partial }))
  }

  return (
    <ScreenShell title="Opções" variant="game">
      <div className="wood-stage wood-stage--options">
        <ZoomBackdrop />

        <div className="wood-stage__content wood-stage__content--options">
          <WoodPanel className="wood-panel--options wood-panel--settings">
            <p className="settings-kicker">Menu</p>
            <h1 className="settings-title">Opções</h1>

            <div className="settings-body wood-form">
              <VolumeSlider
                id="menu-music-volume"
                label="Música do menu"
                testId="music-volume"
                value={options.musicVolume}
                onChange={(musicVolume) => {
                  setMenuMusicVolume(musicVolume)
                  patch({ musicVolume })
                }}
              />

              <VolumeSlider
                id="game-music-volume"
                label="Música do jogo"
                testId="game-music-volume"
                value={options.gameMusicVolume}
                onChange={(gameMusicVolume) => {
                  setGameMusicVolume(gameMusicVolume)
                  patch({ gameMusicVolume })
                }}
              />

              <VolumeSlider
                id="sfx-volume"
                label="Som dos efeitos"
                testId="sfx-volume"
                value={options.sfxVolume}
                onChange={(sfxVolume) => {
                  setSfxVolume(sfxVolume)
                  patch({ sfxVolume })
                }}
              />

              <div className="field">
                <label htmlFor="session-time">Tempo da sessão (s)</label>
                <input
                  id="session-time"
                  data-testid="session-time"
                  type="number"
                  min={SESSION_TIME_MIN}
                  max={SESSION_TIME_MAX}
                  value={options.sessionTimeSeconds}
                  onChange={(event) =>
                    patch({ sessionTimeSeconds: Number(event.target.value) })
                  }
                />
                {errors.sessionTimeSeconds ? (
                  <p className="field-error" role="alert">
                    {errors.sessionTimeSeconds}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="spawn-time">Spawn de inimigos (s)</label>
                <input
                  id="spawn-time"
                  data-testid="spawn-time"
                  type="number"
                  min={SPAWN_TIME_MIN}
                  max={SPAWN_TIME_MAX}
                  step="0.5"
                  value={options.enemySpawnTimeSeconds}
                  onChange={(event) =>
                    patch({
                      enemySpawnTimeSeconds: Number(event.target.value),
                    })
                  }
                />
                {errors.enemySpawnTimeSeconds ? (
                  <p className="field-error" role="alert">
                    {errors.enemySpawnTimeSeconds}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="network-scenario">Cenário de rede (MSW)</label>
                <select
                  id="network-scenario"
                  data-testid="network-scenario"
                  value={scenario}
                  onChange={(event) => {
                    const next = event.target.value as NetworkScenario
                    setScenario(next)
                    saveNetworkScenario(next)
                  }}
                >
                  {NETWORK_SCENARIOS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="settings-reset"
                data-testid="reset-mock"
                onClick={() => {
                  resetMockData()
                  window.location.reload()
                }}
              >
                Resetar dados mock
              </button>

              <p className="settings-hint" role="status">
                Alterações salvas automaticamente
              </p>
            </div>

            <div className="wood-actions wood-actions--options">
              <WoodButton
                data-testid="options-main-menu"
                type="button"
                onClick={() => navigate('/')}
              >
                Menu
              </WoodButton>
            </div>
          </WoodPanel>
        </div>

        <WoodBrand />
      </div>
    </ScreenShell>
  )
}
