/**
 * Animated effects: campfire (doom-fire simulation), waterfall, lake surface,
 * dithered light glows, embers, chimney smoke and fireflies.
 */
import { PAL } from '../palette'
import { bayer, blitClipped, c32, ditherIndex, hexToRgb, makeCanvas, PixelBuffer, rng, type Img } from '../pixel'

/* ------------------------------------------------------------------ */
/* Campfire                                                            */
/* ------------------------------------------------------------------ */

export class Fire {
  readonly w = 18
  readonly h = 24
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private heat: Uint8Array
  private img: ImageData
  private px: Uint32Array
  private pal: number[]
  private acc = 0

  constructor() {
    ;[this.canvas, this.ctx] = makeCanvas(this.w, this.h)
    this.heat = new Uint8Array(this.w * this.h)
    this.img = new ImageData(this.w, this.h)
    this.px = new Uint32Array(this.img.data.buffer)
    this.pal = PAL.fire.map((c, i) => (i === 0 ? 0 : c32(c.slice(0, 7))))
    for (let i = 0; i < 30; i++) this.step()
  }

  private step() {
    const { w, h, heat } = this
    const mid = (w - 1) / 2
    for (let x = 0; x < w; x++) {
      const e = 1 - Math.abs(x - mid) / (mid + 1)
      const base = e > 0.35 ? 8 : e > 0.2 ? 6 : 3
      heat[(h - 1) * w + x] = Math.random() < 0.18 ? base - 3 : base
    }
    for (let y = 1; y < h; y++)
      for (let x = 0; x < w; x++) {
        const src = y * w + x
        const r = (Math.random() * 3.99) | 0
        const edge = Math.abs(x - mid) / mid
        const decay = (r & 1) + (edge > 0.55 && Math.random() < 0.5 ? 1 : 0)
        const dst = src - w - r + 1
        if (dst >= 0 && dst < w * h) heat[dst] = Math.max(0, heat[src] - decay)
      }
  }

  update(dt: number) {
    this.acc += dt
    if (this.acc < 1 / 22) return
    this.acc = 0
    this.step()
    for (let i = 0; i < this.px.length; i++) this.px[i] = this.pal[Math.min(8, this.heat[i])]
    this.ctx.putImageData(this.img, 0, 0)
  }
}

/* ------------------------------------------------------------------ */
/* Dithered light glows                                                */
/* ------------------------------------------------------------------ */

const glowCache = new Map<string, HTMLCanvasElement>()

/** Radial glow quantised into dithered bands — reads as pixel art when upscaled. */
export function glow(radius: number, hex: string, maxAlpha: number) {
  const key = `${radius}|${hex}|${maxAlpha}`
  const hit = glowCache.get(key)
  if (hit) return hit
  const size = radius * 2
  const buf = new PixelBuffer(size, size)
  const [r, g, b] = hexToRgb(hex)
  const levels = 6
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius
      if (d >= 1) continue
      const I = Math.pow(1 - d, 1.7)
      const q = I * levels
      const li = Math.min(levels, Math.floor(q) + (q - Math.floor(q) > bayer(x, y) ? 1 : 0))
      if (!li) continue
      const a = Math.round((li / levels) * maxAlpha * 255)
      buf.px[y * size + x] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    }
  const c = buf.toCanvas()
  glowCache.set(key, c)
  return c
}

/* ------------------------------------------------------------------ */
/* Waterfall                                                           */
/* ------------------------------------------------------------------ */

export class Waterfall {
  readonly tex: HTMLCanvasElement
  private foam: HTMLCanvasElement
  private foamCtx: CanvasRenderingContext2D
  private foamT = 0
  readonly x: number
  readonly top: number
  readonly bottom: number
  readonly width: number

