import {
  DEFAULT_GAME_MUSIC_VOLUME,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_PLAYER_OPTIONS,
  DEFAULT_SFX_VOLUME,
  MUSIC_VOLUME_MAX,
  MUSIC_VOLUME_MIN,
  SESSION_TIME_MAX,
  SESSION_TIME_MIN,
  SPAWN_TIME_MAX,
  SPAWN_TIME_MIN,
  type PlayerOptions,
} from '../config/gameConfig'
import { STORAGE_KEYS } from './storageKeys'

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(MUSIC_VOLUME_MAX, Math.max(MUSIC_VOLUME_MIN, value))
}

function normalizeOptions(value: unknown): PlayerOptions | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const options = value as Partial<PlayerOptions>
  if (
    typeof options.sessionTimeSeconds !== 'number' ||
    typeof options.enemySpawnTimeSeconds !== 'number' ||
    options.sessionTimeSeconds < SESSION_TIME_MIN ||
    options.sessionTimeSeconds > SESSION_TIME_MAX ||
    options.enemySpawnTimeSeconds < SPAWN_TIME_MIN ||
    options.enemySpawnTimeSeconds > SPAWN_TIME_MAX
  ) {
    return null
  }

  return {
    sessionTimeSeconds: options.sessionTimeSeconds,
    enemySpawnTimeSeconds: options.enemySpawnTimeSeconds,
    musicVolume: clampVolume(options.musicVolume, DEFAULT_MUSIC_VOLUME),
    gameMusicVolume: clampVolume(
      options.gameMusicVolume,
      DEFAULT_GAME_MUSIC_VOLUME,
    ),
    sfxVolume: clampVolume(options.sfxVolume, DEFAULT_SFX_VOLUME),
  }
}

export function loadPlayerOptions(): PlayerOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.options)
    if (!raw) {
      return { ...DEFAULT_PLAYER_OPTIONS }
    }

    const parsed: unknown = JSON.parse(raw)
    return normalizeOptions(parsed) ?? { ...DEFAULT_PLAYER_OPTIONS }
  } catch {
    return { ...DEFAULT_PLAYER_OPTIONS }
  }
}

export function savePlayerOptions(options: PlayerOptions): void {
  const normalized: PlayerOptions = {
    sessionTimeSeconds: options.sessionTimeSeconds,
    enemySpawnTimeSeconds: options.enemySpawnTimeSeconds,
    musicVolume: clampVolume(options.musicVolume, DEFAULT_MUSIC_VOLUME),
    gameMusicVolume: clampVolume(
      options.gameMusicVolume,
      DEFAULT_GAME_MUSIC_VOLUME,
    ),
    sfxVolume: clampVolume(options.sfxVolume, DEFAULT_SFX_VOLUME),
  }
  localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(normalized))
}
