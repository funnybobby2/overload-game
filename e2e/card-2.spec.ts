import { test, expect } from '@playwright/test'

test('jouer le dernier 2 termine la manche sans déclencher l\'effet pioche', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 2 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet pioche non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
})

test('jouer un 2 avec surcharge prend une surcharge et fait piocher le joueur suivant', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 2 : green ≠ yellow et |2-5| = 3 ≠ 1 → non jouable → surcharge
  // Effet : joueur 2 pioche 1 carte (3 → 4)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})

test('combo de deux 2 sans surcharge fait piocher le joueur suivant de 2 cartes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // gray 2 toujours jouable → combo sans surcharge
  // Effet combo : joueur suivant pioche 2 cartes (3 → 5)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }, { color: 'gray', value: 2 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: '2 gris' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
})

test('jouer un 2 de la couleur courante fait piocher le joueur suivant sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 2 = couleur courante verte → jouable sans surcharge
  // Effet simple : le joueur suivant (Joueur 2) pioche 1 carte (3 → 4)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})