  constructor(x: number, top: number, bottom: number, width: number) {
    this.x = x
    this.top = top
    this.bottom = bottom
    this.width = width
    const th = 48
    const buf = new PixelBuffer(width, th)
    const ramp = PAL.waterfall.map((c) => c32(c))
    const r = rng(7)
    for (let cx = 0; cx < width; cx++) {
      const edge = Math.min(cx, width - 1 - cx) / (width / 2)
      const f1 = r.int(1, 3), f2 = r.int(2, 5), ph = r.range(0, 6.28), ph2 = r.range(0, 6.28)
      for (let y = 0; y < th; y++) {
        const s = Math.sin((y / th) * Math.PI * 2 * f1 + ph) * 0.5 + Math.sin((y / th) * Math.PI * 2 * f2 + ph2) * 0.3
        const v = 0.25 + edge * 0.35 + s * 0.3 + (cx % 3 === 0 ? 0.1 : 0)
        buf.px[y * width + cx] = ramp[ditherIndex(v, cx, y, ramp.length)]
      }
    }
    this.tex = buf.toCanvas()
    ;[this.foam, this.foamCtx] = makeCanvas(width + 22, 16)
  }

  /** sx, sy: screen position of the waterfall's top-left corner */
  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: number, dt: number) {
    const th = this.tex.height
    const len = this.bottom - this.top
    const off = Math.floor((t * 70) % th)
    for (let y = -off; y < len; y += th) {
      const y0 = Math.max(0, y)
      const h = Math.min(th - (y0 - y), len - y0)
      if (h > 0) ctx.drawImage(this.tex, 0, y0 - y, this.width, h, sx, sy + y0, this.width, h)
    }
    // curling lip at the top
    ctx.fillStyle = PAL.waterfall[3]
    ctx.fillRect(sx + 1, sy, this.width - 2, 1)
    ctx.fillStyle = PAL.waterfall[4]
    ctx.fillRect(sx + 3, sy + 1, this.width - 6, 1)
    // foam + mist at the base
    this.foamT += dt
    if (this.foamT > 0.07) {
      this.foamT = 0
      const f = this.foamCtx
      const fw = this.foam.width
      f.clearRect(0, 0, fw, 16)
      for (let i = 0; i < 90; i++) {
        const fx = Math.floor(fw / 2 + (Math.random() - 0.5) * (Math.random() * fw))
        const fy = Math.floor(16 - Math.pow(Math.random(), 1.8) * 15)
        f.fillStyle = Math.random() > 0.35 ? PAL.waterfall[4] : PAL.waterfall[2]
        f.fillRect(fx, fy, Math.random() > 0.7 ? 2 : 1, 1)
      }
    }
    ctx.drawImage(this.foam, sx - 11, sy + len - 12)
  }
}

/* ------------------------------------------------------------------ */
/* Lake                                                                */
/* ------------------------------------------------------------------ */

export interface WaterLight {
  x: number
  y: number
  strength: number
  color: string
}

export class Lake {
  private base: HTMLCanvasElement
  private refl: HTMLCanvasElement
  private reflCtx: CanvasRenderingContext2D
  private sparkles: { x: number; d: number; ph: number; sp: number; w: number }[] = []

