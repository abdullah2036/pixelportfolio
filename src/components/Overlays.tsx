import { useEffect, useRef, useState } from 'react'
import { getEngine } from '../game/engineRef'
import { useStore } from '../state/store'

/** "[E] Projects" — floats above whatever the player is standing next to. */
export function InteractionPrompt() {
  const nearby = useStore((s) => s.nearby)
  const panel = useStore((s) => s.panel)
  const dialogue = useStore((s) => s.dialogue)
  const traveling = useStore((s) => s.traveling)
  const isTouch = useStore((s) => s.isTouch)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const e = getEngine()
    if (e) e.promptEl = ref.current
    return () => {
      const e2 = getEngine()
      if (e2) e2.promptEl = null
    }
  })

  if (!nearby || panel || dialogue || traveling) return null
  return (
    <div className="anchor" ref={ref} style={{ transform: 'translate(-9999px, 0)' }}>
      <div className="prompt-wrap">
        <button className="prompt" onClick={() => getEngine()?.interact()} aria-label={`Interact: ${nearby.label}`}>
          <span className="key key--gold">{isTouch ? 'TAP' : 'E'}</span>
          {nearby.label}
        </button>
      </div>
    </div>
  )
}

/** Thought bubbles above the player ("A quiet place to build big things."). */
export function ThoughtBubble() {
  const ref = useRef<HTMLDivElement>(null)
  const [text, setText] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const ready = useStore((s) => s.ready)
  const panel = useStore((s) => s.panel)
  const dialogue = useStore((s) => s.dialogue)

  useEffect(() => {
    const e = getEngine()
    if (!e) return
    let timer = 0
    e.onThought = (t) => {
      window.clearTimeout(timer)
      if (t) {
        setLeaving(false)
        setText(t)
      } else {
        setLeaving(true)
        timer = window.setTimeout(() => setText(null), 320)
      }
    }
    return () => {
      e.onThought = () => {}
      window.clearTimeout(timer)
    }
  }, [ready])

  useEffect(() => {
    const e = getEngine()
    if (e) e.bubbleEl = ref.current
  })

  if (!text || panel || dialogue) return null
  return (
    <div className="anchor" ref={ref} aria-live="polite" style={{ transform: 'translate(-9999px, 0)' }}>
      <div className="bubble-wrap">
        <div className={`bubble ${leaving ? 'is-out' : ''}`}>{text}</div>
      </div>
    </div>
  )
}
