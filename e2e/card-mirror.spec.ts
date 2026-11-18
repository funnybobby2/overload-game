import { test, expect } from '@playwright/test'

// --- Miroir-sur-Miroir interdit ---

test('jouer un Miroir quand le dernier coup était un Miroir affiche une erreur', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // discardPile se termine par un Miroir → isMirrorOnMirrorForbidden = true
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }, { type: 'mirror' }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()

  await expect(page.getByText('Vous ne pouvez pas poser un Miroir sur un autre Miroir.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Jouer la carte', exact: true })).toBeDisabled()
})

// --- Ne copie pas l'effet Rejouer du 1 ---

test('Mirror après un 1 simple ne déclenche pas le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // lastPlay = 1 simple → getMirrorSource retourne null → Mirror ne fait rien
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 1, isCombo: false, power: { name: 'Rejouer' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
})

test('Mirror après un combo de 1 ne déclenche pas le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 1, isCombo: true, power: { name: 'Rejouer' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Le Miroir copie la pioche du combo de 1…
  await page.getByRole('button', { name: /joueur 2/i }).click()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()

  // …mais pas le droit de rejouer
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
  await expect(page.getByRole('img', { name: 'rejoue' })).toHaveCount(0)
})

test('Miroir rejoué grâce à un combo de 1 ne donne pas un second rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 4 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 1 }, { color: 'gray', value: 1 }, { type: 'mirror' }, { color: 'red', value: 9 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '1 vert' }).click()
  await page.getByRole('button', { name: '1 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()
  await page.getByRole('button', { name: /joueur 2/i }).click()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()

  // Rejoue un Miroir : il copie le combo de 1 → Joueur 2 pioche encore, sans nouveau rejouer
  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Rejouer la carte' }).click()
  await page.getByRole('button', { name: /joueur 2/i }).click()
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
})

// --- Copie des effets simples (2–10) ---

test('Mirror après un 2 simple fait piocher 1 carte au joueur suivant', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 2, isCombo: false, power: { name: 'Pioche' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})

test('Mirror après un 3 simple affiche le prompt d\'espionnage', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 3, isCombo: false, power: { name: 'Espionnage' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Cliquez sur le joueur dont vous voulez voir la main.')).toBeVisible()
})

test('Mirror après un 4 simple affiche le sélecteur de couleur', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 4, isCombo: false, power: { name: 'Couleur' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('group', { name: 'Choisir la couleur active' })).toBeVisible()
})

test('Mirror après un 5 simple inverse le sens du jeu', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 2 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 5, isCombo: false, power: { name: 'Inversion' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Sens antihoraire')).toBeVisible()
})

test('Mirror après un 6 simple réduit la jauge du joueur actif de 1', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 1, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 6, isCombo: false, power: { name: 'Décharge' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
})

test('Mirror après un 7 simple affiche le prompt de menace', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 7, isCombo: false, power: { name: 'Menace' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
})

test('Mirror après un 8 simple fait piocher tous les adversaires de 1 carte', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 8, isCombo: false, power: { name: 'Arrosage' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
})

test('Mirror après un 9 simple fait piocher 2 cartes aux joueurs avec le moins de cartes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 9, isCombo: false, power: { name: 'Déséquilibre' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
})

test('Mirror après un 10 simple inflige une surcharge à tous les adversaires', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 10, isCombo: false, power: { name: 'Apocalypse' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

// --- Copie de l'effet combo ---

test('Mirror après un combo de 2 fait piocher 2 cartes au joueur suivant', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 2, isCombo: true, power: { name: 'Pioche' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 5 cartes"]')).toBeVisible()
})

test('Mirror après un combo de 5 inverse le sens mais ne déclenche pas le rejouer', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ color: 'yellow', value: 3 }],
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'green', value: 2 }, { color: 'red', value: 4 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'red', value: 4 }, { color: 'pink', value: 7 }] },
      ],
      currentPlayerIndex: 0,
      lastPlay: { cardType: 'number', value: 5, isCombo: true, power: { name: 'Inversion' }, cardIds: [] },
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Sens antihoraire')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rejouer la carte' })).not.toBeVisible()
})
