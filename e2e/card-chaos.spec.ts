import { test, expect } from '@playwright/test'

test('jouer Chaos (sens horaire) : chaque joueur pioche chez son voisin de gauche', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // 3 joueurs, turnDirection=1 (défaut) : joueur 0 pioche chez joueur 1 (index 1)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 3,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'chaos' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 8 }, { color: 'green', value: 9 }, { color: 'blue', value: 10 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Chaos, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Voisin de gauche (sens horaire) = Joueur 2 (index 1)
  await expect(page.getByText(/Cliquez sur une carte face cachée de Joueur 2/)).toBeVisible()
  await page.locator('.player-seat[aria-label*="Joueur 2"]').getByRole('button', { name: 'Choisir cette carte' }).first().click()

  // Après résolution : tous les joueurs ont encore le même nombre de cartes (échange 1-pour-1)
  await expect(page.locator('.player-seat[aria-label*="Vous, 2 cartes"]')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 3, 3 cartes"]')).toBeVisible()
})

test('jouer Chaos (sens antihoraire) : chaque joueur pioche chez son voisin de droite', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // 3 joueurs, turnDirection=-1 : joueur 0 pioche chez joueur 2 (index 2, soit Joueur 3)
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 3,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'chaos' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 8 }, { color: 'green', value: 9 }, { color: 'blue', value: 10 }] },
      ],
      currentPlayerIndex: 0,
      turnDirection: -1,
    })
  })

  await page.getByRole('button', { name: 'Chaos, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Voisin de gauche (sens antihoraire) = Joueur 3 (index 2)
  await expect(page.getByText(/Cliquez sur une carte face cachée de Joueur 3/)).toBeVisible()
  await page.locator('.player-seat[aria-label*="Joueur 3"]').getByRole('button', { name: 'Choisir cette carte' }).first().click()

  // Après résolution : comptages inchangés
  await expect(page.locator('.player-seat[aria-label*="Vous, 2 cartes"]')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 3, 3 cartes"]')).toBeVisible()
})

test('jouer Chaos comme dernière carte ne déclenche pas l\'effet', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 0 n'a qu'une seule carte (le Chaos) → la jouer termine la manche
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'chaos' }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Chaos, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // La manche se termine sans effet Chaos
  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choisir cette carte' })).not.toBeVisible()
})
