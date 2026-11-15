export const CARD_TYPES = {
  NUMBER: 'number',
  OVERLOAD: 'overload',
  MIRROR: 'mirror',
  CHAOS: 'chaos',
} as const

export type CardType = (typeof CARD_TYPES)[keyof typeof CARD_TYPES]

export const CARD_COLORS = [
  { id: 'yellow', label: 'Jaune', hex: '#e8c547' },
  { id: 'blue', label: 'Bleu', hex: '#4388db' },
  { id: 'green', label: 'Vert', hex: '#4b9b63' },
  { id: 'red', label: 'Rouge', hex: '#dc514b' },
  { id: 'pink', label: 'Rose', hex: '#d875a7' },
  { id: 'gray', label: 'Gris', hex: '#8b9297' },
  { id: 'purple', label: 'Violet', hex: '#9860c9' },
] as const

export type CardColorId = (typeof CARD_COLORS)[number]['id']

export interface CardPower {
  readonly name: string
  readonly simple: string
  readonly combo?: string
  readonly effect?: string
}

export const CARD_POWERS = {
  1: {
    name: 'Rejouer',
    simple: 'Rejouez une carte valide de votre main.',
    combo: 'Rejouez et le joueur de votre choix pioche.',
  },
  2: {
    name: 'Pioche',
    simple: 'Le joueur suivant pioche 1 carte.',
    combo: 'Le joueur suivant pioche 2 cartes.',
  },
  3: {
    name: 'Espionnage',
    simple: 'Regardez la main du joueur de votre choix.',
    combo: "Appliquez l'effet simple et échangez 1 carte avec lui.",
  },
  4: {
    name: 'Couleur',
    simple: 'Annoncez votre choix de couleur pour la défausse.',
    combo: 'Changez la couleur et bloquez tous les combos pendant 1 tour.',
  },
  5: {
    name: 'Inversion',
    simple: 'Inversez le sens de rotation du jeu.',
    combo: 'Inversez le sens de rotation du jeu et rejouez immédiatement.',
  },
  6: {
    name: 'Décharge',
    simple: 'Réduisez votre jauge de surcharge de 1.',
    combo: 'Transférez 1 de vos surcharges vers 1 autre joueur.',
  },
  7: {
    name: 'Menace',
    simple: 'Le joueur visé prend 1 de vos cartes OU subit 1 surcharge.',
    combo: "Appliquez l'effet simple et faites piocher 1 carte en plus au joueur ciblé.",
  },
  8: {
    name: 'Arrosage',
    simple: 'Tous les autres joueurs piochent 1 carte.',
    combo: 'Tous les autres joueurs piochent 2 cartes.',
  },
  9: {
    name: 'Déséquilibre',
    simple: 'Les joueurs avec le moins de cartes piochent 2 cartes.',
    combo: 'Les joueurs avec le moins de cartes subissent 1 surcharge.',
  },
  10: {
    name: 'Apocalypse',
    simple: 'Tous les autres joueurs subissent 1 surcharge.',
    combo: 'Tous les autres joueurs subissent 2 surcharges.',
  },
} as const satisfies Record<number, CardPower>

export const SPECIAL_CARD_POWERS = {
  [CARD_TYPES.OVERLOAD]: {
    name: 'Overload',
    simple: "Posez cette carte devant un joueur de votre choix : il reçoit immédiatement 1 surcharge.",
    effect: 'targeted-surcharge',
  },
  [CARD_TYPES.MIRROR]: {
    name: 'Miroir',
    simple: "Copie l'effet de la dernière carte jouée, combo inclus. Ne copie ni un Miroir ni l'effet Rejouer du 1, ni le Rejouer du combo 5.",
    effect: 'copy-last-effect',
  },
  [CARD_TYPES.CHAOS]: {
    name: 'Effet chaos',
    simple: 'Tous les joueurs piochent simultanément une carte au hasard dans la main de leur voisin de gauche.',
    effect: 'left-neighbor-swap',
  },
} as const satisfies Record<string, CardPower>

export interface Card {
  id: string
  type: CardType
  color: CardColorId
  value: number | null
  power: CardPower | null
}

const numberColors = CARD_COLORS.filter((color) => color.id !== 'purple')

const numberCards: Card[] = numberColors.flatMap((color) =>
  Array.from({ length: 10 }, (_, index) => {
    const value = (index + 1) as keyof typeof CARD_POWERS
    return {
      id: `number-${color.id}-${value}`,
      type: CARD_TYPES.NUMBER,
      color: color.id,
      value,
      power: CARD_POWERS[value],
    }
  }),
)

const specialCards: Card[] = (
  [
    [CARD_TYPES.OVERLOAD, 8],
    [CARD_TYPES.MIRROR, 6],
    [CARD_TYPES.CHAOS, 6],
  ] as const
).flatMap(([type, count]) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${type}-${index + 1}`,
    type,
    color: 'purple' as const,
    value: null,
    power: SPECIAL_CARD_POWERS[type],
  })),
)

export const CARDS: readonly Card[] = [...numberCards, ...specialCards]
