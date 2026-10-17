import type { MatchRecord } from '../types/match'
import { STORAGE_KEYS } from './storageKeys'

function readQueue(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pendingMatch)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [parsed as MatchRecord]
    }

    return parsed as MatchRecord[]
  } catch {
    return []
  }
}

function writeQueue(matches: MatchRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.pendingMatch, JSON.stringify(matches))
}

export function loadPendingMatches(): MatchRecord[] {
  return readQueue()
}

export function loadPendingMatch(): MatchRecord | null {
  return readQueue()[0] ?? null
}

export function savePendingMatch(match: MatchRecord): void {
  const queue = readQueue().filter((item) => item.id !== match.id)
  writeQueue([...queue, match])
}

export function removePendingMatch(matchId: string): void {
  writeQueue(readQueue().filter((item) => item.id !== matchId))
}

export function clearPendingMatch(): void {
  localStorage.removeItem(STORAGE_KEYS.pendingMatch)
}
