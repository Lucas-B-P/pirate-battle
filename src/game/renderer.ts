import 'pixi.js/particle-container'
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CAMERA_VISIBLE_TILES,
  TILE_SIZE,
} from './arena'
import type { GameTextures } from './assets'
import { buildMapView } from './mapView'
import { createShipWakeSystem } from './shipWake'
import type { SimulationState } from './types'

/** Visual scale for ship sprites (camera stays at CAMERA_VISIBLE_TILES). */
const SHIP_VISUAL_MULT = 7
const SHIP_SCALE_PLAYER = 0.85 * SHIP_VISUAL_MULT
const SHIP_SCALE_ENEMY = 0.78 * SHIP_VISUAL_MULT
/**
 * Ship PNGs point bow downward; sim forward at rotation 0 is up.
 * Flip the art so the pointed bow leads movement.
 */
const SHIP_SPRITE_ROTATION_OFFSET = Math.PI
const BULLET_SCALE = 0.45 * 3

type ShipView = {
  root: Container
  sprite: Sprite
  barBg: Graphics
  barFill: Graphics
  fire: Sprite
  lastHealth: number
  hitFlash: number
  barWidth: number
}

type BulletView = {
  sprite: Sprite
  trail: Graphics
}

export type GameRenderer = {
  app: Application
  sync: (state: SimulationState) => void
  resize: (width: number, height: number) => void
  /** Convert host-local pixel coords to arena world coords. */
  screenToWorld: (localX: number, localY: number) => { x: number; y: number }
  destroy: () => void
}

function createHealthBar() {
  const m = SHIP_VISUAL_MULT
  const w = 44 * m
  const h = 7 * m
  const barBg = new Graphics()
  barBg.roundRect(-w / 2, -42 * m, w, h, 3 * m).fill({ color: 0x111111, alpha: 0.85 })

  const barFill = new Graphics()
  barFill.roundRect(-w / 2 + 1, -42 * m + 1, w - 2, h - 2, 2 * m).fill({
    color: 0x6fbf86,
  })

  return { barBg, barFill, barWidth: w - 2 }
}

function updateHealthBar(
  barFill: Graphics,
  health: number,
  maxHealth: number,
  barWidth: number,
) {
  const m = SHIP_VISUAL_MULT
  const ratio = Math.max(0, Math.min(1, health / maxHealth))
  const h = 5 * m
  barFill.clear()
  barFill.roundRect(-barWidth / 2, -42 * m + 1, barWidth * ratio, h, 2 * m).fill({
    color: ratio > 0.35 ? 0x6fbf86 : 0xd65b5b,
  })
}

function createShipView(
  texture: GameTextures['playerShip'],
  fireTexture: GameTextures['fire'],
  scale: number,
): ShipView {
  const root = new Container()
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.scale.set(scale)

  // Centered on the hull (root), upright — does not spin with the ship art.
  const fire = new Sprite(fireTexture)
  fire.anchor.set(0.5)
  fire.position.set(0, 0)
  fire.scale.set(scale * 0.62)
  fire.visible = false

  const { barBg, barFill, barWidth } = createHealthBar()
  barBg.y = -8 * SHIP_VISUAL_MULT
  barFill.y = -8 * SHIP_VISUAL_MULT
  root.addChild(sprite, fire, barBg, barFill)

  return {
    root,
    sprite,
    barBg,
    barFill,
    fire,
    lastHealth: Number.POSITIVE_INFINITY,
    hitFlash: 0,
    barWidth,
  }
}

function syncShipDamage(
  view: ShipView,
  health: number,
  maxHealth: number,
  dt: number,
) {
  if (health < view.lastHealth) {
    view.hitFlash = 0.22
  }
  view.lastHealth = health
  view.hitFlash = Math.max(0, view.hitFlash - dt)

  const ratio = maxHealth > 0 ? health / maxHealth : 0
  const wear = 1 - ratio
  const flash = view.hitFlash > 0 ? 1 : 0
  view.sprite.tint =
    flash > 0
      ? 0xff6b6b
      : ((Math.round(255 - wear * 70) << 16) |
          (Math.round(255 - wear * 110) << 8) |
          Math.round(255 - wear * 140))

  updateHealthBar(view.barFill, health, maxHealth, view.barWidth)
  view.fire.visible = ratio < 0.45 && health > 0
  view.fire.alpha = ratio < 0.25 ? 1 : 0.7
}

