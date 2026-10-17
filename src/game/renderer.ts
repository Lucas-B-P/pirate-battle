import 'pixi.js/particle-container'
import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CAMERA_VISIBLE_TILES,
  TILE_SIZE,
} from './arena'
import type { GameTextures } from './assets'
import {
  preferLiteGraphics,
  renderMaxFps,
  renderResolutionCap,
} from '../mobile/device'
import { buildMapView } from './mapView'
import { createShipWakeSystem } from './shipWake'
import type { SimulationState } from './types'

const SHIP_VISUAL_MULT = 7
const SHIP_SCALE_PLAYER = 0.85 * SHIP_VISUAL_MULT
const SHIP_SCALE_ENEMY = 0.78 * SHIP_VISUAL_MULT
/** Art faces down; sim rotation 0 faces up. */
const SHIP_SPRITE_ROTATION_OFFSET = Math.PI
const BULLET_SCALE = 14
const FIRE_FRAME_SECONDS = 0.07
const EXPLOSION_SCALE = 6.2

type ShipView = {
  root: Container
  sprite: Sprite
  barBg: Graphics
  barFill: Graphics
  fire: AnimatedSprite
  fireTime: number
  lastHealth: number
  lastDrawnHealth: number
  lastTint: number
  hitFlash: number
  barWidth: number
}

type BulletView = {
  sprite: Sprite
  trail: Graphics | null
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
  texture: Texture,
  fireFrames: GameTextures['fireFrames'],
  scale: number,
): ShipView {
  const root = new Container()
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.scale.set(scale)

  const fire = new AnimatedSprite(fireFrames)
  fire.anchor.set(0.5, 1)
  fire.position.set(0, 8)
  fire.scale.set(1.05)
  fire.loop = false
  fire.gotoAndStop(0)
  fire.visible = false
  sprite.addChild(fire)

  const { barBg, barFill, barWidth } = createHealthBar()
  barBg.y = -8 * SHIP_VISUAL_MULT
  barFill.y = -8 * SHIP_VISUAL_MULT
  root.addChild(sprite, barBg, barFill)

  return {
    root,
    sprite,
    barBg,
    barFill,
    fire,
    fireTime: 0,
    lastHealth: Number.POSITIVE_INFINITY,
    lastDrawnHealth: Number.NaN,
    lastTint: 0xffffff,
    hitFlash: 0,
    barWidth,
  }
}

function syncShipDamage(
  view: ShipView,
  health: number,
  maxHealth: number,
  dt: number,
  lite: boolean,
) {
  if (health < view.lastHealth) {
    view.hitFlash = 0.22
  }
  view.lastHealth = health
  view.hitFlash = Math.max(0, view.hitFlash - dt)

  const ratio = maxHealth > 0 ? health / maxHealth : 0
  const wear = 1 - ratio
  const flash = view.hitFlash > 0 ? 1 : 0
  const tint =
    flash > 0
      ? 0xff6b6b
      : ((Math.round(255 - wear * 70) << 16) |
          (Math.round(255 - wear * 110) << 8) |
          Math.round(255 - wear * 140))
  if (tint !== view.lastTint) {
    view.sprite.tint = tint
    view.lastTint = tint
  }

  if (health !== view.lastDrawnHealth) {
    updateHealthBar(view.barFill, health, maxHealth, view.barWidth)
    view.lastDrawnHealth = health
  }

  const showFire = ratio <= 0.5 && health > 0
  view.fire.visible = showFire
  if (showFire) {
    view.fire.alpha = ratio < 0.25 ? 1 : 0.85
    if (dt > 0) {
      view.fireTime += dt
      // Skip every other fire frame on mobile — still reads as burning.
      if (!lite || Math.floor(view.fireTime / FIRE_FRAME_SECONDS) % 2 === 0) {
        const frame =
          Math.floor(view.fireTime / FIRE_FRAME_SECONDS) % view.fire.totalFrames
        view.fire.gotoAndStop(frame)
      }
    }
  }
}

