import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { assetUrl } from '../assetUrl'
import { WoodButton } from '../components/WoodButton'
import { WoodPanel } from '../components/WoodPanel'
import type { GameConfig } from '../config/gameConfig'
import { loadGameTextures } from './assets'
import { createGameAudio } from './audio'
import {
  clearVirtualStick,
  createInputController,
  setAimPoint,
  setCanvasFireHeld,
  setVirtualKey,
  setVirtualStick,
} from './input'
import { createSeededRandom, setRandomSource } from './random'
import { createGameRenderer } from './renderer'
import {
  applyTestPlayerHit,
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
  playerSkin: number
}

function TouchPad({
  code,
  label,
  hint,
  icon,
  className = '',
}: {
  code: string
  label: string
  hint: string
  icon: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={`touch-btn ${className}`.trim()}
      data-key={code}
      aria-label={label}
      tabIndex={-1}
    >
      <span className="touch-btn__key" aria-hidden="true">
        {hint}
      </span>
      <img
        className="touch-btn__bg"
        src={assetUrl('assets/png/default/ui/controls/button_round_normal.png')}
        alt=""
      />
      <img className="touch-btn__icon" src={assetUrl(icon)} alt="" />
    </button>
  )
}

const JOYSTICK_RADIUS = 54

function VirtualJoystick() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const activePointer = useRef<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    const knob = knobRef.current
    if (!root || !knob) return

    const setKnob = (nx: number, ny: number) => {
      knob.style.transform = `translate(calc(-50% + ${nx * JOYSTICK_RADIUS}px), calc(-50% + ${ny * JOYSTICK_RADIUS}px))`
    }

    const updateFromEvent = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = event.clientX - cx
      let dy = event.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (dist > JOYSTICK_RADIUS && dist > 0) {
        dx = (dx / dist) * JOYSTICK_RADIUS
        dy = (dy / dist) * JOYSTICK_RADIUS
      }
      const nx = dx / JOYSTICK_RADIUS
      const ny = dy / JOYSTICK_RADIUS
      setVirtualStick(nx, ny)
      setKnob(nx, ny)
    }

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      activePointer.current = event.pointerId
      root.setPointerCapture(event.pointerId)
      updateFromEvent(event)
    }

    const onMove = (event: PointerEvent) => {
      if (activePointer.current !== event.pointerId) return
      event.preventDefault()
      updateFromEvent(event)
    }

    const onUp = (event: PointerEvent) => {
      if (activePointer.current !== event.pointerId) return
      activePointer.current = null
      clearVirtualStick()
      setKnob(0, 0)
    }

    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onUp)

    return () => {
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onUp)
      clearVirtualStick()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="touch-joystick"
      role="group"
      aria-label="Move ship"
      tabIndex={-1}
    >
      <div className="touch-joystick__base" aria-hidden="true" />
      <div ref={knobRef} className="touch-joystick__knob" aria-hidden="true" />
    </div>
  )
}

