import { useEffect, useRef, useState } from 'react'
import type { GameConfig } from '../config/gameConfig'
import { loadGameTextures } from './assets'
import { createGameAudio } from './audio'
import { createInputController, setVirtualKey } from './input'
import { createSeededRandom, setRandomSource } from './random'
import { createGameRenderer } from './renderer'
import {
  createSimulation,
  getSnapshot,
  setPaused,
  updateSimulation,
} from './simulation'
import { createSoundTracker, playStateSounds } from './soundBridge'
import { isE2EMode, type PirateBattleTestApi } from './testApi'
import type { MatchSnapshot } from './types'

type GameCanvasProps = {
  config: GameConfig
  onSnapshot: (snapshot: MatchSnapshot) => void
  onMatchEnd: (snapshot: MatchSnapshot) => void
  externalPaused: boolean
  onRequestResume: () => void
}

function bindTouchButton(button: HTMLButtonElement) {
  const code = button.dataset.key
  if (!code) return () => {}

  const press = (event: Event) => {
    event.preventDefault()
    setVirtualKey(code, true)
  }
  const release = (event: Event) => {
    event.preventDefault()
    setVirtualKey(code, false)
  }

  button.addEventListener('pointerdown', press)
  button.addEventListener('pointerup', release)
  button.addEventListener('pointerleave', release)
  button.addEventListener('pointercancel', release)

  return () => {
    button.removeEventListener('pointerdown', press)
    button.removeEventListener('pointerup', release)
    button.removeEventListener('pointerleave', release)
    button.removeEventListener('pointercancel', release)
    setVirtualKey(code, false)
  }
}

