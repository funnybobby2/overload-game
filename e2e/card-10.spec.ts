import { test, expect } from '@playwright/test'

test('jouer le dernier 10 termine la manche sans déclencher l\'effet apocalypse', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 10 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet apocalypse non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 10 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '0')
})

test('jouer un 10 avec surcharge prend une surcharge et en inflige une à tous les adversaires', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 10 : green ≠ yellow et |10-5| = 5 ≠ 1 → non jouable → surcharge
  // Effet : tous les autres joueurs reçoivent 1 surcharge
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('combo de deux 10 sans surcharge inflige 2 surcharges à tous les adversaires', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // gray 10 toujours jouable → combo sans surcharge
  // Effet combo : tous les autres joueurs reçoivent 2 surcharges (0 → 2)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'gray', value: 10 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: '10 gris' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('jouer un 10 de la couleur courante inflige une surcharge à tous les adversaires sans surcharge propre', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 10 = couleur courante verte → jouable sans surcharge
  // Effet simple : tous les adversaires reçoivent 1 surcharge (0 → 1)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 10 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Vous ne prend pas de surcharge
  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  // Joueur 2 reçoit 1 surcharge
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})
