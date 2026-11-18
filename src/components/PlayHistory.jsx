import { Fragment, useEffect, useRef } from 'react'
import './PlayHistory.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { MiniCard } from './Card.jsx'
import { CARD_COLORS } from '../data/cards.ts'

// L'icône suit chaque nom ciblé : « Joueur 2 ⚡, Joueur 3 ⚡ », « Joueur 2 ⛏ ».
const TARGET_EFFECT_ICONS = {
  surcharge: { src: './eclair.png', alt: 'surcharge sur' },
  draw: { src: './pioche.png', alt: 'pioche' },
  spy: { src: './eye.png', alt: 'espionné' },
}

function HistoryIcon({ src, alt }) {
  return <img src={src} alt={alt} title={alt} className="play-history-icon" />
}

function TargetEffectIcon({ effect }) {
  const icon = TARGET_EFFECT_ICONS[effect]
  return <HistoryIcon src={icon.src} alt={icon.alt} />
}

function Arrow() {
  return <span className="play-history-arrow" aria-hidden="true">→</span>
}

// Ce que produit une carte, affiché après ses mini-cartes (« → … »).
function renderSegmentEffect(segment, { showAction, lead = <Arrow /> }) {
  const chosenColor = segment.chosenColor
    ? CARD_COLORS.find((color) => color.id === segment.chosenColor)
    : null

  if (chosenColor) {
    return (
      <>
        <Arrow />
        <span
          className="play-history-color"
          role="img"
          aria-label={chosenColor.label}
          title={chosenColor.label}
          style={{ '--swatch-color': chosenColor.hex }}
        />
        {segment.combosBlocked && <span className="play-history-note">combos bloqués</span>}
      </>
    )
  }

  if (segment.direction) {
    const clockwise = segment.direction === 1
    return (
      <>
        <Arrow />
        <HistoryIcon
          src={clockwise ? './horaire.png' : './antihoraire.png'}
          alt={clockwise ? 'sens horaire' : 'sens antihoraire'}
        />
      </>
    )
  }

  if (segment.surchargeRemoved != null) {
    return (
      <>
        <Arrow />
        <span>- {segment.surchargeRemoved}</span>
        <HistoryIcon src="./eclair.png" alt="surcharge" />
      </>
    )
  }

  // Menace : la cible choisit entre donner une carte et prendre une surcharge.
  if (segment.targetEffect === 'threat' && segment.targetName) {
    return (
      <>
        <span className="play-history-break" aria-hidden="true" />
        <Arrow />
        <span className="play-history-target">{segment.targetName}</span>
        <span aria-hidden="true">:</span>
        <HistoryIcon src="./pioche.png" alt="pioche" />
        <span className="play-history-note">OU</span>
        <HistoryIcon src="./eclair.png" alt="surcharge" />
        {segment.threatChoice && (
          <>
            <Arrow />
            {segment.threatChoice === 'card'
              ? <HistoryIcon src="./pioche.png" alt="choisit de piocher" />
              : <HistoryIcon src="./eclair.png" alt="choisit la surcharge" />}
          </>
        )}
      </>
    )
  }

  // Effet de groupe (8, 9, 10) : l'icône d'abord, puis « pour tous ! » ou la liste des cibles.
  if (segment.targetName && segment.effectCount != null && TARGET_EFFECT_ICONS[segment.targetEffect]) {
    return (
      <>
        <Arrow />
        <TargetEffectIcon effect={segment.targetEffect} />
        {segment.effectCount > 1 && <span>X {segment.effectCount}</span>}
        {segment.targetAll
          ? <span className="play-history-target">pour tous !</span>
          : (
            <>
              <span aria-hidden="true">:</span>
              <span className="play-history-target">{segment.targetName}</span>
            </>
          )}
      </>
    )
  }

  if (segment.targetName) {
    return (
      <>
        {lead}
        <span className="play-history-target">
          {TARGET_EFFECT_ICONS[segment.targetEffect]
            ? segment.targetName.split(', ').map((name, ni) => (
                <Fragment key={ni}>
                  {ni > 0 && ', '}
                  {name}
                  <TargetEffectIcon effect={segment.targetEffect} />
                </Fragment>
              ))
            : segment.targetName}
        </span>
      </>
    )
  }

  if (showAction && segment.action) {
    return (
      <>
        <Arrow />
        <span>{segment.action}</span>
      </>
    )
  }

  return null
}

// Regroupe les pioches « A pioche chez B », « B pioche chez C »… en une seule
// chaîne « A ⛏ B ⛏ C ». Un cycle complet (Chaos) revient au premier joueur.
function buildStealChains(steals) {
  const remaining = [...steals]
  const chains = []
  while (remaining.length > 0) {
    const sources = new Set(remaining.map((steal) => steal.sourceName))
    const headIndex = remaining.findIndex((steal) => !sources.has(steal.takerName))
    let current = remaining.splice(Math.max(headIndex, 0), 1)[0]
    const chain = [current.takerName, current.sourceName]
    for (;;) {
      const nextIndex = remaining.findIndex((steal) => steal.takerName === current.sourceName)
      if (nextIndex < 0) break
      current = remaining.splice(nextIndex, 1)[0]
      chain.push(current.sourceName)
    }
    chains.push(chain)
  }
  return chains
}

