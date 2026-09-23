/** Keyboard + virtual (touch) input. */

export type Action = 'interact' | 'escape' | 'map' | 'travel1' | 'travel2' | 'travel3' | 'travel4' | 'travel5'

const MOVE_KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
}

const ACTION_KEYS: Record<string, Action> = {
  KeyE: 'interact', Enter: 'interact', Space: 'interact',
  Escape: 'escape',
  KeyM: 'map',
  Digit1: 'travel1', Digit2: 'travel2', Digit3: 'travel3', Digit4: 'travel4', Digit5: 'travel5',
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

export class Input {
  private held = { left: false, right: false, up: false, down: false }
  virtual = { left: false, right: false, up: false, down: false }
  run = false
  /** true while the page UI (a panel) owns the keyboard */
  blocked = false
  onAction: (a: Action, e: KeyboardEvent) => void = () => {}
  onFirstInput: () => void = () => {}

  private down = (e: KeyboardEvent) => {
    if (isTyping(e)) return
    const mv = MOVE_KEYS[e.code]
    if (mv) {
      if (!this.blocked) {
        e.preventDefault()
        this.held[mv] = true
        this.onFirstInput()
      }
      return
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.run = true
    const act = ACTION_KEYS[e.code]
    if (act && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // let buttons/links handle Enter & Space themselves
      const t = e.target as HTMLElement | null
      const onControl = t && (t.tagName === 'BUTTON' || t.tagName === 'A')
      if ((act === 'interact') && onControl) return
      if (act === 'interact' && !this.blocked) e.preventDefault()
      this.onAction(act, e)
    }
  }

  private up = (e: KeyboardEvent) => {
    const mv = MOVE_KEYS[e.code]
    if (mv) this.held[mv] = false
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.run = false
  }

  private blur = () => {
    this.held = { left: false, right: false, up: false, down: false }
    this.run = false
  }

  attach() {
    window.addEventListener('keydown', this.down)
    window.addEventListener('keyup', this.up)
    window.addEventListener('blur', this.blur)
  }

  detach() {
    window.removeEventListener('keydown', this.down)
    window.removeEventListener('keyup', this.up)
    window.removeEventListener('blur', this.blur)
  }

  clear() {
    this.blur()
    this.virtual = { left: false, right: false, up: false, down: false }
  }

  get axisX() {
    const l = this.held.left || this.virtual.left, r = this.held.right || this.virtual.right
    return (r ? 1 : 0) - (l ? 1 : 0)
  }

  /** -1 = up (further back), 1 = down (towards the camera) */
  get axisY() {
    const u = this.held.up || this.virtual.up, d = this.held.down || this.virtual.down
    return (d ? 1 : 0) - (u ? 1 : 0)
  }
}
