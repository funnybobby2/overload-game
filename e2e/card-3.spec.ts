import { test, expect } from '@playwright/test'

test('jouer le dernier 3 termine la manche sans déclencher l\'effet espionnage', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 3 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet espionnage non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 4 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '3 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByText('Cliquez sur le joueur dont vous voulez voir la main.')).not.toBeVisible()
})

test('jouer un 3 avec surcharge prend une surcharge et déclenche l\'effet espionnage', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 3 : green ≠ yellow et |3-7| = 4 ≠ 1 → non jouable → surcharge
  // Effet : prompt espionnage apparaît
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 3 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 4 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '3 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Cliquez sur le joueur dont vous voulez voir la main.')).toBeVisible()
})

test('combo de deux 3 sans surcharge déclenche l\'échange et révèle la main de la cible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // gray 3 toujours jouable → combo sans surcharge
  // Effet combo : échange de carte avec la cible, puis main révélée
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 3 }, { color: 'gray', value: 3 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 4 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '3 vert' }).click()
  await page.getByRole('button', { name: '3 gris' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur pour échanger une carte au hasard.')).toBeVisible()

  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByText('Main dévoilée')).toBeVisible()
})

test('jouer un 3 de la couleur courante déclenche l\'espionnage sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 3 = couleur courante verte → jouable sans surcharge
  // Effet simple : prompt pour choisir la main d'un joueur à espionner
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 3 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 4 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '3 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByText('Cliquez sur le joueur dont vous voulez voir la main.')).toBeVisible()
})
