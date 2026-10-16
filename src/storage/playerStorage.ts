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

export function getPlayerName(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.playerName)
  if (existing) {
    return existing
  }

  const name = 'Captain Lucas'
  localStorage.setItem(STORAGE_KEYS.playerName, name)
  return name
}
