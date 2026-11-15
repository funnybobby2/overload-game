import { CARDS, CARD_COLORS, CARD_TYPES, type Card, type CardPower, type CardType } from './cards.ts'

export const MAX_GAUGE = 3
export const MATCH_POINT_LIMIT = 20
export const LOW_DECK_THRESHOLD = 8

const STARTING_HAND_SIZES: Record<number, number | undefined> = {
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 5,
}

export interface Player {
  id: number
  name: string
  hand: Card[]
  gauge: number
  attacksSinceTurn: number
  shield: boolean
  handVisibleUntilTurn: number | null
  handVisibleToPlayerIndex: number | null
}

export interface PlayRecord {
  playerName: string
  cardDescription: string
  action: string
  cards: Card[]
  isCombo: boolean
  consequences: string[]
}

export interface LastPlay {
  cardType: CardType
  cardIds: string[]
  isCombo: boolean
  power: CardPower | null
  value: number | null
}

export type EffectKind =
  | 'targeted-surcharge'
  | 'left-neighbor-swap'
  | 'copy-last-effect'
  | 'number-one-replay'
  | 'number-one-combo-target'
  | 'choose-color'
  | 'targeted-spy'
  | 'targeted-exchange'
  | 'targeted-surcharge-transfer'
  | 'targeted-threat'
  | 'targeted-threat-response'
  | 'chaos-human-pick'

export interface PendingEffect {
  kind: EffectKind
  playerIndex: number
  historyIndex: number
  cardIds: string[]
  cardType: CardType
  isCombo: boolean
  power: CardPower | null
  copiedPlay?: LastPlay | null
  sourcePlayerIndex?: number
}

export interface RoundPenalty {
  playerIndex: number
  playerName: string
  cardsRemaining: number
  surchargeLevels: number
  cardsPenalty: number
  surchargePenalty: number
  totalPenalty: number
}

export interface RoundResult {
  winnerIndex: number
  winnerName: string
  penalties: RoundPenalty[]
  cumulativeScores: number[]
  matchOver: boolean
}

export interface MatchResult {
  triggeredBy: number[]
  winnerIndices: number[]
  winners: string[]
  scores: number[]
}

export interface GameState {
  players: Player[]
  drawPile: Card[]
  lowDeckActive: boolean
  revealedCard: Card
  discardPile: Card[]
  activeColor: string | null
  startingPlayerIndex: number
  currentPlayerIndex: number
  turnDirection: 1 | -1
  turnNumber: number
  combosBlockedUntilTurn: number | null
  playHistory: PlayRecord[]
  pendingEffect: PendingEffect | null
  lastPlay: LastPlay | null
  roundResult: RoundResult | null
  cumulativeScores: number[]
  roundNumber: number
  matchResult: MatchResult | null
}

interface NegativeEffectOptions {
  draw?: number
  surcharge?: number
  isAttack?: boolean
  critical?: boolean | null
}

interface ResolveOptions {
  color?: string
  targetPlayerIndex?: number
  threatChoice?: 'card' | 'surcharge'
  offeredCardId?: string
  choiceCardId?: string
  isCombo?: boolean
}

interface CardTransfer {
  sourceIndex: number
  recipientIndex: number
  cards: Card[]
}

function describeCard(card: Card): string {
  if (card.type === CARD_TYPES.NUMBER) {
    const color = CARD_COLORS.find((entry) => entry.id === card.color)
    return `un ${card.value!} ${color!.label.toLowerCase()}`
  }

  const label = {
    [CARD_TYPES.OVERLOAD]: 'Overload',
    [CARD_TYPES.MIRROR]: 'Miroir',
    [CARD_TYPES.CHAOS]: 'Chaos',
  }[card.type]
  return `une carte ${label}`
}

function describePlay(player: Player, cards: Card[], game: GameState): PlayRecord {
  const card = cards[cards.length - 1]
  const cardDescription = cards.length > 1
    ? `un combo de ${card.value}`
    : describeCard(card)
  let action = 'joue sa carte'

  if (card.type === CARD_TYPES.OVERLOAD) {
    action = "vise un joueur et lui inflige une surcharge"
  } else if (card.type === CARD_TYPES.CHAOS) {
    action = "declenche un echange de cartes avec les voisins de gauche"
  } else if (card.type === CARD_TYPES.MIRROR) {
    const copiedPlay = getMirrorSource(game.lastPlay)
    if (!copiedPlay) {
      action = 'ne copie aucun effet'
    } else if (copiedPlay.cardType === CARD_TYPES.NUMBER && copiedPlay.power?.name === 'Rejouer' && copiedPlay.isCombo) {
      action = 'copie le combo de 1 : fait piocher un joueur'
    } else {
      action = `copie l'effet de ${copiedPlay.power?.name ?? 'la derniere carte'}`
    }
  } else if (card.type === CARD_TYPES.NUMBER) {
    const combo = cards.length > 1
    switch (card.value) {
      case 1:
        action = combo
          ? "fait piocher un joueur puis rejoue"
          : "rejoue une carte"
        break
      case 2:
        action = `fait piocher ${combo ? 2 : 1} carte${combo ? 's' : ''} au joueur suivant`
        break
      case 3:
        action = combo
          ? "echange une carte avec un joueur"
          : "espionne un joueur"
        break
      case 4:
        action = combo
          ? "choisit une couleur et bloque les combos au prochain tour"
          : "choisit une couleur"
        break
      case 5:
        action = combo
          ? "inverse le sens et rejoue immediatement"
          : "inverse le sens de rotation"
        break
      case 6:
        action = combo
          ? "transfere une surcharge a un joueur"
          : "reduit sa surcharge"
        break
      case 7:
        action = combo
          ? "cible un joueur avec Menace et une pioche supplementaire"
          : "cible un joueur avec Menace"
        break
      case 8:
        action = `fait piocher ${combo ? 2 : 1} carte${combo ? 's' : ''} aux autres joueurs`
        break
      case 9:
        action = combo
          ? "surcharge les joueurs qui ont le moins de cartes"
          : "fait piocher les joueurs qui ont le moins de cartes"
        break
      case 10:
        action = `inflige ${combo ? 2 : 1} surcharge${combo ? 's' : ''} aux autres joueurs`
        break
      default:
        break
    }
  }

  return {
    playerName: player.name,
    cardDescription,
    action,
    cards: cards.map((playedCard) => ({ ...playedCard })),
    isCombo: cards.length > 1,
    consequences: [],
  }
}

