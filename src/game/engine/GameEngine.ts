/**
 * The game loop. Owns the canvases, camera, player and scene, and talks to
 * the React UI through the shared store and a couple of DOM refs.
 */
import { store } from '../../state/store'
import { loadOverrides } from '../assets'
import { CAMERA, PARALLAX, VIEW, WORLD } from '../config'
import { glow } from '../render/generators/effects'
import { Aurora, buildSky, HORIZON_Y, type SkyLayer } from '../render/generators/sky'
import { blitClipped, makeCanvas } from '../render/pixel'
import { INTERACTABLES, PLACES, SPAWN, THOUGHTS, ZONES, type InteractableDef, type PanelId } from '../world/layout'
import { pathBottom, pathDepth, pathTop } from '../world/terrain'
import type { Drawable } from './Critters'
import { Input, type Action } from './Input'
import { Player } from './Player'
import { Scene } from './Scene'

export interface AudioMix {
  fire: number
  water: number
  lake: number
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private fb!: HTMLCanvasElement
  private f!: CanvasRenderingContext2D
  private scene = new Scene()
  private sky!: SkyLayer
  private aurora!: Aurora
  private auroraAcc = 1
  player!: Player
  input = new Input()

  private dpr = 1
  scale = 3
  vw = 480
  vh = 270
  private fbW = 482
  private fbH = 272
  camX = 0
  camY = 0
  private camRefY = 0
  private lookAhead = 0
  private t = 0
  private dt = 1 / 60
  private last = 0
  private raf = 0
  private running = false
  private reduceMotion = false

  private intro: { t: number; dur: number; fromY: number } | null = null
  private travel: {
    t: number; dur: number; fromX: number; fromY: number; toX: number; toY: number
    target: InteractableDef; stage: 'out' | 'pan' | 'in'; stageT: number
  } | null = null
  private shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null
  private nextShooting = 14
  private thoughtUntil = 0
  private thoughtCooldown: Record<string, number> = {}
  private lastZone = ''
  private nearbyId: string | null = null
  private mixAcc = 0

