import './GameTable.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { CARD_COLORS } from '../data/cards.ts'
import { isCriticalState, MAX_GAUGE } from '../data/game.ts'
import { OpponentCard, RevealedCard } from './Card.jsx'

export default function GameTable({
  game,
  botError,
  autoPlay,
  isChoosingTarget,
  isChaosHumanPick,
  chaosNeighborIndex,
  onNextRound,
  onTargetPlayer,
  onChaosCardPick,
}) {
  const playerCount = game.players.length
  const revealedCardColor = CARD_COLORS.find((color) => color.id === game.revealedCard.color)
  const activeColorId = game.activeColor ?? 'purple'
  const tableColor = CARD_COLORS.find((color) => color.id === activeColorId)
  const lastNumericCard = revealedCardColor?.id === 'purple'
    ? ([...game.discardPile].reverse().find((c) => c.type === 'number') ?? null)
    : null
  const lastNumericCardColor = lastNumericCard
    ? CARD_COLORS.find((c) => c.id === lastNumericCard.color)
    : null

  return (
    <div className="table-stage">
      {botError && (
        <span className="bot-error" role="alert">{botError}</span>
      )}
      <div
        className="game-table"
        style={{ '--table-color': tableColor.hex }}
      >
        <div className="table-ring">
          <div className="table-center">
            {game.roundResult ? (
              <div className="round-result" aria-live="polite">
                <span className="table-subtitle">
                  {game.matchResult ? 'Fin de partie' : `Manche ${game.roundNumber} terminée`}
                </span>
                <span className="round-winner">
                  {game.matchResult
                    ? `${game.matchResult.winners.join(', ')} remporte${game.matchResult.winners.length > 1 ? 'nt' : ''} la partie`
                    : `${game.roundResult.winnerName} gagne la manche`}
                </span>
                {game.matchResult && (
                  <span className="match-trigger">
                    Seuil atteint par {game.matchResult.triggeredBy
                      .map((index) => game.players[index].name)
                      .join(', ')}
                  </span>
                )}
                <span className="round-score-title">
                  {game.matchResult ? 'Classement final' : 'Pénalités · total'}
                </span>
                <ul className="round-score-list">
                  {game.roundResult.penalties.map((penalty) => (
                    <li key={penalty.playerIndex}>
                      <span>{penalty.playerName}</span>
                      <span>
                        {game.roundResult.matchOver
                          ? `${game.roundResult.cumulativeScores[penalty.playerIndex]} pts`
                          : `+${penalty.totalPenalty} · ${game.roundResult.cumulativeScores[penalty.playerIndex]} pts`}
                      </span>
                    </li>
                  ))}
                </ul>
                {!game.matchResult && (
                  <button
                    className="next-round-button"
                    type="button"
                    onClick={onNextRound}
                  >
                    Manche suivante
                  </button>
                )}
              </div>
            ) : (
              <>
                <span className="table-subtitle">
                  Sens {game.turnDirection === 1 ? 'horaire' : 'antihoraire'}
                </span>
                <span className="table-player-count">
                  {playerCount} JOUEURS
                </span>
                <div className="revealed-card-wrapper">
                  {lastNumericCard && lastNumericCardColor && (
                    <div className="revealed-card-peek" aria-hidden="true">
                      <RevealedCard card={lastNumericCard} color={lastNumericCardColor} />
                    </div>
                  )}
                  <RevealedCard card={game.revealedCard} color={revealedCardColor} />
                </div>
                <span className="revealed-card-caption">Première carte</span>
                <span className="table-starter">
                  Commence : {game.players[game.startingPlayerIndex].name}
                </span>
                <span className="draw-pile">
                  Pioche · {game.drawPile.length} cartes
                  {game.lowDeckActive && ' · Panne générale ×2'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {game.players.map((player, index) => {
        const isCurrentPlayer = index === game.currentPlayerIndex
        const angle = Math.PI / 2 + (index * 2 * Math.PI) / playerCount
        const x = 50 + Math.cos(angle) * 43
        const y = 50 + Math.sin(angle) * 43
        const handOnLeft = x < 50
        const isHandRevealed = player.handVisibleUntilTurn > game.turnNumber &&
          (player.handVisibleToPlayerIndex === null || player.handVisibleToPlayerIndex === 0)
        const isCritical = isCriticalState(player, game.rules)

        return (
          <div
            className={`player-seat${isCurrentPlayer ? ' player-seat-current' : ''}`}
            key={player.id}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${player.name}, ${player.hand.length} cartes, jauge ${player.gauge} sur ${MAX_GAUGE}${isCurrentPlayer ? ', commence la partie' : ''}`}
            role={
              isChoosingTarget && game.pendingEffect.playerIndex !== index
                ? 'button'
                : undefined
            }
            tabIndex={
              isChoosingTarget && game.pendingEffect.playerIndex !== index
                ? 0
                : undefined
            }
            onClick={() => {
              if (isChoosingTarget && game.pendingEffect.playerIndex !== index) {
                onTargetPlayer(index)
              }
            }}
            onKeyDown={(event) => {
              if (
                isChoosingTarget &&
                game.pendingEffect.playerIndex !== index &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault()
                onTargetPlayer(index)
              }
            }}
          >
            <div className="player-tag">
              <div className="player-tag-avatar">
                <FontAwesomeIcon icon={faUser} aria-hidden="true" />
              </div>
              <span className="player-tag-name">{player.name}</span>
              <span className="player-tag-shield" aria-hidden="true">
                {player.shield && <FontAwesomeIcon icon={faShieldHalved} />}
              </span>
            </div>
            {(isCritical || isHandRevealed) && (
              <div className="player-status">
                {isCritical && <span className="player-status-badge player-status-critical">État critique</span>}
                {isHandRevealed && <span className="player-status-badge player-status-panne">Main dévoilée</span>}
              </div>
            )}
            <div
              className="player-gauge"
              role="meter"
              aria-label={`Jauge de ${player.name}`}
              aria-valuemin={0}
              aria-valuemax={MAX_GAUGE}
              aria-valuenow={player.gauge}
            >
              {Array.from({ length: MAX_GAUGE }, (_, gaugeIndex) => (
                <span
                  className={`gauge-segment${gaugeIndex < player.gauge ? ' gauge-segment-filled' : ''}`}
                  key={gaugeIndex}
                />
              ))}
              <span className="gauge-value">
                {player.gauge}/{MAX_GAUGE}
              </span>
            </div>
            {isCurrentPlayer && (
              <span className="player-turn">
                {index === 0 ? 'À vous de jouer' : autoPlay ? 'Réfléchit…' : 'En attente'}
              </span>
            )}
            {player.id !== 0 && (
              <div
                className={`opponent-hand${handOnLeft ? ' opponent-hand-left' : ''}${isHandRevealed ? ' opponent-hand-revealed' : ''}`}
                role="group"
                aria-label={`${isHandRevealed ? 'Main révélée' : 'Main cachée'} de ${player.name}, ${player.hand.length} cartes`}
              >
                {player.hand.map((card, cardIndex) => {
                  const isPickable = isChaosHumanPick && index === chaosNeighborIndex
                  const color = isHandRevealed
                    ? CARD_COLORS.find((cardColor) => cardColor.id === card.color)
                    : undefined
                  return (
                    <OpponentCard
                      key={card.id}
                      card={card}
                      color={color}
                      cardIndex={cardIndex}
                      hidden={!isHandRevealed}
                      pickable={isPickable}
                      onPick={() => onChaosCardPick(card.id)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
