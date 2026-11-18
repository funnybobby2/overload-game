import { test, expect } from '@playwright/test'

test('l\'écran d\'accueil propose les 3 modes optionnels, activés par défaut et désactivables séparément', async ({ page }) => {
  await page.goto('/')

  const critical = page.getByRole('switch', { name: /État critique/ })
  const shield = page.getByRole('switch', { name: /Bouclier/ })
  const blackout = page.getByRole('switch', { name: /Panne générale/ })

  await expect(critical).toBeChecked()
  await expect(shield).toBeChecked()
  await expect(blackout).toBeChecked()

  await page.getByText('Bouclier', { exact: true }).click()
  await expect(shield).not.toBeChecked()
  await expect(critical).toBeChecked()
  await expect(blackout).toBeChecked()
})

test('mode Bouclier désactivé : 2 attaques consécutives ne donnent pas de bouclier', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      rules: { shield: false },
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }], attacksSinceTurn: 1 },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('img', { name: 'bouclier pour' })).toHaveCount(0)
})

test('mode État critique désactivé : un combo reste possible avec 2 cartes en main', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      rules: { criticalState: false },
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 4 }, { color: 'gray', value: 4 }] },
        { gauge: 0 },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '4 vert' }).click()
  await page.getByRole('button', { name: '4 gris' }).click()

  await expect(page.getByText('En état critique, vous ne pouvez pas sélectionner un combo.')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Jouer le combo', exact: true })).toBeVisible()
})

test('mode État critique désactivé : une attaque sur un joueur à 2 cartes ne génère pas de surcharge supplémentaire', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      rules: { criticalState: false },
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'yellow', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('mode Panne générale désactivé : la pioche sous 8 cartes ne double pas les effets', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      rules: { blackout: false },
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      drawPile: [
        { color: 'blue', value: 1 }, { color: 'blue', value: 3 }, { color: 'blue', value: 4 },
        { color: 'blue', value: 6 }, { color: 'blue', value: 8 },
      ],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 2, hand: [{ color: 'yellow', value: 2 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Surcharge maximale → pioche de 2 cartes (5 → 3), sans activer la panne générale
  await expect(page.getByText('Pioche · 3 cartes', { exact: true })).toBeVisible()
  await expect(page.getByText(/Panne générale ×2/)).not.toBeVisible()
})