  promptEl: HTMLElement | null = null
  bubbleEl: HTMLElement | null = null
  onAudioMix: (m: AudioMix) => void = () => {}
  onThought: (text: string | null) => void = () => {}

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
  }

  async init() {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const overrides = await loadOverrides()
    this.scene.build(overrides)
    this.player = new Player(this.scene.playerFrames, SPAWN.x, SPAWN.depth)
    this.input.onAction = (a, e) => this.handleAction(a, e)
    this.input.onFirstInput = () => {
      if (this.intro) this.intro.t = Math.max(this.intro.t, this.intro.dur * 0.85)
      if (!store.get().hasMoved && store.get().introDone) store.set({ hasMoved: true })
    }
    this.input.attach()
    this.resize()
    window.addEventListener('resize', this.resize)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.snapCamera()
    if (!this.reduceMotion) this.intro = { t: 0, dur: 3.2, fromY: this.camY - 96 }
    else store.set({ introDone: true })
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    let reported = false
    const loop = (now: number) => {
      if (!this.running) return
      // rAF timestamps can predate start(), so never let time run backwards
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000))
      this.last = Math.max(this.last, now)
      try {
        this.update(dt)
        this.render()
      } catch (err) {
        // keep the world alive; report the first failure only
        if (!reported) console.error('[campfire] frame failed', err)
        reported = true
      }
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.input.detach()
    window.removeEventListener('resize', this.resize)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
  }

  /* ------------------------------------------------------------------ */
  /* Viewport                                                            */
  /* ------------------------------------------------------------------ */

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const cw = window.innerWidth, ch = window.innerHeight
    const devW = Math.round(cw * dpr), devH = Math.round(ch * dpr)
    const portrait = ch > cw * 1.05
    const scale = portrait ? Math.max(2, Math.round(devW / VIEW.portraitTargetWidth)) : Math.max(2, Math.round(devH / VIEW.targetHeight))
    this.dpr = dpr
    this.scale = scale
    this.vw = Math.ceil(devW / scale)
    this.vh = Math.ceil(devH / scale)
    this.fbW = this.vw + 2
    this.fbH = this.vh + 2
    this.canvas.width = devW
    this.canvas.height = devH
    this.canvas.style.width = cw + 'px'
    this.canvas.style.height = ch + 'px'
    this.ctx.imageSmoothingEnabled = false
    ;[this.fb, this.f] = makeCanvas(this.fbW, this.fbH)
    this.sky = buildSky(this.fbW + Math.ceil(WORLD.width * PARALLAX.sky[0]) + 8, this.vh + 300)
    this.aurora = new Aurora(this.fbW)
    this.auroraAcc = 1
    this.camRefY = WORLD.baseFeetY - (this.vh - this.feetFromBottom)
    if (this.player) this.snapCamera()
  }

  private get feetFromBottom() {
    const f = Math.round(this.vh * VIEW.feetFromBottom)
    return store.get().isTouch ? Math.max(f, VIEW.feetFromBottomTouchMin) : f
  }

  private camTarget(x = this.player.x, feet = this.player.y) {
    const tx = clamp(x - this.vw / 2 + this.lookAhead, 0, WORLD.width - this.vw)
    // stay calibrated to ground level; rise when the path climbs
    const ground = pathBottom(x) - pathDepth(x) * 0.5
    const lift = Math.min(0, ground - WORLD.baseFeetY)
    const ty = this.camRefY + lift + (feet - ground) * 0.25
    return { x: tx, y: ty }
  }

  private snapCamera() {
    const c = this.camTarget()
    this.camX = c.x
    this.camY = c.y
  }

  /* ------------------------------------------------------------------ */
  /* Input + interaction                                                 */
  /* ------------------------------------------------------------------ */

  private get frozen() {
    const s = store.get()
    return !!(s.panel || s.dialogue || this.travel || this.intro)
  }

  private handleAction(a: Action, e: KeyboardEvent) {
    const s = store.get()
    if (a === 'escape') {
      if (s.menuOpen) store.set({ menuOpen: false })
      return
    }
    if (s.panel || s.dialogue) return
    if (a === 'interact') {
      if (this.intro) { this.intro.t = this.intro.dur; return }
      this.interact()
    } else if (a === 'map') {
      store.set({ menuOpen: !s.menuOpen })
    } else if (a.startsWith('travel')) {
      const order: PanelId[] = ['about', 'projects', 'skills', 'resume', 'contact']
      const p = order[Number(a.slice(-1)) - 1]
      if (p) this.travelTo(p)
    }
    void e
  }

  interact() {
    if (this.frozen) return
    const it = INTERACTABLES.find((i) => i.id === this.nearbyId)
    if (!it) return
    this.open(it)
  }

  private open(it: InteractableDef) {
    this.player.auto = null
    this.player.vx = 0
    this.input.clear()
    if (it.panel) store.openPanel(it.panel)
    else if (it.dialogue) store.set({ dialogue: { id: it.id, lines: it.dialogue, speaker: it.speaker } })
  }

  /** Back to the campfire, nothing opens. */
  travelHome() {
    this.travelTo('home')
  }

  /** Walks (near) or pans the camera (far) to an interactable, then opens it. */
  travelTo(id: string) {
    const home: InteractableDef = { id: 'home', label: '', x: SPAWN.x, promptY: 0, radius: 0, stand: { x: SPAWN.x, depth: SPAWN.depth }, hit: { x: 0, y: 0, w: 0, h: 0 } }
    const target = id === 'home' ? home : INTERACTABLES.find((i) => i.id === id)
    if (!target || this.travel) return
    const s = store.get()
    if (s.panel) store.closePanel()
    store.set({ menuOpen: false, dialogue: null, hasMoved: true })
    if (this.intro) this.intro = null
    store.set({ introDone: true })
    const dist = Math.abs(target.stand.x - this.player.x)
    if (dist < this.vw * 0.55 || this.reduceMotion) {
      if (this.reduceMotion && dist >= this.vw * 0.55) {
        this.player.place(target.stand.x, target.stand.depth)
        this.snapCamera()
        this.open(target)
        return
      }
      this.player.auto = { x: target.stand.x, depth: target.stand.depth, run: dist > 60, onArrive: () => this.open(target) }
      return
    }
    const to = this.camTarget(target.stand.x, pathBottom(target.stand.x) - target.stand.depth * pathDepth(target.stand.x))
    this.travel = {
      t: 0, dur: clamp(dist / 1000, 0.9, 1.9),
      fromX: this.camX, fromY: this.camY, toX: to.x, toY: to.y,
      target, stage: 'out', stageT: 0,
    }
    store.set({ traveling: true })
  }

  private toWorld(clientX: number, clientY: number) {
    const k = this.dpr / this.scale
    return { x: this.camX + clientX * k, y: this.camY + clientY * k }
  }

  private hitTest(wx: number, wy: number) {
    let best: InteractableDef | null = null
    for (const it of INTERACTABLES) {
      const h = it.hit
      if (wx >= h.x && wx <= h.x + h.w && wy >= h.y && wy <= h.y + h.h) {
        if (!best || h.w * h.h < best.hit.w * best.hit.h) best = it
      }
    }
    return best
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const w = this.toWorld(e.clientX, e.clientY)
    this.canvas.style.cursor = !this.frozen && this.hitTest(w.x, w.y) ? 'pointer' : 'default'
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.intro) { this.intro.t = this.intro.dur; return }
    if (this.frozen) return
    const w = this.toWorld(e.clientX, e.clientY)
    const hit = this.hitTest(w.x, w.y)
    store.set({ hasMoved: true })
    if (hit) {
      const dist = Math.abs(hit.stand.x - this.player.x)
      if (dist < 6 && this.nearbyId === hit.id) { this.open(hit); return }
      this.player.auto = { x: hit.stand.x, depth: hit.stand.depth, run: dist > 90, onArrive: () => this.open(hit) }
      return
    }
    const x = clamp(w.x, WORLD.leftBound, WORLD.rightBound)
    const top = pathTop(x), bot = pathBottom(x)
    const depth = w.y >= top - 6 && w.y <= bot + 6 ? clamp((bot - w.y) / (bot - top), 0, 1) : this.player.depth
    this.player.auto = { x, depth, run: Math.abs(x - this.player.x) > 140 }
  }

  /* ------------------------------------------------------------------ */
  /* Update                                                              */
  /* ------------------------------------------------------------------ */

  private update(dt: number) {
    this.t += dt
    this.dt = dt
    const t = this.t
    const s = store.get()
    this.input.blocked = !!(s.panel || s.dialogue)

    this.player.update(dt, this.input, this.frozen)
    const moved = Math.abs(this.player.vx) > 1 || Math.abs(this.player.vDepth) > 0.05
    if (moved && !s.hasMoved && s.introDone) store.set({ hasMoved: true })
    if (moved && s.menuOpen && !this.player.auto) store.set({ menuOpen: false })

    // camera
    if (this.travel) this.updateTravel(dt)
    else {
      const la = this.player.walking ? this.player.facing * CAMERA.lookAhead : this.lookAhead * 0.98
      this.lookAhead += (la - this.lookAhead) * Math.min(1, dt * 1.2)
      const c = this.camTarget()
      if (this.intro) {
        this.intro.t += dt
        const k = ease(Math.min(1, this.intro.t / this.intro.dur))
        this.camX = c.x
        this.camY = this.intro.fromY + (c.y - this.intro.fromY) * k
        if (this.intro.t >= this.intro.dur) {
          this.intro = null
          store.set({ introDone: true })
        }
      } else {
        this.camX += (c.x - this.camX) * Math.min(1, dt * CAMERA.followX)
        this.camY += (c.y - this.camY) * Math.min(1, dt * CAMERA.followY)
      }
    }

    // scene updates
    const sc = this.scene
    sc.fire.update(dt)
    sc.embers.update(dt, sc.fireTop.x, sc.fireTop.y)
    sc.smoke.update(dt, sc.chimney.x, sc.chimney.y)
    for (const d of sc.sorted) d.update?.(dt, t, this.player.x, this.player.y)
    for (const d of sc.backDrawables) d.update?.(dt, t, this.player.x, this.player.y)

    // shooting star
    if (!this.reduceMotion) {
      this.nextShooting -= dt
      if (this.nextShooting <= 0 && !this.shooting) {
        this.shooting = { x: Math.random() * this.vw * 0.8 + this.vw * 0.1, y: 10 + Math.random() * 40, vx: (Math.random() < 0.5 ? -1 : 1) * 150, vy: 55, life: 0 }
        this.nextShooting = 18 + Math.random() * 30
      }
      if (this.shooting) {
        const sh = this.shooting
        sh.life += dt
        sh.x += sh.vx * dt
        sh.y += sh.vy * dt
        if (sh.life > 0.7) this.shooting = null
      }
    }

    if (!this.travel && !this.intro) {
      this.updateNearby()
      this.updateZone()
      this.updateThoughts()
    }
    this.updateOverlays()

    this.mixAcc += dt
    if (this.mixAcc > 0.12) {
      this.mixAcc = 0
      const x = this.player.x
      this.onAudioMix({
        fire: clamp(1 - Math.abs(x - PLACES.campfire.x) / 300, 0, 1),
        water: clamp(1 - Math.abs(x - (PLACES.waterfall.x + 14)) / 460, 0, 1),
        lake: x > 860 && x < 1420 ? 1 : 0.35,
      })
    }
  }

  private updateTravel(dt: number) {
    const tr = this.travel!
    tr.stageT += dt
    const fade = 0.22
    if (tr.stage === 'out') {
      this.player.alpha = 1 - Math.min(1, tr.stageT / fade)
      if (tr.stageT >= fade) { tr.stage = 'pan'; tr.stageT = 0 }
    } else if (tr.stage === 'pan') {
      const k = ease(Math.min(1, tr.stageT / tr.dur))
      this.camX = tr.fromX + (tr.toX - tr.fromX) * k
      this.camY = tr.fromY + (tr.toY - tr.fromY) * k
      if (tr.stageT >= tr.dur) {
        this.player.place(tr.target.stand.x, tr.target.stand.depth)
        this.player.facing = tr.target.x >= tr.target.stand.x ? 1 : -1
        this.lookAhead = 0
        tr.stage = 'in'
        tr.stageT = 0
      }
    } else {
      this.player.alpha = Math.min(1, tr.stageT / fade)
      if (tr.stageT >= fade + 0.12) {
        this.player.alpha = 1
        this.travel = null
        store.set({ traveling: false })
        this.nearbyId = tr.target.id
        this.open(tr.target)
      }
    }
  }

  private updateNearby() {
    let best: InteractableDef | null = null
    let bestD = Infinity
    const px = this.player.x
    for (const it of INTERACTABLES) {
      const d = Math.abs(px - it.x)
      if (d < it.radius && d / it.radius < bestD) {
        best = it
        bestD = d / it.radius
      }
    }
    const id = best?.id ?? null
    if (id !== this.nearbyId) {
      this.nearbyId = id
      store.set({ nearby: best ? { id: best.id, label: best.label } : null })
    }
  }

  private updateZone() {
    const z = ZONES.find((z) => this.player.x >= z.from && this.player.x < z.to)
    if (z && z.id !== this.lastZone) {
      const first = this.lastZone === ''
      this.lastZone = z.id
      if (!first || store.get().introDone) store.set({ zone: { id: z.id, name: z.name, at: performance.now() } })
    }
  }

  private updateThoughts() {
    const now = this.t
    if (now < this.thoughtUntil) return
    if (this.thoughtUntil) {
      this.thoughtUntil = 0
      this.onThought(null)
    }
    for (const th of THOUGHTS) {
      if (Math.abs(this.player.x - th.x) < th.radius && (this.thoughtCooldown[th.id] ?? -1) < now) {
        this.thoughtCooldown[th.id] = now + 40
        this.thoughtUntil = now + 4.2
        this.onThought(th.text)
        break
      }
    }
  }

  /** CSS-pixel position of a world point. */
  toScreen(wx: number, wy: number) {
    const k = this.scale / this.dpr
    return { x: (wx - this.camX) * k, y: (wy - this.camY) * k }
  }

  private updateOverlays() {
    if (this.promptEl) {
      const it = this.nearbyId ? INTERACTABLES.find((i) => i.id === this.nearbyId) : null
      if (it) {
        const p = this.toScreen(it.x, it.promptY + Math.sin(this.t * 3) * 1.2)
        this.promptEl.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`
      }
    }
    if (this.bubbleEl) {
      const p = this.toScreen(this.player.x, this.player.headY - 4)
      this.bubbleEl.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  private layerY(worldTop: number, py: number) {
    return worldTop - (this.camRefY + (this.camY - this.camRefY) * py)
  }

  private render() {
    const f = this.f
    const sc = this.scene
    const t = this.t
    const camXi = Math.floor(this.camX), camYi = Math.floor(this.camY)
    const fx = this.camX - camXi, fy = this.camY - camYi
    const W = this.fbW, H = this.fbH

    // sky
    const [spx, spy] = PARALLAX.sky
    const skyTop = HORIZON_Y - this.sky.horizonRow
    const skyX = Math.round(this.camX * spx - fx)
    const skyY = Math.round(this.layerY(skyTop, spy) + fy)
    f.fillStyle = '#050816'
    f.fillRect(0, 0, W, H)
    blitClipped(f, this.sky.canvas, skyX, 0, W, this.sky.canvas.height, 0, skyY)
    // twinkling stars
    for (const s of this.sky.twinklers) {
      const b = Math.sin(t * s.speed + s.phase)
      const x = s.x - skyX, y = s.y + skyY
      if (x < -2 || x > W + 2) continue
      f.fillStyle = b > 0.5 ? '#fff6dc' : b > -0.3 ? '#b9c3ee' : '#6a75a8'
      f.fillRect(x, y, 1, 1)
      if (s.big && b > 0.6) {
        f.fillStyle = 'rgba(200,210,255,0.45)'
        f.fillRect(x - 1, y, 1, 1); f.fillRect(x + 1, y, 1, 1); f.fillRect(x, y - 1, 1, 1); f.fillRect(x, y + 1, 1, 1)
      }
    }
    if (this.shooting) {
      const sh = this.shooting
      const k = 1 - sh.life / 0.7
      const len = Math.hypot(sh.vx, sh.vy)
      for (let i = 0; i < 8; i++) {
        f.fillStyle = `rgba(230,236,255,${(k * (1 - i / 8)).toFixed(3)})`
        f.fillRect(Math.round(sh.x - (sh.vx / len) * i * 1.6), Math.round(sh.y - (sh.vy / len) * i * 1.6), 1, 1)
      }
    }
    // aurora
    this.auroraAcc += this.dt
    if (this.auroraAcc >= (this.reduceMotion ? 0.5 : 0.05)) {
      this.auroraAcc = 0
      this.aurora.update(this.reduceMotion ? 0 : t, this.camX * 0.05)
    }
    f.drawImage(this.aurora.canvas, 0, Math.round(this.layerY(HORIZON_Y - 176, spy) + fy))

    // distant layers
    const pos: Record<string, { img: HTMLCanvasElement | HTMLImageElement; sx: number; sy: number }> = {}
    for (const L of sc.layers) {
      const lx = Math.round(this.camX * L.px - fx)
      const ly = Math.round(this.layerY(L.top, L.py) + fy)
      pos[L.id] = { img: L.img, sx: lx, sy: ly }
      if (L.id === 'midForest') continue
      blitClipped(f, L.img, lx, 0, W, L.img.height, 0, ly)
    }
    // far lake with mirrored mountains + treeline
    const fl = sc.farLake
    const flx = Math.round(this.camX * fl.px - fx)
    const fly = Math.round(this.layerY(fl.top, fl.py) + fy)
    blitClipped(f, fl.base, flx, 0, W, fl.base.height, 0, fly)
    const mirrored = ['mountainsFar', 'mountainsNear', 'farForest'].map((id) => pos[id]).filter(Boolean)
    f.globalAlpha = 0.3
    for (let d = 0; d < fl.base.height - 2; d++) {
      if ((d + Math.floor(t * 3)) % 5 === 0) continue
      const wob = Math.round(Math.sin(t * 1.1 + d * 0.8) * Math.min(1.5, d * 0.12))
      const screenRow = fly - 1 - d
      for (const m of mirrored) {
        const row = screenRow - m.sy
        if (row >= 0 && row < m.img.height) blitClipped(f, m.img, m.sx + wob, row, W, 1, 0, fly + d + 1)
      }
    }
    f.globalAlpha = 1
    f.fillStyle = 'rgba(8,14,40,0.32)'
    f.fillRect(0, fly, W, fl.base.height)
    const moonScreenX = this.sky.moon.x - skyX
    for (let i = 0; i < 6; i++) {
      const w = 2 + Math.round((Math.sin(t * 2 + i) + 1) * 1.5)
      f.fillStyle = 'rgba(170,185,240,0.26)'
      f.fillRect(Math.round(moonScreenX - w / 2), fly + 2 + i * 3, w, 1)
    }

    // mid forest
    const mid = pos.midForest
    if (mid) blitClipped(f, mid.img, mid.sx, 0, W, mid.img.height, 0, mid.sy)

    // foreground lake (drawn before the ground so the cliffs cover it)
    sc.lake.draw(f, {
      camX: camXi, camY: camYi, fbW: W, fbH: H, waterY: WORLD.waterY, t,
      reflectSrc: sc.terrain.reflect,
      lights: sc.waterLights,
      moonX: moonScreenX,
      waterfall: { x: sc.waterfall.x + 4, w: sc.waterfall.width - 8 },
    })

    // ground (back), waterfall, trees
    blitClipped(f, sc.terrain.back, camXi, camYi, W, H, 0, 0)
    const wf = sc.waterfall
    if (wf.x + wf.width > camXi && wf.x < camXi + W) wf.draw(f, wf.x - camXi, wf.top - camYi, t, this.dt)
    for (const tr of sc.backTrees) {
      const img = tr.frames[Math.floor(t * 0.55 + tr.phase) % tr.frames.length]
      const x = Math.round(tr.x - img.width / 2) - camXi
      if (x > W || x + img.width < 0) continue
      f.drawImage(img, x, Math.round(tr.y - img.height + 1) - camYi)
    }
    for (const d of sc.backDrawables) d.draw(f, camXi, camYi, t)
    sc.fireflies.draw(f, camXi, camYi, t)
    blitClipped(f, sc.terrain.front, camXi, camYi, W, H, 0, 0)

    // y-sorted props + player
    const list: Drawable[] = sc.sorted.filter((d) => {
      const x = (d as unknown as { x: number }).x
      return x > camXi - 90 && x < camXi + W + 90
    })
    const player: Drawable = { y: this.player.drawY, draw: (c, cx, cy) => this.player.draw(c, cx, cy) }
    list.push(player)
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw(f, camXi, camYi, t)
    sc.embers.draw(f, camXi, camYi)
    sc.smoke.draw(f, camXi, camYi)
    blitClipped(f, sc.terrain.overlay, camXi, camYi, W, H, 0, 0)

    // lights
    f.globalCompositeOperation = 'lighter'
    for (const L of sc.lights) {
      const x = L.x - camXi, y = L.y - camYi
      if (x + L.r < 0 || x - L.r > W || y + L.r < 0 || y - L.r > H) continue
      const fl = L.flicker ? 1 + L.flicker * (Math.sin(t * 7.3 + L.phase) * 0.5 + Math.sin(t * 13.1 + L.phase * 2) * 0.3 + Math.sin(t * 2.1 + L.phase) * 0.2) : 1
      f.globalAlpha = clamp(fl, 0, 1.4) * (L.alpha / 0.5)
      const g = glow(L.r, L.color, 0.5)
      f.drawImage(g, Math.round(x - L.r), Math.round(y - L.r))
    }
    f.globalAlpha = 1
    f.globalCompositeOperation = 'source-over'

    // foreground silhouettes
    const [fgPx, fgPy] = PARALLAX.foreground
    for (const it of sc.fg) {
      const x = Math.round(it.fx - this.camX * fgPx + fx)
      if (x > W || x + it.img.width < 0) continue
      const y = Math.round(this.layerY(it.y - it.img.height, fgPy) + fy)
      f.drawImage(it.img, x, y)
    }

    // upscale to the screen with the sub-pixel camera offset
    const k = this.scale
    this.ctx.drawImage(this.fb, 0, 0, W, H, Math.round(-fx * k), Math.round(-fy * k), W * k, H * k)
  }
}
