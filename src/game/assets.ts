import { Assets, Texture } from 'pixi.js'
import { assetUrl } from '../assetUrl'

export type GameTextures = {
  water: Texture
  island: Texture
  playerShip: Texture
  chaserShip: Texture
  shooterShip: Texture
  cannonBall: Texture
  explosion: Texture
  fire: Texture
}

const ASSET_PATHS = {
  water: assetUrl('assets/png/default/tiles/tile_73.png'),
  island: assetUrl('assets/png/default/tiles/tile_45.png'),
  playerShip: assetUrl('assets/png/default/ships/ship_1.png'),
  chaserShip: assetUrl('assets/png/default/ships/ship_4.png'),
  shooterShip: assetUrl('assets/png/default/ships/ship_8.png'),
  cannonBall: assetUrl('assets/png/default/ship_parts/cannon_ball.png'),
  explosion: assetUrl('assets/png/default/effects/explosion_1.png'),
  fire: assetUrl('assets/png/default/effects/fire_1.png'),
} as const

export async function loadGameTextures(
  onProgress?: (progress: number) => void,
): Promise<GameTextures> {
  const entries = Object.entries(ASSET_PATHS) as [keyof GameTextures, string][]
  const textures = {} as GameTextures

  for (let index = 0; index < entries.length; index += 1) {
    const [key, url] = entries[index]!
    textures[key] = await Assets.load<Texture>(url)
    onProgress?.((index + 1) / entries.length)
  }

  return textures
}
