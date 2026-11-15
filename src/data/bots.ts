import { type Card, type CardColorId, CARD_TYPES } from './cards.ts'
import {
  acknowledgeEffect,
  finishTurn,
  isCardPlayable,
  isCriticalState,
  isMirrorOnMirrorForbidden,
  MAX_GAUGE,
  playCards,
  replayCard,
  resolvePendingEffect,
  type GameState,
  type Player,
} from './game.ts'

interface BotMove {
  cardIds: string[]
  useSurcharge: boolean
}

function getTargetValue(game: GameState, botIndex: number, playerIndex: number): number {
  const player = game.players[playerIndex]
  const distance =
    (playerIndex - botIndex + game.players.length) % game.players.length
  const handPressure = 10 / (player.hand.length + 1)
  const scorePressure = (game.cumulativeScores[playerIndex] / 20) * 4
  const surchargePressure = player.gauge * 1.5
  const criticalPressure =
    player.hand.length > 0 && player.hand.length < 3 ? 2 : 0
  const shieldPenalty = player.shield ? 30 : 0

  return handPressure + scorePressure + surchargePressure +
    criticalPressure - shieldPenalty - distance * 0.01
}

export function chooseBotTarget(game: GameState, botIndex: number): number {
  return game.players.reduce((bestIndex, _player, index) => {
    if (index === botIndex) {
      return bestIndex
    }

    return getTargetValue(game, botIndex, index) >
      getTargetValue(game, botIndex, bestIndex)
      ? index
      : bestIndex
  }, botIndex === 0 ? 1 : 0)
}

function getTacticalValue(game: GameState, botIndex: number, cards: Card[]): number {
  const card = cards[cards.length - 1]
  const targetIndex = chooseBotTarget(game, botIndex)
  const target = game.players[targetIndex]

  if (card.type === CARD_TYPES.OVERLOAD) {
    return target.shield ? 0 : 7 + 10 / (target.hand.length + 1)
  }

  if (card.type === CARD_TYPES.MIRROR) {
    return game.lastPlay && game.lastPlay.cardType !== CARD_TYPES.MIRROR
      ? 8
      : -2
  }

  if (card.type === CARD_TYPES.CHAOS) {
    return game.players.length + target.hand.length < 5 ? 7 : 3
  }

  return 0
}

function getSurchargeCost(player: Player, lowDeckActive: boolean): number {
  const surchargeCount = lowDeckActive ? 2 : 1
  let gauge = player.gauge
  let cost = 0

  for (let index = 0; index < surchargeCount; index += 1) {
    gauge += 1
    cost += 12 + gauge * 5
    if (gauge === 3) {
      cost += 28
      gauge = 0
    }
  }

  return cost
}

function getGaugeAfterSurcharge(player: Player, useSurcharge: boolean, lowDeckActive: boolean): number {
  let gauge = player.gauge
  const surchargeCount = useSurcharge ? (lowDeckActive ? 2 : 1) : 0

  for (let index = 0; index < surchargeCount; index += 1) {
    gauge += 1
    if (gauge === 3) {
      gauge = 0
    }
  }

  return gauge
}

function scoreMove(game: GameState, botIndex: number, cards: Card[]): number {
  const player = game.players[botIndex]
  const isPlayable = cards.some((card) =>
    isCardPlayable(card, game.discardPile, game.activeColor),
  )
  const useSurcharge = !isPlayable
  if (
    cards.length === 2 &&
    cards[0].value === 6 &&
    getGaugeAfterSurcharge(player, useSurcharge, game.lowDeckActive) < 1
  ) {
    return Number.NEGATIVE_INFINITY
  }
  if (
    cards.length === 2 &&
    game.combosBlockedUntilTurn === game.turnNumber
  ) {
    return Number.NEGATIVE_INFINITY
  }
  const emptiesHand = cards.length === player.hand.length

  return (
    cards.length * 100 +
    getTacticalValue(game, botIndex, cards) -
    (useSurcharge ? getSurchargeCost(player, game.lowDeckActive) : 0) +
    (emptiesHand ? 10000 : 0)
  )
}

