import { useEffect, useRef, useState } from 'react'
import { store, useStore } from '../state/store'

/** RPG-style dialogue with a typewriter effect. E / Enter / Space / click advances, Esc closes. */
export function DialogueBox() {
  const dialogue = useStore((s) => s.dialogue)
  const isTouch = useStore((s) => s.isTouch)
  const [line, setLine] = useState(0)
  const [shown, setShown] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const text = dialogue?.lines[line] ?? ''
  const done = shown >= text.length

  useEffect(() => {
    setLine(0)
    setShown(0)
    if (dialogue) box.current?.focus({ preventScroll: true })
  }, [dialogue])

  useEffect(() => {
    if (!dialogue || done) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(text.length); return }
    const id = window.setInterval(() => setShown((n) => Math.min(text.length, n + 1)), 22)
    return () => window.clearInterval(id)
  }, [dialogue, line, done, text.length])

  const advance = () => {
    if (!dialogue) return
    if (!done) return setShown(text.length)
    if (line < dialogue.lines.length - 1) {
      setLine((l) => l + 1)
      setShown(0)
    } else store.set({ dialogue: null })
  }

  useEffect(() => {
    if (!dialogue) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); store.set({ dialogue: null }) }
      else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) advance() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!dialogue) return null
  const last = line === dialogue.lines.length - 1
  return (
    <div className="dialogue frame" role="dialog" aria-live="polite" aria-label={dialogue.speaker ?? 'Note'} tabIndex={-1} ref={box} onClick={advance}>
      {dialogue.speaker && <span className="speaker">{dialogue.speaker}</span>}
      <p>
        <span>{text.slice(0, shown)}</span>
        <span aria-hidden="true" style={{ opacity: 0 }}>{text.slice(shown)}</span>
      </p>
      <span className="hint">{isTouch ? 'Tap to continue' : last ? 'E — close' : 'E — next · Esc — close'}</span>
      {done && <span className="more" aria-hidden="true" />}
    </div>
  )
}
