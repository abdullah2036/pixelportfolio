/**
 * Distant parallax layers: two mountain ranges, the far treeline across the
 * lake, and the mid-distance forest. Each is baked once into a wide canvas.
 */
import { PAL } from '../palette'
import { bayer, c32, ditherIndex, hash1, makeCanvas, PixelBuffer, rng, valueNoise } from '../pixel'
import { pineBuffer } from './trees'

interface RangeOpts {
  width: number
  height: number
  seed: number
  peaks: number
  minH: number
  maxH: number
  colors: { dark: string; lit: string; snow: string; snowShade: string; haze: string }
  snow: number
}

/** Classic two-tone pixel mountains: dark west faces, moonlit east faces, jagged snow caps. */
export function mountainRange(o: RangeOpts): HTMLCanvasElement {
  const { width: W, height: H } = o
  const r = rng(o.seed)
  const buf = new PixelBuffer(W, H)
  const noise = valueNoise(o.seed + 1)
  const peaks = Array.from({ length: o.peaks }, (_, i) => ({
    x: (i + r.range(0.1, 0.9)) * (W / o.peaks),
    top: H - r.range(o.minH, o.maxH),
    sl: r.range(0.55, 1.0),
    sr: r.range(0.6, 1.05),
  }))
  // a few extra tall hero peaks
  for (let i = 0; i < Math.ceil(o.peaks / 5); i++)
    peaks.push({ x: r.range(0, W), top: H - o.maxH * r.range(1.02, 1.12), sl: r.range(0.7, 0.95), sr: r.range(0.75, 1.0) })

  const dark = c32(o.colors.dark), lit = c32(o.colors.lit)
  const litHi = c32(mixHex(o.colors.lit, o.colors.snowShade, 0.3))
  const snow = c32(o.colors.snow), snowSh = c32(o.colors.snowShade), haze = c32(o.colors.haze)
  const ridge = new Float32Array(W)
  const owner = new Int16Array(W)
  for (let x = 0; x < W; x++) {
    let best = Infinity, who = 0
    peaks.forEach((p, i) => {
      const d = x - p.x
      const y = p.top + Math.abs(d) * (d < 0 ? p.sl : p.sr) + (noise(x * 0.12, i) - 0.5) * 4
      if (y < best) { best = y; who = i }
    })
    ridge[x] = best + Math.round((hash1(x, o.seed) - 0.5) * 1.2)
    owner[x] = who
  }
  for (let x = 0; x < W; x++) {
    const p = peaks[owner[x]]
    const start = Math.max(0, Math.floor(ridge[x]))
    const peakH = H - p.top
    const snowDepth = peakH * o.snow * (0.55 + 0.9 * noise(x * 0.09, 7))
    for (let y = start; y < H; y++) {
      const eastFace = x > p.x
      // gullies: diagonal striations that follow the slope
      const g = noise((x + y * (eastFace ? 1.1 : -1.1)) * 0.16, 3)
      let col = eastFace ? (g > 0.72 ? dark : g > 0.6 ? litHi : lit) : g > 0.78 ? lit : dark
      if (y - p.top < snowDepth && y - ridge[x] < snowDepth * 1.2) col = eastFace ? (g > 0.75 ? snowSh : snow) : g > 0.7 ? snow : snowSh
      const hz = (y - (H - 34)) / 34
      if (hz > 0 && hz > bayer(x, y) * 1.1) col = haze
      buf.px[y * W + x] = col
    }
  }
  return buf.toCanvas()
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t)
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')
}

/** Tiny pines on the far shore, plus a thin shoreline strip. */
export function farForest(width: number, seed: number): HTMLCanvasElement {
  const H = 44
  const [c, ctx] = makeCanvas(width, H)
  const r = rng(seed)
  const ramp = PAL.farForest
  let x = -4
  while (x < width + 4) {
    const h = r.int(7, 22) + (r.chance(0.12) ? 8 : 0)
    const t = pineBuffer(h, { ramp: [ramp[0], ramp[0], ramp[1], ramp[1], ramp[2]], trunk: [ramp[0], ramp[0], ramp[0]], seed: r.int(1, 1e6), outline: null, rim: 0.8 })
    ctx.drawImage(t.toCanvas(), Math.round(x), H - 4 - h + r.int(0, 2))
    x += r.range(2.5, 7)
  }
  ctx.fillStyle = ramp[0]
  ctx.fillRect(0, H - 5, width, 5)
  // a few distant rocks along the shore line
  ctx.fillStyle = '#141d3a'
  for (let i = 0; i < width / 30; i++) ctx.fillRect(r.int(0, width), H - 5, r.int(2, 5), 1)
  return c
}

export interface MidForestOpts {
  width: number
  height: number
  seed: number
  /** density 0..1 as a function of layer x */
  density: (lx: number) => number
}

/** Mid-distance forest with clearings; a dark forest floor extends below. */
export function midForest(o: MidForestOpts): HTMLCanvasElement {
  const { width: W, height: H } = o
  const [c, ctx] = makeCanvas(W, H)
  const r = rng(o.seed)
  const ramp = PAL.midForest
  const floorY = H - 34
  const trees: { x: number; h: number; y: number; img: HTMLCanvasElement }[] = []
  let x = -10
  while (x < W + 10) {
    const d = o.density(x)
    if (r.next() < d) {
      const h = Math.round(r.range(26, 74) * (0.65 + d * 0.45))
      const img = pineBuffer(h, { ramp: [ramp[0], ramp[1], ramp[1], ramp[2], ramp[3], ramp[4]], seed: r.int(1, 1e6), rim: 0.75, outline: '#050d14' }).toCanvas()
      trees.push({ x, h, y: floorY + r.int(-3, 5), img })
    }
    x += r.range(5, 12) * (d > 0.3 ? 1 : 1.8)
  }
  trees.sort((a, b) => a.y - b.y)
  for (const t of trees) ctx.drawImage(t.img, Math.round(t.x - t.img.width / 2), t.y - t.h)
  // forest floor
  const floor = new PixelBuffer(W, H - floorY)
  const fr = [PAL.midForest[0], '#081610', '#0b1c15'].map((c) => c32(c))
  const noise = valueNoise(o.seed + 5)
  for (let y = 0; y < floor.h; y++)
    for (let xx = 0; xx < W; xx++) {
      const covered = o.density(xx) > 0.05 || y > 3
      if (!covered) continue
      const v = noise(xx * 0.2, y * 0.3) * 0.6 + (1 - y / floor.h) * 0.3
      floor.px[y * W + xx] = fr[ditherIndex(v, xx, y, fr.length)]
    }
  ctx.drawImage(floor.toCanvas(), 0, floorY + 2)
  return c
}

/** Draws the far lake band: base colour, reflections are added at runtime. */
export function farLakeBase(width: number, height: number): HTMLCanvasElement {
  const buf = new PixelBuffer(width, height)
  const ramp = PAL.farLake.map((c) => c32(c))
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) buf.px[y * width + x] = ramp[ditherIndex(0.25 + (y / height) * 0.6, x, y, ramp.length)]
  return buf.toCanvas()
}
