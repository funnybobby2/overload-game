import { test, expect } from '@playwright/test'

test('jouer une carte Overload et cibler joueur 2 augmente sa jauge de 1', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'overload' }, { color: 'red', value: 1 }] },
        { gauge: 1, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Overload, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('jouer une carte Overload sur joueur 2 à jauge 2 déclenche l\'explosion : jauge 0, pioche 2, main visible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // gauge=2 → Overload +1 → gauge=3=MAX_GAUGE → explosion : jauge 0, pioche 2, main visible
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'overload' }, { color: 'red', value: 1 }] },
        { gauge: 2, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Overload, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
  await expect(page.getByText('Main dévoilée')).toBeVisible()
})
