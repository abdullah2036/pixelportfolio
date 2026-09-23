import { useEffect, useRef } from 'react'
import { getEngine } from '../game/engineRef'
import type { PanelId } from '../game/world/layout'
import { store, useStore } from '../state/store'
import { PixelIcon } from './PixelIcon'
import type { IconName } from './pixelArt'

const PLACES: { id: PanelId | 'explore'; label: string; icon: IconName; key?: string }[] = [
  { id: 'explore', label: 'Explore', icon: 'fire' },
  { id: 'about', label: 'About', icon: 'journal', key: '1' },
  { id: 'projects', label: 'Projects', icon: 'board', key: '2' },
  { id: 'skills', label: 'Skills', icon: 'hammer', key: '3' },
  { id: 'resume', label: 'Resume', icon: 'scroll', key: '4' },
  { id: 'contact', label: 'Contact', icon: 'house', key: '5' },
]

/** Optional accessible navigation: every choice pans the camera to that place. */
export function NavMenu() {
  const open = useStore((s) => s.menuOpen)
  const visited = useStore((s) => s.visited)
  const isTouch = useStore((s) => s.isTouch)
  const wrap = useRef<HTMLDivElement>(null)
  const firstItem = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    firstItem.current?.focus({ preventScroll: true })
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) store.set({ menuOpen: false })
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const go = (id: PanelId | 'explore') => {
    store.set({ menuOpen: false })
    const e = getEngine()
    if (!e) return
    if (id === 'explore') e.travelHome()
    else e.travelTo(id)
  }

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button
        className="px-btn"
        aria-expanded={open}
        aria-controls="map-menu"
        onClick={() => store.set({ menuOpen: !open })}
        title="Map (M)"
      >
        <PixelIcon name="map" scale={2} />
        <span>Map</span>
      </button>
      {open && (
        <nav id="map-menu" className="map-menu frame" aria-label="Places in the world">
          <h2>Where to?</h2>
          <ul>
            {PLACES.map((p, i) => (
              <li key={p.id}>
                <button ref={i === 0 ? firstItem : undefined} onClick={() => go(p.id)}>
                  <span className="arrow" />
                  <PixelIcon name={p.icon} scale={2} />
                  <span>{p.label}</span>
                  {p.id !== 'explore' && visited[p.id] && <PixelIcon name="check" scale={2} className="seen" label="visited" />}
                  {!isTouch && p.key && <span className="num">{p.key}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="foot">The camera will carry you there.</p>
        </nav>
      )}
    </div>
  )
}