export async function createGameRenderer(
  host: HTMLElement,
  textures: GameTextures,
): Promise<GameRenderer> {
  const app = new Application()

  await app.init({
    width: Math.max(320, host.clientWidth || 800),
    height: Math.max(220, host.clientHeight || 600),
    background: '#0a4a72',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  })

  host.appendChild(app.canvas)
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.display = 'block'
  app.canvas.style.borderRadius = '0'

  const world = new Container()
  app.stage.addChild(world)

  const mapView = buildMapView(textures)
  world.addChild(mapView.root)

  const wakeSystem = createShipWakeSystem()
  world.addChild(wakeSystem.container)

  const entityLayer = new Container()
  world.addChild(entityLayer)

  const effectLayer = new Container()
  world.addChild(effectLayer)

  const playerView = createShipView(
    textures.playerShip,
    textures.fire,
    SHIP_SCALE_PLAYER,
  )
  entityLayer.addChild(playerView.root)

  const enemyViews = new Map<string, ShipView>()
  const bulletViews = new Map<string, BulletView>()
  const explosionViews = new Map<string, Sprite>()
  const shipPrevPos = new Map<string, { x: number; y: number }>()
  const MOVE_EPS = 8

  const pauseText = new Text({
    text: 'PAUSADO\nP ou Continuar',
    style: new TextStyle({
      fill: '#f0d27a',
      fontSize: 34,
      fontWeight: '700',
      align: 'center',
      dropShadow: {
        color: '#000000',
        blur: 4,
        distance: 2,
      },
    }),
  })
  pauseText.anchor.set(0.5)
  pauseText.visible = false
  app.stage.addChild(pauseText)

  let lastSyncAt = performance.now()
  let viewScale = 1
  let viewWidth = app.screen.width
  let viewHeight = app.screen.height
  let camX = ARENA_WIDTH / 2
  let camY = ARENA_HEIGHT / 2

  function applyCamera(focusX: number, focusY: number) {
    const worldViewW = viewWidth / viewScale
    const worldViewH = viewHeight / viewScale
    const halfW = worldViewW / 2
    const halfH = worldViewH / 2

    camX = Math.min(ARENA_WIDTH - halfW, Math.max(halfW, focusX))
    camY = Math.min(ARENA_HEIGHT - halfH, Math.max(halfH, focusY))

    // If arena smaller than view on an axis, center it.
    if (ARENA_WIDTH <= worldViewW) camX = ARENA_WIDTH / 2
    if (ARENA_HEIGHT <= worldViewH) camY = ARENA_HEIGHT / 2

    world.scale.set(viewScale)
    world.x = viewWidth / 2 - camX * viewScale
    world.y = viewHeight / 2 - camY * viewScale

    mapView.updateVisibility({
      left: camX - halfW,
      top: camY - halfH,
      right: camX + halfW,
      bottom: camY + halfH,
    })
  }

  function sync(state: SimulationState) {
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastSyncAt) / 1000)
    lastSyncAt = now

    playerView.root.x = state.player.x
    playerView.root.y = state.player.y
    playerView.sprite.rotation = state.player.rotation + SHIP_SPRITE_ROTATION_OFFSET
    playerView.root.visible = state.player.alive
    syncShipDamage(
      playerView,
      state.player.health,
      state.player.maxHealth,
      dt,
    )

    const playerPrev = shipPrevPos.get('player')
    const playerMoving =
      Boolean(playerPrev) &&
      (Math.abs(playerPrev!.x - state.player.x) > MOVE_EPS ||
        Math.abs(playerPrev!.y - state.player.y) > MOVE_EPS)
    wakeSystem.syncShip({
      id: 'player',
      x: state.player.x,
      y: state.player.y,
      rotation: state.player.rotation,
      alive: state.player.alive && !state.paused,
      moving: playerMoving && !state.paused,
      dense: true,
    })
    shipPrevPos.set('player', { x: state.player.x, y: state.player.y })

    applyCamera(state.player.x, state.player.y)

    const liveEnemyIds = new Set(state.enemies.map((enemy) => enemy.id))
    const liveWakeIds = new Set<string>(['player', ...liveEnemyIds])

    for (const [id, view] of enemyViews) {
      if (!liveEnemyIds.has(id)) {
        view.root.destroy()
        enemyViews.delete(id)
        shipPrevPos.delete(id)
      }
    }

    for (const enemy of state.enemies) {
      let view = enemyViews.get(enemy.id)
      if (!view) {
        const texture =
          enemy.type === 'chaser' ? textures.chaserShip : textures.shooterShip
        view = createShipView(texture, textures.fire, SHIP_SCALE_ENEMY)
        view.lastHealth = enemy.health
        enemyViews.set(enemy.id, view)
        entityLayer.addChild(view.root)
      }

      view.root.x = enemy.x
      view.root.y = enemy.y
      view.sprite.rotation = enemy.rotation + SHIP_SPRITE_ROTATION_OFFSET
      syncShipDamage(view, enemy.health, enemy.maxHealth, dt)

      const prev = shipPrevPos.get(enemy.id)
      const moving =
        Boolean(prev) &&
        (Math.abs(prev!.x - enemy.x) > MOVE_EPS ||
          Math.abs(prev!.y - enemy.y) > MOVE_EPS)
      wakeSystem.syncShip({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        rotation: enemy.rotation,
        alive: enemy.alive && !state.paused,
        moving: moving && !state.paused,
      })
      shipPrevPos.set(enemy.id, { x: enemy.x, y: enemy.y })
    }

    wakeSystem.prune(liveWakeIds)
    wakeSystem.update(state.paused ? 0 : dt)

    const liveBulletIds = new Set(
      state.projectiles.filter((item) => item.alive).map((item) => item.id),
    )

    for (const [id, view] of bulletViews) {
      if (!liveBulletIds.has(id)) {
        view.sprite.destroy()
        view.trail.destroy()
        bulletViews.delete(id)
      }
    }

    for (const bullet of state.projectiles) {
      if (!bullet.alive) continue
      let view = bulletViews.get(bullet.id)
      if (!view) {
        const trail = new Graphics()
        const sprite = new Sprite(textures.cannonBall)
        sprite.anchor.set(0.5)
        sprite.scale.set(BULLET_SCALE)
        bulletViews.set(bullet.id, { sprite, trail })
        entityLayer.addChild(trail)
        entityLayer.addChild(sprite)
        view = { sprite, trail }
      }

      const speed = Math.hypot(bullet.vx, bullet.vy) || 1
      const tx = bullet.x - (bullet.vx / speed) * 28 * 3
      const ty = bullet.y - (bullet.vy / speed) * 28 * 3
      view.trail.clear()
      view.trail
        .moveTo(bullet.x, bullet.y)
        .lineTo(tx, ty)
        .stroke({ width: 4 * 3, color: 0xffffff, alpha: 0.55 })
      view.sprite.x = bullet.x
      view.sprite.y = bullet.y
    }

    const liveBoomIds = new Set(
      state.explosions.filter((item) => item.life > 0).map((item) => item.id),
    )

    for (const [id, sprite] of explosionViews) {
      if (!liveBoomIds.has(id)) {
        sprite.destroy()
        explosionViews.delete(id)
      }
    }

    for (const boom of state.explosions) {
      if (boom.life <= 0) continue
      let sprite = explosionViews.get(boom.id)
      if (!sprite) {
        sprite = new Sprite(textures.explosion)
        sprite.anchor.set(0.5)
        explosionViews.set(boom.id, sprite)
        effectLayer.addChild(sprite)
      }
      const t = 1 - boom.life / boom.maxLife
      sprite.x = boom.x
      sprite.y = boom.y
      sprite.scale.set((0.4 + t * 0.8) * 3)
      sprite.alpha = 1 - t
    }

    pauseText.visible = state.paused && !state.ended
  }

  function resize(width: number, height: number) {
    viewWidth = Math.max(320, width)
    viewHeight = Math.max(220, height)
    // Keep a local view (~CAMERA_VISIBLE_TILES across), responsive to aspect ratio.
    const targetWorldW = TILE_SIZE * CAMERA_VISIBLE_TILES
    const targetWorldH = TILE_SIZE * (CAMERA_VISIBLE_TILES * 0.65)
    // Cover the screen with a local slice of the world (never fit the whole map).
    viewScale = Math.max(viewWidth / targetWorldW, viewHeight / targetWorldH)

    pauseText.x = viewWidth / 2
    pauseText.y = viewHeight / 2
    pauseText.scale.set(Math.max(0.75, Math.min(1.4, viewWidth / 900)))
    app.renderer.resize(viewWidth, viewHeight)
    applyCamera(camX, camY)
  }

  function screenToWorld(localX: number, localY: number) {
    return {
      x: (localX - world.x) / viewScale,
      y: (localY - world.y) / viewScale,
    }
  }

  function destroy() {
    wakeSystem.destroy()
    app.destroy(true, { children: true })
  }

  resize(app.screen.width, app.screen.height)

  return { app, sync, resize, screenToWorld, destroy }
}
