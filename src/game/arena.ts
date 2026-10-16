import { TILE_SIZE, getLevelSize } from './maps/channel.level'
import { buildIslandsFromTilemap, isWaterAt } from './tilemap'
import type { Island } from './types'

const size = getLevelSize()

export { TILE_SIZE }
export const ARENA_WIDTH = size.width
export const ARENA_HEIGHT = size.height

/** How many tiles fit across the screen (local view — never the whole 10× map). */
export const CAMERA_VISIBLE_TILES = 20

/** Spawn in open water (south-center channel). */
export const PLAYER_SPAWN = {
  x: ARENA_WIDTH * 0.5,
  y: ARENA_HEIGHT * 0.78,
}

/** Collision bodies generated from solid tiles in channel.level.ts */
export const ARENA_ISLANDS: Island[] = buildIslandsFromTilemap()

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

export function isWaterPoint(x: number, y: number, clearance = 0): boolean {
  return isWaterAt(x, y, clearance)
}