function updatePlayHistory(game: GameState, effect: PendingEffect, action: string): GameState {
  if (!Number.isInteger(effect.historyIndex)) {
    return game
  }

  const playHistory = [...(game.playHistory ?? [])]
  const entry = playHistory[effect.historyIndex]
  if (!entry) {
    return game
  }

  playHistory[effect.historyIndex] = { ...entry, action }
  return { ...game, playHistory }
}

function applyAutoCardEffect(
  game: GameState,
  playerIndex: number,
  value: number,
  isCombo: boolean,
  turnDirection: number,
): GameState {
  const playerCount = game.players.length

  if (value === 2) {
    const nextIndex = (playerIndex + turnDirection + playerCount) % playerCount
    return applyNegativeEffect(game, nextIndex, { draw: isCombo ? 2 : 1, isAttack: true })
  }

  if (value === 6 && !isCombo) {
    const players = [...game.players]
    const player = players[playerIndex]
    if (player.gauge > 0) {
      players[playerIndex] = { ...player, gauge: player.gauge - 1 }
    }
    return { ...game, players }
  }

  if (value === 8) {
    let nextGame = game
    for (let i = 0; i < playerCount; i += 1) {
      if (i !== playerIndex) {
        nextGame = applyNegativeEffect(nextGame, i, { draw: isCombo ? 2 : 1, isAttack: true })
      }
    }
    return nextGame
  }

  if (value === 9) {
    const minCards = Math.min(
      ...game.players
        .filter((_, i) => i !== playerIndex)
        .map((p) => p.hand.length),
    )
    let nextGame = game
    for (let i = 0; i < playerCount; i += 1) {
      if (i !== playerIndex && game.players[i].hand.length === minCards) {
        nextGame = isCombo
          ? applyNegativeEffect(nextGame, i, { surcharge: 1, isAttack: false })
          : applyNegativeEffect(nextGame, i, { draw: 2, isAttack: false })
      }
    }
    return nextGame
  }

  if (value === 10) {
    let nextGame = game
    for (let i = 0; i < playerCount; i += 1) {
      if (i !== playerIndex) {
        nextGame = applyNegativeEffect(nextGame, i, { surcharge: isCombo ? 2 : 1, isAttack: true })
      }
    }
    return nextGame
  }

  return game
}

export function getStartingHandSize(playerCount: number): number {
  const handSize = STARTING_HAND_SIZES[playerCount]

  if (handSize === undefined) {
    throw new RangeError("Une partie doit compter entre 2 et 6 joueurs.")
  }

  return handSize
}

function shuffleCards(cards: Card[], random: () => number): Card[] {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const card = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = card
  }

  return shuffled
}

export function isMirrorOnMirrorForbidden(card: Card | undefined | null, discardPile: Card | Card[]): boolean {
  const pile = Array.isArray(discardPile) ? discardPile : [discardPile]
  const topDiscard = pile[pile.length - 1]

  return card?.type === CARD_TYPES.MIRROR &&
    topDiscard?.type === CARD_TYPES.MIRROR
}

export function isCardPlayable(card: Card, discardPile: Card | Card[], activeColor: string | null): boolean {
  if (!card || isMirrorOnMirrorForbidden(card, discardPile)) {
    return false
  }

  if (card.type !== CARD_TYPES.NUMBER) {
    return true
  }

  const pile = Array.isArray(discardPile) ? discardPile : [discardPile]
  const topDiscard = pile[pile.length - 1]
  const referenceCard = topDiscard?.type === CARD_TYPES.NUMBER
    ? topDiscard
    : [...pile].reverse().find(
      (discardedCard) => discardedCard?.type === CARD_TYPES.NUMBER,
    )

  if (!referenceCard) {
    return true
  }

  const referenceColor =
    activeColor && activeColor !== 'purple'
      ? activeColor
      : referenceCard.color
  const sameColor = card.color === referenceColor
  const adjacentValue =
    Math.abs(card.value! - referenceCard.value!) === 1

  return sameColor || adjacentValue
}

export function isCriticalState(player: Player): boolean {
  return player.hand.length > 0 && player.hand.length < 3
}

export function isLowDeckActive(game: GameState): boolean {
  return game.lowDeckActive
}

