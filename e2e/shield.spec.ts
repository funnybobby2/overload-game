import { test, expect } from '@playwright/test'

test('2 attaques consécutives avant le tour du joueur → bouclier temporaire activé', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 2 a déjà reçu 1 attaque ce tour (attacksSinceTurn=1).
  // La prochaine attaque (2ème consécutive) déclenche le bouclier.
  // La 2ème attaque s'applique QUAND MÊME avant l'activation du bouclier.
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }], attacksSinceTurn: 1 },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // La 2ème attaque est appliquée (gauge passe à 1) puis le bouclier s'active
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '1')
  // La conséquence est enregistrée dans l'historique
  await expect(
    page.locator('.play-history-consequences li', { hasText: 'Joueur 2' })
      .getByRole('img', { name: 'bouclier pour' }),
  ).toBeVisible()
})

test('le bouclier annule entièrement la prochaine attaque reçue', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Joueur 2 possède déjà le bouclier (activé lors d'une attaque précédente).
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'green',
      discardPile: [{ color: 'green', value: 9 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 10 }, { color: 'red', value: 3 }] },
        { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }], shield: true },
      ],
      currentPlayerIndex: 0,
    })
  })

  await page.getByRole('button', { name: '10 vert' }).click()
  await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()

  // Le bouclier absorbe l'attaque : jauge inchangée (toujours 0)
  await expect(page.getByRole('meter', { name: 'Jauge de Joueur 2' })).toHaveAttribute('aria-valuenow', '0')
  // Le bouclier est consommé et disparaît
  await expect(
    page.locator('.play-history-consequences li', { hasText: 'Joueur 2' })
      .getByRole('img', { name: 'bouclier perdu pour' }),
  ).toBeVisible()
})

for (const combo of [false, true]) {
  test(`un ${combo ? 'combo de 9' : '9 seul'} compte comme une attaque pour le bouclier`, async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => typeof window.__testSetup === 'function')

    // Joueur 2 a déjà subi 1 attaque et a le moins de cartes → le 9 est sa 2ème attaque.
    await page.evaluate((isCombo) => {
      window.__testSetup({
        playerCount: 3,
        activeColor: 'green',
        revealedCard: { type: 'overload' },
        discardPile: [{ color: 'green', value: 5 }],
        players: [
          {
            gauge: 0,
            hand: isCombo
              ? [{ color: 'green', value: 9 }, { color: 'yellow', value: 9 }, { color: 'red', value: 3 }, { color: 'red', value: 4 }]
              : [{ color: 'green', value: 9 }, { color: 'red', value: 3 }],
          },
          { gauge: 0, hand: [{ color: 'blue', value: 2 }, { color: 'yellow', value: 5 }, { color: 'pink', value: 7 }], attacksSinceTurn: 1 },
          { gauge: 0, hand: [{ color: 'blue', value: 3 }, { color: 'yellow', value: 6 }, { color: 'pink', value: 8 }, { color: 'blue', value: 4 }] },
        ],
        currentPlayerIndex: 0,
      })
    }, combo)

    await page.getByRole('button', { name: '9 vert' }).click()
    if (combo) {
      await page.getByRole('button', { name: '9 jaune' }).click()
      await page.getByRole('button', { name: 'Jouer le combo', exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Jouer la carte', exact: true }).click()
    }

    await expect(
      page.locator('.play-history-consequences li', { hasText: 'Joueur 2' })
        .getByRole('img', { name: 'bouclier pour' }),
    ).toBeVisible()
  })
}
