import type { MatchSnapshot } from './types'

export type PirateBattleTestApi = {
  ready: boolean
  getSnapshot: () => MatchSnapshot
  getPlayer: () => {
    x: number
    y: number
    rotation: number
    health: number
    alive: boolean
  }
  getEnemies: () => Array<{
    id: string
    type: string
    x: number
    y: number
    health: number
  }>
  getProjectileCount: () => number
  getScore: () => number
  step: (dtSeconds?: number) => MatchSnapshot
  setSeed: (seed: number) => void
  setTimeLeft: (seconds: number) => void
  setPlayerHealth: (health: number) => void
}

declare global {
  interface Window {
    __pirateBattleTest?: PirateBattleTestApi
  }
}

export function isE2EMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('e2e') === '1'
}
