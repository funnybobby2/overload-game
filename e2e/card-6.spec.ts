import { test, expect } from '@playwright/test'

test('jouer le dernier 6 termine la manche sans déclencher la décharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 6 vert, couleur active verte → jouable sans surcharge
  // Jauge à 2 : si l'effet décharge se déclenchait, elle passerait à 1 — elle ne doit pas
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 6 }],
      players: [
        { gauge: 2, hand: [{ color: 'green', value: 6 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '6 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '2')
})

test('jouer un 6 avec surcharge montre que la surcharge et la décharge s\'annulent', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 6 : green ≠ yellow et |6-2| = 4 ≠ 1 → non jouable → surcharge (+1)
  // Effet décharge appliqué ensuite (-1) → jauge inchangée à 1
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 1, hand: [{ color: 'green', value: 6 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '6 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  // Surcharge prise (+1) puis décharge appliquée (-1) → jauge reste à 1
  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
})

test('combo de deux 6 sans surcharge transfère une surcharge vers la cible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // yellow 6 de la couleur active (jaune) → combo jouable sans surcharge
  // Jauge à 2 pour pouvoir transférer
  // Effet combo : transférer 1 surcharge vers un adversaire (2→1 et 0→1)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 2, hand: [{ color: 'green', value: 6 }, { color: 'yellow', value: 6 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '6 vert' }).click()
  await page.getByRole('button', { name: '6 jaune' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByText('Cliquez sur le joueur qui recevra votre surcharge.')).toBeVisible()

  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('jouer un 6 de la couleur courante réduit la jauge du joueur sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 6 = couleur courante verte → jouable sans surcharge
  // Effet simple : jauge du joueur diminue de 1 (1 → 0)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 6 }],
      players: [
        { gauge: 1, hand: [{ color: 'green', value: 6 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '6 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Décharge appliquée : jauge passe de 1 à 0
  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
})
