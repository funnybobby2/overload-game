import { test, expect } from '@playwright/test'

test('jouer le dernier 9 termine la manche sans déclencher l\'effet déséquilibre', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 9 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet déséquilibre non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 9 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '9 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
})

test('jouer un 9 avec surcharge prend une surcharge et fait piocher les joueurs avec le moins de cartes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 9 : green ≠ yellow et |9-5| = 4 ≠ 1 → non jouable → surcharge
  // Effet : le joueur avec le moins de cartes (ici joueur 2, seul adversaire) pioche 2 cartes (3 → 5)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 9 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '9 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
})

test('combo de deux 9 sans surcharge inflige une surcharge aux joueurs avec le moins de cartes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // yellow 9 de la couleur active (jaune) → combo jouable sans surcharge
  // Effet combo : le joueur avec le moins de cartes (joueur 2, seul adversaire) reçoit 1 surcharge
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 9 }, { color: 'yellow', value: 9 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '9 vert' }).click()
  await page.getByRole('button', { name: '9 jaune' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  // Surcharge infligée (pas de pioche) : jauge 0→1, nombre de cartes inchangé
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
})

test('jouer un 9 de la couleur courante fait piocher le joueur avec le moins de cartes sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 9 = couleur courante verte → jouable sans surcharge
  // Joueur 2 a 1 carte (moins que le joueur 0 qui en a 2) → pioche 2 cartes (1 → 3)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 9 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '9 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
})