function drawCards(game: GameState, playerIndex: number, count: number): GameState {
  if (!Number.isInteger(playerIndex) || !game.players[playerIndex]) {
    throw new RangeError("Joueur invalide pour la pioche.")
  }

  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("Le nombre de cartes a piocher doit etre positif.")
  }

  if (game.drawPile.length < count) {
    throw new RangeError("La pioche ne contient pas assez de cartes.")
  }

  const drawPile = [...game.drawPile]
  const hand = [...game.players[playerIndex].hand]
  const actualCount = count * (game.lowDeckActive ? 2 : 1)

  if (drawPile.length < actualCount) {
    throw new RangeError("La pioche ne contient pas assez de cartes pour cet effet.")
  }

  for (let index = 0; index < actualCount; index += 1) {
    hand.push(drawPile.pop()!)
  }

  const players = [...game.players]
  players[playerIndex] = { ...players[playerIndex], hand }

  return {
    ...game,
    players,
    drawPile,
    lowDeckActive:
      game.lowDeckActive || drawPile.length < LOW_DECK_THRESHOLD,
  }
}

export function drawForPlayer(game: GameState, playerIndex: number, count = 1, forced = false): GameState {
  if (!forced) {
    return drawCards(game, playerIndex, count)
  }

  return applyNegativeEffect(
    game,
    playerIndex,
    { draw: count, surcharge: 1, isAttack: true },
  )
}

export function addSurcharge(game: GameState, playerIndex: number, amount = 1): GameState {
  if (!Number.isInteger(playerIndex) || !game.players[playerIndex]) {
    throw new RangeError("Joueur invalide pour une surcharge.")
  }

  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError("La surcharge doit etre un nombre entier positif ou nul.")
  }

  let nextGame = game
  const actualAmount = amount * (game.lowDeckActive ? 2 : 1)

  for (let index = 0; index < actualAmount; index += 1) {
    const players = [...nextGame.players]
    const player = players[playerIndex]
    const gauge = player.gauge + 1

    if (gauge === MAX_GAUGE) {
      players[playerIndex] = {
        ...player,
        gauge: 0,
        handVisibleUntilTurn: nextGame.turnNumber + nextGame.players.length,
      }
      nextGame = { ...nextGame, players }
      nextGame = drawCards(nextGame, playerIndex, 2)
    } else {
      players[playerIndex] = { ...player, gauge }
      nextGame = { ...nextGame, players }
    }
  }

  return nextGame
}

export function applyNegativeEffect(
  game: GameState,
  playerIndex: number,
  { draw = 0, surcharge = 0, isAttack = true, critical = null }: NegativeEffectOptions = {},
): GameState {
  const player = game.players[playerIndex]
  if (!player) {
    throw new RangeError("Joueur invalide pour cet effet.")
  }

  if (player.shield) {
    const players = [...game.players]
    players[playerIndex] = { ...player, shield: false }
    return { ...game, players }
  }

  const wasCritical = critical ?? isCriticalState(player)
  let nextGame = draw > 0 ? drawCards(game, playerIndex, draw) : game
  const surchargeAmount = surcharge + (wasCritical ? 1 : 0)

  if (surchargeAmount > 0) {
    nextGame = addSurcharge(nextGame, playerIndex, surchargeAmount)
  }

  if (isAttack) {
    const players = [...nextGame.players]
    const attackedPlayer = players[playerIndex]
    const attacksSinceTurn = attackedPlayer.attacksSinceTurn + 1
    players[playerIndex] = {
      ...attackedPlayer,
      attacksSinceTurn: attacksSinceTurn >= 2 ? 0 : attacksSinceTurn,
      shield: attacksSinceTurn >= 2,
    }
    nextGame = { ...nextGame, players }
  }

  return nextGame
}

export function calculateRoundPenalties(players: Player[], winnerIndex: number, exemptWinner = true): RoundPenalty[] {
  if (!Number.isInteger(winnerIndex) || !players[winnerIndex]) {
    throw new RangeError("Le joueur gagnant de la manche est invalide.")
  }

  return players.map((player, playerIndex) => {
    const isExempt = exemptWinner && playerIndex === winnerIndex
    const cardsPenalty = isExempt ? 0 : player.hand.length
    const surchargePenalty = player.gauge * 2

    return {
      playerIndex,
      playerName: player.name,
      cardsRemaining: isExempt ? 0 : player.hand.length,
      surchargeLevels: player.gauge,
      cardsPenalty,
      surchargePenalty,
      totalPenalty: cardsPenalty + surchargePenalty,
    }
  })
}

function getMirrorSource(lastPlay: LastPlay | null): LastPlay | null {
  if (!lastPlay || lastPlay.cardType === CARD_TYPES.MIRROR) {
    return null
  }

  if (
    lastPlay.cardType === CARD_TYPES.NUMBER &&
    lastPlay.power?.name === 'Rejouer' &&
    !lastPlay.isCombo
  ) {
    return null
  }

  return lastPlay
}

