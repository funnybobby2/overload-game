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
  await expect(page.getByText(/Cliquez sur une carte de Joueur 2 pour l'obtenir/)).toBeVisible()
  await page.locator('.player-seat[aria-label*="Joueur 2"]').getByRole('button', { name: 'Choisir cette carte' }).first().click()

  // Après résolution : échange 1-pour-1, Vous gardez 1 carte (2 - Chaos posé)
  await expect(page.locator('.player-seat[aria-label*="Vous, 1 cartes"]')).toBeVisible()
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
  await expect(page.getByText(/Cliquez sur une carte de Joueur 3 pour l'obtenir/)).toBeVisible()
  await page.locator('.player-seat[aria-label*="Joueur 3"]').getByRole('button', { name: 'Choisir cette carte' }).first().click()

  // Après résolution : comptages inchangés
  await expect(page.locator('.player-seat[aria-label*="Vous, 1 cartes"]')).toBeVisible()
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

test('Chaos : les joueurs avec un bouclier sont sautés, les autres échangent entre eux', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Vous, Joueur 2, Joueur 3 et Joueur 6 sont protégés : seuls Joueur 4 et Joueur 5 échangent.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 6,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, shield: true, hand: [{ type: 'chaos' }, { color: 'green', value: 3 }] },
        { gauge: 0, shield: true, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }] },
        { gauge: 0, shield: true, hand: [{ color: 'yellow', value: 8 }, { color: 'green', value: 9 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 1 }, { color: 'red', value: 6 }] },
        { gauge: 0, hand: [{ color: 'pink', value: 1 }, { color: 'pink', value: 6 }, { color: 'pink', value: 8 }] },
        { gauge: 0, shield: true, hand: [{ color: 'gray', value: 2 }, { color: 'gray', value: 3 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Chaos, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Vous êtes protégé : pas de carte à choisir
  await expect(page.getByText(/Cliquez sur une carte de/)).not.toBeVisible()
  await expect(page.locator('.play-history-steals li')).toHaveText('Joueur 4Joueur 5Joueur 4')
  // Les mains des joueurs protégés n'ont pas bougé
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 2 cartes"]')).toBeVisible()
  await expect(page.locator('.player-seat[aria-label*="Joueur 6, 2 cartes"]')).toBeVisible()
  // …mais ils perdent leur bouclier
  const shieldLost = page.locator('.play-history-consequences li', {
    has: page.getByRole('img', { name: 'bouclier perdu pour' }),
  })
  await expect(shieldLost).toHaveText(/Vous, Joueur 2, Joueur 3, Joueur 6/)
})