  constructor(worldWidth: number) {
    const bw = 64, bh = 140
    const buf = new PixelBuffer(bw, bh)
    const ramp = PAL.water.map((c) => c32(c))
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const t = y / bh
        const v = 0.52 - t * 0.44 + Math.sin(x * 0.2 + y * 0.9) * 0.03
        buf.px[y * bw + x] = ramp[ditherIndex(v, x, y, 5)]
      }
    this.base = buf.toCanvas()
    ;[this.refl, this.reflCtx] = makeCanvas(8, 8)
    const r = rng(33)
    for (let i = 0; i < worldWidth / 7; i++)
      this.sparkles.push({ x: r.range(0, worldWidth), d: Math.floor(Math.pow(r.next(), 1.6) * 60) + 3, ph: r.range(0, 6.28), sp: r.range(0.6, 1.6), w: r.int(1, 4) })
  }

  draw(
    ctx: CanvasRenderingContext2D,
    o: {
      camX: number
      camY: number
      fbW: number
      fbH: number
      waterY: number
      t: number
      reflectSrc: Img
      lights: WaterLight[]
      moonX: number | null
      waterfall?: { x: number; w: number }
    },
  ) {
    const { camX, camY, fbW, fbH, waterY, t } = o
    const wl = Math.round(waterY - camY)
    if (wl >= fbH) return
    const rows = fbH - Math.max(0, wl)
    const start = Math.max(0, wl)
    // base gradient tiled horizontally
    const srcY0 = start - wl
    const baseH = Math.min(140 - srcY0, rows)
    if (baseH > 0)
      for (let x = -((camX | 0) % 64) - 64; x < fbW; x += 64) ctx.drawImage(this.base, 0, srcY0, 64, baseH, x, start, 64, baseH)
    if (rows > baseH) {
      ctx.fillStyle = PAL.water[0]
      ctx.fillRect(0, start + Math.max(0, baseH), fbW, rows - Math.max(0, baseH))
    }
    // reflection of the shore, rippled
    if (this.refl.width !== fbW || this.refl.height < rows) {
      this.refl.width = fbW
      this.refl.height = Math.max(rows, 8)
      this.reflCtx.imageSmoothingEnabled = false
    }
    const rc = this.reflCtx
    rc.globalCompositeOperation = 'source-over'
    rc.clearRect(0, 0, this.refl.width, this.refl.height)
    const phase = Math.floor(t * 5)
    for (let yy = start; yy < fbH; yy++) {
      const d = yy - wl
      const srcY = waterY - 1 - d
      if (srcY < 0) break
      if ((d + phase) % 6 === 0 && d > 2) continue
      const amp = Math.min(3, 0.5 + d * 0.07)
      const wob = Math.round(Math.sin(t * 1.8 + d * 0.5) * amp + Math.sin(t * 0.9 + d * 0.17) * 0.6)
      blitClipped(rc, o.reflectSrc, Math.floor(camX) + wob, srcY, fbW, 1, 0, yy - start)
    }
    rc.globalCompositeOperation = 'source-atop'
    rc.fillStyle = 'rgba(9,16,44,0.42)'
    rc.fillRect(0, 0, fbW, rows)
    ctx.globalAlpha = 0.72
    ctx.drawImage(this.refl, 0, 0, fbW, rows, 0, start, fbW, rows)
    ctx.globalAlpha = 1

    // sparkles
    for (const s of this.sparkles) {
      const sx = Math.round(s.x - camX)
      if (sx < -4 || sx > fbW) continue
      const b = Math.sin(t * s.sp + s.ph)
      if (b < 0.72) continue
      ctx.fillStyle = b > 0.93 ? PAL.water[6] : PAL.water[5]
      ctx.fillRect(sx, wl + s.d, s.w, 1)
    }

    // light streaks
    ctx.globalCompositeOperation = 'lighter'
    for (const L of o.lights) {
      const sx = L.x - camX
      if (sx < -20 || sx > fbW + 20) continue
      const dist = waterY - L.y
      const len = Math.max(10, 38 - dist * 0.2) * L.strength
      const cy = wl + Math.min(dist * 0.35, 22)
      const [r, g, b] = hexToRgb(L.color)
      for (let yy = Math.floor(cy - len * 0.35); yy < cy + len; yy++) {
        if (yy < start) continue
        const k = 1 - Math.abs(yy - cy) / len
        const wave = Math.sin(t * 3.2 + yy * 0.9)
        if (wave < -0.25) continue
        const w = Math.max(1, Math.round((1.5 + wave * 1.6 + k * 3) * L.strength))
        const a = 0.46 * k * L.strength
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
        ctx.fillRect(Math.round(sx - w / 2 + Math.sin(t * 1.3 + yy * 0.4)), yy, w, 1)
      }
    }
    if (o.moonX !== null) {
      for (let yy = start; yy < Math.min(fbH, wl + 70); yy += 2) {
        const k = 1 - (yy - wl) / 70
        const w = Math.max(1, Math.round(1 + k * 2 + Math.sin(t * 2 + yy) * 1.2))
        ctx.fillStyle = `rgba(150,165,230,${(0.18 * k).toFixed(3)})`
        ctx.fillRect(Math.round(o.moonX - w / 2 + Math.sin(t + yy * 0.3)), yy, w, 1)
      }
    }
    if (o.waterfall) {
      const sx = Math.round(o.waterfall.x - camX)
      for (let yy = start; yy < Math.min(fbH, wl + 26); yy++) {
        if ((yy + phase) % 3 === 0) continue
        const k = 1 - (yy - wl) / 26
        ctx.fillStyle = `rgba(120,150,210,${(0.22 * k).toFixed(3)})`
        ctx.fillRect(sx + Math.round(Math.sin(t * 2 + yy) * 2), yy, o.waterfall.w, 1)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

/** The far lake band: rows of the layers above are mirrored with a gentle ripple. */
export function drawFarLake(
  ctx: CanvasRenderingContext2D,
  base: HTMLCanvasElement,
  sx: number,
  sy: number,
  fbW: number,
  t: number,
  sources: { img: Img; sx: number; bottomRow: number }[],
) {
  const h = base.height
  blitClipped(ctx, base, -sx, 0, fbW, h, 0, sy)
  ctx.globalAlpha = 0.34
  for (let d = 0; d < h - 2; d++) {
    if ((d + Math.floor(t * 3)) % 5 === 0) continue
    const wob = Math.round(Math.sin(t * 1.2 + d * 0.7) * Math.min(2, d * 0.15))
    for (const s of sources) {
      const row = s.bottomRow - d - 1
      if (row < 0) continue
      blitClipped(ctx, s.img, s.sx + wob, row, fbW, 1, 0, sy + d + 1)
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(8,14,40,0.35)'
  ctx.fillRect(0, sy, fbW, h)
}

/* ------------------------------------------------------------------ */
/* Particles                                                           */
/* ------------------------------------------------------------------ */

interface P {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
}

export class Embers {
  private ps: P[] = []
  private acc = 0
  update(dt: number, x: number, y: number) {
    this.acc += dt
    if (this.acc > 0.22 && this.ps.length < 9) {
      this.acc = 0
      this.ps.push({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 10, life: 0, max: 1.2 + Math.random() * 1.2, size: 1 })
    }
    for (const p of this.ps) {
      p.life += dt
      p.x += (p.vx + Math.sin(p.life * 5 + p.max * 10) * 6) * dt
      p.y += p.vy * dt
    }
    this.ps = this.ps.filter((p) => p.life < p.max)
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const p of this.ps) {
      const k = 1 - p.life / p.max
      ctx.fillStyle = k > 0.6 ? PAL.fire[7] : k > 0.3 ? PAL.fire[6] : PAL.fire[4]
      ctx.globalAlpha = Math.min(1, k * 1.6)
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 1, 1)
    }
    ctx.globalAlpha = 1
  }
}

export class Smoke {
  private ps: P[] = []
  private acc = 0
  update(dt: number, x: number, y: number) {
    this.acc += dt
    if (this.acc > 0.55 && this.ps.length < 12) {
      this.acc = 0
      this.ps.push({ x, y, vx: 3 + Math.random() * 2, vy: -6 - Math.random() * 2, life: 0, max: 4 + Math.random() * 2, size: 1 })
    }
    for (const p of this.ps) {
      p.life += dt
      p.x += (p.vx + Math.sin(p.life * 1.3) * 2) * dt
      p.y += p.vy * dt
      p.size = 1 + Math.floor(p.life / 1.4)
    }
    this.ps = this.ps.filter((p) => p.life < p.max)
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const p of this.ps) {
      const k = 1 - p.life / p.max
      ctx.fillStyle = `rgba(70,80,112,${(0.45 * k).toFixed(3)})`
      const s = p.size
      ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - camY - s / 2), s, s)
    }
  }
}