function bindTouchButton(button: HTMLButtonElement) {
  const code = button.dataset.key
  if (!code) return () => {}

  const press = (event: PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    setVirtualKey(code, true)
  }
  const release = (event: PointerEvent) => {
    if (event.type === 'pointerleave' && button.hasPointerCapture(event.pointerId)) {
      return
    }
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
  playerSkin,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const touchRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const onSnapshotRef = useRef(onSnapshot)
  const onMatchEndRef = useRef(onMatchEnd)
  const onRequestResumeRef = useRef(onRequestResume)
  const externalPausedRef = useRef(externalPaused)

  useLayoutEffect(() => {
    externalPausedRef.current = externalPaused
    onRequestResumeRef.current = onRequestResume
  }, [externalPaused, onRequestResume])

  useEffect(() => {
    onSnapshotRef.current = onSnapshot
  }, [onSnapshot])

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd
  }, [onMatchEnd])

  useEffect(() => {
    if (!loadError) return
    document.getElementById('retry-assets')?.focus()
  }, [loadError])

  useEffect(() => {
    if (!externalPaused || loading || loadError) return
    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusable = () =>
      [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea')]

    focusable()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onRequestResumeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [externalPaused, loading, loadError])

  useEffect(() => {
    if (!hostRef.current) return
    const arenaHost: HTMLDivElement = hostRef.current

    let disposed = false
    let sessionReady = false
    let renderer: Awaited<ReturnType<typeof createGameRenderer>> | null = null
    const input = createInputController(
      () => sessionReady && !externalPausedRef.current,
    )
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
        renderer = await createGameRenderer(hostRef.current, textures, playerSkin)
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
            input.clearHeldKeys()
            setCanvasFireHeld(false)
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

        const timeBucket = (seconds: number) => Math.ceil(Math.max(0, seconds))

        const publishSnapshot = () => {
          const snapshot = getSnapshot(state)
          const changed =
            timeBucket(snapshot.timeLeft) !== timeBucket(lastSnapshot.timeLeft) ||
            snapshot.score !== lastSnapshot.score ||
            snapshot.playerHealth !== lastSnapshot.playerHealth ||
            snapshot.paused !== lastSnapshot.paused ||
            snapshot.ended !== lastSnapshot.ended ||
            snapshot.endReason !== lastSnapshot.endReason

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
          if (isE2EMode()) {
            renderer.app.render()
          }
          return publishSnapshot()
        }

        sessionReady = true
        const e2eMode = isE2EMode()

        if (e2eMode) {
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
                skin: enemy.skin,
                x: enemy.x,
                y: enemy.y,
                health: enemy.health,
              })),
            getIslands: () =>
              state.islands.map((island) => ({
                x: island.x,
                y: island.y,
                radius: island.radius,
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
            applyPlayerHit: (enemyId: string) => {
              const hit = applyTestPlayerHit(state, config, enemyId)
              if (hit) publishSnapshot()
              return hit
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
  }, [config, playerSkin, reloadToken])

  const loadPercent = Math.round(loadProgress * 100)
  const blockPlay = externalPaused || loading || Boolean(loadError)

  return (
    <div className="game-stage" data-testid="game-stage" aria-busy={loading}>
      <div
        ref={hostRef}
        className="game-canvas-host"
        data-testid="game-canvas"
        inert={blockPlay}
      />

      {loading ? (
        <div className="game-overlay">
          <p role="status">Loading match assets</p>
          <p aria-hidden="true">{loadPercent}%</p>
          <div
            className="load-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={loadPercent}
            aria-label="Match asset loading"
          >
            <span style={{ width: `${loadPercent}%` }} />
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="game-overlay" role="alert">
          <p>Could not load assets.</p>
          <p className="muted">{loadError}</p>
          <button
            id="retry-assets"
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}

      {externalPaused && !loading && !loadError ? (
        <div className="wood-overlay">
          <div
            ref={dialogRef}
            className="wood-stage__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-dialog-title"
            aria-describedby="pause-dialog-desc"
          >
            <WoodPanel>
              <h2
                id="pause-dialog-title"
                className="wood-score"
                style={{ fontSize: '2.2rem', color: '#f4f7fa' }}
              >
                Paused
              </h2>
              <p id="pause-dialog-desc" className="wood-sub">
                Ready when you are.
              </p>
              <div className="wood-actions">
                <WoodButton onClick={onRequestResume}>Continue</WoodButton>
                {onRequestOptions ? (
                  <WoodButton onClick={onRequestOptions}>Options</WoodButton>
                ) : null}
                {onRequestMainMenu ? (
                  <WoodButton onClick={onRequestMainMenu}>Menu</WoodButton>
                ) : null}
              </div>
            </WoodPanel>
          </div>
        </div>
      ) : null}

      <div
        ref={touchRef}
        className="touch-controls"
        aria-label="Touch controls"
        inert={blockPlay}
      >
        <div className="touch-cluster touch-cluster--move">
          <VirtualJoystick />
        </div>
        <div className="touch-cluster touch-cluster--abilities">
          <TouchPad
            code="KeyQ"
            label="Port broadside (Q)"
            hint="Q"
            icon="assets/png/default/ui/controls/icon_fire_left.png"
          />
          <TouchPad
            code="Space"
            label="Front cannon (Space)"
            hint="Space"
            icon="assets/png/default/ui/controls/icon_fire_front.png"
            className="touch-fire touch-fire--desktop"
          />
          <TouchPad
            code="KeyE"
            label="Starboard broadside (E)"
            hint="E"
            icon="assets/png/default/ui/controls/icon_fire_right.png"
          />
        </div>
        <p className="touch-hint" aria-hidden="true">
          Tap arena to fire
        </p>
      </div>
    </div>
  )
}
