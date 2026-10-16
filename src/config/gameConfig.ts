/**
 * Central gameplay settings.
 * Balance changes should happen here, not inside game systems.
 */
export type GameConfig = {
  sessionTimeSeconds: number
  enemySpawnTimeSeconds: number
  playerMaxHealth: number
  playerMoveSpeed: number
  playerRotationSpeed: number
  playerFrontCooldownSeconds: number
  playerSideCooldownSeconds: number
  projectileSpeed: number
  projectileDamage: number
  projectileLifetimeSeconds: number
  chaserMoveSpeed: number
  chaserHealth: number
  chaserCollisionDamage: number
  shooterMoveSpeed: number
  shooterHealth: number
  shooterAttackRange: number
  shooterCooldownSeconds: number
  shooterProjectileSpeed: number
  shooterProjectileDamage: number
}

export const SESSION_TIME_MIN = 60
export const SESSION_TIME_MAX = 180
export const SPAWN_TIME_MIN = 1
export const SPAWN_TIME_MAX = 10

export const DEFAULT_GAME_CONFIG: GameConfig = {
  sessionTimeSeconds: 90,
  enemySpawnTimeSeconds: 3,
  playerMaxHealth: 100,
  playerMoveSpeed: 180,
  playerRotationSpeed: 2.4,
  playerFrontCooldownSeconds: 0.35,
  playerSideCooldownSeconds: 0.7,
  projectileSpeed: 420,
  projectileDamage: 25,
  projectileLifetimeSeconds: 1.4,
  chaserMoveSpeed: 140,
  chaserHealth: 40,
  chaserCollisionDamage: 30,
  shooterMoveSpeed: 100,
  shooterHealth: 50,
  shooterAttackRange: 260,
  shooterCooldownSeconds: 1.2,
  shooterProjectileSpeed: 320,
  shooterProjectileDamage: 15,
}

/** Options the player can change in the Options screen. */
export type PlayerOptions = {
  sessionTimeSeconds: number
  enemySpawnTimeSeconds: number
}

export const DEFAULT_PLAYER_OPTIONS: PlayerOptions = {
  sessionTimeSeconds: DEFAULT_GAME_CONFIG.sessionTimeSeconds,
  enemySpawnTimeSeconds: DEFAULT_GAME_CONFIG.enemySpawnTimeSeconds,
}

export function createMatchConfig(options: PlayerOptions): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    sessionTimeSeconds: options.sessionTimeSeconds,
    enemySpawnTimeSeconds: options.enemySpawnTimeSeconds,
  }
}