export function createGame(playerCount: number, random: () => number = Math.random): GameState {
  const handSize = getStartingHandSize(playerCount)
  const shuffledCards = shuffleCards(CARDS as unknown as Card[], random)
  const players: Player[] = Array.from({ length: playerCount }, (_, index) => ({
    id: index,
    name: index === 0 ? 'Vous' : `Joueur ${index + 1}`,
    hand: [] as Card[],
    gauge: 0,
    attacksSinceTurn: 0,
    shield: false,
    handVisibleUntilTurn: null as number | null,
    handVisibleToPlayerIndex: null as number | null,
  }))

  for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
    for (const player of players) {
      player.hand.push(shuffledCards.pop()!)
    }
  }

  const revealedCard = shuffledCards.pop()!
  const startingPlayerIndex = Math.floor(random() * playerCount)

  return {
    players,
    drawPile: shuffledCards,
    lowDeckActive: false,
    revealedCard,
    discardPile: [revealedCard],
    activeColor: revealedCard.color,
    startingPlayerIndex,
    currentPlayerIndex: startingPlayerIndex,
    turnDirection: 1,
    turnNumber: 0,
    combosBlockedUntilTurn: null,
    playHistory: [],
    pendingEffect: null,
    lastPlay: null,
    roundResult: null,
    cumulativeScores: players.map(() => 0),
    roundNumber: 1,
    matchResult: null,
  }
}

export function playCards(game: GameState, playerIndex: number, cardIds: string[], useSurcharge = false): GameState {
  if (game.matchResult) {
    throw new Error("La partie est terminee.")
  }

  if (game.roundResult) {
    throw new Error("La manche est terminee.")
  }

  if (game.pendingEffect) {
    throw new Error("Resolvez l'effet en cours avant de jouer une autre carte.")
  }

  if (playerIndex !== game.currentPlayerIndex) {
    throw new Error("Seul le joueur actif peut poser des cartes.")
  }

  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    throw new Error("Selectionnez au moins une carte a jouer.")
  }

  const player = game.players[playerIndex]
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error("Une carte ne peut etre selectionnee qu'une fois.")
  }

  const foundCards = cardIds.map((id) =>
    player.hand.find((card) => card.id === id),
  )

  if (foundCards.some((card) => !card)) {
    throw new Error("Une carte selectionnee ne se trouve pas dans la main.")
  }

  const selectedCards = foundCards as Card[]

  if (
    selectedCards.some((card) =>
      isMirrorOnMirrorForbidden(card, game.discardPile),
    )
  ) {
    throw new Error("Vous ne pouvez pas poser un Miroir sur un autre Miroir.")
  }

  if (
    selectedCards.length > 2 ||
    (
    selectedCards.length > 1 &&
    (selectedCards.some((card) => card.type !== CARD_TYPES.NUMBER) ||
      selectedCards.some((card) => card.value !== selectedCards[0].value))
    )
  ) {
    throw new Error("Un combo doit etre compose de deux cartes numerotees de meme valeur au maximum.")
  }

  if (selectedCards.length > 1 && isCriticalState(player)) {
    throw new Error("Un joueur en etat critique ne peut pas jouer de combo.")
  }

  if (
    selectedCards.length > 1 &&
    game.combosBlockedUntilTurn === game.turnNumber
  ) {
    throw new Error("Les combos sont bloques pendant ce tour.")
  }

  const allCardsPlayable = selectedCards.length === 2
    ? selectedCards.some((card) => isCardPlayable(card, game.discardPile, game.activeColor))
    : selectedCards.every((card) => isCardPlayable(card, game.discardPile, game.activeColor))

  if (!allCardsPlayable && !useSurcharge) {
    throw new Error("Cette pose est invalide sans ajouter une surcharge.")
  }

  if (allCardsPlayable && useSurcharge) {
    throw new Error("Une surcharge ne peut etre ajoutee que pour une pose invalide.")
  }

  const previousPlay = game.lastPlay
  let nextGame = useSurcharge
    ? addSurcharge(game, playerIndex)
    : game
  if (
    selectedCards.length === 2 &&
    selectedCards[0].value === 6 &&
    nextGame.players[playerIndex].gauge < 1
  ) {
    throw new Error("Il faut au moins une surcharge pour jouer le combo 6.")
  }

  const updatedPlayer = nextGame.players[playerIndex]
  const playedIds = new Set(cardIds)
  const players = [...nextGame.players]

  players[playerIndex] = {
    ...updatedPlayer,
    hand: updatedPlayer.hand.filter((card) => !playedIds.has(card.id)),
  }

  const discardPile = [...nextGame.discardPile, ...selectedCards]
  const playedCard = selectedCards[selectedCards.length - 1]
  const isCombo = selectedCards.length > 1
  let cumulativeScores = game.cumulativeScores
  let roundResult: RoundResult | null = null
  let matchResult: MatchResult | null = null

  if (players[playerIndex].hand.length === 0) {
    const penalties = calculateRoundPenalties(players, playerIndex)
    cumulativeScores = game.cumulativeScores.map(
      (score, index) => score + penalties[index].totalPenalty,
    )
    const triggeredBy = cumulativeScores
      .map((score, index) => (score >= MATCH_POINT_LIMIT ? index : null))
      .filter((x): x is number => x !== null)

    roundResult = {
      winnerIndex: playerIndex,
      winnerName: players[playerIndex].name,
      penalties,
      cumulativeScores,
      matchOver: triggeredBy.length > 0,
    }

    if (triggeredBy.length > 0) {
      const lowestScore = Math.min(...cumulativeScores)
      const winnerIndices = cumulativeScores
        .map((score, index) => (score === lowestScore ? index : null))
        .filter((x): x is number => x !== null)
      matchResult = {
        triggeredBy,
        winnerIndices,
        winners: winnerIndices.map((index) => players[index].name),
        scores: [...cumulativeScores],
      }
    }
  }
  const mirrorSource = playedCard.type === CARD_TYPES.MIRROR
    ? getMirrorSource(previousPlay)
    : null
  const lastPlay: LastPlay = {
    cardType: playedCard.type,
    cardIds: [...cardIds],
    isCombo,
    power: playedCard.power ?? null,
    value: playedCard.type === CARD_TYPES.NUMBER ? playedCard.value! : null,
  }
  const playHistory = [
    ...(game.playHistory ?? []),
    describePlay(player, selectedCards, game),
  ]
  const pendingEffectBase = {
    playerIndex,
    historyIndex: playHistory.length - 1,
    cardIds: [...cardIds],
    cardType: playedCard.type,
    isCombo,
    power: playedCard.power ?? null,
  }
  let pendingEffect: PendingEffect | null = null
  let turnDirection = nextGame.turnDirection

  if (!roundResult && playedCard.type === CARD_TYPES.OVERLOAD) {
    pendingEffect = { ...pendingEffectBase, kind: 'targeted-surcharge' }
  } else if (!roundResult && playedCard.type === CARD_TYPES.CHAOS) {
    pendingEffect = { ...pendingEffectBase, kind: 'left-neighbor-swap' }
  } else if (!roundResult && playedCard.type === CARD_TYPES.MIRROR) {
    pendingEffect = {
      ...pendingEffectBase,
      kind: 'copy-last-effect',
      copiedPlay: mirrorSource,
    }
  } else if (!roundResult && playedCard.type === CARD_TYPES.NUMBER) {
    if (playedCard.value === 1) {
      pendingEffect = {
        ...pendingEffectBase,
        kind: isCombo ? 'number-one-combo-target' : 'number-one-replay',
      }
    } else if (playedCard.value === 4) {
      pendingEffect = { ...pendingEffectBase, kind: 'choose-color' }
    } else if (playedCard.value === 5) {
      turnDirection = (game.turnDirection * -1) as 1 | -1
      if (isCombo) {
        pendingEffect = {
          ...pendingEffectBase,
          kind: 'number-one-replay',
        }
      }
    } else if (playedCard.value === 3) {
      pendingEffect = {
        ...pendingEffectBase,
        kind: isCombo ? 'targeted-exchange' : 'targeted-spy',
      }
    } else if (playedCard.value === 6 && isCombo) {
      pendingEffect = {
        ...pendingEffectBase,
        kind: 'targeted-surcharge-transfer',
      }
    } else if (playedCard.value === 7) {
      pendingEffect = { ...pendingEffectBase, kind: 'targeted-threat' }
    }
  }

  const resultGame: GameState = {
    ...nextGame,
    turnDirection,
    players,
    playHistory,
    discardPile,
    revealedCard: playedCard,
    activeColor: playedCard.type === CARD_TYPES.NUMBER
      ? playedCard.color
      : game.activeColor,
    lastPlay,
    pendingEffect,
    roundResult,
    cumulativeScores,
    matchResult,
  }

  if (!roundResult && !pendingEffect && playedCard.type === CARD_TYPES.NUMBER) {
    const before = resultGame.players
    const afterEffect = applyAutoCardEffect(resultGame, playerIndex, playedCard.value!, isCombo, turnDirection)
    return appendConsequencesToEntry(afterEffect, afterEffect.playHistory.length - 1, before)
  }

  return resultGame
}