export class Fireflies {
  private flies: { x: number; y: number; ax: number; ay: number; fx: number; fy: number; ph: number; blink: number }[] = []
  constructor(spots: [number, number, number][]) {
    const r = rng(5)
    for (const [x, y, n] of spots)
      for (let i = 0; i < n; i++)
        this.flies.push({ x: x + r.range(-20, 20), y: y + r.range(-8, 8), ax: r.range(6, 16), ay: r.range(3, 8), fx: r.range(0.15, 0.4), fy: r.range(0.2, 0.5), ph: r.range(0, 6.28), blink: r.range(0.5, 1.1) })
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    for (const f of this.flies) {
      const b = Math.sin(t * f.blink + f.ph)
      if (b < 0.2) continue
      const x = Math.round(f.x + Math.sin(t * f.fx + f.ph) * f.ax - camX)
      const y = Math.round(f.y + Math.sin(t * f.fy + f.ph * 2) * f.ay - camY)
      ctx.globalAlpha = Math.min(1, (b - 0.2) * 1.6)
      ctx.fillStyle = 'rgba(215,240,140,0.28)'
      ctx.fillRect(x - 1, y, 3, 1)
      ctx.fillRect(x, y - 1, 1, 3)
      ctx.fillStyle = '#e4f5a0'
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.globalAlpha = 1
  }
}
