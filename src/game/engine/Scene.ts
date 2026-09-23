/**
 * Builds every static layer and places every prop, animal and light.
 * Generated art is used unless an override image was loaded (see assets.ts).
 */
import { ASSET_OVERRIDES, sliceSheet } from '../assets'
import { PARALLAX, WORLD } from '../config'
import { farForest, farLakeBase, midForest, mountainRange } from '../render/generators/landscape'
import { Embers, Fire, Fireflies, Lake, Smoke, Waterfall } from '../render/generators/effects'
import { buildTerrain, wallTop, type TerrainLayers } from '../render/generators/terrain'
import { broadleafFrames, bush, pineBuffer, pineFrames } from '../render/generators/trees'
import { PAL } from '../render/palette'
import { flipH, makeCanvas, rng, silhouette, valueNoise, type Img } from '../render/pixel'
import { buildCat, buildDuck, buildFox, buildOwl, buildPlayerFrames, buildRabbit, type CharacterFrames } from '../render/sprites/characters'
import * as O from '../render/sprites/objects'
import { PLACES } from '../world/layout'
import { pathTop } from '../world/terrain'
import { Duck, Owl, Rabbit, Sleeper, type Drawable } from './Critters'

export interface Light {
  x: number
  y: number
  r: number
  color: string
  alpha: number
  flicker: number
  phase: number
  reflect: number
}

export interface TreeInst {
  frames: Img[]
  x: number
  y: number
  phase: number
}

export interface FgItem {
  img: Img
  fx: number
  y: number
}

export interface ParallaxLayer {
  id: 'mountainsFar' | 'mountainsNear' | 'farForest' | 'midForest'
  img: Img
  px: number
  py: number
  /** world y of the image's top edge at the reference camera */
  top: number
}

const placed = (img: Img, x: number, y: number) => ({ left: Math.round(x - img.width / 2), top: Math.round(y - img.height + 1) })

class Prop implements Drawable {
  frames: Img[]
  x: number
  y: number
  fps: number
  bob: number
  lift: number
  constructor(frames: Img | Img[], x: number, y: number, opts: { fps?: number; bob?: number; lift?: number } = {}) {
    this.frames = Array.isArray(frames) ? frames : [frames]
    this.x = x
    this.y = y
    this.fps = opts.fps ?? 0
    this.bob = opts.bob ?? 0
    this.lift = opts.lift ?? 0
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const img = this.frames.length > 1 ? this.frames[Math.floor(t * this.fps) % this.frames.length] : this.frames[0]
    const bob = this.bob ? Math.round(Math.sin(t * 1.3 + this.x) * this.bob) : 0
    ctx.drawImage(img, Math.round(this.x - img.width / 2 - camX), Math.round(this.y - img.height + 1 - this.lift - camY + bob))
  }
}

class Campfire implements Drawable {
  x: number
  y: number
  base: Img
  fire: Fire
  constructor(base: Img, fire: Fire, x: number, y: number) {
    this.base = base
    this.fire = fire
    this.x = x
    this.y = y
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const bx = Math.round(this.x - this.base.width / 2 - camX)
    const by = Math.round(this.y - this.base.height + 1 - camY)
    ctx.drawImage(this.fire.canvas, Math.round(this.x - this.fire.w / 2 - camX), by - this.fire.h + 4)
    ctx.drawImage(this.base, bx, by)
  }
}

/** Crate + laptop with a blinking cursor. */
class LaptopProp implements Drawable {
  x: number
  y: number
  crate: Img
  laptop: Img
  constructor(crate: Img, laptop: Img, x: number, y: number) {
    this.crate = crate
    this.laptop = laptop
    this.x = x
    this.y = y
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const c = placed(this.crate, this.x, this.y)
    ctx.drawImage(this.crate, c.left - Math.round(camX), c.top - Math.round(camY))
    const l = placed(this.laptop, this.x, c.top + 1)
    ctx.drawImage(this.laptop, l.left - Math.round(camX), l.top - Math.round(camY))
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#d8fff4'
      ctx.fillRect(l.left - Math.round(camX) + 7, l.top - Math.round(camY) + 5, 1, 1)
    }
  }
}

