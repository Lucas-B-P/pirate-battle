import { expect, test } from '@playwright/test'
import { resetAppState, STORAGE } from './helpers'

test.describe('Options', () => {
  test('validates, autosaves and persists options after refresh', async ({
    page,
  }) => {
    await resetAppState(page, {
      sessionTimeSeconds: 90,
      enemySpawnTimeSeconds: 3,
    })

    await page.getByTestId('options-button').click()
    await expect(page.getByText('Options', { exact: true })).toBeVisible()
    await expect(page.getByTestId('network-scenario')).toBeVisible()

    await page.getByTestId('session-time').fill('30')
    await page.getByTestId('spawn-time').fill('0')
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByText(/Enter a value between 60 and 180/i)).toBeVisible()

    await page.getByTestId('session-time').fill('120')
    await page.getByTestId('spawn-time').fill('4')
    await expect(page.getByRole('status')).toContainText(
      'Changes saved automatically',
    )

    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), STORAGE.options))
      .toContain('"sessionTimeSeconds":120')
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), STORAGE.options))
      .toContain('"enemySpawnTimeSeconds":4')

    await page.reload()
    await expect(page.getByTestId('session-time')).toHaveValue('120')
    await expect(page.getByTestId('spawn-time')).toHaveValue('4')
  })
})
