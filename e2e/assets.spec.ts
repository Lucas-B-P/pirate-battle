import { expect, test } from '@playwright/test'
import { resetAppState } from './helpers'

test.describe('Match asset loading', () => {
  test('shows loading progress then the arena', async ({ page }) => {
    await resetAppState(page)
    await page.goto('/game?e2e=1')
    await expect(page.getByTestId('game-stage')).toBeVisible()
    await page.waitForFunction(() => window.__pirateBattleTest?.ready === true, null, {
      timeout: 30_000,
    })
    await expect(page.getByTestId('match-hud')).toBeVisible()
    await expect(page.getByTestId('game-stage')).toHaveAttribute('aria-busy', 'false')
  })

  test('shows an error and recovers after retry', async ({ page }) => {
    await resetAppState(page)
    await page.goto('/game?e2e=1&failAssets=1')
    await expect(page.getByRole('alert')).toContainText(/Could not load assets/i, {
      timeout: 15_000,
    })
    await expect(page.locator('#retry-assets')).toBeVisible()

    await page.evaluate(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('failAssets')
      window.history.replaceState({}, '', url.toString())
    })
    await page.locator('#retry-assets').click()

    await page.waitForFunction(() => window.__pirateBattleTest?.ready === true, null, {
      timeout: 30_000,
    })
    await expect(page.getByTestId('match-hud')).toBeVisible()
  })
})
