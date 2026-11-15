import { useEffect, useState } from 'react'
import { CARD_COLORS, CARD_TYPES } from './data/cards.ts'
import {
  createGame,
  finishTurn,
  forceEndRound,
  isCriticalState,
  isCardPlayable,
  isMirrorOnMirrorForbidden,
  playCards,
  replayCard,
  resolvePendingEffect,
  startNextRound,
} from './data/game.ts'
import { playBotTurn } from './data/bots.ts'
import { HandCard } from './components/Card.jsx'
import TopBar from './components/TopBar.jsx'
import BottomBar from './components/BottomBar.jsx'
import PlayHistory from './components/PlayHistory.jsx'
import GameTable from './components/GameTable.jsx'
import Snackbar from './components/Snackbar.jsx'
import './App.css'


const TARGETED_EFFECT_KINDS = new Set([
  'number-one-combo-target',
  'targeted-surcharge',
  'targeted-spy',
  'targeted-exchange',
  'targeted-surcharge-transfer',
  'targeted-threat',
])

function App() {
  const [game, setGame] = useState(null)
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [playError, setPlayError] = useState('')
  const [botError, setBotError] = useState('')
  const [autoPlay, setAutoPlay] = useState(false)
  const [deckError, setDeckError] = useState(null)
  const playerCount = game?.players.length
  const localPlayer = game?.players[0]
  const selectedCards = localPlayer
    ? selectedCardIds.map((id) => localPlayer.hand.find((card) => card.id === id))
    : []
  const isComboSelection = selectedCards.length === 2
  const selectedCardsArePlayable =
    game && selectedCards.length > 0 && (
      isComboSelection
        ? selectedCards.some((card) => isCardPlayable(card, game.discardPile, game.activeColor))
        : selectedCards.every((card) => isCardPlayable(card, game.discardPile, game.activeColor))
    )
  const requiresSurcharge =
    selectedCards.length > 0 && !selectedCardsArePlayable
  const isChoosingTarget =
    game?.pendingEffect?.playerIndex === 0 &&
    TARGETED_EFFECT_KINDS.has(game.pendingEffect.kind)
  const isReplayingCard =
    game?.pendingEffect?.kind === 'number-one-replay' &&
    game.pendingEffect.playerIndex === 0
  const isChoosingColor =
    game?.pendingEffect?.kind === 'choose-color' &&
    game.pendingEffect.playerIndex === 0
  const isRespondingToThreat =
    game?.pendingEffect?.kind === 'targeted-threat-response' &&
    game.pendingEffect.playerIndex === 0
  const combosBlocked =
    game?.combosBlockedUntilTurn === game?.turnNumber
  const isChaosHumanPick = game?.pendingEffect?.kind === 'chaos-human-pick'
  const chaosNeighborIndex = game && playerCount
    ? (playerCount + game.turnDirection) % playerCount
    : 1
  const isBotTurn = Boolean(
    game &&
    game.currentPlayerIndex !== 0 &&
    !game.roundResult &&
    !game.matchResult &&
    !game.pendingEffect,
  )

  function executeBotTurn(currentGame) {
    try {
      const botIndex = currentGame.currentPlayerIndex
      const nextGame = playBotTurn(currentGame, botIndex)
      setBotError('')
      setSelectedCardIds([])

      setGame((g) => g === currentGame ? nextGame : g)
    } catch (error) {
      if (error instanceof RangeError && error.message.startsWith('La pioche ne contient pas assez')) {
        setDeckError(error.message)
        setBotError('')
      } else {
        setBotError(
          error instanceof Error
            ? error.message
            : "Un adversaire n'a pas pu jouer.",
        )
      }
    }
  }

  function handleNextBot() {
    if (isBotTurn && !autoPlay && game) {
      executeBotTurn(game)
    }
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined

    window.__testSetup = (config) => {
      const base = createGame(config.playerCount ?? 2)

      // Collect all cards from every zone
      const allCards = [
        base.revealedCard,
        ...base.discardPile,
        ...base.drawPile,
        ...base.players.flatMap((p) => p.hand),
      ]
      const usedIds = new Set()

      const takeCard = ({ color, value, type } = {}) => {
        const card = allCards.find(
          (c) =>
            !usedIds.has(c.id) &&
            (!color || c.color === color) &&
            (value === undefined || c.value === value) &&
            (!type || c.type === type),
        )
        if (card) usedIds.add(card.id)
        return card
      }

      const revealedCard = config.revealedCard
        ? takeCard(config.revealedCard)
        : (() => { usedIds.add(base.revealedCard.id); return base.revealedCard })()

      const discardPile = config.discardPile
        ? config.discardPile.map((spec) => takeCard(spec)).filter(Boolean)
        : [revealedCard]

      const players = base.players.map((player, i) => {
        const cfg = config.players?.[i]
        const hand = cfg?.hand
          ? cfg.hand.map((spec) => takeCard(spec)).filter(Boolean)
          : player.hand.filter((c) => !usedIds.has(c.id))
        hand.forEach((c) => usedIds.add(c.id))
        return {
          ...player,
          gauge: cfg?.gauge ?? player.gauge,
          attacksSinceTurn: cfg?.attacksSinceTurn ?? player.attacksSinceTurn,
          shield: cfg?.shield ?? player.shield,
          hand,
        }
      })

      setGame({
        ...base,
        activeColor: config.activeColor ?? base.activeColor,
        revealedCard,
        discardPile,
        drawPile: Array.isArray(config.drawPile)
          ? config.drawPile.map((spec) => takeCard(spec)).filter(Boolean)
          : allCards.filter((c) => !usedIds.has(c.id)),
        players,
        currentPlayerIndex: config.currentPlayerIndex ?? 0,
        lastPlay: config.lastPlay ?? null,
        turnDirection: config.turnDirection ?? base.turnDirection,
        cumulativeScores: Array.isArray(config.cumulativeScores)
          ? config.cumulativeScores
          : base.cumulativeScores,
      })
    }

    return () => { delete window.__testSetup }
  }, [])

  useEffect(() => {
    if (!isBotTurn || !autoPlay) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      executeBotTurn(game)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [game, autoPlay])

  function toggleCardSelection(card) {
    setPlayError('')
    if (isMirrorOnMirrorForbidden(card, game.discardPile)) {
      setPlayError('Vous ne pouvez pas poser un Miroir sur un autre Miroir.')
      return
    }

    if (selectedCardIds.includes(card.id)) {
      setSelectedCardIds(selectedCardIds.filter((id) => id !== card.id))
      return
    }

    if (selectedCardIds.length === 0) {
      setSelectedCardIds([card.id])
      return
    }

    if (
      selectedCardIds.length === 1 &&
      selectedCards[0].type === CARD_TYPES.NUMBER &&
      card.type === CARD_TYPES.NUMBER &&
      selectedCards[0].value === card.value &&
      !combosBlocked &&
      !isCriticalState(localPlayer)
    ) {
      setSelectedCardIds([...selectedCardIds, card.id])
      return
    }

    if (isCriticalState(localPlayer)) {
      setPlayError(
        'En état critique, vous ne pouvez pas sélectionner un combo.',
      )
    } else if (combosBlocked) {
      setPlayError('Les combos sont bloqués pendant ce tour.')
    } else {
      setPlayError(
        selectedCardIds.length >= 2
          ? 'Vous ne pouvez sélectionner que deux cartes.'
          : 'Pour former un combo, choisissez deux cartes de même valeur.',
      )
    }
  }

  function handlePlayCards() {
    try {
      let nextGame = isReplayingCard
        ? replayCard(game, 0, selectedCardIds, requiresSurcharge)
        : playCards(game, 0, selectedCardIds, requiresSurcharge)
      const effect = nextGame.pendingEffect
      const isChaosEffect =
        effect?.kind === 'left-neighbor-swap' ||
        (
          effect?.kind === 'copy-last-effect' &&
          effect.copiedPlay?.cardType === CARD_TYPES.CHAOS
        )

      if (isChaosEffect) {
        nextGame = {
          ...nextGame,
          pendingEffect: { ...nextGame.pendingEffect, kind: 'chaos-human-pick' },
        }
      } else if (effect?.kind === 'copy-last-effect') {
        nextGame = resolvePendingEffect(nextGame)
      }

      setGame(
        !nextGame.pendingEffect && !nextGame.roundResult
          ? finishTurn(nextGame)
          : nextGame,
      )
      setSelectedCardIds([])

      setPlayError('')
    } catch (error) {
      if (error instanceof RangeError && error.message.startsWith('La pioche ne contient pas assez')) {
        setDeckError(error.message)
      } else {
        setPlayError(error.message)
      }
    }
  }

  function handleTargetPlayer(targetPlayerIndex) {
    if (!game || !isChoosingTarget) {
      return
    }

    try {
      let resolvedGame = resolvePendingEffect(game, { targetPlayerIndex })
      if (
        resolvedGame.pendingEffect?.kind === 'targeted-threat-response' &&
        resolvedGame.pendingEffect.playerIndex !== 0
      ) {
        resolvedGame = resolvePendingEffect(resolvedGame, { threatChoice: 'surcharge' })
      }
      setGame(resolvedGame.pendingEffect ? resolvedGame : finishTurn(resolvedGame))
      setPlayError('')
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "L'effet n'a pas pu être appliqué.",
      )
    }
  }

  function handleRespondToThreat(choice) {
    if (!game || !isRespondingToThreat) return
    try {
      const resolvedGame = resolvePendingEffect(game, { threatChoice: choice })
      setGame(resolvedGame.pendingEffect ? resolvedGame : finishTurn(resolvedGame))
      setPlayError('')
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "La réponse n'a pas pu être appliquée.",
      )
    }
  }

  function handleChooseColor(color) {
    if (!game || !isChoosingColor) {
      return
    }

    try {
      const resolvedGame = resolvePendingEffect(game, { color })
      setGame(
        resolvedGame.pendingEffect
          ? resolvedGame
          : finishTurn(resolvedGame),
      )
      setPlayError('')
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "La couleur n'a pas pu être choisie.",
      )
    }
  }

  function handleChaosCardPick(cardId) {
    if (!game || !isChaosHumanPick) return
    try {
      const resolvedGame = resolvePendingEffect(game, { choiceCardId: cardId })
      setGame(resolvedGame.pendingEffect ? resolvedGame : finishTurn(resolvedGame))
      setPlayError('')
    } catch (error) {
      setPlayError(
        error instanceof Error ? error.message : "La carte n'a pas pu être récupérée.",
      )
    }
  }

  let snackbarMessage = null
  let snackbarAction = null
  if (deckError) {
    snackbarMessage = deckError
    snackbarAction = {
      label: 'Terminer la manche',
      onClick: () => {
        setGame(forceEndRound(game))
        setDeckError(null)
      },
    }
  } else if (game && !game.roundResult) {
    if (isChaosHumanPick) {
      const chaosPlayer = game.players[game.pendingEffect.playerIndex]
      const neighborPlayer = game.players[chaosNeighborIndex]
      snackbarMessage = `${chaosPlayer.name} a joué une carte Chaos — choisissez une carte chez ${neighborPlayer.name}`
    } else if (isRespondingToThreat) {
      const sourcePlayer = game.players[game.pendingEffect.sourcePlayerIndex]
      snackbarMessage = `${sourcePlayer.name} vous menace avec son 7 — choisissez votre réponse`
    } else if (isChoosingTarget) {
      const kind = game.pendingEffect.kind
      if (kind === 'targeted-spy') snackbarMessage = 'Espionnez la main d\'un joueur adverse'
      else if (kind === 'targeted-exchange') snackbarMessage = 'Échangez une carte avec un joueur adverse'
      else if (kind === 'targeted-surcharge') snackbarMessage = 'Infligez une surcharge à un joueur adverse'
      else if (kind === 'targeted-surcharge-transfer') snackbarMessage = 'Transférez votre surcharge à un joueur adverse'
      else if (kind === 'targeted-threat') snackbarMessage = 'Menacez un joueur adverse avec votre 7'
      else snackbarMessage = 'Choisissez un joueur cible'
    } else if (isChoosingColor) {
      snackbarMessage = game.pendingEffect.isCombo
        ? 'Choisissez une couleur — les combos seront bloqués au prochain tour'
        : 'Choisissez la couleur active'
    } else if (isReplayingCard) {
      snackbarMessage = 'Effet rejouer — sélectionnez une carte valide'
    }
  }

  return (
    <main className="game-shell">
      <div className="game-main">
      {playerCount && <TopBar onHomeClick={() => {
        setGame(null)
        setBotError('')
        setSelectedCardIds([])
        setPlayError('')
        setDeckError(null)
      }} />}

      {!playerCount ? (
        <section className="setup-panel" aria-labelledby="setup-title">
          <img src="./logo.png" alt="Overload" width="175" />
          <p className="eyebrow">La table est à vous</p>
          <h1 id="setup-title">On lance une partie&nbsp;?</h1>
          <p className="setup-description">
            Réunissez les joueurs autour de la table et survivez à la surcharge !
          </p>
          <label className="select-label" htmlFor="player-count">
            Nombre de joueurs
          </label>
          <select
            id="player-count"
            className="player-select"
            value=""
            onChange={(event) => {
              setGame(createGame(Number(event.target.value)))
              setBotError('')
              setSelectedCardIds([])
              setPlayError('')
              setDeckError(null)
            }}
          >
            <option value="" disabled>Choisir entre 2 et 6 joueurs</option>
            {[2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} joueurs
              </option>
            ))}
          </select>
          <span className="setup-hint">Vous serez placé en bas de la table.</span>
        </section>
      ) : (
        <section
          className="game-area"
          aria-label={`Table de jeu pour ${playerCount} joueurs`}
        >
          <GameTable
            game={game}
            botError={botError}
            autoPlay={autoPlay}
            isChoosingTarget={isChoosingTarget}
            isChaosHumanPick={isChaosHumanPick}
            chaosNeighborIndex={chaosNeighborIndex}
            onNextRound={() => {
              setGame(startNextRound(game))
              setBotError('')
              setSelectedCardIds([])
              setPlayError('')
              setDeckError(null)
            }}
            onTargetPlayer={handleTargetPlayer}
            onChaosCardPick={handleChaosCardPick}
          />
          <div className="local-hand" aria-label="Votre main">
            <span className="local-hand-label">Votre main</span>
            <div className="local-hand-cards">
              {game.players[0].hand.map((card, index) => {
                const color = CARD_COLORS.find((cardColor) => cardColor.id === card.color)
                return (
                  <HandCard
                    key={card.id}
                    card={card}
                    color={color}
                    selected={selectedCardIds.includes(card.id)}
                    disabled={game.currentPlayerIndex !== 0}
                    cardIndex={index}
                    onClick={() => toggleCardSelection(card)}
                  />
                )
              })}
            </div>
            {(game.currentPlayerIndex === 0 || isRespondingToThreat || isChaosHumanPick) && !game.roundResult && (
              <div className="hand-actions">
                {isChoosingTarget && (
                  <span className="target-player-prompt" role="status">
                    {game.pendingEffect.kind === 'number-one-combo-target'
                      ? 'Cliquez sur le joueur qui piochera une carte, puis rejouez une carte.'
                      : game.pendingEffect.kind === 'targeted-spy'
                      ? 'Cliquez sur le joueur dont vous voulez voir la main.'
                      : game.pendingEffect.kind === 'targeted-exchange'
                        ? 'Cliquez sur un joueur pour échanger une carte au hasard.'
                        : game.pendingEffect.kind === 'targeted-surcharge-transfer'
                          ? 'Cliquez sur le joueur qui recevra votre surcharge.'
                          : 'Cliquez sur un joueur à cibler.'}
                  </span>
                )}
                {isChaosHumanPick && (
                  <span className="target-player-prompt" role="status">
                    Cliquez sur une carte de {game.players[chaosNeighborIndex].name} pour l'obtenir.
                  </span>
                )}
                {isReplayingCard && (
                  <span className="target-player-prompt" role="status">
                    Sélectionnez une carte valide à rejouer, puis cliquez sur « Rejouer ».
                  </span>
                )}
                {isRespondingToThreat && (
                  <div className="threat-response">
                    <span className="threat-response-label">
                      Menace de {game.players[game.pendingEffect.sourcePlayerIndex].name} — choisissez :
                    </span>
                    <div className="threat-response-choices">
                      <button
                        type="button"
                        className="threat-response-btn"
                        onClick={() => handleRespondToThreat('surcharge')}
                      >
                        Prendre une surcharge
                      </button>
                      <button
                        type="button"
                        className="threat-response-btn"
                        onClick={() => handleRespondToThreat('card')}
                      >
                        Prendre une carte de sa main
                      </button>
                    </div>
                  </div>
                )}
                {game.pendingEffect && !isReplayingCard && !isChoosingTarget && !isChoosingColor && !isRespondingToThreat && (
                  <span className="play-error" role="status">
                    Cet effet nécessite une action avant le prochain tour.
                  </span>
                )}
                {playError && (
                  <span className="play-error" role="status">{playError}</span>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {game && playerCount && (
        <BottomBar
          autoPlay={autoPlay}
          onAutoPlayChange={setAutoPlay}
          isBotTurn={isBotTurn}
          onNextBot={handleNextBot}
          isChoosingColor={isChoosingColor}
          colorChoiceIsCombo={isChoosingColor && game.pendingEffect.isCombo}
          onChooseColor={handleChooseColor}
          playDisabled={
            game.currentPlayerIndex !== 0 ||
            Boolean(game.roundResult) ||
            selectedCardIds.length === 0 ||
            (Boolean(game.pendingEffect) && !isReplayingCard)
          }
          playLabel={
            isReplayingCard
              ? 'Rejouer la carte'
              : requiresSurcharge
                ? `Jouer${isComboSelection ? ' le combo' : ' la carte'} (+ 1 surcharge)`
                : `Jouer${isComboSelection ? ' le combo' : ' la carte'}`
          }
          onPlay={handlePlayCards}
        />
      )}
      <Snackbar message={snackbarMessage} action={snackbarAction} />
      </div>
      {game ? <PlayHistory playHistory={game.playHistory} /> : null}
    </main>
  )
}

export default App
