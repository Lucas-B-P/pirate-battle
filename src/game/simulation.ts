import type { GameConfig } from '../config/gameConfig'
import {
  ARENA_HEIGHT,
  ARENA_ISLANDS,
  ARENA_WIDTH,
  PLAYER_SPAWN,
  TILE_SIZE,
  clampToArena,
  isWaterPoint,
} from './arena'
import type { InputState } from './input'
import {
  angleTowards,
  circlesOverlap,
  clamp,
  directionFromRotation,
  distance,
  rotateTowards,
} from './math'
import { random } from './random'
import { CHASER_SKIN_COUNT, SHOOTER_SKIN_COUNT } from './shipSkins'
import type {
  EnemyEntity,
  ExplosionEffect,
  FireSide,
  MatchSnapshot,
  ProjectileEntity,
  SimulationState,
} from './types'

let nextId = 1

function createId(prefix: string): string {
  nextId += 1
  return `${prefix}_${nextId}`
}

function hitsIsland(
  x: number,
  y: number,
  radius: number,
  state: SimulationState,
): boolean {
  return state.islands.some((island) =>
    circlesOverlap(
      { x, y, radius },
      { x: island.x, y: island.y, radius: island.radius },
    ),
  )
}

function tryMoveShip(
  ship: { x: number; y: number; radius: number },
  nextX: number,
  nextY: number,
  state: SimulationState,
) {
  const clamped = clampToArena(nextX, nextY, ship.radius)

  if (!hitsIsland(clamped.x, ship.y, ship.radius, state)) {
    ship.x = clamped.x
  }

  if (!hitsIsland(ship.x, clamped.y, ship.radius, state)) {
    ship.y = clamped.y
  }
}

function spawnProjectile(
  state: SimulationState,
  options: {
    x: number
    y: number
    rotation: number
    speed: number
    damage: number
    life: number
    owner: 'player' | 'enemy'
    sideOffset?: number
  },
) {
  const dir = directionFromRotation(options.rotation)
  const side = directionFromRotation(options.rotation + Math.PI / 2)
  const offset = options.sideOffset ?? 0

  const projectile: ProjectileEntity = {
    id: createId('bullet'),
    x: options.x + dir.x * 65 + side.x * offset,
    y: options.y + dir.y * 65 + side.y * offset,
    vx: dir.x * options.speed,
    vy: dir.y * options.speed,
      radius: 18,
    damage: options.damage,
    life: options.life,
    owner: options.owner,
    alive: true,
  }

  state.projectiles.push(projectile)
}

function firePlayerWeapon(
  state: SimulationState,
  config: GameConfig,
  side: FireSide,
  aimRotation?: number | null,
) {
  const player = state.player

  if (side === 'front') {
    if (state.frontCooldown > 0) return
    state.frontCooldown = config.playerFrontCooldownSeconds
    const rotation =
      typeof aimRotation === 'number' ? aimRotation : player.rotation
    spawnProjectile(state, {
      x: player.x,
      y: player.y,
      rotation,
      speed: config.projectileSpeed,
      damage: config.projectileDamage,
      life: config.projectileLifetimeSeconds,
      owner: 'player',
    })
    return
  }

  if (side === 'left') {
    if (state.leftCooldown > 0) return
    state.leftCooldown = config.playerSideCooldownSeconds
    const rotation = player.rotation - Math.PI / 2
    for (const offset of [-65, 0, 65]) {
      spawnProjectile(state, {
        x: player.x,
        y: player.y,
        rotation,
        speed: config.projectileSpeed,
        damage: config.projectileDamage,
        life: config.projectileLifetimeSeconds,
        owner: 'player',
        sideOffset: offset,
      })
    }
    return
  }

  if (state.rightCooldown > 0) return
  state.rightCooldown = config.playerSideCooldownSeconds
  const rotation = player.rotation + Math.PI / 2
  for (const offset of [-65, 0, 65]) {
    spawnProjectile(state, {
      x: player.x,
      y: player.y,
      rotation,
      speed: config.projectileSpeed,
      damage: config.projectileDamage,
      life: config.projectileLifetimeSeconds,
      owner: 'player',
      sideOffset: offset,
    })
  }
}

function addExplosion(state: SimulationState, x: number, y: number) {
  const explosion: ExplosionEffect = {
    id: createId('boom'),
    x,
    y,
    life: 0.8,
    maxLife: 0.8,
  }
  state.explosions.push(explosion)
}

const MIN_ENEMY_SPAWN_DISTANCE = TILE_SIZE * 5
const SPAWN_EDGE_MARGIN = TILE_SIZE * 0.4
const SPAWN_WATER_CLEARANCE = 220

