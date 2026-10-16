import type { Island } from './types'

export const ARENA_WIDTH = 1280
export const ARENA_HEIGHT = 720

export const ARENA_ISLANDS: Island[] = [
  { id: 'island_1', x: 340, y: 220, radius: 70 },
  { id: 'island_2', x: 920, y: 480, radius: 90 },
  { id: 'island_3', x: 700, y: 180, radius: 55 },
]

export function isInsideArena(x: number, y: number, radius: number): boolean {
  return (
    x - radius >= 0 &&
    y - radius >= 0 &&
    x + radius <= ARENA_WIDTH &&
    y + radius <= ARENA_HEIGHT
  )
}

export function clampToArena(x: number, y: number, radius: number) {
  return {
    x: Math.min(ARENA_WIDTH - radius, Math.max(radius, x)),
    y: Math.min(ARENA_HEIGHT - radius, Math.max(radius, y)),
  }
}
