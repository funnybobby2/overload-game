import { test, expect } from '@playwright/test'

test('jouer une carte de mauvaise couleur donne une surcharge', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__testSetup === 'function')

  // Partie à 2 joueurs, couleur active jaune, carte violette au centre (Overload)
  // Discard pile : [overload violet, jaune 5] → référence = jaune 5, activeColor = jaune
  // Le joueur a un 1 vert en main → vert ≠ jaune et |1-5| ≠ 1 → surcharge obligatoire
  await page.evaluate(() => {
    window.__testSetup({
      playerCount: 2,
      activeColor: 'yellow',
      revealedCard: { type: 'overload' },
      discardPile: [{ type: 'overload' }, { color: 'yellow', value: 5 }],
      players: [
        { gauge: 0, hand: [{ color: 'green', value: 1 }] },
        { gauge: 0 },
      ],
      currentPlayerIndex: 0,
    })
  })

  // Sélectionner la carte 1 vert
  await page.getByRole('button', { name: '1 vert' }).click()

  // Le bouton doit indiquer qu'une surcharge sera prise
  const playButton = page.getByRole('button', { name: /jouer la carte \(\+ 1 surcharge\)/i })
  await expect(playButton).toBeVisible()

  // Jouer la carte avec surcharge
  await playButton.click()

  // La jauge du joueur doit être passée à 1
  await expect(
    page.getByRole('meter', { name: 'Jauge de Vous' })
  ).toHaveAttribute('aria-valuenow', '1')
})
