/**
 * Tiny external store shared by the canvas engine and the React UI.
 * The engine writes (nearby object, zone, dialogue); React reads with useStore.
 */
import { useSyncExternalStore } from 'react'
import type { PanelId } from '../game/world/layout'

export interface Dialogue {
  id: string
  lines: string[]
  speaker?: string
}

export interface UIState {
  ready: boolean
  introDone: boolean
  hasMoved: boolean
  isTouch: boolean
  nearby: { id: string; label: string } | null
  panel: PanelId | null
  /** optional deep-link inside a panel, e.g. a project id */
  panelArg: string | null
  dialogue: Dialogue | null
  zone: { id: string; name: string; at: number } | null
  visited: Partial<Record<PanelId, boolean>>
  menuOpen: boolean
  sound: { enabled: boolean; nature: boolean; music: boolean; volume: number }
  traveling: boolean
}

let state: UIState = {
  ready: false,
  introDone: false,
  hasMoved: false,
  isTouch: false,
  nearby: null,
  panel: null,
  panelArg: null,
  dialogue: null,
  zone: null,
  visited: {},
  menuOpen: false,
  sound: { enabled: false, nature: true, music: true, volume: 0.7 },
  traveling: false,
}

const listeners = new Set<() => void>()

export const store = {
  get: () => state,
  set(patch: Partial<UIState> | ((s: UIState) => Partial<UIState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch
    let changed = false
    for (const k in p) {
      if ((p as Record<string, unknown>)[k] !== (state as unknown as Record<string, unknown>)[k]) {
        changed = true
        break
      }
    }
    if (!changed) return
    state = { ...state, ...p }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  openPanel(panel: PanelId, arg: string | null = null) {
    store.set((s) => ({ panel, panelArg: arg, dialogue: null, menuOpen: false, visited: { ...s.visited, [panel]: true } }))
  },
  closePanel() {
    store.set({ panel: null, panelArg: null })
  },
}

export function useStore<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state), () => selector(state))
}
