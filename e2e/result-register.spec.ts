import { expect, test } from '@playwright/test'
import { resetAppState, startMatch, stepSeconds, STORAGE } from './helpers'

test.describe('Result registration', () => {
  test('registers a finished match and updates ranking and history', async ({
    page,
  }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'success',
    })

    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setTimeLeft(0.05))
    await stepSeconds(page, 0.2)

    await expect(page).toHaveURL(/\/result/)
    await expect(page.getByTestId('save-status')).toHaveText('Saved', {
      timeout: 15_000,
    })

    await page.getByTestId('result-main-menu').click()

    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
    await expect(page.getByText('E2E Captain')).toBeVisible()

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible()
    await expect(page.locator('.table tbody tr').first()).toBeVisible()
  })

  test('keeps pending save after register timeout, survives refresh, and retries without duplication', async ({
    page,
  }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'timeout-on-register',
    })

    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setTimeLeft(0.05))
    await stepSeconds(page, 0.2)

    await expect(page).toHaveURL(/\/result/)
    await expect(page.getByTestId('save-status')).toHaveText('Failed', {
      timeout: 20_000,
    })

    const pendingBefore = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE.pendingMatch,
    )
    expect(pendingBefore).toBeTruthy()
    const pendingId = JSON.parse(pendingBefore!)[0].id as string

    await page.reload()
    await expect(page.getByTestId('save-status')).toHaveText(/Failed|Pending/)
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), STORAGE.pendingMatch))
      .toContain(pendingId)

    await page.evaluate((key) => {
      localStorage.setItem(key, 'success')
    }, STORAGE.networkScenario)

    await page.getByTestId('retry-save').click()
    await expect(page.getByTestId('save-status')).toHaveText('Saved', {
      timeout: 15_000,
    })

    const confirmed = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as Array<{ id: string }>) : []
    }, STORAGE.confirmedMatches)

    expect(confirmed).toHaveLength(1)
    expect(confirmed[0]?.id).toBe(pendingId)

    await page.reload()
    await expect(page.getByTestId('save-status')).toHaveText('Saved')
  })

  test('persists the last result after refresh', async ({ page }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'success',
    })
    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setTimeLeft(0.05))
    await stepSeconds(page, 0.2)
    await expect(page.getByTestId('save-status')).toHaveText('Saved', {
      timeout: 15_000,
    })

    const scoreText = await page.locator('.wood-score').first().innerText()
    await page.reload()
    await expect(page.getByTestId('save-status')).toHaveText('Saved')
    await expect(page.locator('.wood-score').first()).toHaveText(scoreText)
  })

  test('visual regression of result screen', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Desktop baseline only')

    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'success',
    })
    await startMatch(page)
    await page.evaluate(() => window.__pirateBattleTest!.setTimeLeft(0.05))
    await stepSeconds(page, 0.2)
    await expect(page.getByTestId('save-status')).toHaveText('Saved', {
      timeout: 15_000,
    })

    await expect(page).toHaveScreenshot('result-screen.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