export function GameCanvas({
  config,
  onSnapshot,
  onMatchEnd,
  externalPaused,
  onRequestResume,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const touchRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const onSnapshotRef = useRef(onSnapshot)
  const onMatchEndRef = useRef(onMatchEnd)
  const externalPausedRef = useRef(externalPaused)

  useEffect(() => {
    onSnapshotRef.current = onSnapshot
  }, [onSnapshot])

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd
  }, [onMatchEnd])

  useEffect(() => {
    externalPausedRef.current = externalPaused
  }, [externalPaused])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let renderer: Awaited<ReturnType<typeof createGameRenderer>> | null = null
    const input = createInputController()
    const audio = createGameAudio()
    const state = createSimulation(config)
    const soundTracker = createSoundTracker(state)
    let lastSnapshot = getSnapshot(state)
    let endedNotified = false
    let wasExternallyPaused = externalPausedRef.current
    let startSoundPlayed = false

    const unlockAudio = () => audio.unlock()
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    onSnapshotRef.current(lastSnapshot)

    const touchCleanups: Array<() => void> = []
    if (touchRef.current) {
      const buttons = touchRef.current.querySelectorAll('button[data-key]')
      buttons.forEach((button) => {
        touchCleanups.push(bindTouchButton(button as HTMLButtonElement))
      })
    }

    async function start() {
      try {
        setLoading(true)
        setLoadError('')

        const textures = await loadGameTextures((progress) => {
          if (!disposed) setLoadProgress(progress)
        })

        if (disposed) return

        if (!hostRef.current) return
        renderer = await createGameRenderer(hostRef.current, textures)
        if (disposed) {
          renderer.destroy()
          return
        }

        input.attach()

        const resize = () => {
          if (!host || !renderer) return
          const bounds = host.getBoundingClientRect()
          renderer.resize(
            Math.max(320, bounds.width),
            Math.max(220, bounds.height),
          )
        }

        resize()
        window.addEventListener('resize', resize)

        const onVisibility = () => {
          if (document.hidden) {
            setPaused(state, true)
            onSnapshotRef.current(getSnapshot(state))
          }
        }

        const onBlur = () => {
          setPaused(state, true)
          input.clearHeldKeys()
          onSnapshotRef.current(getSnapshot(state))
        }

        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('blur', onBlur)

        const publishSnapshot = () => {
          const snapshot = getSnapshot(state)
          const changed =
            snapshot.timeLeft !== lastSnapshot.timeLeft ||
            snapshot.score !== lastSnapshot.score ||
            snapshot.playerHealth !== lastSnapshot.playerHealth ||
            snapshot.paused !== lastSnapshot.paused ||
            snapshot.ended !== lastSnapshot.ended

          if (changed) {
            lastSnapshot = snapshot
            onSnapshotRef.current(snapshot)
          }

          if (snapshot.ended && !endedNotified) {
            endedNotified = true
            onMatchEndRef.current(snapshot)
          }

          return snapshot
        }

        const runFrame = (dt: number) => {
          if (disposed || !renderer) return getSnapshot(state)

          if (!startSoundPlayed && !isE2EMode()) {
            startSoundPlayed = true
            audio.unlock()
            audio.play('start', 0.5)
          }

          if (externalPausedRef.current) {
            setPaused(state, true)
          } else if (wasExternallyPaused && !state.ended) {
            // React Resume / external pause released.
            setPaused(state, false)
            input.clearHeldKeys()
          }
          wasExternallyPaused = externalPausedRef.current

          const frontBefore = state.frontCooldown
          const leftBefore = state.leftCooldown
          const rightBefore = state.rightCooldown

          const inputState = input.read()
          updateSimulation(state, config, inputState, dt)

          let firedSide: 'none' | 'front' | 'side' = 'none'
          if (frontBefore === 0 && state.frontCooldown > 0) firedSide = 'front'
          else if (
            (leftBefore === 0 && state.leftCooldown > 0) ||
            (rightBefore === 0 && state.rightCooldown > 0)
          ) {
            firedSide = 'side'
          }

          playStateSounds(audio, soundTracker, state, firedSide)
          renderer.sync(state)
          return publishSnapshot()
        }

        const e2eMode = isE2EMode()

        if (e2eMode) {
          // Deterministic combat for Playwright: tests advance time with step().
          renderer.app.ticker.stop()
          setRandomSource(createSeededRandom(42))

          const api: PirateBattleTestApi = {
            ready: true,
            getSnapshot: () => getSnapshot(state),
            getPlayer: () => ({
              x: state.player.x,
              y: state.player.y,
              rotation: state.player.rotation,
              health: state.player.health,
              alive: state.player.alive,
            }),
            getEnemies: () =>
              state.enemies.map((enemy) => ({
                id: enemy.id,
                type: enemy.type,
                x: enemy.x,
                y: enemy.y,
                health: enemy.health,
              })),
            getProjectileCount: () =>
              state.projectiles.filter((bullet) => bullet.alive).length,
            getScore: () => state.score,
            step: (dtSeconds = 1 / 60) => runFrame(dtSeconds),
            setSeed: (seed: number) => {
              setRandomSource(createSeededRandom(seed))
            },
            setTimeLeft: (seconds: number) => {
              state.timeLeft = seconds
              publishSnapshot()
            },
            setPlayerHealth: (health: number) => {
              state.player.health = health
              if (health <= 0) {
                state.player.alive = false
              }
              publishSnapshot()
            },
          }

          window.__pirateBattleTest = api
          renderer.sync(state)
        } else {
          renderer.app.ticker.add(() => {
            const dt = renderer!.app.ticker.deltaMS / 1000
            runFrame(dt)
          })
        }

        if (!disposed) setLoading(false)

        return () => {
          window.removeEventListener('resize', resize)
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('blur', onBlur)
        }
      } catch (error) {
        if (!disposed) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Failed to load game assets',
          )
          setLoading(false)
        }
        return undefined
      }
    }

    let stopListeners: (() => void) | undefined
    void start().then((cleanup) => {
      stopListeners = cleanup
    })

    return () => {
      disposed = true
      stopListeners?.()
      touchCleanups.forEach((cleanup) => cleanup())
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
      input.detach()
      if (window.__pirateBattleTest) {
        delete window.__pirateBattleTest
      }
      renderer?.destroy()
      host.innerHTML = ''
    }
  }, [config, reloadToken])

  return (
    <div className="game-stage" data-testid="game-stage">
      <div ref={hostRef} className="game-canvas-host" data-testid="game-canvas" />

      {loading ? (
        <div className="game-overlay" role="status">
          <p>Loading assets... {Math.round(loadProgress * 100)}%</p>
          <div className="load-bar">
            <span style={{ width: `${Math.round(loadProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="game-overlay" role="alert">
          <p>Could not load combat assets.</p>
          <p className="muted">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}

      {externalPaused && !loading && !loadError ? (
        <div className="game-overlay">
          <h2>Paused</h2>
          <p className="muted">Simulation is frozen. Resume to continue.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRequestResume}
          >
            Resume
          </button>
        </div>
      ) : null}

      <div ref={touchRef} className="touch-controls" aria-label="Touch controls">
        <div className="touch-cluster">
          <button type="button" className="touch-btn" data-key="KeyA">
            ◀
          </button>
          <button type="button" className="touch-btn" data-key="KeyW">
            ▲
          </button>
          <button type="button" className="touch-btn" data-key="KeyD">
            ▶
          </button>
        </div>
        <div className="touch-cluster">
          <button type="button" className="touch-btn" data-key="KeyQ">
            L
          </button>
          <button type="button" className="touch-btn touch-fire" data-key="Space">
            Fire
          </button>
          <button type="button" className="touch-btn" data-key="KeyE">
            R
          </button>
        </div>
      </div>
    </div>
  )
}