export function chooseBotMove(game: GameState, botIndex: number): BotMove {
  const player = game.players[botIndex]
  if (!player || botIndex === 0) {
    throw new RangeError('Un adversaire valide doit être choisi pour le bot.')
  }

  const candidates: Card[][] = player.hand
    .filter((card) => !isMirrorOnMirrorForbidden(card, game.discardPile))
    .map((card) => [card])
  if (candidates.length === 0) {
    throw new Error('Aucun Miroir ne peut être posé sur le Miroir visible.')
  }

  if (!isCriticalState(player)) {
    for (let firstIndex = 0; firstIndex < player.hand.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < player.hand.length;
        secondIndex += 1
      ) {
        const firstCard = player.hand[firstIndex]
        const secondCard = player.hand[secondIndex]
        if (
          firstCard.type === CARD_TYPES.NUMBER &&
          secondCard.type === CARD_TYPES.NUMBER &&
          firstCard.value === secondCard.value &&
          game.combosBlockedUntilTurn !== game.turnNumber &&
          (firstCard.value !== 6 || player.gauge > 0)
        ) {
          candidates.push([firstCard, secondCard])
        }
      }
    }
  }

  const bestCards = candidates.reduce((best, candidate) =>
    scoreMove(game, botIndex, candidate) > scoreMove(game, botIndex, best)
      ? candidate
      : best,
  )
  const useSurcharge = !bestCards.some((card) =>
    isCardPlayable(card, game.discardPile, game.activeColor),
  )

  return {
    cardIds: bestCards.map((card) => card.id),
    useSurcharge,
  }
}

function resolveBotEffects(
  game: GameState,
  botIndex: number,
  random: () => number,
): GameState {
  let nextGame: GameState = game
  let resolutionCount = 0

  while (nextGame.pendingEffect) {
    if (resolutionCount >= 80) {
      throw new Error("Le bot a dépassé le nombre prévu de résolutions d'effet.")
    }

    const effect = nextGame.pendingEffect
    if (effect.kind === 'choose-color') {
      const colorTotals = new Map<string, number>()
      for (const card of nextGame.players[botIndex].hand) {
        if (card.type === CARD_TYPES.NUMBER) {
          colorTotals.set(
            card.color,
            (colorTotals.get(card.color) ?? 0) + 1,
          )
        }
      }

      const color: CardColorId = ([...colorTotals.entries()].sort(
        ([, countA], [, countB]) => countB - countA,
      )[0]?.[0] ?? 'yellow') as CardColorId
      nextGame = resolvePendingEffect(nextGame, { color }, random) as GameState
      resolutionCount += 1
      continue
    }

    if (effect.kind === 'number-one-replay') {
      const move = chooseBotMove(
        acknowledgeEffect(nextGame) as GameState,
        botIndex,
      )
      nextGame = replayCard(
        nextGame,
        botIndex,
        move.cardIds,
        move.useSurcharge,
      ) as GameState
      resolutionCount += 1
      continue
    }

    const copiesOverload =
      effect.kind === 'copy-last-effect' &&
      effect.copiedPlay?.cardType === CARD_TYPES.OVERLOAD
    if (
      effect.kind === 'number-one-combo-target' ||
      effect.kind === 'targeted-surcharge' ||
      effect.kind === 'targeted-spy' ||
      effect.kind === 'targeted-exchange' ||
      effect.kind === 'targeted-surcharge-transfer' ||
      effect.kind === 'targeted-threat' ||
      copiesOverload
    ) {
      nextGame = resolvePendingEffect(
        nextGame,
        {
          targetPlayerIndex: chooseBotTarget(nextGame, botIndex),
          threatChoice: 'surcharge',
        },
        random,
      ) as GameState
    } else if (effect.kind === 'targeted-threat-response' && effect.playerIndex !== 0) {
      const respondingBot = nextGame.players[effect.playerIndex]
      const threatChoice = respondingBot.gauge >= MAX_GAUGE - 1 ? 'card' : 'surcharge'
      nextGame = resolvePendingEffect(nextGame, { threatChoice }, random) as GameState
    } else if (effect.kind === 'targeted-threat-response' && effect.playerIndex === 0) {
      break
    } else if (
      effect.kind === 'left-neighbor-swap' ||
      (
        effect.kind === 'copy-last-effect' &&
        effect.copiedPlay?.cardType === CARD_TYPES.CHAOS
      )
    ) {
      nextGame = {
        ...nextGame,
        pendingEffect: { ...nextGame.pendingEffect, kind: 'chaos-human-pick' },
      }
      break
    } else if (effect.kind === 'copy-last-effect') {
      nextGame = resolvePendingEffect(nextGame, {}, random) as GameState
    } else {
      nextGame = acknowledgeEffect(nextGame) as GameState
    }

    resolutionCount += 1
  }

  return nextGame
}

export function playBotTurn(
  game: GameState,
  botIndex: number,
  random: () => number = Math.random,
): GameState {
  if (game.currentPlayerIndex !== botIndex) {
    throw new Error("Ce n'est pas le tour de ce bot.")
  }

  const move = chooseBotMove(game, botIndex)
  let nextGame = playCards(game, botIndex, move.cardIds, move.useSurcharge) as GameState

  if (nextGame.roundResult) {
    return nextGame
  }

  nextGame = resolveBotEffects(nextGame, botIndex, random)
  if (nextGame.roundResult || nextGame.pendingEffect) {
    return nextGame
  }

  return finishTurn(nextGame) as GameState
}
