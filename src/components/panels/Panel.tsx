import { useEffect, useRef, type ReactNode } from 'react'
import { store } from '../../state/store'
import { PixelIcon } from '../PixelIcon'
import type { IconName } from '../pixelArt'

interface Props {
  title: string
  eyebrow: string
  icon: IconName
  narrow?: boolean
  /** return true to swallow Escape (e.g. to go "back" inside the panel first) */
  onEscape?: () => boolean
  children: ReactNode
}

/** Shared pixel-framed dialog: traps focus, closes on Esc / backdrop click, restores focus. */
export function Panel({ title, eyebrow, icon, narrow, onEscape, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const escRef = useRef(onEscape)
  escRef.current = onEscape

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('button, a, input')
    first?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (escRef.current?.()) return
        store.closePanel()
      } else if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, [tabindex="0"]')].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const a = items[0], z = items[items.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className="panel-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) store.closePanel() }}>
      <div className={`panel frame ${narrow ? 'panel--narrow' : ''}`} role="dialog" aria-modal="true" aria-labelledby="panel-title" ref={ref}>
        <div className="panel-head">
          <PixelIcon name={icon} scale={4} />
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id="panel-title">{title}</h2>
          </div>
          <span className="spacer" />
          <span className="esc"><span className="key">Esc</span> back to camp</span>
          <button className="px-btn px-btn--icon" onClick={() => store.closePanel()} aria-label="Close and return to the world">
            <PixelIcon name="close" scale={2} />
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  )
}
