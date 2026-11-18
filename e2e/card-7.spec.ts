import { test, expect } from '@playwright/test'

test('jouer le dernier 7 termine la manche sans déclencher l\'effet menace', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 7 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, effet menace non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByText('Cliquez sur un joueur à cibler.')).not.toBeVisible()
})

test('jouer un 7 avec surcharge prend une surcharge et déclenche l\'effet menace', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 7 : green ≠ yellow et |7-3| = 4 ≠ 1 → non jouable → surcharge
  // Effet : prompt de ciblage menace apparaît
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
})

test('combo de deux 7 sans surcharge inflige une surcharge et fait piocher la cible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // yellow 7 de la couleur active (jaune) → combo jouable sans surcharge
  // Effet combo : la cible prend 1 surcharge ET pioche 1 carte (bot choisit automatiquement surcharge)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }, { color: 'yellow', value: 7 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await page.getByRole('button', { name: '7 jaune' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await page.getByRole('button', { name: /joueur 2/i }).click()

  // Le bot choisit la surcharge → jauge 0→1, et pioche 1 carte en plus du combo (3→4)
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})

test('jouer un 7 de la couleur courante déclenche le ciblage menace sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 7 = couleur courante verte → jouable sans surcharge
  // Effet simple : prompt de ciblage apparaît pour choisir la cible de la menace
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 5 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
})
