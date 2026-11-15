import { useEffect, useState } from 'react'
import './Snackbar.css'

export default function Snackbar({ message, action }) {
  const [dismissed, setDismissed] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (message) {
      setDismissed(false)
      setAnimKey((k) => k + 1)
    }
  }, [message])

  const visible = Boolean(message) && !dismissed

  return (
    <div className={`snackbar${visible ? ' snackbar-visible' : ''}`} role="status" aria-live="polite">
      {visible && (
        <span className="snackbar-message" key={animKey}>
          <span className="snackbar-text">{message}</span>
          {action && (
            <button
              className="snackbar-action-btn"
              type="button"
              onClick={() => { action.onClick(); setDismissed(true) }}
            >
              {action.label}
            </button>
          )}
          <button
            className="snackbar-close"
            type="button"
            aria-label="Fermer"
            onClick={() => setDismissed(true)}
          >
            ×
          </button>
        </span>
      )}
    </div>
  )
}