/** Cabin with a tiny terminal scrolling behind the left window. */
class CabinProp implements Drawable {
  x: number
  y: number
  img: Img
  term: { x: number; y: number; w: number; h: number } | null
  constructor(img: Img, x: number, y: number, term: { x: number; y: number; w: number; h: number } | null) {
    this.img = img
    this.x = x
    this.y = y
    this.term = term
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const p = placed(this.img, this.x, this.y)
    const ox = p.left - Math.round(camX), oy = p.top - Math.round(camY)
    ctx.drawImage(this.img, ox, oy)
    if (!this.term) return
    const { x, y, w, h } = this.term
    const scroll = Math.floor(t * 1.5)
    for (let i = 0; i < h; i++) {
      const len = 1 + ((i + scroll) * 7) % (w - 1)
      ctx.fillStyle = (i + scroll) % 4 === 0 ? '#f0c060' : '#7fe0b0'
      ctx.fillRect(ox + x, oy + y + i, len, 1)
    }
  }
}

export class Scene {
  layers: ParallaxLayer[] = []
  farLake!: { base: HTMLCanvasElement; top: number; px: number; py: number }
  terrain!: TerrainLayers
  backTrees: TreeInst[] = []
  backDrawables: Drawable[] = []
  sorted: Drawable[] = []
  fg: FgItem[] = []
  lights: Light[] = []
  waterLights: { x: number; y: number; strength: number; color: string }[] = []
  fire!: Fire
  embers = new Embers()
  smoke = new Smoke()
  fireflies!: Fireflies
  waterfall!: Waterfall
  lake!: Lake
  playerFrames!: { right: CharacterFrames; left: CharacterFrames }
  chimney = { x: 0, y: 0 }
  fireTop = { x: 0, y: 0 }

