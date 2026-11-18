import { test, expect } from '@playwright/test'

test('jouer le dernier 8 termine la manche sans déclencher l\'effet arrosage', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 8 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet arrosage non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 8 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 8 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '8 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
})

test('jouer un 8 avec surcharge prend une surcharge et fait piocher tous les adversaires', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 8 : green ≠ yellow et |8-3| = 5 ≠ 1 → non jouable → surcharge
  // Effet : tous les autres joueurs piochent 1 carte (3 → 4)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 8 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '8 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})

test('combo de deux 8 sans surcharge fait piocher tous les adversaires de 2 cartes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // yellow 8 de la couleur active (jaune) → combo jouable sans surcharge
  // Effet combo : tous les autres joueurs piochent 2 cartes (3 → 5)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 8 }, { color: 'yellow', value: 8 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '8 vert' }).click()
  await page.getByRole('button', { name: '8 jaune' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
})

test('jouer un 8 de la couleur courante fait piocher tous les adversaires sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 8 = couleur courante verte → jouable sans surcharge
  // Effet simple : tous les adversaires piochent 1 carte (3 → 4)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 8 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 8 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '8 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})