export async function createGameRenderer(
  host: HTMLElement,
  textures: GameTextures,
  playerSkin: number,
): Promise<GameRenderer> {
  const app = new Application()
  const lite = preferLiteGraphics()

  await app.init({
    width: Math.max(320, host.clientWidth || 800),
    height: Math.max(220, host.clientHeight || 600),
    background: '#0a4a72',
    antialias: !lite,
    resolution: renderResolutionCap(),
    autoDensity: true,
    roundPixels: lite,
    preference: 'webgl',
    ...(lite ? { powerPreference: 'high-performance' as const } : {}),
    hello: false,
  })

  // Cap mobile FPS so the GPU spends less time filling retina pixels.
  app.ticker.maxFPS = renderMaxFps()

  host.appendChild(app.canvas)
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.display = 'block'
  app.canvas.style.borderRadius = '0'

  const world = new Container()
  app.stage.addChild(world)

  const mapView = buildMapView(textures, { lite })
  world.addChild(mapView.root)

  const wakeSystem = createShipWakeSystem(lite)
  world.addChild(wakeSystem.container)

  const entityLayer = new Container()
  world.addChild(entityLayer)

  const effectLayer = new Container()
  world.addChild(effectLayer)

  const playerTexture =
    textures.playerSkins[playerSkin] ?? textures.playerSkins[0]
  if (!playerTexture) {
    throw new Error('Nenhuma skin de navio carregada')
  }

  const playerView = createShipView(
    playerTexture,
    textures.fireFrames,
    SHIP_SCALE_PLAYER,
  )
  entityLayer.addChild(playerView.root)

  const enemyViews = new Map<string, ShipView>()
  const bulletViews = new Map<string, BulletView>()
  const explosionViews = new Map<string, AnimatedSprite>()
  const shipPrevPos = new Map<string, { x: number; y: number }>()
  const MOVE_EPS = 8

  const pauseText = new Text({
    text: 'PAUSED\nP or Continue',
    style: new TextStyle({
      fill: '#f0d27a',
      fontSize: lite ? 28 : 34,
      fontWeight: '700',
      align: 'center',
      dropShadow: lite
        ? undefined
        : {
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
  const liveEnemyIds = new Set<string>()
  const liveWakeIds = new Set<string>()
  const liveBulletIds = new Set<string>()
  const liveBoomIds = new Set<string>()

  function applyCamera(focusX: number, focusY: number) {
    const worldViewW = viewWidth / viewScale
    const worldViewH = viewHeight / viewScale
    const halfW = worldViewW / 2
    const halfH = worldViewH / 2

    camX = Math.min(ARENA_WIDTH - halfW, Math.max(halfW, focusX))
    camY = Math.min(ARENA_HEIGHT - halfH, Math.max(halfH, focusY))

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
      lite,
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

    liveEnemyIds.clear()
    liveWakeIds.clear()
    liveWakeIds.add('player')
    for (const enemy of state.enemies) {
      liveEnemyIds.add(enemy.id)
      liveWakeIds.add(enemy.id)
    }

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
        const skins =
          enemy.type === 'chaser' ? textures.chaserSkins : textures.shooterSkins
        const texture = skins[enemy.skin % skins.length]
        if (!texture) continue
        view = createShipView(texture, textures.fireFrames, SHIP_SCALE_ENEMY)
        view.lastHealth = enemy.health
        enemyViews.set(enemy.id, view)
        entityLayer.addChild(view.root)
      }

      view.root.x = enemy.x
      view.root.y = enemy.y
      view.sprite.rotation = enemy.rotation + SHIP_SPRITE_ROTATION_OFFSET
      syncShipDamage(view, enemy.health, enemy.maxHealth, dt, lite)

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
        dense: false,
      })
      shipPrevPos.set(enemy.id, { x: enemy.x, y: enemy.y })
    }

    wakeSystem.prune(liveWakeIds)
    wakeSystem.update(state.paused ? 0 : dt)

    liveBulletIds.clear()
    for (const item of state.projectiles) {
      if (item.alive) liveBulletIds.add(item.id)
    }

    for (const [id, view] of bulletViews) {
      if (!liveBulletIds.has(id)) {
        view.sprite.destroy()
        view.trail?.destroy()
        bulletViews.delete(id)
      }
    }

    for (const bullet of state.projectiles) {
      if (!bullet.alive) continue
      let view = bulletViews.get(bullet.id)
      if (!view) {
        // Graphics trail strokes are expensive on mobile GPUs — skip on lite.
        const trail = lite ? null : new Graphics()
        const sprite = new Sprite(textures.cannonBall)
        sprite.anchor.set(0.5)
        sprite.scale.set(BULLET_SCALE)
        bulletViews.set(bullet.id, { sprite, trail })
        if (trail) entityLayer.addChild(trail)
        entityLayer.addChild(sprite)
        view = { sprite, trail }
      }

      if (view.trail) {
        const speed = Math.hypot(bullet.vx, bullet.vy) || 1
        const tx = bullet.x - (bullet.vx / speed) * 150
        const ty = bullet.y - (bullet.vy / speed) * 150
        view.trail.clear()
        view.trail
          .moveTo(bullet.x, bullet.y)
          .lineTo(tx, ty)
          .stroke({ width: 36, color: 0x141414, alpha: 0.55 })
      }
      view.sprite.x = bullet.x
      view.sprite.y = bullet.y
    }

    liveBoomIds.clear()
    for (const item of state.explosions) {
      if (item.life > 0) liveBoomIds.add(item.id)
    }

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
        sprite = new AnimatedSprite(textures.explosionFrames)
        sprite.anchor.set(0.5)
        sprite.loop = false
        sprite.scale.set(EXPLOSION_SCALE)
        explosionViews.set(boom.id, sprite)
        effectLayer.addChild(sprite)
      }
      const t = 1 - boom.life / Math.max(boom.maxLife, 0.001)
      const frame = Math.min(
        sprite.totalFrames - 1,
        Math.floor(t * sprite.totalFrames),
      )
      sprite.gotoAndStop(frame)
      sprite.x = boom.x
      sprite.y = boom.y
      sprite.alpha = frame >= sprite.totalFrames - 1 ? Math.max(0, 1 - (t - 0.9) / 0.1) : 1
    }

    pauseText.visible = state.paused && !state.ended
  }

  function resize(width: number, height: number) {
    viewWidth = Math.max(320, width)
    viewHeight = Math.max(220, height)
    const targetWorldW = TILE_SIZE * CAMERA_VISIBLE_TILES
    const targetWorldH = TILE_SIZE * (CAMERA_VISIBLE_TILES * 0.65)
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
    // Keep shared Pixi Assets / textures alive for the next match.
    app.destroy(
      {
        removeView: true,
      },
      {
        children: true,
        texture: false,
        textureSource: false,
        context: false,
      },
    )
  }

  resize(app.screen.width, app.screen.height)

  return { app, sync, resize, screenToWorld, destroy }
}
