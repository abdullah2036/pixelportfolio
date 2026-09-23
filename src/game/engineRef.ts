import type { GameEngine } from './engine/GameEngine'
import { store } from '../state/store'

/** The single running engine, so UI components can ask it to travel/interact. */
let current: GameEngine | null = null
export const setEngine = (e: GameEngine | null) => { current = e }
export const getEngine = () => current

/** Leave the current panel and let the camera carry the player to another place. */
export function goTo(id: string) {
  store.closePanel()
  window.setTimeout(() => current?.travelTo(id), 60)
}
