import type { LastMatchResult } from '../types/match'
import { STORAGE_KEYS } from './storageKeys'

export function loadLastResult(): LastMatchResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastResult)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as LastMatchResult
  } catch {
    return null
  }
}

export function saveLastResult(result: LastMatchResult): void {
  localStorage.setItem(STORAGE_KEYS.lastResult, JSON.stringify(result))
}

export function clearLastResult(): void {
  localStorage.removeItem(STORAGE_KEYS.lastResult)
}
