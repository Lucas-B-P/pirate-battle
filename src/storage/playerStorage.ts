import { PLAYER_SKIN_COUNT } from '../game/shipSkins'
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

export function loadShipSkin(): number {
  const raw = localStorage.getItem(STORAGE_KEYS.shipSkin)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value >= PLAYER_SKIN_COUNT) return 0
  return value
}

export function setShipSkin(skin: number): void {
  const value = Math.trunc(skin)
  if (value < 0 || value >= PLAYER_SKIN_COUNT) return
  localStorage.setItem(STORAGE_KEYS.shipSkin, String(value))
}

export function loadPlayerName(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.playerName)?.trim() ?? ''
  if (!existing || existing === 'Captain Lucas') {
    if (existing === 'Captain Lucas') {
      localStorage.removeItem(STORAGE_KEYS.playerName)
    }
    return ''
  }

  return existing
}

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
