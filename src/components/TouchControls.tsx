import { useRef, useState } from 'react'
import { getEngine } from '../game/engineRef'
import { store, useStore } from '../state/store'

type Dir = 'up' | 'down' | 'left' | 'right'

/** On-screen D-pad + interact button for touch devices. Tapping the world also walks there. */
export function TouchControls() {
  const isTouch = useStore((s) => s.isTouch)
  const ready = useStore((s) => s.ready)
  const nearby = useStore((s) => s.nearby)
  const panel = useStore((s) => s.panel)
  const dialogue = useStore((s) => s.dialogue)
  const [down, setDown] = useState<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false })
  const pad = useRef<HTMLDivElement>(null)

  if (!isTouch || !ready || panel) return null

  const set = (d: Partial<Record<Dir, boolean>>) => {
    const next = { up: false, down: false, left: false, right: false, ...d }
    setDown(next)
    const e = getEngine()
    if (e) {
      e.input.virtual = next
      if (Object.values(next).some(Boolean)) {
        e.player.auto = null
        store.set({ hasMoved: true })
      }
    }
  }

  // one pointer can slide across the pad, so work out the direction from its position
  const fromPoint = (x: number, y: number) => {
    const el = pad.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2)
    if (Math.hypot(dx, dy) < 12) return set({})
    const ang = Math.atan2(dy, dx)
    const d: Partial<Record<Dir, boolean>> = {}
    if (Math.abs(Math.cos(ang)) > 0.38) d[dx > 0 ? 'right' : 'left'] = true
    if (Math.abs(Math.sin(ang)) > 0.38) d[dy > 0 ? 'down' : 'up'] = true
    set(d)
  }

  return (
    <div className="touch">
      <div
        className="dpad"
        ref={pad}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); fromPoint(e.clientX, e.clientY) }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') fromPoint(e.clientX, e.clientY) }}
        onPointerUp={() => set({})}
        onPointerCancel={() => set({})}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Movement pad"
        role="group"
      >
        {(['up', 'left', 'right', 'down'] as Dir[]).map((d) => (
          <button key={d} className={`${d} ${down[d] ? 'is-down' : ''}`} aria-label={`Move ${d}`} tabIndex={-1}>
            <span className="tri" />
          </button>
        ))}
      </div>
      <button
        className={`act-btn ${nearby && !dialogue ? 'is-ready' : ''}`}
        onClick={() => {
          if (dialogue) return
          getEngine()?.interact()
        }}
        aria-label={nearby ? `Interact: ${nearby.label}` : 'Interact'}
      >
        <span>E<small>{nearby ? nearby.label : 'use'}</small></span>
      </button>
    </div>
  )
}
