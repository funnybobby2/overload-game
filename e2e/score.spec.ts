import { test, expect } from '@playwright/test'

test('fin de manche normale : scores calculés correctement pour 6 joueurs', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 0 (Vous) a sa dernière carte → joue → exempt des cartes, mais surcharge compte toujours.
  // Vous: 0c(exempt), j2 → 0+4=4 | J2: 5c, j1 → 5+2=7 | J3: 2c, j0 → 2 | J4: 3c, j1 → 3+2=5 | J5: 4c, j2 → 4+4=8 | J6: 1c, j0 → 1
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 6,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 4 }],
      players: [
        { gauge: 2, hand: [{ color: 'green', value: 5 }] },
        { gauge: 1, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 3 }, { color: 'yellow', value: 7 }, { color: 'pink', value: 8 }, { color: 'gray', value: 9 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 6 }, { color: 'red', value: 10 }] },
        { gauge: 1, hand: [{ color: 'yellow', value: 2 }, { color: 'pink', value: 4 }, { color: 'gray', value: 6 }] },
        { gauge: 2, hand: [{ color: 'blue', value: 3 }, { color: 'red', value: 5 }, { color: 'yellow', value: 8 }, { color: 'pink', value: 9 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByText('Vous gagne la manche')).toBeVisible()

  // Vous : cartes exempt (0), mais 2 surcharges×2 = 4 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Vous' }).getByText('+4 · 4 pts')).toBeVisible()
  // Joueur 2 : 5 cartes + 1 surcharge×2 = 7 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 2' }).getByText('+7 · 7 pts')).toBeVisible()
  // Joueur 3 : 2 cartes + 0 surcharge = 2 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 3' }).getByText('+2 · 2 pts')).toBeVisible()
  // Joueur 4 : 3 cartes + 1 surcharge×2 = 5 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 4' }).getByText('+5 · 5 pts')).toBeVisible()
  // Joueur 5 : 4 cartes + 2 surcharges×2 = 8 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 5' }).getByText('+8 · 8 pts')).toBeVisible()
  // Joueur 6 : 1 carte + 0 surcharge = 1 pt
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 6' }).getByText('+1 · 1 pts')).toBeVisible()
})

test('fin de manche par pioche vide : scores calculés correctement, gagnant non exempté', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Pioche vide → forceEndRound → personne n'est exempté.
  // Gagnant : Joueur 2 (index 1) — 2 cartes, 0 jauge (moins de cartes, moins de jauge que J3).
  // Vous(3c,j1)=5 | J2(2c,j0)=2 | J3(2c,j1)=4 | J4(5c,j0)=5 | J5(6c,j2)=10 | J6(3c,j2)=7
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 6,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 4 }],
      drawPile: [],
      players: [
        { gauge: 1, hand: [{ color: 'green', value: 2 }, { color: 'red', value: 7 }, { color: 'blue', value: 9 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 3 }, { color: 'pink', value: 8 }] },
        { gauge: 1, hand: [{ color: 'gray', value: 5 }, { color: 'blue', value: 10 }] },
        { gauge: 0, hand: [{ color: 'red', value: 2 }, { color: 'yellow', value: 4 }, { color: 'pink', value: 6 }, { color: 'gray', value: 8 }, { color: 'red', value: 10 }] },
        { gauge: 2, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 3 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }, { color: 'gray', value: 9 }, { color: 'blue', value: 4 }] },
        { gauge: 2, hand: [{ color: 'red', value: 6 }, { color: 'yellow', value: 8 }, { color: 'pink', value: 10 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  // Joueur 0 joue carte 2 → le suivant doit piocher, mais la pioche est vide → erreur
  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Le snackbar affiche l'erreur et le bouton "Terminer la manche"
  await expect(page.getByRole('button', { name: 'Terminer la manche' })).toBeVisible()
  await page.getByRole('button', { name: 'Terminer la manche' }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByText('Joueur 2 gagne la manche')).toBeVisible()

  // Vous : 3 cartes + 1 surcharge×2 = 5 pts (non exempté)
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Vous' }).getByText('+5 · 5 pts')).toBeVisible()
  // Joueur 2 (gagnant, mais non exempté) : 2 cartes + 0 surcharge = 2 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 2' }).getByText('+2 · 2 pts')).toBeVisible()
  // Joueur 3 : 2 cartes + 1 surcharge×2 = 4 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 3' }).getByText('+4 · 4 pts')).toBeVisible()
  // Joueur 4 : 5 cartes + 0 surcharge = 5 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 4' }).getByText('+5 · 5 pts')).toBeVisible()
  // Joueur 5 : 6 cartes + 2 surcharges×2 = 10 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 5' }).getByText('+10 · 10 pts')).toBeVisible()
  // Joueur 6 : 3 cartes + 2 surcharges×2 = 7 pts
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 6' }).getByText('+7 · 7 pts')).toBeVisible()
})

test('fin de manche sans joueur à 20 pts : bouton "Manche suivante" disponible', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Scores cumulatifs = [0, 0] → aucun joueur ne peut atteindre 20 avec cette manche
  // Vous joue sa dernière carte → exempt. Joueur 2 : 3 cartes, 0 jauge = 3 pts → total 3 < 20
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 7 }, { color: 'yellow', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Manche 1 terminée')).toBeVisible()
  await expect(page.getByText('Vous gagne la manche')).toBeVisible()
  // Format scores avec pénalité
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Vous' }).getByText('+0 · 0 pts')).toBeVisible()
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 2' }).getByText('+3 · 3 pts')).toBeVisible()
  // La partie continue : bouton manche suivante présent
  await expect(page.getByRole('button', { name: 'Manche suivante' })).toBeVisible()
})

test('fin de manche avec un joueur à 20+ pts : la partie se termine sans bouton manche suivante', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 2 a déjà 17 pts cumulés. Pénalité de cette manche : 1 carte + 1 jauge×2 = 3 pts → total 20 ≥ 20
  // Vous joue sa dernière carte → exempt (0 pts). Vous a 0 cumulé → gagnant de la partie
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 4 }],
      cumulativeScores: [0, 17],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }] },
        { gauge: 1, hand: [{ color: 'blue', value: 2 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '5 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Fin de partie')).toBeVisible()
  await expect(page.getByText('Vous remporte la partie')).toBeVisible()
  await expect(page.getByText('Seuil atteint par Joueur 2')).toBeVisible()
  // Format scores sans pénalité (juste le total cumulé)
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Vous' }).getByText('0 pts')).toBeVisible()
  await expect(page.locator('.round-score-list li').filter({ hasText: 'Joueur 2' }).getByText('20 pts')).toBeVisible()
  // La partie est terminée : pas de bouton manche suivante
  await expect(page.getByRole('button', { name: 'Manche suivante' })).not.toBeVisible()
})
