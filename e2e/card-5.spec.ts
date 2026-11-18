import { test, expect } from '@playwright/test'

test('jouer le dernier 5 termine la manche sans inverser le sens ni déclencher le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 5 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, inversion et rejouer non déclenchés
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
})

test('jouer un 5 avec surcharge prend une surcharge et inverse le sens du jeu', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 5 : green ≠ yellow et |5-2| = 3 ≠ 1 → non jouable → surcharge
  // Effet : sens de jeu inversé (horaire → antihoraire)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Sens antihoraire')).toBeVisible()
})

test('combo de deux 5 sans surcharge inverse le sens et permet de rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // yellow 5 de la couleur active (jaune) → combo jouable sans surcharge
  // Effet combo : inversion du sens + effet rejouer
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }, { color: 'yellow', value: 5 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: '5 jaune' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByText('Sens antihoraire')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).toBeVisible()
})

test('jouer un 5 de la couleur courante inverse le sens du jeu sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 5 = couleur courante verte → jouable sans surcharge
  // Effet simple : sens de jeu inversé (horaire → antihoraire)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByText('Sens antihoraire')).toBeVisible()
})
