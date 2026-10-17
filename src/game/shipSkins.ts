export const PLAYER_SKIN_COUNT = 10
export const CHASER_SKIN_COUNT = 5
export const SHOOTER_SKIN_COUNT = 5

export const PLAYER_SKIN_NAMES = [
  'Cross',
  'Anchor',
  'Compass Rose',
  'Skull',
  'Wave',
  'Tree',
  'Dragon',
  'Trident',
  'Moon',
  'Sun',
] as const

export function playerSkinPath(index: number): string {
  return `assets/png/default/ships/player/skin_${pad(index)}.png`
}

export function chaserSkinPath(index: number): string {
  return `assets/png/default/ships/enemy/ship_${pad(index)}.png`
}

export function shooterSkinPath(index: number): string {
  return `assets/png/default/ships/enemy/ship_${pad(index + CHASER_SKIN_COUNT)}.png`
}

function pad(index: number): string {
  return String(index).padStart(2, '0')
}
