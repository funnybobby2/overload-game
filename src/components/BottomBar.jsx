import { CARD_COLORS } from '../data/cards.ts'
import './BottomBar.css'

export default function BottomBar({ autoPlay, onAutoPlayChange, isBotTurn, onNextBot, playDisabled, playLabel, onPlay, isChoosingColor, colorChoiceIsCombo, onChooseColor }) {
  return (
    <div className="bottom-bar">
      {isChoosingColor && (
        <div className="bottom-bar-color-choice" role="group" aria-label="Choisir la couleur active">
          <span className="bottom-bar-color-label">
            {colorChoiceIsCombo
              ? 'Choisissez une couleur. Les combos seront bloqués au prochain tour.'
              : 'Choisissez la couleur active.'}
          </span>
          <div className="bottom-bar-color-options">
            {CARD_COLORS.filter((color) => color.id !== 'purple').map((color) => (
              <button
                className="color-choice-button"
                key={color.id}
                type="button"
                style={{ '--choice-color': color.hex }}
                aria-label={color.label}
                onClick={() => onChooseColor(color.id)}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="bottom-bar-auto">
        <input
          type="checkbox"
          checked={autoPlay}
          onChange={(event) => onAutoPlayChange(event.target.checked)}
        />
        <span>Auto</span>
      </label>
      <button
        className="bottom-bar-btn bottom-bar-suivant"
        type="button"
        disabled={autoPlay || !isBotTurn}
        onClick={onNextBot}
      >
        Suivant
      </button>
      <button
        className="bottom-bar-btn bottom-bar-jouer"
        type="button"
        disabled={playDisabled}
        onClick={onPlay}
      >
        {playLabel}
      </button>
    </div>
  )
}