function findSpawnPoint(state: SimulationState): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = SPAWN_EDGE_MARGIN + random() * (ARENA_WIDTH - SPAWN_EDGE_MARGIN * 2)
    const y = SPAWN_EDGE_MARGIN + random() * (ARENA_HEIGHT - SPAWN_EDGE_MARGIN * 2)
    const farFromPlayer =
      distance({ x, y }, state.player) > MIN_ENEMY_SPAWN_DISTANCE
    const inChannel = isWaterPoint(x, y, SPAWN_WATER_CLEARANCE)

    if (farFromPlayer && inChannel) {
      return { x, y }
    }
  }

  return null
}

function spawnEnemy(state: SimulationState, config: GameConfig) {
  const point = findSpawnPoint(state)
  if (!point) return

  const isChaser =
    config.enemySpawnPattern === 'alternate' ? state.nextEnemyIsChaser : true
  if (config.enemySpawnPattern === 'alternate') {
    state.nextEnemyIsChaser = !state.nextEnemyIsChaser
  }
  const skin = isChaser ? state.nextChaserSkin : state.nextShooterSkin
  if (isChaser) {
    state.nextChaserSkin = (skin + 1) % CHASER_SKIN_COUNT
  } else {
    state.nextShooterSkin = (skin + 1) % SHOOTER_SKIN_COUNT
  }

  const enemy: EnemyEntity = {
    id: createId(isChaser ? 'chaser' : 'shooter'),
    type: isChaser ? 'chaser' : 'shooter',
    skin,
    x: point.x,
    y: point.y,
    rotation: angleTowards(point, state.player),
    radius: 238,
    health: isChaser ? config.chaserHealth : config.shooterHealth,
    maxHealth: isChaser ? config.chaserHealth : config.shooterHealth,
    alive: true,
    cooldown: 0.4,
  }

  state.enemies.push(enemy)
}

function updatePlayer(
  state: SimulationState,
  config: GameConfig,
  input: InputState,
  dt: number,
) {
  const player = state.player
  if (!player.alive) return

  if (input.rotateLeft) {
    player.rotation -= config.playerRotationSpeed * dt
  }
  if (input.rotateRight) {
    player.rotation += config.playerRotationSpeed * dt
  }

  if (input.forward) {
    const dir = directionFromRotation(player.rotation)
    tryMoveShip(
      player,
      player.x + dir.x * config.playerMoveSpeed * dt,
      player.y + dir.y * config.playerMoveSpeed * dt,
      state,
    )
  }

  const aimRotation =
    input.aimX !== null && input.aimY !== null
      ? angleTowards(player, { x: input.aimX, y: input.aimY })
      : null

  if (input.fireFront) firePlayerWeapon(state, config, 'front', aimRotation)
  if (input.fireLeft) firePlayerWeapon(state, config, 'left')
  if (input.fireRight) firePlayerWeapon(state, config, 'right')
}

function updateEnemies(state: SimulationState, config: GameConfig, dt: number) {
  for (const enemy of state.enemies) {
    if (!enemy.alive || !state.player.alive) continue

    const targetAngle = angleTowards(enemy, state.player)
    enemy.rotation = rotateTowards(enemy.rotation, targetAngle, 2.2 * dt)

    const speed =
      enemy.type === 'chaser' ? config.chaserMoveSpeed : config.shooterMoveSpeed
    const dir = directionFromRotation(enemy.rotation)
    const dist = distance(enemy, state.player)

    const shouldMove =
      enemy.type === 'chaser' || dist > config.shooterAttackRange * 0.7

    if (shouldMove) {
      tryMoveShip(
        enemy,
        enemy.x + dir.x * speed * dt,
        enemy.y + dir.y * speed * dt,
        state,
      )
    }

    enemy.cooldown = Math.max(0, enemy.cooldown - dt)

    if (enemy.type === 'chaser') {
      if (circlesOverlap(enemy, state.player)) {
        state.player.health = Math.max(
          0,
          state.player.health - config.chaserCollisionDamage,
        )
        enemy.alive = false
        addExplosion(state, enemy.x, enemy.y)
      }
      continue
    }

    if (dist <= config.shooterAttackRange && enemy.cooldown <= 0) {
      enemy.cooldown = config.shooterCooldownSeconds
      spawnProjectile(state, {
        x: enemy.x,
        y: enemy.y,
        rotation: enemy.rotation,
        speed: config.shooterProjectileSpeed,
        damage: config.shooterProjectileDamage,
        life: config.projectileLifetimeSeconds,
        owner: 'enemy',
      })
    }
  }
}

