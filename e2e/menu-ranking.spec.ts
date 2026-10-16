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

    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('tab', { name: 'Ranking' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Player' })).toBeVisible()
    await expect(page.getByText('Anne Bonny')).toBeVisible()

    await setNetworkScenario(page, 'empty')
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByText(/Sem entradas no ranking/i)).toBeVisible()

    await setNetworkScenario(page, 'error')
    await page.getByRole('button', { name: 'Ranking' }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o ranking')

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o histórico')
  })

  test('visual regression of main menu', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Desktop baseline only')

    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
      networkScenario: 'success',
    })
    await expect(page.getByAltText('Batalha Pirata')).toBeVisible()
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

