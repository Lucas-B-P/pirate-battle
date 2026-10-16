import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js'
import { ARENA_HEIGHT, ARENA_WIDTH } from './arena'
import type { GameTextures } from './assets'
import type { SimulationState } from './types'

type ShipView = {
  root: Container
  sprite: Sprite
  barBg: Graphics
  barFill: Graphics
  fire: Sprite
  lastHealth: number
  hitFlash: number
}

export type GameRenderer = {
  app: Application
  sync: (state: SimulationState) => void
  resize: (width: number, height: number) => void
  destroy: () => void
}

function createHealthBar() {
  const barBg = new Graphics()
  barBg.roundRect(-22, -42, 44, 7, 3).fill({ color: 0x111111, alpha: 0.8 })

  const barFill = new Graphics()
  barFill.roundRect(-21, -41, 42, 5, 2).fill({ color: 0x6fbf86 })

  return { barBg, barFill }
}

function updateHealthBar(
  barFill: Graphics,
  health: number,
  maxHealth: number,
) {
  const ratio = Math.max(0, Math.min(1, health / maxHealth))
  barFill.clear()
  barFill.roundRect(-21, -41, 42 * ratio, 5, 2).fill({
    color: ratio > 0.35 ? 0x6fbf86 : 0xd65b5b,
  })
}

function createShipView(texture: GameTextures['playerShip'], fireTexture: GameTextures['fire']): ShipView {
  const root = new Container()
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.scale.set(0.55)

  const fire = new Sprite(fireTexture)
  fire.anchor.set(0.5, 0.2)
  fire.scale.set(0.35)
  fire.visible = false
  fire.y = 10

  const { barBg, barFill } = createHealthBar()
  root.addChild(sprite, fire, barBg, barFill)

  return {
    root,
    sprite,
    barBg,
    barFill,
    fire,
    lastHealth: Number.POSITIVE_INFINITY,
    hitFlash: 0,
  }
}

function syncShipDamage(view: ShipView, health: number, maxHealth: number, dt: number) {
  if (health < view.lastHealth) {
    view.hitFlash = 0.22
  }
  view.lastHealth = health
  view.hitFlash = Math.max(0, view.hitFlash - dt)

  const ratio = maxHealth > 0 ? health / maxHealth : 0
  // Progressive wear: darker and redder as health drops.
  const wear = 1 - ratio
  const flash = view.hitFlash > 0 ? 1 : 0
  view.sprite.tint =
    flash > 0
      ? 0xff6b6b
      : ((Math.round(255 - wear * 70) << 16) |
          (Math.round(255 - wear * 110) << 8) |
          Math.round(255 - wear * 140))

  updateHealthBar(view.barFill, health, maxHealth)
  view.fire.visible = ratio < 0.45 && health > 0
  view.fire.alpha = ratio < 0.25 ? 1 : 0.7
}

