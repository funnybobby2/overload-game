import './Card.css'
import cardBackImg from '../assets/card back.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExplosion, faBatteryQuarter } from '@fortawesome/free-solid-svg-icons'
import { CARD_TYPES } from '../data/cards.ts'

const CARD_TYPE_LABELS = {
  [CARD_TYPES.OVERLOAD]: 'Overload',
  [CARD_TYPES.MIRROR]: 'Miroir',
  [CARD_TYPES.CHAOS]: 'Chaos',
}

const CARD_TYPE_ICONS = {
  [CARD_TYPES.CHAOS]: faExplosion,
  [CARD_TYPES.OVERLOAD]: faBatteryQuarter,
}

function getValueLabel(card) {
  return card.type === CARD_TYPES.NUMBER ? card.value : CARD_TYPE_LABELS[card.type]
}

function CardValueContent({ card }) {
  if (card.type === CARD_TYPES.NUMBER) return card.value
  if (card.type === CARD_TYPES.MIRROR) {
    return <img src="/miroir.png" alt="" aria-hidden="true" className="card-mirror-icon" />
  }
  return <FontAwesomeIcon icon={CARD_TYPE_ICONS[card.type]} aria-hidden="true" />
}

export function HandCard({ card, color, selected, disabled, cardIndex, onClick }) {
  const isSpecial = card.type !== CARD_TYPES.NUMBER
  const valueLabel = getValueLabel(card)
  const ariaLabel = isSpecial
    ? `${valueLabel}, ${color.label.toLowerCase()}`
    : `${valueLabel} ${color.label.toLowerCase()}`

  return (
    <button
      className={`card card-hand${selected ? ' card-selected' : ''}`}
      type="button"
      disabled={disabled}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={selected}
      aria-describedby={card.power ? `card-power-${card.id}` : undefined}
      style={{ '--card-color': color.hex, '--card-index': cardIndex }}
      onClick={onClick}
    >
      <span className={`card-value${isSpecial ? ' card-value-special' : ''}`} aria-hidden="true">
        <CardValueContent card={card} />
      </span>
      <span className={`card-value card-value-corner${isSpecial ? ' card-value-special' : ''}`} aria-hidden="true">
        <CardValueContent card={card} />
      </span>
      {card.power && (
        <span className="card-tooltip" id={`card-power-${card.id}`} role="tooltip">
          <span className="card-tooltip-title">{card.power.name}</span>
          <span className="card-tooltip-section">
            <span className="card-tooltip-label">Effet simple</span>
            <span>{card.power.simple}</span>
          </span>
          {card.power.combo && (
            <span className="card-tooltip-section">
              <span className="card-tooltip-label">Effet combo</span>
              <span>{card.power.combo}</span>
            </span>
          )}
        </span>
      )}
    </button>
  )
}

export function OpponentCard({ card, color, cardIndex, hidden, pickable, onPick }) {
  const handleKeyDown = pickable
    ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick() } }
    : undefined

  if (hidden) {
    return (
      <span
        className={`card card-opponent${pickable ? ' card-pickable' : ''}`}
        style={{ '--card-index': cardIndex }}
        role={pickable ? 'button' : undefined}
        tabIndex={pickable ? 0 : undefined}
        aria-label={pickable ? 'Choisir cette carte' : undefined}
        aria-hidden={!pickable ? true : undefined}
        onClick={pickable ? onPick : undefined}
        onKeyDown={handleKeyDown}
      >
        <img src={cardBackImg} alt="" className="card-back-img" />
      </span>
    )
  }

  const isSpecial = card.type !== CARD_TYPES.NUMBER
  const valueLabel = getValueLabel(card)
  const baseLabel = isSpecial
    ? `${valueLabel}, ${color.label.toLowerCase()}`
    : `${valueLabel} ${color.label.toLowerCase()}`

  return (
    <span
      className={`card card-opponent card-visible${pickable ? ' card-pickable' : ''}`}
      style={{ '--card-color': color.hex, '--card-index': cardIndex }}
      role={pickable ? 'button' : 'img'}
      tabIndex={pickable ? 0 : undefined}
      aria-label={pickable ? `Choisir ${baseLabel}` : baseLabel}
      onClick={pickable ? onPick : undefined}
      onKeyDown={handleKeyDown}
    >
      <span className={`card-value${isSpecial ? ' card-value-special' : ''}`}>
        <CardValueContent card={card} />
      </span>
      <span className={`card-value card-value-corner${isSpecial ? ' card-value-special' : ''}`} aria-hidden="true">
        <CardValueContent card={card} />
      </span>
    </span>
  )
}

export function RevealedCard({ card, color }) {
  const isSpecial = card.type !== CARD_TYPES.NUMBER
  const valueLabel = getValueLabel(card)
  const ariaLabel = isSpecial
    ? `Carte révélée : ${valueLabel}, ${color.label.toLowerCase()}`
    : `Carte révélée : ${valueLabel} ${color.label.toLowerCase()}`

  return (
    <div
      className="card card-revealed"
      style={{ '--card-color': color.hex }}
      role="img"
      aria-label={ariaLabel}
    >
      <span className={`card-value${isSpecial ? ' card-value-special' : ''}`}>
        <CardValueContent card={card} />
      </span>
      <span className={`card-value card-value-corner${isSpecial ? ' card-value-special' : ''}`} aria-hidden="true">
        <CardValueContent card={card} />
      </span>
    </div>
  )
}
