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

/** Speeds / ranges scaled for the 10× world (TILE_SIZE 640). */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  sessionTimeSeconds: 90,
  enemySpawnTimeSeconds: 3,
  playerMaxHealth: 100,
  playerMoveSpeed: 1800,
  playerRotationSpeed: 2.4,
  playerFrontCooldownSeconds: 0.35,
  playerSideCooldownSeconds: 0.7,
  projectileSpeed: 4200,
  projectileDamage: 25,
  projectileLifetimeSeconds: 1.4,
  chaserMoveSpeed: 1400,
  chaserHealth: 40,
  chaserCollisionDamage: 30,
  shooterMoveSpeed: 1000,
  shooterHealth: 50,
  shooterAttackRange: 2600,
  shooterCooldownSeconds: 1.2,
  shooterProjectileSpeed: 3200,
  shooterProjectileDamage: 15,
}

/** Options the player can change in the Options screen. */
export type PlayerOptions = {
  sessionTimeSeconds: number
  enemySpawnTimeSeconds: number
  /** Menu music volume from 0 to 1. */
  musicVolume: number
  /** In-match music volume from 0 to 1. */
  gameMusicVolume: number
  /** UI / SFX volume from 0 to 1. */
  sfxVolume: number
}

export const MUSIC_VOLUME_MIN = 0
export const MUSIC_VOLUME_MAX = 1
export const DEFAULT_MUSIC_VOLUME = 0.45
export const DEFAULT_GAME_MUSIC_VOLUME = 0.5
export const DEFAULT_SFX_VOLUME = 0.7

export const DEFAULT_PLAYER_OPTIONS: PlayerOptions = {
  sessionTimeSeconds: DEFAULT_GAME_CONFIG.sessionTimeSeconds,
  enemySpawnTimeSeconds: DEFAULT_GAME_CONFIG.enemySpawnTimeSeconds,
  musicVolume: DEFAULT_MUSIC_VOLUME,
  gameMusicVolume: DEFAULT_GAME_MUSIC_VOLUME,
  sfxVolume: DEFAULT_SFX_VOLUME,
}

export function createMatchConfig(options: PlayerOptions): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    sessionTimeSeconds: options.sessionTimeSeconds,
    enemySpawnTimeSeconds: options.enemySpawnTimeSeconds,
  }
}
