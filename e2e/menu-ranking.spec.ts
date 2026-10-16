import { expect, test } from '@playwright/test'
import { resetAppState, setNetworkScenario } from './helpers'

test.describe('Menu ranking and history', () => {
  test('shows ranking fixtures and handles empty/error scenarios', async ({
    page,
  }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'success',
    })

    await expect(page.getByRole('tab', { name: 'Ranking' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
    await expect(page.getByText('Anne Bonny')).toBeVisible()

    await setNetworkScenario(page, 'empty')
    await expect(page.getByText(/No ranking entries/i)).toBeVisible()

    await setNetworkScenario(page, 'error')
    await expect(page.getByRole('alert')).toContainText('Could not load ranking')

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load match history')
  })

  test('visual regression of main menu', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Desktop baseline only')

    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'success',
    })
    await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

