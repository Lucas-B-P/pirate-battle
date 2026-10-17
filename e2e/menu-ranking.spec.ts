import { expect, test } from '@playwright/test'
import { resetAppState, setNetworkScenario } from './helpers'

test.describe('Menu ranking and history', () => {
  test('shows ranking fixtures, pagination, empty and error scenarios', async ({
    page,
  }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'success',
    })

    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('tab', { name: 'Ranking' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
    await expect(page.getByText('Anne Bonny')).toBeVisible()
    await expect(page.getByText(/Page 1 of 2/i)).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/Page 2 of 2/i)).toBeVisible()
    await expect(page.getByText('Mary Read')).toBeVisible()

    await setNetworkScenario(page, 'empty')
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(
      page.getByText(/No leaderboard entries for current options/i),
    ).toBeVisible()

    await setNetworkScenario(page, 'error')
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load the leaderboard')

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load match history')
  })

  test('handles client error and offline network scenarios', async ({ page }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'client-error',
    })

    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load the leaderboard')

    await setNetworkScenario(page, 'offline')
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load the leaderboard')
  })

  test('visual regression of main menu', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Desktop baseline only')

    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'success',
    })
    await expect(page.getByAltText('Pirate Battle')).toBeVisible()
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