function validateTarget(game: GameState, sourcePlayerIndex: number, targetPlayerIndex: number | undefined): asserts targetPlayerIndex is number {
  if (
    !Number.isInteger(targetPlayerIndex) ||
    !game.players[targetPlayerIndex as number] ||
    targetPlayerIndex === sourcePlayerIndex
  ) {
    throw new RangeError("Choisissez un autre joueur comme cible.")
  }
}

function resolveChaos(game: GameState, random: () => number, humanChoiceCardId: string | null = null): GameState {
  if (typeof random !== "function") {
    throw new TypeError("La source aleatoire doit etre une fonction.")
  }

  const chosenCards: CardTransfer[] = game.players.map((_, index) => {
    const neighborIndex = (index + game.turnDirection + game.players.length) % game.players.length
    const neighborHand = game.players[neighborIndex].hand
    const protectedByShield = game.players[index].shield
    const cardCount = game.lowDeckActive ? 2 : 1

    if (protectedByShield || neighborHand.length === 0) {
      return {
        sourceIndex: neighborIndex,
        recipientIndex: index,
        cards: [],
      }
    }

    if (index === 0 && humanChoiceCardId !== null) {
      const chosenCard = neighborHand.find((card) => card.id === humanChoiceCardId)
      if (!chosenCard) {
        throw new Error("La carte choisie est introuvable dans la main de l'adversaire.")
      }
      const cards: Card[] = [chosenCard]
      if (cardCount > 1) {
        const remaining = neighborHand.filter((card) => card.id !== humanChoiceCardId)
        for (let i = 1; i < cardCount && remaining.length > 0; i += 1) {
          const cardIndex = Math.floor(random() * remaining.length)
          cards.push(remaining.splice(cardIndex, 1)[0])
        }
      }
      return { sourceIndex: neighborIndex, recipientIndex: index, cards }
    }

    const availableCards = [...neighborHand]
    const takeCount = Math.min(cardCount, availableCards.length)
    const cards = Array.from({ length: takeCount }, () => {
      const cardIndex = Math.floor(random() * availableCards.length)
      return availableCards.splice(cardIndex, 1)[0]
    })

    return {
      sourceIndex: neighborIndex,
      recipientIndex: index,
      cards,
    }
  })

  const cardsToRemove = game.players.map(() => new Set<string>())
  for (const { sourceIndex, cards } of chosenCards) {
    for (const card of cards) {
      cardsToRemove[sourceIndex].add(card.id)
    }
  }

  const hands = game.players.map((player, index) =>
    player.hand.filter((card) => !cardsToRemove[index].has(card.id)),
  )

  for (const { recipientIndex, cards } of chosenCards) {
    hands[recipientIndex].push(...cards)
  }

  let nextGame: GameState = {
    ...game,
    players: game.players.map((player, index) => ({
      ...player,
      hand: hands[index],
    })),
  }

  for (let index = 0; index < game.players.length; index += 1) {
    if (game.players[index].shield) {
      const players = [...nextGame.players]
      players[index] = { ...players[index], shield: false }
      nextGame = { ...nextGame, players }
    } else {
      nextGame = applyNegativeEffect(
        nextGame,
        index,
        {
          critical: isCriticalState(game.players[index]),
          isAttack: true,
        },
      )
    }
  }

  return nextGame
}

