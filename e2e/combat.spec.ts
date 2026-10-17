import { expect, test } from '@playwright/test'
import { holdKey, resetAppState, startMatch, stepSeconds } from './helpers'

test.describe('Combat arena', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'success',
    })
  })

  test('loads assets and supports movement, rotation and shooting', async ({
    page,
  }) => {
    await startMatch(page)

    const before = await page.evaluate(() => window.__pirateBattleTest!.getPlayer())

    await holdKey(page, 'KeyD', 0.4)
    const rotated = await page.evaluate(() => window.__pirateBattleTest!.getPlayer())
    expect(rotated.rotation).not.toBeCloseTo(before.rotation, 3)

    await holdKey(page, 'KeyW', 0.5)
    const moved = await page.evaluate(() => window.__pirateBattleTest!.getPlayer())
    expect(Math.hypot(moved.x - before.x, moved.y - before.y)).toBeGreaterThan(5)

    await page.keyboard.down('Space')
    await stepSeconds(page, 0.05)
    await page.keyboard.up('Space')
    const bulletsFront = await page.evaluate(
      () => window.__pirateBattleTest!.getProjectileCount(),
    )
    expect(bulletsFront).toBeGreaterThanOrEqual(1)

    await page.keyboard.down('KeyQ')
    await stepSeconds(page, 0.05)
    await page.keyboard.up('KeyQ')
    const bulletsSide = await page.evaluate(
      () => window.__pirateBattleTest!.getProjectileCount(),
    )
    expect(bulletsSide).toBeGreaterThanOrEqual(bulletsFront)
  })

  test('respects front cannon cooldown and scores one point per kill', async ({
    page,
  }) => {
    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setSeed(3))

    await page.keyboard.down('Space')
    await stepSeconds(page, 0.02)
    await page.keyboard.up('Space')
    const first = await page.evaluate(() => window.__pirateBattleTest!.getProjectileCount())

    await page.keyboard.down('Space')
    await stepSeconds(page, 0.02)
    await page.keyboard.up('Space')
    const duringCooldown = await page.evaluate(
      () => window.__pirateBattleTest!.getProjectileCount(),
    )
    expect(duringCooldown).toBe(first)

    await stepSeconds(page, 0.4)
    await page.keyboard.down('Space')
    await stepSeconds(page, 0.02)
    await page.keyboard.up('Space')
    const afterCooldown = await page.evaluate(
      () => window.__pirateBattleTest!.getProjectileCount(),
    )
    expect(afterCooldown).toBeGreaterThan(first)

    await stepSeconds(page, 2.2)
    const score = await page.evaluate(() => {
      const api = window.__pirateBattleTest!
      const enemy = api.getEnemies()[0]
      if (!enemy) return -1
      api.applyPlayerHit(enemy.id)
      api.applyPlayerHit(enemy.id)
      // Extra hits must not raise the score again after the kill.
      api.applyPlayerHit(enemy.id)
      return api.getScore()
    })
    expect(score).toBe(1)
  })

  test('keeps the ship inside the arena and blocked by islands', async ({
    page,
  }) => {
    await startMatch(page)

    await page.keyboard.down('KeyW')
    await stepSeconds(page, 8)
    await page.keyboard.up('KeyW')

    const result = await page.evaluate(() => {
      const api = window.__pirateBattleTest!
      const player = api.getPlayer()
      const islands = api.getIslands()
      const playerRadius = 252
      const overlapsIsland = islands.some((island) => {
        const dx = player.x - island.x
        const dy = player.y - island.y
        return Math.hypot(dx, dy) < island.radius + playerRadius - 1
      })
      return { player, overlapsIsland }
    })

    const tile = 640
    const radius = 108
    expect(result.player.x).toBeGreaterThanOrEqual(radius)
    expect(result.player.y).toBeGreaterThanOrEqual(radius)
    expect(result.player.x).toBeLessThanOrEqual(34 * tile - radius)
    expect(result.player.y).toBeLessThanOrEqual(17 * tile - radius)
    expect(result.overlapsIsland).toBeFalsy()
  })

  test('pauses with P and does not advance the timer while paused', async ({
    page,
  }) => {
    await startMatch(page)

    await stepSeconds(page, 1)
    const mid = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())

    await page.keyboard.down('KeyP')
    await stepSeconds(page, 0.05)
    await page.keyboard.up('KeyP')

    await expect(page.getByTestId('hud-status')).toHaveText('Paused')
    await stepSeconds(page, 2)
    const paused = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())

    expect(paused.paused).toBeTruthy()
    expect(paused.timeLeft).toBeCloseTo(mid.timeLeft, 1)

    await page.getByTestId('game-stage').getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByTestId('hud-status')).toHaveText('Fighting')
    await stepSeconds(page, 0.2)
    const resumed = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())
    expect(resumed.paused).toBeFalsy()
    expect(resumed.timeLeft).toBeLessThan(paused.timeLeft)
  })

  test('pauses on blur without advancing the timer', async ({ page }) => {
    await startMatch(page)
    await stepSeconds(page, 0.5)
    const before = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await expect(page.getByTestId('hud-status')).toHaveText('Paused')
    await stepSeconds(page, 1.5)
    const paused = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())
    expect(paused.paused).toBeTruthy()
    expect(paused.timeLeft).toBeCloseTo(before.timeLeft, 1)
  })

  test('spawns chaser and shooter on the configured interval', async ({ page }) => {
    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setSeed(7))

    await stepSeconds(page, 2.1)
    let enemies = await page.evaluate(() => window.__pirateBattleTest!.getEnemies())
    expect(enemies.length).toBe(1)

    await stepSeconds(page, 2.1)
    enemies = await page.evaluate(() => window.__pirateBattleTest!.getEnemies())
    expect(enemies.length).toBe(2)
    expect(enemies.some((enemy) => enemy.type === 'chaser')).toBeTruthy()
    expect(enemies.some((enemy) => enemy.type === 'shooter')).toBeTruthy()
  })

  test('ends by timeout and by death, then restarts cleanly', async ({ page }) => {
    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setTimeLeft(0.05))
    await stepSeconds(page, 0.2)
    await expect(page).toHaveURL(/\/result/)
    await expect(page.getByTestId('save-status')).toBeVisible()

    await page.getByTestId('play-again').click()
    await expect(page).toHaveURL(/\/game/)
    await page.waitForFunction(() => window.__pirateBattleTest?.ready === true, null, {
      timeout: 30_000,
    })

    const restarted = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())
    expect(restarted.score).toBe(0)
    expect(restarted.ended).toBeFalsy()
    expect(restarted.playerHealth).toBe(100)

    await page.evaluate(() => window.__pirateBattleTest!.setPlayerHealth(0))
    await stepSeconds(page, 0.2)
    await expect(page).toHaveURL(/\/result/)
    await expect(page.getByText(/Defeat/i)).toBeVisible()
  })

  test('visual regression of a stable arena state', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Desktop baseline only')

    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setSeed(1))
    await stepSeconds(page, 0.5)

    await expect(page.getByTestId('game-stage')).toHaveScreenshot('arena-stable.png', {
      animations: 'disabled',
    })
  })
})
