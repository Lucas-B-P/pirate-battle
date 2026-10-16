import { STORAGE_KEYS } from './storageKeys'

function createId(): string {
  return `player_${Math.random().toString(36).slice(2, 10)}`
}

export function getPlayerId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.playerId)
  if (existing) {
    return existing
  }

  const id = createId()
  localStorage.setItem(STORAGE_KEYS.playerId, id)
  return id
}

/** Raw saved nickname (may be empty). */
export function loadPlayerName(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.playerName)?.trim() ?? ''
  // Legacy auto-filled default — treat as empty so the field starts blank.
  if (!existing || existing === 'Captain Lucas') {
    if (existing === 'Captain Lucas') {
      localStorage.removeItem(STORAGE_KEYS.playerName)
    }
    return ''
  }

  return existing
}

/** Name used in match records / ranking. */
export function getPlayerName(): string {
  return loadPlayerName() || 'Pirata'
}

export function setPlayerName(name: string): void {
  const trimmed = name.trim().slice(0, 24)
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEYS.playerName)
    return
  }

  localStorage.setItem(STORAGE_KEYS.playerName, trimmed)
}
