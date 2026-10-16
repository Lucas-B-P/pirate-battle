import { expect, test } from '@playwright/test'
import { resetAppState } from './helpers'

test.describe('Navigation and abandon', () => {
  test('can leave a match without registering it', async ({ page }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 60,
      enemySpawnTimeSeconds: 2,
      networkScenario: 'success',
    })

    await page.getByTestId('play-button').click()
    await expect(page).toHaveURL(/\/game/)
    await page.keyboard.press('KeyP')
    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(page).toHaveURL(/\/$/)

    const pending = await page.evaluate(() =>
      localStorage.getItem('pirate-battle:pending-match'),
    )
    const lastResult = await page.evaluate(() =>
      localStorage.getItem('pirate-battle:last-result'),
    )

    expect(pending).toBeNull()
    expect(lastResult).toBeNull()
  })

  test('mobile project can open play flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile project only')

    await resetAppState(page)
    await page.getByTestId('play-button').click()
    await expect(page.getByTestId('game-stage')).toBeVisible()
    await expect(page.getByLabel('Touch controls')).toBeVisible()
  })
})