function computeConsequences(before: Player[], after: Player[]): string[] {
  const results: string[] = []
  for (let i = 0; i < after.length; i++) {
    const p = before[i]
    const n = after[i]
    if (!p.shield && n.shield) results.push(`${n.name} obtient un bouclier`)
    if (p.shield && !n.shield) results.push(`${n.name} perd son bouclier`)
    if (!isCriticalState(p) && isCriticalState(n)) results.push(`${n.name} est en état critique`)
    if (n.gauge === 0 && p.gauge > 0 && n.hand.length > p.hand.length) results.push(`${n.name} déclenche une surcharge maximale`)
  }
  return results
}

function appendConsequencesToEntry(game: GameState, historyIndex: number, before: Player[]): GameState {
  const consequences = computeConsequences(before, game.players)
  if (consequences.length === 0) return game
  const playHistory = [...game.playHistory]
  const entry = playHistory[historyIndex]
  if (!entry) return game
  playHistory[historyIndex] = { ...entry, consequences: [...entry.consequences, ...consequences] }
  return { ...game, playHistory }
}

export function resolvePendingEffect(game: GameState, options: ResolveOptions = {}, random: () => number = Math.random): GameState {
  if (game.matchResult) {
    throw new Error("La partie est terminee.")
  }

  if (game.roundResult) {
    throw new Error("La manche est terminee.")
  }

  const effect = game.pendingEffect
  if (!effect) {
    throw new Error("Aucun effet n'attend d'etre resolu.")
  }

  const before = game.players
  const historyIndex = effect?.historyIndex ?? 0
  const withC = (s: GameState): GameState => appendConsequencesToEntry(s, historyIndex, before)

  if (effect.kind === 'number-one-replay') {
    throw new Error("Selectionnez une carte a rejouer.")
  }

  if (effect.kind === 'number-one-combo-target') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    const nextGame = applyNegativeEffect(game, options.targetPlayerIndex!, {
      draw: 1,
      isAttack: true,
    })
    return {
      ...updatePlayHistory(
        nextGame,
        effect,
        `fait piocher ${nextGame.players[options.targetPlayerIndex!].name} puis rejoue`,
      ),
      pendingEffect: { ...effect, kind: 'number-one-replay' },
    }
  }

  if (effect.kind === 'choose-color') {
    if (!CARD_COLORS.some((color) => color.id === options.color)) {
      throw new RangeError("Choisissez une couleur valide.")
    }

    const colorName = CARD_COLORS.find(
      (color) => color.id === options.color,
    )!.label.toLowerCase()
    const resolvedGame = updatePlayHistory(
      game,
      effect,
      effect.isCombo
        ? `choisit ${colorName} et bloque les combos au prochain tour`
        : `choisit ${colorName}`,
    )
    return acknowledgeEffect({
      ...resolvedGame,
      activeColor: options.color!,
      combosBlockedUntilTurn: effect.isCombo
        ? game.turnNumber + 1
        : game.combosBlockedUntilTurn,
    })
  }

  if (effect.kind === 'targeted-surcharge') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    const targetName = game.players[options.targetPlayerIndex!].name
    const action = effect.cardType === CARD_TYPES.MIRROR
      ? `copie Overload et vise ${targetName}`
      : `vise ${targetName}, qui recoit une surcharge`
    return withC(acknowledgeEffect(
      updatePlayHistory(
        applyNegativeEffect(game, options.targetPlayerIndex!, {
          surcharge: 1,
          isAttack: true,
        }),
        effect,
        action,
      ),
    ))
  }

  if (effect.kind === 'targeted-spy') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    const targetName = game.players[options.targetPlayerIndex!].name
    const players = [...game.players]
    players[options.targetPlayerIndex!] = {
      ...players[options.targetPlayerIndex!],
      handVisibleUntilTurn: game.turnNumber + game.players.length,
      handVisibleToPlayerIndex: effect.playerIndex,
    }
    return acknowledgeEffect(
      updatePlayHistory(
        { ...game, players },
        effect,
        `espionne ${targetName}`,
      ),
    )
  }

  if (effect.kind === 'targeted-exchange') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    const sourcePlayer = game.players[effect.playerIndex]
    const targetPlayer = game.players[options.targetPlayerIndex!]
    if (sourcePlayer.hand.length === 0 || targetPlayer.hand.length === 0) {
      throw new Error("Les deux joueurs doivent avoir une carte a echanger.")
    }
    if (typeof random !== 'function') {
      throw new TypeError("La source aleatoire doit etre une fonction.")
    }

    const sourceCardIndex = Math.floor(random() * sourcePlayer.hand.length)
    const targetCardIndex = Math.floor(random() * targetPlayer.hand.length)
    const players = [...game.players]
    const sourceHand = [...sourcePlayer.hand]
    const targetHand = [...targetPlayer.hand]
    const [sourceCard] = sourceHand.splice(sourceCardIndex, 1)
    const [targetCard] = targetHand.splice(targetCardIndex, 1)
    sourceHand.push(targetCard)
    targetHand.push(sourceCard)
    players[effect.playerIndex] = { ...sourcePlayer, hand: sourceHand }
    players[options.targetPlayerIndex!] = {
      ...targetPlayer,
      hand: targetHand,
      handVisibleUntilTurn: game.turnNumber + game.players.length,
    }
    return withC(acknowledgeEffect(
      updatePlayHistory(
        { ...game, players },
        effect,
        `echange une carte avec ${targetPlayer.name}`,
      ),
    ))
  }

  if (effect.kind === 'targeted-surcharge-transfer') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    const sourcePlayer = game.players[effect.playerIndex]
    if (sourcePlayer.gauge < 1) {
      throw new Error("Vous n'avez plus de surcharge a transferer.")
    }

    const players = [...game.players]
    players[effect.playerIndex] = {
      ...sourcePlayer,
      gauge: sourcePlayer.gauge - 1,
    }
    const targetName = game.players[options.targetPlayerIndex!].name
    return withC(acknowledgeEffect(
      updatePlayHistory(
        applyNegativeEffect(
        { ...game, players },
        options.targetPlayerIndex!,
        { surcharge: 1, isAttack: true },
        ),
        effect,
        `transfere une surcharge a ${targetName}`,
      ),
    ))
  }

  if (effect.kind === 'targeted-threat') {
    validateTarget(game, effect.playerIndex, options.targetPlayerIndex)
    return {
      ...game,
      pendingEffect: {
        ...effect,
        kind: 'targeted-threat-response' as EffectKind,
        playerIndex: options.targetPlayerIndex!,
        sourcePlayerIndex: effect.playerIndex,
      },
    }
  }

  if (effect.kind === 'targeted-threat-response') {
    const sourcePlayerIndex = effect.sourcePlayerIndex!
    const sourcePlayer = game.players[sourcePlayerIndex]
    const targetPlayer = game.players[effect.playerIndex]
    const takeCard = options.threatChoice === 'card'

    const nextGame = applyNegativeEffect(
      game,
      effect.playerIndex,
      {
        draw: effect.isCombo ? 1 : 0,
        surcharge: takeCard ? 0 : 1,
        isAttack: true,
      },
    )
    if (targetPlayer.shield) {
      return withC(acknowledgeEffect(
        updatePlayHistory(
          nextGame,
          effect,
          `Menace annulée par le bouclier de ${targetPlayer.name}`,
        ),
      ))
    }

    if (takeCard && sourcePlayer.hand.length > 0) {
      const players = [...nextGame.players]
      const sourceHand = [...players[sourcePlayerIndex].hand]
      const takenIndex = Math.floor(random() * sourceHand.length)
      const [takenCard] = sourceHand.splice(takenIndex, 1)
      players[sourcePlayerIndex] = { ...players[sourcePlayerIndex], hand: sourceHand }
      players[effect.playerIndex] = {
        ...players[effect.playerIndex],
        hand: [...players[effect.playerIndex].hand, takenCard],
      }
      return withC(acknowledgeEffect(
        updatePlayHistory(
          { ...nextGame, players },
          effect,
          `choisit de prendre une carte de ${sourcePlayer.name}`,
        ),
      ))
    }

    return withC(acknowledgeEffect(
      updatePlayHistory(
        nextGame,
        effect,
        `choisit de prendre une surcharge`,
      ),
    ))
  }

  if (effect.kind === 'chaos-human-pick') {
    if (!options.choiceCardId) {
      throw new Error("Cliquez sur une carte de votre adversaire pour l'obtenir.")
    }
    return withC(acknowledgeEffect(resolveChaos(game, random, options.choiceCardId)))
  }

  if (effect.kind === 'left-neighbor-swap') {
    return withC(acknowledgeEffect(resolveChaos(game, random)))
  }

  if (effect.kind === 'copy-last-effect') {
    const copiedPlay = effect.copiedPlay
    if (!copiedPlay) {
      return acknowledgeEffect(game)
    }

    if (copiedPlay.cardType === CARD_TYPES.CHAOS) {
      return withC(acknowledgeEffect(resolveChaos(game, random)))
    }

    if (copiedPlay.cardType === CARD_TYPES.OVERLOAD) {
      return { ...game, pendingEffect: { ...effect, kind: 'targeted-surcharge' } }
    }

    if (copiedPlay.cardType === CARD_TYPES.NUMBER) {
      const { value, isCombo } = copiedPlay

      if (value === 1) {
        if (!isCombo) return acknowledgeEffect(game)
        return { ...game, pendingEffect: { ...effect, kind: 'number-one-combo-target' } }
      }

      if (value === 5) {
        const updatedGame = { ...game, turnDirection: (game.turnDirection * -1) as 1 | -1 }
        return acknowledgeEffect(updatedGame)
      }

      if (value === 3) {
        return {
          ...game,
          pendingEffect: { ...effect, kind: isCombo ? 'targeted-exchange' : 'targeted-spy' },
        }
      }

      if (value === 4) {
        return { ...game, pendingEffect: { ...effect, kind: 'choose-color', isCombo } }
      }

      if (value === 6 && isCombo) {
        if (game.players[effect.playerIndex].gauge < 1) {
          return acknowledgeEffect(game)
        }
        return { ...game, pendingEffect: { ...effect, kind: 'targeted-surcharge-transfer' } }
      }

      if (value === 7) {
        return { ...game, pendingEffect: { ...effect, kind: 'targeted-threat', isCombo } }
      }

      return withC(acknowledgeEffect(
        applyAutoCardEffect(game, effect.playerIndex, value!, isCombo, game.turnDirection),
      ))
    }

    return acknowledgeEffect(game)
  }

  return game
}

