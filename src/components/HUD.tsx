import { useEffect, useState } from 'react'
import { profile } from '../data/portfolio'
import { useStore } from '../state/store'

/** Minimal intro text (top-left), fading controls hint and area-name toasts. */
export function HUD() {
  const ready = useStore((s) => s.ready)
  const introDone = useStore((s) => s.introDone)
  const hasMoved = useStore((s) => s.hasMoved)
  const isTouch = useStore((s) => s.isTouch)
  const panel = useStore((s) => s.panel)
  const zone = useStore((s) => s.zone)
  const [quiet, setQuiet] = useState(false)

  useEffect(() => {
    if (!hasMoved) return
    const id = window.setTimeout(() => setQuiet(true), 6000)
    return () => window.clearTimeout(id)
  }, [hasMoved])

  const [first, ...rest] = profile.name.split(' ')
  const showTitle = ready && introDone && !panel

  return (
    <>
      <header className={`hud-title ${showTitle ? '' : 'is-hidden'} ${quiet ? 'is-quiet' : ''}`}>
        <h1 className="hud-name">
          <span className="bracket">&lt;</span>
          {first}
          {rest.length ? ' ' + rest.join(' ') : ''}
          <span className="bracket">/&gt;</span>
        </h1>
        <p className="hud-role">{profile.role}</p>
        <p className="hud-tag">{profile.tagline}</p>
        <div className="hud-rule" />
        <p className={`hud-explore ${hasMoved ? 'is-hidden' : ''}`}>Explore the world to discover my work.</p>
      </header>

      {!isTouch && (
        <div className={`hud-controls ${showTitle && !hasMoved ? '' : 'is-hidden'}`} aria-hidden="true">
          <div className="group">
            <div className="keys">
              <span className="key">W</span>
              <span className="key">A</span>
              <span className="key">S</span>
              <span className="key">D</span>
            </div>
            <span>Move</span>
          </div>
          <div className="sep" />
          <div className="group">
            <span className="key key--gold">E</span>
            <span>Interact</span>
          </div>
          <div className="sep" />
          <div className="group">
            <span className="key">M</span>
            <span>Map</span>
          </div>
        </div>
      )}

      {zone && introDone && !panel && (
        <div className="zone-toast" key={zone.at} aria-live="polite">
          <div className="rule">{zone.name}</div>
        </div>
      )}
    </>
  )
}
