import { Container, Graphics, Sprite, TilingSprite, type Texture } from 'pixi.js'
import type { Island } from './types'
import {
  LEVEL_ROWS,
  TILE_SIZE,
  getLevelSize,
  type TileCode,
} from './maps/channel.level'

export type TilemapTextures = {
  water: Texture
  grass: Texture
  rock: Texture
  tower: Texture
  plant: Texture
}

export type MapViewHandle = {
  root: Container
  /** Hide tiles outside the camera frustum (+ margin in world px). */
  updateVisibility: (bounds: {
    left: number
    top: number
    right: number
    bottom: number
  }) => void
}

const SAND = 0xe2c48a
const SAND_SHADOW = 0xc9a86a

type TileSprite = {
  col: number
  row: number
  display: Container
}

function cell(col: number, row: number): TileCode {
  const line = LEVEL_ROWS[row] ?? ''
  const ch = line[col] ?? '.'
  return ch as TileCode
}

export function isSolidCode(code: TileCode): boolean {
  return code === 'S' || code === 'G' || code === 'R' || code === 'P' || code === 'T'
}

/** Collision circles derived from solid tiles (keeps sim simple). */
export function buildIslandsFromTilemap(): Island[] {
  const { cols, rows } = getLevelSize()
  const islands: Island[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const code = cell(col, row)
      if (!isSolidCode(code)) continue
      islands.push({
        id: `tile_${col}_${row}`,
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
        radius: TILE_SIZE * 0.48,
      })
    }
  }

  return islands
}

export function isWaterAt(x: number, y: number, clearance = 0): boolean {
  const { cols, rows, width, height } = getLevelSize()
  if (x < clearance || y < clearance || x > width - clearance || y > height - clearance) {
    return false
  }

  const minC = Math.max(0, Math.floor((x - clearance) / TILE_SIZE))
  const maxC = Math.min(cols - 1, Math.floor((x + clearance) / TILE_SIZE))
  const minR = Math.max(0, Math.floor((y - clearance) / TILE_SIZE))
  const maxR = Math.min(rows - 1, Math.floor((y + clearance) / TILE_SIZE))

  for (let row = minR; row <= maxR; row += 1) {
    for (let col = minC; col <= maxC; col += 1) {
      if (isSolidCode(cell(col, row))) return false
    }
  }
  return true
}

/**
 * Builds the map from the editable ASCII level.
 * Water + land are culled to the camera so the full 10× arena is never drawn at once.
 */
export function buildTilemapView(
  textures: TilemapTextures,
  options: { lite?: boolean } = {},
): MapViewHandle {
  const lite = Boolean(options.lite)
  const root = new Container()
  const { cols, rows } = getLevelSize()

  // Viewport-sized water plane (repositioned each cull pass).
  const water = new TilingSprite({
    texture: textures.water,
    width: TILE_SIZE * 12,
    height: TILE_SIZE * 12,
  })
  water.tileScale.set(TILE_SIZE / 64)
  root.addChild(water)

  const landLayer = new Container()
  root.addChild(landLayer)

  const tracked: TileSprite[] = []
  let lastMinC = Number.NaN
  let lastMaxC = Number.NaN
  let lastMinR = Number.NaN
  let lastMaxR = Number.NaN
  let lastWaterLeft = Number.NaN
  let lastWaterTop = Number.NaN

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const code = cell(col, row)
      if (code === '.') continue

      const cellRoot = new Container()
      cellRoot.x = col * TILE_SIZE
      cellRoot.y = row * TILE_SIZE

      if (lite) {
        // One rect per tile instead of two rounded fills — cheaper on mobile GPUs.
        const sand = new Graphics()
        sand.rect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4).fill({ color: SAND })
        cellRoot.addChild(sand)
      } else {
        const sand = new Graphics()
        const pad = Math.max(2, TILE_SIZE * 0.02)
        const inset = Math.max(6, TILE_SIZE * 0.09)
        sand
          .roundRect(pad, pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2, TILE_SIZE * 0.14)
          .fill({ color: SAND })
        sand
          .roundRect(
            inset,
            inset,
            TILE_SIZE - inset * 2,
            TILE_SIZE - inset * 2,
            TILE_SIZE * 0.12,
          )
          .fill({ color: SAND_SHADOW, alpha: 0.25 })
        cellRoot.addChild(sand)
      }

      const cx = TILE_SIZE / 2
      const cy = TILE_SIZE / 2

      if (code === 'G' || code === 'P') {
        const grass = new Sprite(textures.grass)
        grass.anchor.set(0.5)
        grass.width = TILE_SIZE - 8
        grass.height = TILE_SIZE - 8
        grass.x = cx
        grass.y = cy
        cellRoot.addChild(grass)
      }

      if (code === 'R') {
        const rock = new Sprite(textures.rock)
        rock.anchor.set(0.5)
        rock.scale.set(0.55 * (TILE_SIZE / 64))
        rock.x = cx
        rock.y = cy
        cellRoot.addChild(rock)
      }

      if (code === 'P') {
        const plant = new Sprite(textures.plant)
        plant.anchor.set(0.5)
        plant.scale.set(0.55 * (TILE_SIZE / 64))
        plant.x = cx + TILE_SIZE * 0.06
        plant.y = cy - TILE_SIZE * 0.06
        cellRoot.addChild(plant)
      }

      if (code === 'T') {
        const tower = new Sprite(textures.tower)
        tower.anchor.set(0.5)
        tower.scale.set(0.7 * (TILE_SIZE / 64))
        tower.x = cx
        tower.y = cy
        cellRoot.addChild(tower)
      }

      cellRoot.visible = false
      landLayer.addChild(cellRoot)
      tracked.push({ col, row, display: cellRoot })
    }
  }

  function updateVisibility(bounds: {
    left: number
    top: number
    right: number
    bottom: number
  }) {
    const margin = TILE_SIZE
    const left = bounds.left - margin
    const top = bounds.top - margin
    const right = bounds.right + margin
    const bottom = bounds.bottom + margin

    const viewW = Math.max(TILE_SIZE * 4, right - left)
    const viewH = Math.max(TILE_SIZE * 4, bottom - top)
    if (
      left !== lastWaterLeft ||
      top !== lastWaterTop ||
      water.width !== viewW ||
      water.height !== viewH
    ) {
      water.width = viewW
      water.height = viewH
      water.x = left
      water.y = top
      water.tilePosition.x = -left
      water.tilePosition.y = -top
      lastWaterLeft = left
      lastWaterTop = top
    }

    const minC = Math.max(0, Math.floor(left / TILE_SIZE))
    const maxC = Math.min(cols - 1, Math.floor(right / TILE_SIZE))
    const minR = Math.max(0, Math.floor(top / TILE_SIZE))
    const maxR = Math.min(rows - 1, Math.floor(bottom / TILE_SIZE))

    if (
      minC === lastMinC &&
      maxC === lastMaxC &&
      minR === lastMinR &&
      maxR === lastMaxR
    ) {
      return
    }
    lastMinC = minC
    lastMaxC = maxC
    lastMinR = minR
    lastMaxR = maxR

    for (const tile of tracked) {
      tile.display.visible =
        tile.col >= minC &&
        tile.col <= maxC &&
        tile.row >= minR &&
        tile.row <= maxR
    }
  }

  return { root, updateVisibility }
}
