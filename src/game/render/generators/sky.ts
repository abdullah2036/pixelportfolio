/**
 * Sky, stars, moon and the animated aurora.
 * The sky is regenerated whenever the viewport size changes.
 */
import { PAL } from '../palette'
import { bayer, c32, ditherIndex, hexToRgb, PixelBuffer, rng } from '../pixel'

export interface Twinkler {
  x: number
  y: number
  phase: number
  speed: number
  big: boolean
}

export interface SkyLayer {
  canvas: HTMLCanvasElement
  /** canvas row that lines up with world y = HORIZON_Y */
  horizonRow: number
  twinklers: Twinkler[]
  moon: { x: number; y: number }
}

/** world y where the sky meets the mountains */
export const HORIZON_Y = 186

export function buildSky(width: number, height: number): SkyLayer {
  const buf = new PixelBuffer(width, height)
  const r = rng(4242)
  const horizonRow = height - 24
  const ramp = PAL.sky.map((c) => c32(c))
  const span = 250
  for (let y = 0; y < height; y++) {
    const t = Math.max(0, Math.min(1, 1 - (horizonRow - y) / span))
    for (let x = 0; x < width; x++) buf.px[y * width + x] = ramp[ditherIndex(t * t * 0.95 + 0.02, x, y, ramp.length)]
  }

  // stars — fewer near the horizon
  const stars = PAL.star.map((c) => c32(c))
  const count = Math.floor((width * height) / 150)
  const twinklers: Twinkler[] = []
  for (let i = 0; i < count; i++) {
    const x = r.int(0, width - 1)
    const y = Math.floor(Math.pow(r.next(), 1.35) * (horizonRow - 20))
    const fade = 1 - y / horizonRow
    if (r.next() > fade + 0.15) continue
    const b = r.next()
    if (b > 0.985 && twinklers.length < 40) {
      twinklers.push({ x, y, phase: r.range(0, 6.28), speed: r.range(0.6, 1.8), big: r.chance(0.5) })
      continue
    }
    buf.set(x, y, stars[b > 0.93 ? 2 : b > 0.65 ? 1 : 0])
  }

  // moon
  const moon = { x: Math.round(width * 0.78), y: Math.max(28, horizonRow - 122) }
  const glow = hexToRgb(PAL.moon.glow)
  for (let y = -34; y <= 34; y++)
    for (let x = -34; x <= 34; x++) {
      const d = Math.sqrt(x * x + y * y)
      if (d < 10 || d > 34) continue
      const a = Math.pow(1 - (d - 10) / 24, 2) * 0.32
      if (a < bayer(x + 64, y + 64) * 0.34) continue
      const i = (moon.y + y) * width + moon.x + x
      if (moon.y + y < 0 || moon.y + y >= height || moon.x + x < 0 || moon.x + x >= width) continue
      const base = buf.px[i]
      const br = base & 255, bg = (base >> 8) & 255, bb = (base >> 16) & 255
      const k = 0.5
      buf.px[i] = c32FromRgb(br + (glow[0] - br) * k * (a / 0.32), bg + (glow[1] - bg) * k * (a / 0.32), bb + (glow[2] - bb) * k * (a / 0.32))
    }
  const mR = 10
  for (let y = -mR; y <= mR; y++)
    for (let x = -mR; x <= mR; x++) {
      const d2 = x * x + y * y
      if (d2 > mR * mR + 2) continue
      const shade = x < -5 && d2 > 40 ? PAL.moon.shade : x < -2 && d2 > 60 ? PAL.moon.mid : PAL.moon.light
      buf.set(moon.x + x, moon.y + y, c32(shade))
    }
  const craters: [number, number, number][] = [[-3, -3, 2], [3, 1, 3], [-1, 5, 1], [5, -5, 1], [-5, 2, 1], [1, -6, 1]]
  for (const [cx, cy, cr] of craters)
    for (let y = -cr; y <= cr; y++)
      for (let x = -cr; x <= cr; x++)
        if (x * x + y * y <= cr * cr) buf.set(moon.x + cx + x, moon.y + cy + y, c32(x + y < 0 ? PAL.moon.crater : PAL.moon.mid))

  return { canvas: buf.toCanvas(), horizonRow, twinklers, moon }
}

function c32FromRgb(r: number, g: number, b: number) {
  return ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0
}

/* ------------------------------------------------------------------ */
/* Aurora                                                              */
/* ------------------------------------------------------------------ */

export class Aurora {
  readonly height = 130
  canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private img: ImageData
  private px: Uint32Array
  private width = 0
  private cols: number[][]

  constructor(width: number) {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
    this.cols = [PAL.aurora[2], PAL.aurora[1], PAL.aurora[0], PAL.aurora[3], PAL.aurora[4]].map(hexToRgb)
    this.img = new ImageData(1, 1)
    this.px = new Uint32Array(1)
    this.resize(width)
  }

  resize(width: number) {
    this.width = width
    this.canvas.width = width
    this.canvas.height = this.height
    this.img = new ImageData(width, this.height)
    this.px = new Uint32Array(this.img.data.buffer)
  }

  update(t: number, drift: number) {
    const { width, height, px } = this
    px.fill(0)
    const levels = [0, 0.1, 0.19, 0.3, 0.42]
    for (let x = 0; x < width; x++) {
      const u = x + drift
      const yb = 78 + 13 * Math.sin(u * 0.011 + t * 0.045) + 7 * Math.sin(u * 0.027 - t * 0.08) + 3 * Math.sin(u * 0.07 + t * 0.12)
      const hgt = 40 + 16 * Math.sin(u * 0.016 + t * 0.035 + 1.3)
      const env = Math.max(0, 0.35 + 0.65 * Math.sin(u * 0.0065 + t * 0.018 + 0.6))
      const rays = 0.55 + 0.45 * Math.sin(u * 0.85 + 2.6 * Math.sin(u * 0.045 + t * 0.22))
      const amp = env * (0.45 + 0.55 * rays)
      if (amp < 0.04) continue
      const top = Math.max(0, Math.floor(yb - hgt)), bot = Math.min(height - 1, Math.ceil(yb + 3))
      for (let y = top; y <= bot; y++) {
        const s = (yb - y) / hgt
        let I = amp
        if (s < 0) I *= Math.max(0, 1 + s * (hgt / 3))
        else I *= Math.pow(1 - s, 1.6) * Math.min(1, s / 0.06 + 0.4)
        if (I <= 0.02) continue
        const q = I * (levels.length - 1)
        const li = Math.min(levels.length - 1, Math.floor(q) + (q - Math.floor(q) > bayer(x, y) ? 1 : 0))
        if (li === 0) continue
        const ci = s < 0.12 ? 0 : s < 0.35 ? 1 : s < 0.6 ? 2 : s < 0.8 ? 3 : 4
        const [r, g, b] = this.cols[ci]
        px[y * width + x] = ((Math.round(levels[li] * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0
      }
    }
    this.ctx.putImageData(this.img, 0, 0)
  }
}