function updateProjectiles(state: SimulationState, dt: number) {
  for (const bullet of state.projectiles) {
    if (!bullet.alive) continue

    bullet.x += bullet.vx * dt
    bullet.y += bullet.vy * dt
    bullet.life -= dt

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.y < -20 ||
      bullet.x > ARENA_WIDTH + 20 ||
      bullet.y > ARENA_HEIGHT + 20 ||
      hitsIsland(bullet.x, bullet.y, bullet.radius, state)
    ) {
      bullet.alive = false
      continue
    }

    if (bullet.owner === 'player') {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue
        if (!circlesOverlap(bullet, enemy)) continue

        bullet.alive = false
        enemy.health -= bullet.damage
        if (enemy.health <= 0) {
          enemy.alive = false
          state.score += 1
          addExplosion(state, enemy.x, enemy.y)
        }
        break
      }
      continue
    }

    if (state.player.alive && circlesOverlap(bullet, state.player)) {
      bullet.alive = false
      state.player.health = Math.max(0, state.player.health - bullet.damage)
    }
  }
}

function cleanupEntities(state: SimulationState) {
  state.enemies = state.enemies.filter((enemy) => enemy.alive)
  state.projectiles = state.projectiles.filter((bullet) => bullet.alive)
  state.explosions = state.explosions.filter((item) => item.life > 0)
}

export function createSimulation(config: GameConfig): SimulationState {
  nextId = 1

  return {
    player: {
      id: 'player',
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      rotation: -Math.PI / 2,
      radius: 252,
      health: config.playerMaxHealth,
      maxHealth: config.playerMaxHealth,
      alive: true,
    },
    enemies: [],
    projectiles: [],
    explosions: [],
    islands: ARENA_ISLANDS.map((island) => ({ ...island })),
    spawnTimer: 1,
    nextEnemyIsChaser: true,
    nextChaserSkin: 0,
    nextShooterSkin: 0,
    timeLeft: config.sessionTimeSeconds,
    score: 0,
    paused: false,
    ended: false,
    endReason: null,
    durationPlayed: 0,
    frontCooldown: 0,
    leftCooldown: 0,
    rightCooldown: 0,
  }
}

/** Test helper: apply one player hit using the same scoring rules as combat. */
export function applyTestPlayerHit(
  state: SimulationState,
  config: GameConfig,
  enemyId: string,
): boolean {
  if (state.ended) return false
  const enemy = state.enemies.find((item) => item.id === enemyId && item.alive)
  if (!enemy) return false

  enemy.health -= config.projectileDamage
  if (enemy.health <= 0) {
    enemy.alive = false
    enemy.health = 0
    state.score += 1
    addExplosion(state, enemy.x, enemy.y)
  }
  return true
}

export function getSnapshot(state: SimulationState): MatchSnapshot {
  return {
    timeLeft: Math.max(0, state.timeLeft),
    score: state.score,
    playerHealth: Math.max(0, state.player.health),
    playerMaxHealth: state.player.maxHealth,
    paused: state.paused,
    ended: state.ended,
    endReason: state.endReason,
    durationPlayed: state.durationPlayed,
  }
}

export function setPaused(state: SimulationState, paused: boolean) {
  if (state.ended) return
  state.paused = paused
}

export function togglePause(state: SimulationState) {
  if (state.ended) return
  state.paused = !state.paused
}

export function updateSimulation(
  state: SimulationState,
  config: GameConfig,
  input: InputState,
  dt: number,
) {
  if (state.ended) return

  if (input.pausePressed) {
    togglePause(state)
  }

  if (state.paused) return

  const step = clamp(dt, 0, 0.05)

  state.timeLeft -= step
  state.durationPlayed += step
  state.frontCooldown = Math.max(0, state.frontCooldown - step)
  state.leftCooldown = Math.max(0, state.leftCooldown - step)
  state.rightCooldown = Math.max(0, state.rightCooldown - step)
  state.spawnTimer -= step

  updatePlayer(state, config, input, step)
  updateEnemies(state, config, step)
  updateProjectiles(state, step)

  for (const explosion of state.explosions) {
    explosion.life -= step
  }

  if (state.spawnTimer <= 0) {
    state.spawnTimer = config.enemySpawnTimeSeconds
    spawnEnemy(state, config)
  }

  cleanupEntities(state)

  if (state.player.health <= 0) {
    state.player.alive = false
    state.player.health = 0
    state.ended = true
    state.endReason = 'death'
    state.paused = false
    addExplosion(state, state.player.x, state.player.y)
    return
  }

  if (state.timeLeft <= 0) {
    state.timeLeft = 0
    state.ended = true
    state.endReason = 'timeout'
    state.paused = false
  }
}