export function finishTurn(game: GameState): GameState {
  if (game.matchResult) {
    throw new Error("La partie est terminee.")
  }

  if (game.roundResult) {
    throw new Error("La manche est terminee.")
  }

  if (game.pendingEffect) {
    throw new Error("Appliquez l'effet de la carte avant de terminer le tour.")
  }

  const turnNumber = game.turnNumber + 1
  const currentPlayerIndex =
    (game.currentPlayerIndex + game.turnDirection + game.players.length) %
    game.players.length

  return {
    ...game,
    currentPlayerIndex,
    turnNumber,
    players: game.players.map((player) => ({
      ...player,
      attacksSinceTurn:
        player.id === game.players[currentPlayerIndex].id
          ? 0
          : player.attacksSinceTurn,
      handVisibleUntilTurn:
        (player.handVisibleUntilTurn ?? 0) > turnNumber
          ? player.handVisibleUntilTurn
          : null,
    })),
  }
}

export function acknowledgeEffect(game: GameState): GameState {
  if (!game.pendingEffect) {
    throw new Error("Aucun effet n'attend d'etre applique.")
  }

  return { ...game, pendingEffect: null }
}

export function replayCard(game: GameState, playerIndex: number, cardIds: string[], useSurcharge = false): GameState {
  const effect = game.pendingEffect
  if (
    effect?.kind !== 'number-one-replay' ||
    effect.playerIndex !== playerIndex
  ) {
    throw new Error("Aucune carte ne peut etre rejouee pour ce joueur.")
  }

  if (!Array.isArray(cardIds) || cardIds.length < 1 || cardIds.length > 2) {
    throw new Error("Rejouer nécessite une ou deux cartes.")
  }

  const replayedGame = playCards(
    acknowledgeEffect(game),
    playerIndex,
    cardIds,
    useSurcharge,
  )

  return replayedGame
}

