/**
 * Low-level pixel-art helpers shared by every generator.
 * Everything here works on tiny, un-smoothed canvases that are later
 * upscaled with nearest-neighbour sampling.
 */

export type Img = HTMLCanvasElement | HTMLImageElement

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  const ctx = c.getContext('2d', { willReadFrequently: false })!
  ctx.imageSmoothingEnabled = false
  return [c, ctx]
}

/** Deterministic PRNG (mulberry32) so the world looks identical on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  }
}
export type Rng = ReturnType<typeof rng>

/** 4x4 ordered-dither (Bayer) threshold in [0,1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
export const bayer = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)]

/** Pick an index into a colour ramp using a dithered value in [0,1]. */
export function ditherIndex(v: number, x: number, y: number, steps: number) {
  const f = Math.max(0, Math.min(0.9999, v)) * (steps - 1)
  const i = Math.floor(f)
  return Math.min(steps - 1, i + (f - i > bayer(x, y) ? 1 : 0))
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/** Packs a colour into a little-endian ABGR uint32 for ImageData buffers. */
export function c32(hex: string, alpha = 255) {
  const [r, g, b] = hexToRgb(hex)
  return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0
}

/**
 * A fast per-pixel drawing surface backed by a Uint32Array.
 * Used for all large procedural textures (terrain, mountains, trees).
 */
export class PixelBuffer {
  readonly w: number
  readonly h: number
  readonly img: ImageData
  readonly px: Uint32Array

  constructor(w: number, h: number) {
    this.w = Math.ceil(w)
    this.h = Math.ceil(h)
    this.img = new ImageData(this.w, this.h)
    this.px = new Uint32Array(this.img.data.buffer)
  }

  set(x: number, y: number, col: number) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = col
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.px[(y | 0) * this.w + (x | 0)]
  }

  filled(x: number, y: number) {
    return (this.get(x, y) >>> 24) > 0
  }

  rect(x: number, y: number, w: number, h: number, col: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, col)
  }

  hline(x0: number, x1: number, y: number, col: number) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, col)
  }

  vline(x: number, y0: number, y1: number, col: number) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, col)
  }

  line(x0: number, y0: number, x1: number, y1: number, col: number) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.set(x0, y0, col)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
  }

  disc(cx: number, cy: number, r: number, col: number) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) this.set(cx + x, cy + y, col)
  }

  /** Adds a 1px outline around every opaque pixel (classic sprite outline). */
  outline(col: number, diagonal = false) {
    const copy = new Uint32Array(this.px)
    const at = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && copy[y * this.w + x] >>> 24 > 0
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (at(x, y)) continue
        const n = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)
        const d = diagonal && (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1))
        if (n || d) this.px[y * this.w + x] = col
      }
  }

  toCanvas(): HTMLCanvasElement {
    const [c, ctx] = makeCanvas(this.w, this.h)
    ctx.putImageData(this.img, 0, 0)
    return c
  }
}

/** Palette map for ASCII sprites. '.' and ' ' are always transparent. */
export type GridPalette = Record<string, string>

/**
 * Builds a sprite from hand-authored ASCII rows.
 * `outline` adds the dark silhouette line automatically so the grids stay readable.
 */
export function gridToBuffer(rows: string[], pal: GridPalette, pad = 0): PixelBuffer {
  const w = Math.max(...rows.map((r) => r.length))
  const buf = new PixelBuffer(w + pad * 2, rows.length + pad * 2)
  const cache: Record<string, number> = {}
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.' || ch === ' ') continue
      const hex = pal[ch]
      if (!hex) continue
      cache[ch] ??= c32(hex)
      buf.set(x + pad, y + pad, cache[ch])
    }
  })
  return buf
}

export function spriteFromGrid(rows: string[], pal: GridPalette, outline?: string): HTMLCanvasElement {
  const buf = gridToBuffer(rows, pal, outline ? 1 : 0)
  if (outline) buf.outline(c32(outline))
  return buf.toCanvas()
}

export function flipH(src: Img): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height)
  ctx.translate(src.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0)
  return c
}

/** Recolours every opaque pixel of a sprite (used for silhouettes). */
export function silhouette(src: Img, hex: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height)
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

/* ------------------------------------------------------------------ */
/* Noise                                                               */
/* ------------------------------------------------------------------ */

function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function hash1(x: number, seed = 0) {
  return hash2(x | 0, 0, seed)
}

/** Smooth 2D value noise in [0,1]. */
export function valueNoise(seed: number) {
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed)
    const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

export function fbm(noise: (x: number, y: number) => number, x: number, y: number, oct = 3) {
  let amp = 0.5, f = 1, sum = 0, norm = 0
  for (let i = 0; i < oct; i++) {
    sum += noise(x * f, y * f) * amp
    norm += amp
    amp *= 0.5
    f *= 2
  }
  return sum / norm
}

/** Draws a sub-rectangle of a large canvas, clipping the source safely. */
export function blitClipped(
  ctx: CanvasRenderingContext2D,
  src: Img,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dx: number,
  dy: number,
) {
  let x0 = sx, y0 = sy, x1 = sx + w, y1 = sy + h
  if (x0 < 0) { dx -= x0; x0 = 0 }
  if (y0 < 0) { dy -= y0; y0 = 0 }
  x1 = Math.min(x1, src.width)
  y1 = Math.min(y1, src.height)
  const cw = x1 - x0, ch = y1 - y0
  if (cw <= 0 || ch <= 0) return
  ctx.drawImage(src, x0, y0, cw, ch, dx, dy, cw, ch)
}
