import { Assets, Texture } from 'pixi.js'
import { assetUrl } from '../assetUrl'

export type GameTextures = {
  water: Texture
  grass: Texture
  rock: Texture
  tower: Texture
  plant: Texture
  playerShip: Texture
  chaserShip: Texture
  shooterShip: Texture
  cannonBall: Texture
  explosion: Texture
  fire: Texture
  healthFrame: Texture
  healthFill: Texture
  counterPanel: Texture
  iconHeart: Texture
  iconScore: Texture
  iconTime: Texture
  btnRound: Texture
  iconForward: Texture
  iconTurnLeft: Texture
  iconTurnRight: Texture
  iconFireFront: Texture
  iconFireLeft: Texture
  iconFireRight: Texture
  iconPause: Texture
}

const ASSET_PATHS = {
  water: assetUrl('assets/png/default/tiles/tile_73.png'),
  grass: assetUrl('assets/png/default/tiles/tile_40.png'),
  rock: assetUrl('assets/png/default/tiles/tile_50.png'),
  tower: assetUrl('assets/png/default/tiles/tile_45.png'),
  plant: assetUrl('assets/png/default/tiles/tile_70.png'),
  playerShip: assetUrl('assets/png/default/ships/ship_1.png'),
  chaserShip: assetUrl('assets/png/default/ships/ship_4.png'),
  shooterShip: assetUrl('assets/png/default/ships/ship_8.png'),
  cannonBall: assetUrl('assets/png/default/ship_parts/cannon_ball.png'),
  explosion: assetUrl('assets/png/default/effects/explosion_1.png'),
  fire: assetUrl('assets/png/default/effects/fire_1.png'),
  healthFrame: assetUrl('assets/png/default/ui/hud/health_frame.png'),
  healthFill: assetUrl('assets/png/default/ui/hud/health_fill_green.png'),
  counterPanel: assetUrl('assets/png/default/ui/hud/counter_panel.png'),
  iconHeart: assetUrl('assets/png/default/ui/hud/icon_heart.png'),
  iconScore: assetUrl('assets/png/default/ui/hud/icon_score.png'),
  iconTime: assetUrl('assets/png/default/ui/hud/icon_time.png'),
  btnRound: assetUrl('assets/png/default/ui/controls/button_round_normal.png'),
  iconForward: assetUrl('assets/png/default/ui/controls/icon_forward.png'),
  iconTurnLeft: assetUrl('assets/png/default/ui/controls/icon_turn_left.png'),
  iconTurnRight: assetUrl('assets/png/default/ui/controls/icon_turn_right.png'),
  iconFireFront: assetUrl('assets/png/default/ui/controls/icon_fire_front.png'),
  iconFireLeft: assetUrl('assets/png/default/ui/controls/icon_fire_left.png'),
  iconFireRight: assetUrl('assets/png/default/ui/controls/icon_fire_right.png'),
  iconPause: assetUrl('assets/png/default/ui/controls/icon_pause.png'),
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
