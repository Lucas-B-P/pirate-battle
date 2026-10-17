import { Assets, Texture } from 'pixi.js'
import { assetUrl } from '../assetUrl'
import {
  CHASER_SKIN_COUNT,
  PLAYER_SKIN_COUNT,
  SHOOTER_SKIN_COUNT,
  chaserSkinPath,
  playerSkinPath,
  shooterSkinPath,
} from './shipSkins'

export type GameTextures = {
  water: Texture
  grass: Texture
  rock: Texture
  tower: Texture
  plant: Texture
  playerSkins: Texture[]
  chaserSkins: Texture[]
  shooterSkins: Texture[]
  cannonBall: Texture
  explosionFrames: Texture[]
  fireFrames: Texture[]
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
  cannonBall: assetUrl('assets/png/default/ship_parts/cannon_ball.png'),
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

const FIRE_FRAME_COUNT = 12
const EXPLOSION_FRAME_COUNT = 10

function frameUrl(folder: string, index: number): string {
  const name = `frame_${index.toString().padStart(2, '0')}.png`
  return assetUrl(`assets/png/default/effects/${folder}/${name}`)
}

export async function loadGameTextures(
  onProgress?: (progress: number) => void,
): Promise<GameTextures> {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('failAssets') === '1'
  ) {
    throw new Error('Forced asset load failure')
  }

  const entries = Object.entries(ASSET_PATHS) as [keyof typeof ASSET_PATHS, string][]
  const frameUrls = [
    ...Array.from({ length: FIRE_FRAME_COUNT }, (_, index) => frameUrl('fire_anim', index)),
    ...Array.from({ length: EXPLOSION_FRAME_COUNT }, (_, index) =>
      frameUrl('explosion_anim', index),
    ),
  ]
  const playerUrls = Array.from({ length: PLAYER_SKIN_COUNT }, (_, index) =>
    assetUrl(playerSkinPath(index)),
  )
  const chaserUrls = Array.from({ length: CHASER_SKIN_COUNT }, (_, index) =>
    assetUrl(chaserSkinPath(index)),
  )
  const shooterUrls = Array.from({ length: SHOOTER_SKIN_COUNT }, (_, index) =>
    assetUrl(shooterSkinPath(index)),
  )
  const total = entries.length + frameUrls.length + playerUrls.length + chaserUrls.length + shooterUrls.length
  let loaded = 0
  const textures = {} as GameTextures

  for (const [key, url] of entries) {
    textures[key] = await Assets.load<Texture>(url)
    loaded += 1
    onProgress?.(loaded / total)
  }

  const frames: Texture[] = []
  for (const url of frameUrls) {
    frames.push(await Assets.load<Texture>(url))
    loaded += 1
    onProgress?.(loaded / total)
  }

  textures.fireFrames = frames.slice(0, FIRE_FRAME_COUNT)
  textures.explosionFrames = frames.slice(FIRE_FRAME_COUNT)

  textures.playerSkins = []
  for (const url of playerUrls) {
    textures.playerSkins.push(await Assets.load<Texture>(url))
    loaded += 1
    onProgress?.(loaded / total)
  }

  textures.chaserSkins = []
  for (const url of chaserUrls) {
    textures.chaserSkins.push(await Assets.load<Texture>(url))
    loaded += 1
    onProgress?.(loaded / total)
  }

  textures.shooterSkins = []
  for (const url of shooterUrls) {
    textures.shooterSkins.push(await Assets.load<Texture>(url))
    loaded += 1
    onProgress?.(loaded / total)
  }

  return textures
}
