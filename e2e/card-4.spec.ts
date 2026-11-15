import { test, expect } from '@playwright/test'

test('jouer le dernier 4 termine la manche sans déclencher le choix de couleur', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Seule carte en main : 4 vert, couleur active verte → jouable sans surcharge
  // Après jeu : main vide → manche terminée, choix de couleur non déclenché
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 4 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '4 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Choisir la couleur active' })).not.toBeVisible()
})

test('jouer un 4 avec surcharge prend une surcharge et déclenche le choix de couleur', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 4 : green ≠ yellow et |4-7| = 3 ≠ 1 → non jouable → surcharge
  // Effet : sélecteur de couleur apparaît
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 4 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '4 vert' }).click()
  await page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('group', { name: 'Choisir la couleur active' })).toBeVisible()
})

test('combo de deux 4 sans surcharge change la couleur active et bloque les combos', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // gray 4 toujours jouable → combo sans surcharge
  // Effet combo : choix de couleur + combos bloqués au prochain tour
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 7 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 4 }, { color: 'gray', value: 4 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '4 vert' }).click()
  await page.getByRole('button', { name: '4 gris' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(
    page.getByText('Choisissez une couleur. Les combos seront bloqués au prochain tour.')
  ).toBeVisible()

  await page.getByRole('button', { name: 'Vert', exact: true }).click()

  await expect(page.getByRole('group', { name: 'Choisir la couleur active' })).not.toBeVisible()
})

test('jouer un 4 de la couleur courante ouvre le choix de couleur sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // green 4 = couleur courante verte → jouable sans surcharge
  // Effet simple : sélecteur de couleur active apparaît
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'yellow', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 4 }, { color: 'red', value: 1 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 5 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '4 vert' }).click()
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('group', { name: 'Choisir la couleur active' })).toBeVisible()
})
