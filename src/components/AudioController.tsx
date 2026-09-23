import { useEffect, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/AudioEngine'
import { getEngine } from '../game/engineRef'
import { store, useStore } from '../state/store'
import { PixelIcon } from './PixelIcon'

/**
 * Sound toggle + tiny mixer. The audio engine is only downloaded and created
 * after the visitor clicks, so nothing ever autoplays.
 */
export function AudioController() {
  const sound = useStore((s) => s.sound)
  const ready = useStore((s) => s.ready)
  const [open, setOpen] = useState(false)
  const audio = useRef<AudioEngine | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ready) return
    const e = getEngine()
    if (!e) return
    e.onAudioMix = (m) => audio.current?.setMix(m)
    return () => { e.onAudioMix = () => {} }
  }, [ready])

  useEffect(() => {
    if (!open) return
    const onDown = (ev: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(ev.target as Node)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => audio.current?.dispose(), [])

  const ensure = async () => {
    if (!audio.current) {
      const { AudioEngine } = await import('../audio/AudioEngine')
      audio.current = new AudioEngine()
    }
    return audio.current
  }

  const toggle = async () => {
    const next = !sound.enabled
    store.set({ sound: { ...sound, enabled: next } })
    const a = await ensure()
    a.setChannels(sound.nature, sound.music)
    a.setVolume(sound.volume)
    await a.setEnabled(next)
    if (next) setOpen(true)
  }

  const update = (patch: Partial<typeof sound>) => {
    const s = { ...sound, ...patch }
    store.set({ sound: s })
    audio.current?.setChannels(s.nature, s.music)
    audio.current?.setVolume(s.volume)
  }

  return (
    <div ref={wrap} style={{ position: 'relative', display: 'flex', gap: 6 }}>
      <button
        className="px-btn px-btn--icon"
        onClick={toggle}
        aria-pressed={sound.enabled}
        aria-label={sound.enabled ? 'Turn sound off' : 'Turn sound on'}
        title={sound.enabled ? 'Sound on — click to mute' : 'Sound off — click for campfire ambience'}
      >
        <PixelIcon name={sound.enabled ? 'soundOn' : 'soundOff'} scale={2} />
      </button>
      {sound.enabled && (
        <button className="px-btn px-btn--icon" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Sound settings" title="Sound settings">
          <span aria-hidden="true" style={{ fontSize: 12, lineHeight: '14px' }}>{open ? '▴' : '▾'}</span>
        </button>
      )}
      {open && sound.enabled && (
        <div className="sound-pop frame" role="group" aria-label="Sound settings">
          <h2>Campfire radio</h2>
          <label className="toggle-row">
            <span>Nature<small>crickets · wind · water · fire</small></span>
            <input type="checkbox" className="px-switch" checked={sound.nature} onChange={(e) => update({ nature: e.target.checked })} />
          </label>
          <label className="toggle-row">
            <span>Lo-fi loop<small>soft keys &amp; brushed drums</small></span>
            <input type="checkbox" className="px-switch" checked={sound.music} onChange={(e) => update({ music: e.target.checked })} />
          </label>
          <label className="toggle-row" style={{ display: 'block' }}>
            <span>Volume</span>
            <input className="px-range" type="range" min={0} max={1} step={0.05} value={sound.volume} onChange={(e) => update({ volume: Number(e.target.value) })} aria-label="Volume" />
          </label>
        </div>
      )}
    </div>
  )
}