// Tous les boucliers obtenus sur un même coup tiennent sur une seule ligne,
// placée là où apparaît le premier.
function groupConsequences(consequences) {
  const grouped = []
  const groupsByKind = new Map()
  for (const consequence of consequences) {
    if (typeof consequence === 'string' || consequence.kind === 'max-surcharge') {
      grouped.push(consequence)
    } else if (groupsByKind.has(consequence.kind)) {
      groupsByKind.get(consequence.kind).playerNames.push(consequence.playerName)
    } else {
      const group = { kind: consequence.kind, playerNames: [consequence.playerName] }
      groupsByKind.set(consequence.kind, group)
      grouped.push(group)
    }
  }
  // Ordre fixe : bouclier perdu, bouclier obtenu, puis surcharges MAX.
  const rank = (c) => (typeof c === 'string' ? 0 : CONSEQUENCE_ORDER.indexOf(c.kind) + 1)
  return grouped.sort((a, b) => rank(a) - rank(b))
}

const CONSEQUENCE_ORDER = ['shield-lost', 'shield-gained', 'max-surcharge']

const CONSEQUENCE_ICONS = {
  'shield-gained': { src: './bouclier.png', alt: 'bouclier pour' },
  'shield-lost': { src: './brokenbouclier.png', alt: 'bouclier perdu pour' },
}

function getSegments(entry) {
  return [entry, ...(entry.replays ?? [])]
}

export default function PlayHistory({ playHistory }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const panel = panelRef.current
    if (panel) {
      panel.scrollTop = 0
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
          {[...playHistory].reverse().map((entry, index) => (
            <li className="play-history-entry" key={`${index}-${entry.playerName}`}>
              <span className="play-history-number">{playHistory.length - index}</span>
              <span>
                <span className="play-history-play">
                  <strong>{entry.playerName}</strong>
                  <span aria-hidden="true">:</span>
                  {getSegments(entry).map((segment, si, segments) => {
                    const isLast = si === segments.length - 1
                    // Carte qui fait rejouer (1, combo de 5…) : l'icône replay remplace le texte,
                    // et la carte rejouée s'affiche sur la ligne suivante.
                    const triggersReplay = !isLast || /rejoue/.test(segment.action ?? '')
                    // Combo de 1 : « → replay + Joueur Y ⛏ » plutôt que la cible puis le replay.
                    const replayFirst = triggersReplay && segment.targetName && segment.targetEffect === 'draw'
                    const effect = renderSegmentEffect(segment, {
                      showAction: isLast && !triggersReplay && !entry.steals?.length,
                      lead: replayFirst
                        ? (
                          <>
                            <Arrow />
                            <HistoryIcon src="./replay.png" alt="rejoue" />
                            <span>+</span>
                          </>
                        )
                        : undefined,
                    })
                    return (
                      <Fragment key={si}>
                        {si > 0 && <span className="play-history-break" aria-hidden="true" />}
                        <span className="play-history-cards">
                          {segment.cards.map((card) => <MiniCard key={card.id} card={card} />)}
                        </span>
                        {effect}
                        {triggersReplay && !replayFirst && (
                          <>
                            <Arrow />
                            <HistoryIcon src="./replay.png" alt="rejoue" />
                          </>
                        )}
                      </Fragment>
                    )
                  })}
                </span>
                {entry.steals?.length > 0 && (
                  <ul className="play-history-steals">
                    {buildStealChains(entry.steals).map((chain, chi) => (
                      <li key={chi}>
                        {chain.map((name, ni) => (
                          <Fragment key={ni}>
                            {ni > 0 && (
                              <img src="./pioche.png" alt="pioche chez" className="play-history-steal-icon" />
                            )}
                            <strong>{name}</strong>
                          </Fragment>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.consequences && entry.consequences.length > 0 && (
                  <ul className="play-history-consequences">
                    {groupConsequences(entry.consequences).map((c, ci) => (
                      typeof c === 'string'
                        ? <li key={ci}>{c}</li>
                        : c.kind === 'max-surcharge'
                          ? (
                            <li key={ci} className="play-history-consequence-icon">
                              <HistoryIcon src="./eclair.png" alt="surcharge" />
                              <span className="play-history-max">MAX</span>
                              {' '}: {c.playerName}{' '}
                              <span className="play-history-arrow" aria-hidden="true">→</span>{' '}
                              <HistoryIcon src="./pioche.png" alt="pioche" />
                              {' '}X 2 +{' '}
                              <HistoryIcon src="./eye.png" alt="main révélée" />
                            </li>
                          )
                          : (
                          <li key={ci} className="play-history-consequence-icon">
                            <img
                              src={CONSEQUENCE_ICONS[c.kind].src}
                              alt={CONSEQUENCE_ICONS[c.kind].alt}
                              className="play-history-effect-icon"
                            />
                            : {c.playerNames.join(', ')}
                          </li>
                        )
                    ))}
                  </ul>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
