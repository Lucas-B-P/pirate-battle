import type { GameTextures } from './assets'
import { buildTilemapView, type MapViewHandle } from './tilemap'

/** Renders the editable tilemap from `maps/channel.level.ts`. */
export function buildMapView(textures: GameTextures): MapViewHandle {
  return buildTilemapView({
    water: textures.water,
    grass: textures.grass,
    rock: textures.rock,
    tower: textures.tower,
    plant: textures.plant,
  })
}