  build(ov: Record<string, HTMLImageElement>) {
    const W = WORLD.width
    const r = rng(2024)

    /* ---------- player ---------- */
    const pSpec = ASSET_OVERRIDES.characters.player
    if (pSpec && ov.player) {
      const idle = sliceSheet(ov.player, pSpec, pSpec.animations.idle.row, pSpec.animations.idle.frames)
      const walk = sliceSheet(ov.player, pSpec, pSpec.animations.walk.row, pSpec.animations.walk.frames)
      this.playerFrames = { right: { idle, walk }, left: { idle: idle.map(flipH), walk: walk.map(flipH) } }
    } else this.playerFrames = buildPlayerFrames()

    /* ---------- distant layers ---------- */
    const env = ASSET_OVERRIDES.environment
    const layer = (key: 'mountains' | 'farForest' | 'midForest', fallback: () => ParallaxLayer, px: number, py: number): ParallaxLayer => {
      const spec = env[key]
      const img = ov[key]
      const id = key === 'mountains' ? 'mountainsFar' : key
      if (spec && img) return { id, img, px, py, top: spec.bottomY - img.height }
      return fallback()
    }
    const [mfx, mfy] = PARALLAX.mountainsFar
    const [mnx, mny] = PARALLAX.mountainsNear
    const [ffx, ffy] = PARALLAX.farForest
    const [mdx, mdy] = PARALLAX.midForest
    const hasMountains = !!(env.mountains && ov.mountains)
    this.layers.push(
      layer('mountains', () => ({
        id: 'mountainsFar',
        img: mountainRange({ width: Math.ceil(W * mfx) + 1000, height: 112, seed: 5, peaks: 9, minH: 34, maxH: 96, snow: 0.34, colors: PAL.mountFar }),
        px: mfx, py: mfy, top: 192 - 112,
      }), mfx, mfy),
    )
    if (!hasMountains)
      this.layers.push({
        id: 'mountainsNear',
        img: mountainRange({ width: Math.ceil(W * mnx) + 1000, height: 84, seed: 9, peaks: 12, minH: 18, maxH: 62, snow: 0.22, colors: PAL.mountNear }),
        px: mnx, py: mny, top: 197 - 84,
      })
    this.layers.push(layer('farForest', () => ({ id: 'farForest', img: farForest(Math.ceil(W * ffx) + 1000, 31), px: ffx, py: ffy, top: 196 - 44 }), ffx, ffy))
    this.farLake = { base: farLakeBase(Math.ceil(W * ffx) + 1000, 52), top: 191, px: ffx, py: ffy }

    const dens = (lx: number) => {
      const X = (lx - 120) / mdx
      const stops: [number, number][] = [[0, 0.95], [180, 0.9], [280, 0.5], [340, 0.14], [660, 0.14], [760, 0.75], [900, 0.7], [980, 0.06], [1290, 0.06], [1380, 0.8], [1500, 0.5], [1700, 0.5], [1800, 0.85], [2600, 0.9]]
      for (let i = 1; i < stops.length; i++)
        if (X <= stops[i][0]) {
          const [x0, v0] = stops[i - 1], [x1, v1] = stops[i]
          return v0 + ((v1 - v0) * (X - x0)) / (x1 - x0)
        }
      return 0.9
    }
    this.layers.push(layer('midForest', () => ({ id: 'midForest', img: midForest({ width: Math.ceil(W * mdx) + 1000, height: 112, seed: 71, density: dens }), px: mdx, py: mdy, top: 208 - 78 }), mdx, mdy))

    /* ---------- ground ---------- */
    this.terrain = buildTerrain()
    const n1 = valueNoise(11)

    /* ---------- trees behind the path ---------- */
    const nearRamp = PAL.nearTree
    const addPine = (x: number, h: number, y = pathTop(x) - 1, sway = true) =>
      this.backTrees.push({ frames: pineFrames(h, { ramp: nearRamp, seed: Math.round(x * 13 + h), sway, rim: 0.7 }), x, y, phase: r.range(0, 10) })
    const addBroad = (x: number, h: number) =>
      this.backTrees.push({ frames: broadleafFrames(h, Math.round(x)), x, y: pathTop(x) - 1, phase: r.range(0, 10) })
    ;[[18, 124], [50, 98], [84, 136], [136, 90], [238, 104], [414, 120], [556, 132], [712, 108], [796, 126], [840, 98], [882, 110], [918, 94], [1342, 106], [1376, 126], [1430, 118], [1462, 92], [1742, 126], [1794, 104], [1842, 134], [1874, 96], [2300, 98], [2490, 114], [2546, 128]].forEach(([x, h]) => addPine(x, h))
    ;[[170, 72], [752, 66], [1488, 62]].forEach(([x, h]) => addBroad(x, h))
    for (const x of [1912, 1944, 2064, 2096, 2146, 2198, 2244]) addPine(x, r.int(44, 76), wallTop(x, n1) + 2)
    this.backTrees.sort((a, b) => a.y - b.y || a.x - b.x)

    /* ---------- bushes on the back strip ---------- */
    for (const x of [120, 272, 452, 590, 740, 1400, 1520, 1770, 2296, 2470]) {
      const img = bush(r.int(12, 22), r.int(7, 12), Math.round(x))
      this.backDrawables.push(new Prop(img, x, pathTop(x) + 1))
    }
    // reeds along the shore bank behind the boardwalk
    for (let x = 970; x < 1310; x += r.range(10, 26)) this.backDrawables.push(new Prop(reeds(r.int(1, 1e6), false), x, 245))

    /* ---------- owl on its tree ---------- */
    const owl = buildOwl()
    this.backDrawables.push(new Owl(owl, PLACES.owlTree.x + 3, PLACES.owlTree.y - 52))

    /* ---------- props (y-sorted with the player) ---------- */
    const pick = (key: keyof typeof ASSET_OVERRIDES.objects, gen: () => Img | Img[]) => (ov[key] ? ov[key] : gen())
    const P = PLACES

    const tel = pick('telescope', O.telescope) as Img
    this.sorted.push(new Prop(tel, P.telescope.x, P.telescope.y))
    this.sorted.push(new Prop(O.signBoard('ABOUT ME'), P.aboutSign.x, P.aboutSign.y))
    this.sorted.push(new Prop(O.journalStump(), P.journal.x, P.journal.y))

    const tentFrames = pick('tent', O.tent)
    this.sorted.push(new Prop(tentFrames, P.tent.x, P.tent.y, { fps: 0.9 }))
    const tentImg = Array.isArray(tentFrames) ? tentFrames[0] : tentFrames
    const tp = placed(tentImg, P.tent.x, P.tent.y)
    this.addLight(tp.left + tentImg.width * 0.66, tp.top + tentImg.height * 0.76, 54, PAL.warm, 0.3, 0.05, 0.55)

    this.sorted.push(new Sleeper(buildCat(), P.cat.x, P.cat.y, 1.7))
    this.sorted.push(new Prop(O.backpack(), P.backpack.x, P.backpack.y))

    const campPost = O.lanternPost()
    this.sorted.push(new Prop(campPost.img, P.campLantern.x, P.campLantern.y))
    const cpp = placed(campPost.img, P.campLantern.x, P.campLantern.y)
    this.addLight(cpp.left + campPost.light.x, cpp.top + campPost.light.y, 30, '#ffc070', 0.34, 0.08, 0.45)

    this.sorted.push(new Prop(O.carvedSign(), P.carvedSign.x, P.carvedSign.y))
    this.sorted.push(new Prop(O.logBench(36), P.bench.x, P.bench.y))

    this.fire = new Fire()
    const fireBase = pick('campfireBase', O.campfireBase) as Img
    this.sorted.push(new Campfire(fireBase, this.fire, P.campfire.x, P.campfire.y))
    this.fireTop = { x: P.campfire.x, y: P.campfire.y - 14 }
    this.addLight(P.campfire.x, P.campfire.y - 9, 92, '#ff9a3c', 0.46, 0.2, 1)
    this.addLight(P.campfire.x, P.campfire.y - 10, 30, '#ffd27a', 0.3, 0.25, 0)

    this.sorted.push(new LaptopProp(O.crate(14, 10), O.laptop(), P.laptopCrate.x, P.laptopCrate.y))
    this.addLight(P.laptopCrate.x, P.laptopCrate.y - 15, 14, '#7fe0d0', 0.22, 0.05, 0)

    const board = ov.projectBoard ? { img: ov.projectBoard as Img, light: { x: ov.projectBoard.width * 0.95, y: ov.projectBoard.height * 0.26 } } : O.projectBoard()
    this.sorted.push(new Prop(board.img, P.board.x, P.board.y))
    const bp = placed(board.img, P.board.x, P.board.y)
    this.addLight(bp.left + board.light.x, bp.top + board.light.y, 30, '#ffc070', 0.32, 0.08, 0.4)
    this.sorted.push(new Prop(O.stump(12, 8, 3), P.mugStump.x, P.mugStump.y))
    this.sorted.push(new Prop(O.mug(), P.mugStump.x + 1, P.mugStump.y + 0.1, { lift: 8 }))

    // dock
    const dockPost = O.lanternPost()
    this.sorted.push(new Prop(dockPost.img, P.dockLantern.x, P.dockLantern.y))
    const dpp = placed(dockPost.img, P.dockLantern.x, P.dockLantern.y)
    this.addLight(dpp.left + dockPost.light.x, dpp.top + dockPost.light.y, 34, '#ffc070', 0.36, 0.08, 1)
    this.sorted.push(new Prop(pick('mailbox', O.mailbox), P.mailbox.x, P.mailbox.y))
    this.sorted.push(new Prop(O.signBoard('RESUME', { posts: 1, postH: 8 }), P.resumeSign.x, P.resumeSign.y))
    this.sorted.push(new Prop(pick('rowboat', O.rowboat), P.boat.x, P.boat.y, { bob: 1 }))

    // workshop
    this.sorted.push(new Prop(O.signBoard('SKILLS'), P.skillsSign.x, P.skillsSign.y))
    const ws = ov.workshop ? { img: ov.workshop as Img, light: { x: ov.workshop.width * 0.5, y: ov.workshop.height * 0.33 } } : O.workshop()
    this.sorted.push(new Prop(ws.img, P.workshop.x, P.workshop.y))
    const wp = placed(ws.img, P.workshop.x, P.workshop.y)
    this.addLight(wp.left + ws.light.x, wp.top + ws.light.y, 44, '#ffb45c', 0.34, 0.07, 0.4)
    this.sorted.push(new Prop(O.woodpile(), P.woodpile.x, P.woodpile.y))
    this.sorted.push(new Sleeper(buildFox(), P.fox.x, P.fox.y, 1.9))
    this.sorted.push(new Prop(O.chessStump(), P.chess.x, P.chess.y))

    // cabin
    this.sorted.push(new Prop(O.hangingSign('CONTACT'), P.contactSign.x, P.contactSign.y))
    if (ov.cabin) {
      const img = ov.cabin as Img
      this.sorted.push(new CabinProp(img, P.cabin.x, P.cabin.y, null))
      const cp = placed(img, P.cabin.x, P.cabin.y)
      this.addLight(cp.left + img.width * 0.5, cp.top + img.height * 0.65, 44, PAL.warm, 0.3, 0.05, 0.3)
      this.chimney = { x: cp.left + img.width * 0.75, y: cp.top + 4 }
    } else {
      const cab = O.cabin()
      this.sorted.push(new CabinProp(cab.img, P.cabin.x, P.cabin.y, cab.terminal))
      const cp = placed(cab.img, P.cabin.x, P.cabin.y)
      for (const w of cab.windows) this.addLight(cp.left + w.x, cp.top + w.y, 30, '#ffb45c', 0.3, 0.04, 0.3)
      this.addLight(cp.left + cab.lantern.x, cp.top + cab.lantern.y, 26, '#ffc070', 0.34, 0.1, 0.2)
      this.addLight(cp.left + cab.attic.x, cp.top + cab.attic.y, 16, '#ffb45c', 0.24, 0.04, 0)
      this.chimney = { x: cp.left + cab.chimney.x, y: cp.top + cab.chimney.y }
    }
    this.sorted.push(new Prop(O.flag(), P.flag.x, P.flag.y, { fps: 1.6 }))

    // wildlife
    this.sorted.push(new Rabbit(buildRabbit(), 1400, 1386, 1480))
    this.sorted.push(new Duck(buildDuck(), 1230, 279, 1160, 1320))

    /* ---------- effects ---------- */
    const wf = P.waterfall
    this.waterfall = new Waterfall(wf.x, Math.round(wallTop(wf.x + wf.w / 2, n1)) + 1, WORLD.waterY + 2, wf.w)
    this.lake = new Lake(W)
    this.fireflies = new Fireflies([[150, 200, 3], [560, 194, 3], [770, 198, 2], [1470, 194, 3], [1810, 196, 3], [2310, 128, 2]])

    /* ---------- foreground silhouettes (parallax > 1) ---------- */
    const fgx = (X: number) => X * PARALLAX.foreground[0] - 66
    for (const X of [30, 250, 470, 700, 930, 1180, 1400, 1640, 1880, 2150, 2380, 2560]) {
      this.fg.push({ img: reeds(Math.round(X), true), fx: fgx(X + r.range(-30, 30)), y: 300 + r.int(0, 8) })
    }
    for (const X of [140, 620, 1090, 1560, 2040, 2440]) {
      const img = silhouette(O.boulder(r.int(18, 30), r.int(8, 12), X, true), '#04070e')
      this.fg.push({ img, fx: fgx(X), y: 304 + r.int(0, 6) })
    }
    const edgeTree = silhouette(pineBuffer(260, { ramp: ['#03060c', '#03060c', '#060b14', '#060b14', '#08101a'], seed: 3, outline: null }).toCanvas(), '#03060c')
    this.fg.push({ img: edgeTree, fx: fgx(-6), y: 320 })
    this.fg.push({ img: flipH(edgeTree), fx: fgx(W + 16), y: 320 })

    this.waterLights = this.lights.filter((l) => l.reflect > 0).map((l) => ({ x: l.x, y: l.y, strength: l.reflect, color: l.color }))
  }

