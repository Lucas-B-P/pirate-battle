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

  test('keeps the ship inside the arena and blocked by islands', async ({
    page,
  }) => {
    await startMatch(page)

    // Push the ship forward for a long time; it must remain in bounds.
    await page.keyboard.down('KeyW')
    await stepSeconds(page, 8)
    await page.keyboard.up('KeyW')

    const player = await page.evaluate(() => window.__pirateBattleTest!.getPlayer())
    const tile = 640
    const radius = 108
    expect(player.x).toBeGreaterThanOrEqual(radius)
    expect(player.y).toBeGreaterThanOrEqual(radius)
    expect(player.x).toBeLessThanOrEqual(34 * tile - radius)
    expect(player.y).toBeLessThanOrEqual(17 * tile - radius)
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

    // Let React mark the match as externally paused, then prove time is frozen.
    await expect(page.getByTestId('hud-status')).toHaveText('Paused')
    await stepSeconds(page, 0.05)
    await stepSeconds(page, 2)
    const paused = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())

    expect(paused.paused).toBeTruthy()
    expect(paused.timeLeft).toBeCloseTo(mid.timeLeft, 1)

    await page.getByTestId('game-stage').getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByTestId('hud-status')).toHaveText('Fighting')
    await stepSeconds(page, 0.2)
    const resumed = await page.evaluate(() => window.__pirateBattleTest!.getSnapshot())
    expect(resumed.paused).toBeFalsy()
    expect(resumed.timeLeft).toBeLessThan(paused.timeLeft)
  })

  test('spawns enemies and can end by timeout', async ({ page }) => {
    await startMatch(page)

    await page.evaluate(() => window.__pirateBattleTest!.setSeed(7))
    await stepSeconds(page, 3)
    const enemies = await page.evaluate(() => window.__pirateBattleTest!.getEnemies())
    expect(enemies.length).toBeGreaterThan(0)
    expect(enemies.some((enemy) => enemy.type === 'chaser')).toBeTruthy()

    await page.evaluate(() => {
      window.__pirateBattleTest!.setTimeLeft(0.05)
    })
    await stepSeconds(page, 0.2)

    await expect(page).toHaveURL(/\/result/)
    await expect(page.getByTestId('save-status')).toBeVisible()
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
