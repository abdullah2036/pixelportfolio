import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/engine/GameEngine'
import { setEngine } from '../game/engineRef'
import { store } from '../state/store'

/** Hosts the world canvas and owns the engine's lifecycle. */
export function GameWorld() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    store.set({ isTouch })
    const engine = new GameEngine(canvas)
    let alive = true
    // let the loading screen paint before the (synchronous) world generation
    const id = window.setTimeout(() => {
      engine.init().then(() => {
        if (!alive) return
        setEngine(engine)
        engine.start()
        store.set({ ready: true })
      })
    }, 30)
    return () => {
      alive = false
      window.clearTimeout(id)
      engine.destroy()
      setEngine(null)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="world-canvas"
      role="img"
      aria-label="A pixel-art campsite at night: a glowing tent and campfire, a lake with a boardwalk, a workshop, a waterfall and a cabin on a cliff. Use the map menu to jump to each section."
    />
  )
}
