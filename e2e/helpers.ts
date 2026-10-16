import { expect, type Page } from '@playwright/test'
import type { PirateBattleTestApi } from '../src/game/testApi'

export const STORAGE = {
  options: 'pirate-battle:options',
  networkScenario: 'pirate-battle:network-scenario',
  confirmedMatches: 'pirate-battle:confirmed-matches',
  pendingMatch: 'pirate-battle:pending-match',
  lastResult: 'pirate-battle:last-result',
  playerId: 'pirate-battle:player-id',
  playerName: 'pirate-battle:player-name',
} as const

type ResetOptions = {
  sessionTimeSeconds?: number
  enemySpawnTimeSeconds?: number
  networkScenario?: string
}

/** Clears and seeds localStorage once. Does not re-run on later reloads. */
export async function resetAppState(page: Page, options?: ResetOptions) {
  await page.goto('/?e2e=1')
  await page.evaluate(
    ({ storage, values }) => {
      localStorage.clear()
      localStorage.setItem(
        storage.options,
        JSON.stringify({
          sessionTimeSeconds: values.sessionTimeSeconds,
          enemySpawnTimeSeconds: values.enemySpawnTimeSeconds,
        }),
      )
      localStorage.setItem(storage.networkScenario, values.networkScenario)
      localStorage.setItem(storage.playerId, 'e2e_player')
      localStorage.setItem(storage.playerName, 'E2E Captain')
    },
    {
      storage: STORAGE,
      values: {
        sessionTimeSeconds: options?.sessionTimeSeconds ?? 60,
        enemySpawnTimeSeconds: options?.enemySpawnTimeSeconds ?? 2,
        networkScenario: options?.networkScenario ?? 'success',
      },
    },
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
}

export async function openMenu(page: Page) {
  await page.goto('/?e2e=1')
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
}

export async function setNetworkScenario(page: Page, scenario: string) {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value)
    },
    { key: STORAGE.networkScenario, value: scenario },
  )
  await page.reload()
}

export async function startMatch(page: Page) {
  await page.goto('/game?e2e=1')
  await expect(page.getByTestId('game-stage')).toBeVisible()
  await expect(page.getByTestId('match-hud')).toBeVisible()
  await page.waitForFunction(() => window.__pirateBattleTest?.ready === true, null, {
    timeout: 30_000,
  })
}

export async function getTestApi(page: Page): Promise<PirateBattleTestApi> {
  const api = await page.evaluate(() => window.__pirateBattleTest)
  if (!api) {
    throw new Error('Test API was not found. Open /game?e2e=1 first.')
  }
  return api
}

export async function stepSeconds(page: Page, seconds: number, dt = 1 / 60) {
  const steps = Math.max(1, Math.round(seconds / dt))
  await page.evaluate(
    ({ stepsCount, stepDt }) => {
      const api = window.__pirateBattleTest
      if (!api) throw new Error('missing test api')
      for (let i = 0; i < stepsCount; i += 1) {
        api.step(stepDt)
      }
    },
    { stepsCount: steps, stepDt: dt },
  )
}

export async function holdKey(page: Page, key: string, seconds: number) {
  await page.keyboard.down(key)
  await stepSeconds(page, seconds)
  await page.keyboard.up(key)
}
