import { test, expect } from '@playwright/test'

for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  test(`en état critique, sélectionner un combo de ${value} affiche une erreur`, async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => typeof window.__testSetup === 'function')

    // 2 cartes en main → état critique (hand.length < 3) → combo interdit
    await page.evaluate((v) => {
      window.__testSetup({
        playerCount: 2,
        activeColor: 'green',
        revealedCard: { type: 'overload' },
        discardPile: [{ color: 'yellow', value: v }],
        players: [
          { gauge: 0, hand: [{ color: 'green', value: v }, { color: 'gray', value: v }] },
          { gauge: 0 },
        ],
        currentPlayerIndex: 0,
      })
    }, value)

    await page.getByRole('button', { name: `${value} vert` }).click()
    await page.getByRole('button', { name: `${value} gris` }).click()

    await expect(
      page.getByText('En état critique, vous ne pouvez pas sélectionner un combo.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jouer le combo', exact: true })).not.toBeVisible()
  })
}
