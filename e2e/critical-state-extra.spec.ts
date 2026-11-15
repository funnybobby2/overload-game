import { test, expect } from '@playwright/test'

// --- Affichage du badge ---

test('joueur avec 2 cartes affiche le badge "État critique"', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }, { color: 'red', value: 7 }, { color: 'blue', value: 9 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await expect(page.locator('.player-seat[aria-label*="Joueur 2"]').getByText('État critique')).toBeVisible()
})

test('joueur avec 3 cartes n\'affiche pas le badge "État critique"', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 5 }, { color: 'red', value: 7 }, { color: 'blue', value: 9 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }, { color: 'pink', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await expect(page.locator('.player-seat[aria-label*="Joueur 2"]').getByText('État critique')).not.toBeVisible()
})

// --- Surcharge supplémentaire lors d'une attaque ---

test('carte 2 sur un joueur en état critique lui impose une pioche ET une surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 1 en état critique (2 cartes). Carte 2 = suivant pioche 1 (ici joueur 1).
  // En état critique : pioche 1 ET gauge +1.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }, { color: 'red', value: 7 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 5 }, { color: 'blue', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Joueur 2 a pioché 1 carte (2→3) ET reçu 1 surcharge
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('combo 2 sur un joueur en état critique lui impose une pioche de 2 ET une surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 3 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 2 }, { color: 'gray', value: 2 }, { color: 'red', value: 7 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 5 }, { color: 'blue', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '2 vert' }).click()
  await page.getByRole('button', { name: '2 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  // Joueur 2 a pioché 2 cartes (2→4) ET reçu 1 surcharge
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('carte 8 sur un joueur en état critique lui impose une pioche ET une surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 8 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '8 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Joueur 2 (2 cartes, critique) : pioche 1 (2→3) ET gauge +1
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('carte 10 sur un joueur en état critique lui impose 2 surcharges au lieu de 1', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Joueur 2 (critique) : 1 surcharge normale + 1 critique = gauge 2
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('combo 10 sur un joueur en état critique déclenche une explosion (3 surcharges)', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Combo 10 : +2 surcharges normales. Joueur 2 est critique : +1 extra = 3 = MAX_GAUGE → explosion.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'gray', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: '10 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  // Explosion : jauge retombe à 0, joueur 2 pioche 2 cartes (2→4), main dévoilée
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 4 cartes"]')).toBeVisible()
  await expect(page.getByText('Main dévoilée')).toBeVisible()
})

test('combo 9 sur un joueur en état critique lui impose 2 surcharges au lieu de 1', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 0 joue combo 9 : joueurs avec le moins de cartes reçoivent 1 surcharge.
  // Joueur 1 a 2 cartes (minimum), joueur 0 en a 5 (après combo → 3).
  // Joueur 1 est en état critique : 1 surcharge normale + 1 critique = gauge 2.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 8 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 9 }, { color: 'gray', value: 9 }, { color: 'red', value: 3 }, { color: 'blue', value: 5 }, { color: 'pink', value: 7 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '9 vert' }).click()
  await page.getByRole('button', { name: '9 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('combo 6 transférant une surcharge à un joueur en état critique lui en impose 2', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 0 a gauge=1, joue combo 6 sur joueur 1.
  // Joueur 1 (critique, 2 cartes) reçoit 1 surcharge transférée + 1 critique = gauge 2.
  // Joueur 0 perd sa surcharge : gauge 1→0.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 5 }],
      players: [
        { gauge: 1, hand: [{ color: 'green', value: 6 }, { color: 'gray', value: 6 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '6 vert' }).click()
  await page.getByRole('button', { name: '6 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Vous' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('carte 7 sur un joueur en état critique lui impose 2 surcharges (menace + bonus critique)', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Bot (joueur 1, 2 cartes, critique) auto-choisit la surcharge face à une menace.
  // applyNegativeEffect : { surcharge: 1, isAttack: true } + critique (+1) = 2 surcharges.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  // Le bot choisit automatiquement la surcharge → 1 (menace) + 1 (critique) = gauge 2
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

test('combo 7 sur un joueur en état critique lui impose une pioche forcée ET 2 surcharges', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Combo 7 : pioche 1 forcée + surcharge si choix surcharge.
  // Bot (critique) auto-choisit surcharge : { draw: 1, surcharge: 1 } + critique (+1) = 3 cartes, gauge 2.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 7 }, { color: 'gray', value: 7 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'yellow', value: 2 }, { color: 'blue', value: 4 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '7 vert' }).click()
  await page.getByRole('button', { name: '7 gris' }).click()
  await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  // Bot choisit surcharge : pioche 1 (2→3 cartes) + 1 (menace) + 1 (critique) = gauge 2
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

// --- Overload ---

test('Overload sur un joueur en état critique lui impose 2 surcharges au lieu de 1', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // targeted-surcharge → applyNegativeEffect({ surcharge: 1 }) + critique (+1) = gauge 2.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'overload' }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 7 }, { color: 'green', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Overload, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

// --- Miroir copiant une attaque ---

test('Miroir copiant la carte 2 sur un joueur en état critique lui impose pioche ET surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Mirror copie l'effet pioche du 2 → joueur suivant (joueur 1, critique) pioche 1 ET gauge +1.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      lastPlay: { cardType: 'number', value: 2, isCombo: false, power: { name: 'Pioche' }, cardIds: [] },
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 7 }, { color: 'green', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Effet copié résolu automatiquement : joueur 2 pioche 1 (2→3 cartes) + gauge 1
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 3 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
})

test('Miroir copiant Overload sur un joueur en état critique lui impose 2 surcharges', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      lastPlay: { cardType: 'overload', value: null, isCombo: false, power: { name: 'Overload' }, cardIds: [] },
      players: [
        { gauge: 0, hand: [{ type: 'mirror' }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 7 }, { color: 'green', value: 9 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Miroir, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Mirror copie Overload → targeted-surcharge → choix de la cible
  await expect(page.getByText('Cliquez sur un joueur à cibler.')).toBeVisible()
  await page.getByRole('button', { name: /joueur 2/i }).click()

  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '2')
})

// --- Chaos ---

test('Chaos avec un joueur en état critique : échange de cartes sans surcharge supplémentaire', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // resolveChaos fait un échange pur (pas applyNegativeEffect) : pas de bonus critique.
  // 3 joueurs, clockwise. Joueur 2 (index 1, 2 cartes, critique) : donne 1 carte à joueur 0,
  // reçoit 1 carte de joueur 3 → reste à 2 cartes, gauge inchangé.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 3,
      activeColor: 'yellow',
      discardPile: [{ color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ type: 'chaos' }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 7 }, { color: 'green', value: 9 }] },
        { gauge: 0, hand: [{ color: 'pink', value: 2 }, { color: 'gray', value: 4 }, { color: 'yellow', value: 6 }] },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: 'Chaos, violet' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Joueur 0 pioche chez joueur 1 (voisin de gauche, clockwise)
  await page.locator('.player-seat[aria-label*="Joueur 2"]').getByRole('button', { name: 'Choisir cette carte' }).first().click()

  // Joueur 2 (critique) : toujours 2 cartes, gauge 0 — Chaos n'applique pas de surcharge critique
  await expect(page.locator('.player-seat[aria-label*="Joueur 2, 2 cartes"]')).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '0')
})
