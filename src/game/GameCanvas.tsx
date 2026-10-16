import { useEffect, useRef, useState } from 'react'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import type { GameConfig } from '../config/gameConfig'
import { loadGameTextures } from './assets'
import { createGameAudio } from './audio'
import {
  createInputController,
  setAimPoint,
  setCanvasFireHeld,
  setVirtualKey,
} from './input'
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
  onRequestOptions?: () => void
  onRequestMainMenu?: () => void
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
  onRequestOptions,
  onRequestMainMenu,
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
    if (!hostRef.current) return
    // Captured for nested closures (TS does not keep null narrowing inside them).
    const arenaHost: HTMLDivElement = hostRef.current

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
          if (!renderer) return
          const bounds = arenaHost.getBoundingClientRect()
          renderer.resize(
            Math.max(320, bounds.width),
            Math.max(220, bounds.height),
          )
        }

        const updateAimFromEvent = (event: PointerEvent) => {
          if (!renderer) return
          const bounds = arenaHost.getBoundingClientRect()
          const localX = event.clientX - bounds.left
          const localY = event.clientY - bounds.top
          const world = renderer.screenToWorld(localX, localY)
          setAimPoint(world.x, world.y)
        }

        const onPointerMove = (event: PointerEvent) => {
          updateAimFromEvent(event)
        }

        const onCanvasPointerDown = (event: PointerEvent) => {
          if (event.button !== 0) return
          // Touch pads have their own handlers; ignore those bubbles.
          if ((event.target as HTMLElement | null)?.closest?.('.touch-controls')) {
            return
          }
          updateAimFromEvent(event)
          setCanvasFireHeld(true)
        }

        const onCanvasPointerUp = () => {
          setCanvasFireHeld(false)
        }

        resize()
        window.addEventListener('resize', resize)
        window.visualViewport?.addEventListener('resize', resize)
        const resizeObserver =
          typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => resize())
            : null
        resizeObserver?.observe(arenaHost)
        arenaHost.addEventListener('pointermove', onPointerMove)
        arenaHost.addEventListener('pointerdown', onCanvasPointerDown)
        window.addEventListener('pointerup', onCanvasPointerUp)
        window.addEventListener('pointercancel', onCanvasPointerUp)

        const onVisibility = () => {
          if (document.hidden) {
            setPaused(state, true)
            onSnapshotRef.current(getSnapshot(state))
          }
        }

        const onBlur = () => {
          setPaused(state, true)
          input.clearHeldKeys()
          setCanvasFireHeld(false)
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
          // e2e stops the ticker — force a present so the canvas updates.
          if (isE2EMode()) {
            renderer.app.render()
          }
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
          renderer.app.render()
        } else {
          renderer.app.ticker.add(() => {
            const dt = renderer!.app.ticker.deltaMS / 1000
            runFrame(dt)
          })
        }

        if (!disposed) setLoading(false)

        return () => {
          window.removeEventListener('resize', resize)
          window.visualViewport?.removeEventListener('resize', resize)
          resizeObserver?.disconnect()
          arenaHost.removeEventListener('pointermove', onPointerMove)
          arenaHost.removeEventListener('pointerdown', onCanvasPointerDown)
          window.removeEventListener('pointerup', onCanvasPointerUp)
          window.removeEventListener('pointercancel', onCanvasPointerUp)
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('blur', onBlur)
          setCanvasFireHeld(false)
          setAimPoint(null, null)
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
      arenaHost.innerHTML = ''
    }
  }, [config, reloadToken])

  return (
    <div className="game-stage" data-testid="game-stage">
      <div ref={hostRef} className="game-canvas-host" data-testid="game-canvas" />

      {loading ? (
        <div className="game-overlay" role="status">
          <p>Carregando... {Math.round(loadProgress * 100)}%</p>
          <div className="load-bar">
            <span style={{ width: `${Math.round(loadProgress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="game-overlay" role="alert">
          <p>Não foi possível carregar os assets.</p>
          <p className="muted">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {externalPaused && !loading && !loadError ? (
        <div className="wood-overlay">
          <div className="wood-stage__content">
            <WoodPanel>
              <h2 className="wood-score" style={{ fontSize: '2.2rem', color: '#f4f7fa' }}>
                Pausado
              </h2>
              <p className="wood-sub">Pronto quando você estiver.</p>
              <div className="wood-actions">
                <WoodButton onClick={onRequestResume}>Continuar</WoodButton>
                {onRequestOptions ? (
                  <WoodButton onClick={onRequestOptions}>Opções</WoodButton>
                ) : null}
                {onRequestMainMenu ? (
                  <WoodButton onClick={onRequestMainMenu}>Menu</WoodButton>
                ) : null}
              </div>
            </WoodPanel>
          </div>
        </div>
      ) : null}

      <div ref={touchRef} className="touch-controls" aria-label="Habilidades">
        <div className="touch-cluster touch-cluster--abilities">
          <button type="button" className="touch-btn" data-key="KeyQ" aria-label="Bordo esquerdo (Q)">
            <span className="touch-btn__key">Q</span>
            <img className="touch-btn__bg" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/button_round_normal.png`} alt="" />
            <img className="touch-btn__icon" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/icon_fire_left.png`} alt="" />
          </button>
          <button type="button" className="touch-btn touch-fire" data-key="Space" aria-label="Tiro frontal (Espaço)">
            <span className="touch-btn__key">Espaço</span>
            <img className="touch-btn__bg" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/button_round_normal.png`} alt="" />
            <img className="touch-btn__icon" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/icon_fire_front.png`} alt="" />
          </button>
          <button type="button" className="touch-btn" data-key="KeyE" aria-label="Bordo direito (E)">
            <span className="touch-btn__key">E</span>
            <img className="touch-btn__bg" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/button_round_normal.png`} alt="" />
            <img className="touch-btn__icon" src={`${import.meta.env.BASE_URL}assets/png/default/ui/controls/icon_fire_right.png`} alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}