export function advanceTurn(game: GameState): GameState {
  return finishTurn(game)
}

export function startNextRound(game: GameState, random: () => number = Math.random): GameState {
  if (!game.roundResult) {
    throw new Error("La manche en cours doit se terminer avant d'en commencer une autre.")
  }

  if (game.matchResult) {
    throw new Error("La partie est terminee.")
  }

  const nextRound = createGame(game.players.length, random)

  return {
    ...nextRound,
    playHistory: [...(game.playHistory ?? [])],
    players: nextRound.players.map((player, index) => ({
      ...player,
      name: game.players[index].name,
    })),
    cumulativeScores: [...game.cumulativeScores],
    roundNumber: game.roundNumber + 1,
  }
}

export function forceEndRound(game: GameState): GameState {
  const { players } = game

  const winnerIndex = players.reduce((bestIndex, player, index) => {
    const best = players[bestIndex]
    if (player.hand.length < best.hand.length) return index
    if (player.hand.length === best.hand.length && player.gauge < best.gauge) return index
    return bestIndex
  }, 0)

  const penalties = calculateRoundPenalties(players, winnerIndex, false)
  const cumulativeScores = game.cumulativeScores.map(
    (score, index) => score + penalties[index].totalPenalty,
  )
  const triggeredBy = cumulativeScores
    .map((score, index) => (score >= MATCH_POINT_LIMIT ? index : null))
    .filter((x): x is number => x !== null)

  const roundResult: RoundResult = {
    winnerIndex,
    winnerName: players[winnerIndex].name,
    penalties,
    cumulativeScores,
    matchOver: triggeredBy.length > 0,
  }

  let matchResult: MatchResult | null = null
  if (triggeredBy.length > 0) {
    const lowestScore = Math.min(...cumulativeScores)
    const winnerIndices = cumulativeScores
      .map((score, index) => (score === lowestScore ? index : null))
      .filter((x): x is number => x !== null)
    matchResult = {
      triggeredBy,
      winnerIndices,
      winners: winnerIndices.map((index) => players[index].name),
      scores: [...cumulativeScores],
    }
  }

  return { ...game, roundResult, matchResult, cumulativeScores, pendingEffect: null }
}
