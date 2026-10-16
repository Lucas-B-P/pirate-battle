import {
  DEFAULT_PLAYER_OPTIONS,
  SESSION_TIME_MAX,
  SESSION_TIME_MIN,
  SPAWN_TIME_MAX,
  SPAWN_TIME_MIN,
  type PlayerOptions,
} from '../config/gameConfig'
import { STORAGE_KEYS } from './storageKeys'

function isValidOptions(value: unknown): value is PlayerOptions {
  if (!value || typeof value !== 'object') {
    return false
  }

  const options = value as PlayerOptions
  return (
    typeof options.sessionTimeSeconds === 'number' &&
    typeof options.enemySpawnTimeSeconds === 'number' &&
    options.sessionTimeSeconds >= SESSION_TIME_MIN &&
    options.sessionTimeSeconds <= SESSION_TIME_MAX &&
    options.enemySpawnTimeSeconds >= SPAWN_TIME_MIN &&
    options.enemySpawnTimeSeconds <= SPAWN_TIME_MAX
  )
}

export function loadPlayerOptions(): PlayerOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.options)
    if (!raw) {
      return { ...DEFAULT_PLAYER_OPTIONS }
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isValidOptions(parsed)) {
      return { ...DEFAULT_PLAYER_OPTIONS }
    }

    return parsed
  } catch {
    return { ...DEFAULT_PLAYER_OPTIONS }
  }
}

export function savePlayerOptions(options: PlayerOptions): void {
  localStorage.setItem(STORAGE_KEYS.options, JSON.stringify(options))
}