export async function createGameRenderer(
  host: HTMLElement,
  textures: GameTextures,
): Promise<GameRenderer> {
  const app = new Application()

  await app.init({
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    background: '#0a3a5c',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  })

  host.appendChild(app.canvas)
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.display = 'block'
  app.canvas.style.borderRadius = '14px'

  const world = new Container()
  app.stage.addChild(world)

  // Water background tiles
  const waterLayer = new Container()
  const tileSize = 64
  for (let y = 0; y < ARENA_HEIGHT; y += tileSize) {
    for (let x = 0; x < ARENA_WIDTH; x += tileSize) {
      const tile = new Sprite(textures.water)
      tile.x = x
      tile.y = y
      tile.width = tileSize
      tile.height = tileSize
      waterLayer.addChild(tile)
    }
  }
  world.addChild(waterLayer)

  const islandLayer = new Container()
  world.addChild(islandLayer)

  const entityLayer = new Container()
  world.addChild(entityLayer)

  const effectLayer = new Container()
  world.addChild(effectLayer)

  const playerView = createShipView(textures.playerShip, textures.fire)
  entityLayer.addChild(playerView.root)

  const enemyViews = new Map<string, ShipView>()
  const bulletViews = new Map<string, Sprite>()
  const explosionViews = new Map<string, Sprite>()

  // Create island sprites once from state islands on first sync
  let islandsReady = false

  const pauseText = new Text({
    text: 'PAUSED\nPress P or tap Resume',
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
  pauseText.x = ARENA_WIDTH / 2
  pauseText.y = ARENA_HEIGHT / 2
  pauseText.visible = false
  app.stage.addChild(pauseText)

  function ensureIslands(state: SimulationState) {
    if (islandsReady) return
    for (const island of state.islands) {
      const sprite = new Sprite(textures.island)
      sprite.anchor.set(0.5)
      sprite.x = island.x
      sprite.y = island.y
      const size = island.radius * 2.2
      sprite.width = size
      sprite.height = size
      islandLayer.addChild(sprite)

      // Soft sand ring under island for readability
      const ring = new Graphics()
      ring.circle(island.x, island.y, island.radius).fill({
        color: 0xc2a46b,
        alpha: 0.35,
      })
      islandLayer.addChildAt(ring, 0)
    }
    islandsReady = true
  }

  let lastSyncAt = performance.now()

  function sync(state: SimulationState) {
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastSyncAt) / 1000)
    lastSyncAt = now

    ensureIslands(state)

    playerView.root.x = state.player.x
    playerView.root.y = state.player.y
    playerView.sprite.rotation = state.player.rotation
    playerView.root.visible = state.player.alive
    syncShipDamage(
      playerView,
      state.player.health,
      state.player.maxHealth,
      dt,
    )

    const liveEnemyIds = new Set(state.enemies.map((enemy) => enemy.id))

    for (const [id, view] of enemyViews) {
      if (!liveEnemyIds.has(id)) {
        view.root.destroy()
        enemyViews.delete(id)
      }
    }

    for (const enemy of state.enemies) {
      let view = enemyViews.get(enemy.id)
      if (!view) {
        const texture =
          enemy.type === 'chaser' ? textures.chaserShip : textures.shooterShip
        view = createShipView(texture, textures.fire)
        view.sprite.scale.set(0.5)
        view.lastHealth = enemy.health
        enemyViews.set(enemy.id, view)
        entityLayer.addChild(view.root)
      }

      view.root.x = enemy.x
      view.root.y = enemy.y
      view.sprite.rotation = enemy.rotation
      syncShipDamage(view, enemy.health, enemy.maxHealth, dt)
    }

    const liveBulletIds = new Set(
      state.projectiles.filter((item) => item.alive).map((item) => item.id),
    )

    for (const [id, sprite] of bulletViews) {
      if (!liveBulletIds.has(id)) {
        sprite.destroy()
        bulletViews.delete(id)
      }
    }

    for (const bullet of state.projectiles) {
      if (!bullet.alive) continue
      let sprite = bulletViews.get(bullet.id)
      if (!sprite) {
        sprite = new Sprite(textures.cannonBall)
        sprite.anchor.set(0.5)
        sprite.scale.set(0.45)
        bulletViews.set(bullet.id, sprite)
        entityLayer.addChild(sprite)
      }
      sprite.x = bullet.x
      sprite.y = bullet.y
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
      sprite.scale.set(0.4 + t * 0.8)
      sprite.alpha = 1 - t
    }

    pauseText.visible = state.paused && !state.ended
  }

  function resize(width: number, height: number) {
    const scale = Math.min(width / ARENA_WIDTH, height / ARENA_HEIGHT)
    world.scale.set(scale)
    world.x = (width - ARENA_WIDTH * scale) / 2
    world.y = (height - ARENA_HEIGHT * scale) / 2
    pauseText.x = width / 2
    pauseText.y = height / 2
    pauseText.scale.set(Math.max(0.7, scale))
    app.renderer.resize(width, height)
  }

  function destroy() {
    app.destroy(true, { children: true })
  }

  return { app, sync, resize, destroy }
}
