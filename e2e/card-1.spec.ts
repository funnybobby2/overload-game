import { test, expect } from '@playwright/test'

test('jouer un 1 de la couleur courante relance le tour sans surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Carte 4 jaune au centre, couleur courante verte
  // Le joueur joue un 1 vert → vert = couleur courante, pas de surcharge
  // Après le jeu, effet rejouer → c'est encore son tour
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 1 }, { color: 'green', value: 3 }] },
        { gauge: 0 },
      ],
      currentPlayerIndex: 0,
    })
  })

  // Sélectionner le 1 vert
  await page.getByRole('button', { name: '1 vert' }).click()

  // Le bouton ne doit PAS mentionner de surcharge
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Jouer la carte' })).toBeVisible()

  // Jouer la carte
  await page.getByRole('button', { name: 'Jouer la carte' }).click()

  // C'est encore au joueur de jouer (effet rejouer)
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).toBeVisible()
})

test('jouer le dernier 1 termine la manche sans déclencher le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Le joueur n'a qu'une seule carte : le 1 vert
  // Couleur courante verte → jouable sans surcharge
  // Après le jeu : main vide → la manche se termine, pas d'effet rejouer
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 1 }] },
        { gauge: 0 },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '1 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // La manche est terminée
  await expect(page.getByText('Manche 1 terminée')).toBeVisible()

  // Aucun effet rejouer
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
})

test('jouer un 1 avec surcharge déclenche quand même le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Couleur courante jaune, carte 5 jaune en discard
  // Green 1 : vert ≠ jaune et |1-5| ≠ 1 → non jouable → surcharge requise
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 1 }, { color: 'green', value: 3 }] },
        { gauge: 0 },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '1 vert' }).click()
  await page.getByRole('button', { name: /Jouer la carte \(\+ 1 surcharge\)/i }).click()

  // Le joueur a pris une surcharge
  await expect(
    page.getByRole('meter', { name: 'Jauge de Vous' })
  ).toHaveAttribute('aria-valuenow', '1')

  // L'effet rejouer est quand même déclenché
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).toBeVisible()
})

test('combo de deux 1 sans surcharge fait piocher le joueur 2 et permet de rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Carte 2 jaune en discard, couleur courante jaune
  // Green 1 et gray 1 : |1-2| = 1 → adjacents → jouables sans surcharge
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 2 }],
      players: [
        {
          gauge: 0,
          hand: [
            { color: 'green', value: 1 },
            { color: 'gray', value: 1 },
            { color: 'yellow', value: 3 },
          ],
        },
        {
          gauge: 0,
          hand: [
            { color: 'blue', value: 2 },
            { color: 'red', value: 3 },
            { color: 'pink', value: 4 },
          ],
        },
      ],
      currentPlayerIndex: 0,
    })
  })

  // Sélectionner les deux 1 pour former le combo
  await page.getByRole('button', { name: '1 vert' }).click()
  await page.getByRole('button', { name: '1 gris' }).click()

  // Pas de surcharge requise
  await expect(page.getByRole('button', { name: /surcharge/i })).not.toBeVisible()

  // Jouer le combo
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  // Cibler le joueur 2 pour qu'il pioche
  await page.getByRole('button', { name: /joueur 2/i }).click()

  // Joueur 2 est passé de 3 à 4 cartes
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()

  // C'est encore le tour du joueur (effet rejouer)
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).toBeVisible()
})

