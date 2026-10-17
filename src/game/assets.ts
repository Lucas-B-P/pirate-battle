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

let texturesPromise: Promise<GameTextures> | null = null

function frameUrl(folder: string, index: number): string {
  const name = `frame_${index.toString().padStart(2, '0')}.png`
  return assetUrl(`assets/png/default/effects/${folder}/${name}`)
}

function shouldForceFail(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('failAssets') === '1'
  )
}

async function loadAllTextures(
  onProgress?: (progress: number) => void,
): Promise<GameTextures> {
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

  const allUrls = [
    ...entries.map(([, url]) => url),
    ...frameUrls,
    ...playerUrls,
    ...chaserUrls,
    ...shooterUrls,
  ]
  const total = allUrls.length
  let loaded = 0

  await Promise.all(
    allUrls.map(async (url) => {
      await Assets.load(url)
      loaded += 1
      onProgress?.(loaded / total)
    }),
  )

  const textures = {} as GameTextures
  for (const [key, url] of entries) {
    textures[key] = Assets.get<Texture>(url)
  }

  textures.fireFrames = frameUrls
    .slice(0, FIRE_FRAME_COUNT)
    .map((url) => Assets.get<Texture>(url))
  textures.explosionFrames = frameUrls
    .slice(FIRE_FRAME_COUNT)
    .map((url) => Assets.get<Texture>(url))
  textures.playerSkins = playerUrls.map((url) => Assets.get<Texture>(url))
  textures.chaserSkins = chaserUrls.map((url) => Assets.get<Texture>(url))
  textures.shooterSkins = shooterUrls.map((url) => Assets.get<Texture>(url))

  onProgress?.(1)
  return textures
}

/**
 * Loads match textures once per page lifetime (until hard refresh / cache clear).
 */
export async function loadGameTextures(
  onProgress?: (progress: number) => void,
): Promise<GameTextures> {
  if (shouldForceFail()) {
    texturesPromise = null
    throw new Error('Forced asset load failure')
  }

  if (!texturesPromise) {
    texturesPromise = loadAllTextures(onProgress).catch((error) => {
      texturesPromise = null
      throw error
    })
  } else {
    onProgress?.(1)
  }

  return texturesPromise
}

export function clearGameTextureCache(): void {
  texturesPromise = null
}