  addLight(x: number, y: number, r: number, color: string, alpha: number, flicker: number, reflect: number) {
    this.lights.push({ x, y, r, color, alpha, flicker, phase: this.lights.length * 1.7, reflect })
  }
}

/** A clump of reeds/grass blades. `dark` makes a foreground silhouette. */
function reeds(seed: number, dark: boolean): HTMLCanvasElement {
  const r = rng(seed)
  const w = 16, h = dark ? 30 : 16
  const [c, ctx] = makeCanvas(w, h)
  const blades = r.int(5, 9)
  for (let i = 0; i < blades; i++) {
    const x0 = r.int(3, w - 4)
    const len = r.int(Math.floor(h * 0.45), h - 1)
    const lean = r.range(-0.25, 0.25)
    for (let j = 0; j < len; j++) {
      const x = Math.round(x0 + lean * j)
      ctx.fillStyle = dark ? (j > len - 3 && r.chance(0.3) ? '#0b1522' : '#04080f') : j > len - 4 ? PAL.grass[3] : PAL.grass[1]
      ctx.fillRect(x, h - 1 - j, 1, 1)
    }
    if (r.chance(dark ? 0.35 : 0.25)) {
      const x = Math.round(x0 + lean * len)
      ctx.fillStyle = dark ? '#0a0f18' : '#3a2a20'
      ctx.fillRect(x, h - len - 2, 1, 3)
    }
  }
  return c
}
