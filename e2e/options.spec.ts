import { expect, test } from '@playwright/test'
import { resetAppState, STORAGE } from './helpers'

test.describe('Options', () => {
  test('validates, saves and persists options after refresh', async ({ page }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
    })

    await page.getByTestId('options-button').click()
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()

    await page.getByTestId('session-time').fill('30')
    await page.getByTestId('spawn-time').fill('0')
    await page.getByTestId('save-options').click()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByText(/between 60 and 180/i)).toBeVisible()

    await page.getByTestId('session-time').fill('120')
    await page.getByTestId('spawn-time').fill('4')
    await page.getByTestId('save-options').click()

    await expect(page.getByRole('status')).toContainText('Options saved')

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE.options)
    expect(stored).toContain('"sessionTimeSeconds":120')
    expect(stored).toContain('"enemySpawnTimeSeconds":4')

    await page.reload()
    await expect(page.getByTestId('session-time')).toHaveValue('120')
    await expect(page.getByTestId('spawn-time')).toHaveValue('4')
  })
})
