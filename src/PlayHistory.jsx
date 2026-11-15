import { useEffect, useRef } from 'react'
import './PlayHistory.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'

export default function PlayHistory({ playHistory }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const panel = panelRef.current
    if (panel) {
      panel.scrollTop = panel.scrollHeight
    }
  }, [playHistory.length])

  return (
    <section
      className="play-history"
      ref={panelRef}
      aria-label="Historique Live"
      aria-live="polite"
    >
      <h2 className="play-history-title"><FontAwesomeIcon icon={faClockRotateLeft} /> Historique Live</h2>
      {playHistory.length === 0 ? (
        <p className="play-history-empty">Aucun coup joué.</p>
      ) : (
        <ol className="play-history-list">
          {playHistory.map((entry, index) => (
            <li className="play-history-entry" key={`${index}-${entry.playerName}`}>
              <span className="play-history-number">{index + 1}</span>
              <span>
                <strong>{entry.playerName}</strong> joue {entry.cardDescription} : {entry.action}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
