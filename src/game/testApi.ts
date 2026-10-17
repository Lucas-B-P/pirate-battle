import type { MatchSnapshot } from './types'

const E2E_FLAG = 'pirate-battle:e2e'

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
    skin: number
    x: number
    y: number
    health: number
  }>
  getIslands: () => Array<{ x: number; y: number; radius: number }>
  getProjectileCount: () => number
  getScore: () => number
  step: (dtSeconds?: number) => MatchSnapshot
  setSeed: (seed: number) => void
  setTimeLeft: (seconds: number) => void
  setPlayerHealth: (health: number) => void
  applyPlayerHit: (enemyId: string) => boolean
}

declare global {
  interface Window {
    __pirateBattleTest?: PirateBattleTestApi
  }
}

export function isE2EMode(): boolean {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).get('e2e') === '1') {
    sessionStorage.setItem(E2E_FLAG, '1')
    return true
  }
  return sessionStorage.getItem(E2E_FLAG) === '1'
}
