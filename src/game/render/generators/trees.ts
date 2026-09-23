/**
 * Procedural pine / broadleaf trees. Each pine is built tier by tier with
 * jagged, drooping edges and moonlight coming from the right, then optionally
 * baked into a few sway frames (rows near the tip shift by a pixel).
 */
import { PAL } from '../palette'
import { bayer, c32, hash1, PixelBuffer, rng, valueNoise } from '../pixel'

export interface TreeOpts {
  ramp: string[]
  trunk?: string[]
  outline?: string | null
  sway?: boolean
  seed: number
  /** 0..1 how strongly the moonlit side is highlighted */
  rim?: number
  width?: number
}

function shiftRows(src: PixelBuffer, amp: number): PixelBuffer {
  const out = new PixelBuffer(src.w, src.h)
  for (let y = 0; y < src.h; y++) {
    const t = 1 - y / src.h
    const off = Math.round(amp * Math.max(0, t - 0.35) * 1.6)
    for (let x = 0; x < src.w; x++) {
      const v = src.px[y * src.w + x]
      if (v >>> 24) out.set(x + off, y, v)
    }
  }
  return out
}

export function pineBuffer(h: number, o: TreeOpts): PixelBuffer {
  const r = rng(o.seed)
  const w = o.width ?? (Math.round(h * 0.58) | 1) + 4
  const cx = Math.floor(w / 2)
  const buf = new PixelBuffer(w, h)
  const ramp = o.ramp.map((c) => c32(c))
  const trunk = (o.trunk ?? PAL.trunk).map((c) => c32(c))
  const noise = valueNoise(o.seed * 7 + 3)
  const rim = o.rim ?? 0.6

  // trunk
  const tw = h > 70 ? 3 : h > 26 ? 2 : 1
  for (let y = Math.floor(h * 0.55); y < h; y++)
    for (let i = 0; i < tw; i++) {
      const x = cx - Math.floor(tw / 2) + i
      buf.set(x, y, trunk[i === tw - 1 && tw > 1 ? 2 : 1])
    }
  if (h > 40) {
    buf.set(cx - 2, h - 1, trunk[0])
    buf.set(cx + 2, h - 1, trunk[1])
  }

  const tiers = Math.max(3, Math.min(10, Math.round(h / 10)))
  const foliageH = h * (h > 30 ? 0.86 : 0.92)
  const maxHalf = (w - 2) / 2
  // draw from the bottom tier up so upper tiers overlap lower ones
  for (let i = tiers - 1; i >= 0; i--) {
    const yTop = Math.round((i * foliageH) / (tiers + 0.6))
    const tierH = Math.round((foliageH / tiers) * 1.75)
    const yBot = Math.min(Math.floor(foliageH), yTop + tierH)
    const half = maxHalf * (0.22 + 0.78 * Math.pow((i + 1) / tiers, 0.9)) * r.range(0.86, 1.04)
    for (let y = yTop; y <= yBot; y++) {
      const f = (y - yTop) / Math.max(1, yBot - yTop)
      let hw = half * (0.12 + 0.88 * Math.pow(f, 0.85))
      hw += (hash1(y * 31 + i * 7, o.seed) - 0.5) * 1.8
      const droop = f > 0.82 ? Math.round((hash1(y + i, o.seed + 1) - 0.4) * 2) : 0
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const rel = (x - cx) / Math.max(1, hw)
        if (Math.abs(rel) > 1) continue
        // underside of each tier is darker; right side is moonlit
        let light = 0.36 + rel * 0.3 * rim + (1 - f) * 0.12 - (f > 0.78 ? 0.22 : 0)
        light += (noise(x * 0.45, y * 0.45) - 0.5) * 0.35
        if (y < h * 0.12) light += 0.1
        const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(light * ramp.length + (bayer(x, y) - 0.5) * 1.2)))
        buf.set(x, y + (Math.abs(rel) > 0.85 ? droop : 0), ramp[idx])
      }
    }
  }
  // tip
  buf.set(cx, 0, ramp[Math.min(ramp.length - 1, 3)])
  if (o.outline !== null) buf.outline(c32(o.outline ?? PAL.outline))
  return buf
}

export function pineFrames(h: number, o: TreeOpts): HTMLCanvasElement[] {
  const base = pineBuffer(h, { ...o, outline: null })
  const out = o.outline !== null ? c32(o.outline ?? PAL.outline) : 0
  const make = (b: PixelBuffer) => {
    if (o.outline !== null) b.outline(out)
    return b.toCanvas()
  }
  if (!o.sway) return [make(base)]
  return [make(shiftRows(base, -1)), make(shiftRows(base, 0)), make(shiftRows(base, 1)), make(shiftRows(base, 0))]
}

/** Broadleaf tree built from overlapping, sphere-shaded leaf clumps. */
export function broadleafFrames(h: number, seed: number, sway = true): HTMLCanvasElement[] {
  const r = rng(seed)
  const w = Math.round(h * 0.95)
  const buf = new PixelBuffer(w, h)
  const leaf = PAL.leafy.map((c) => c32(c))
  const trunk = PAL.trunk.map((c) => c32(c))
  const noise = valueNoise(seed + 11)
  const cx = w / 2
  // trunk and two branches
  for (let y = Math.floor(h * 0.45); y < h; y++) {
    const spread = y > h - 3 ? 2 : 0
    for (let x = Math.floor(cx - 2 - spread); x <= Math.ceil(cx + 1 + spread); x++) buf.set(x, y, trunk[x > cx ? 2 : 1])
  }
  buf.line(Math.round(cx), Math.round(h * 0.6), Math.round(cx - w * 0.22), Math.round(h * 0.38), trunk[1])
  buf.line(Math.round(cx), Math.round(h * 0.55), Math.round(cx + w * 0.2), Math.round(h * 0.36), trunk[2])
  const clumps: [number, number, number][] = []
  const n = 7 + Math.floor(h / 12)
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2)
    const d = r.range(0, 0.34)
    clumps.push([cx + Math.cos(a) * w * d, h * 0.34 + Math.sin(a) * h * d * 0.7, r.range(h * 0.14, h * 0.22)])
  }
  clumps.sort((a, b) => a[1] - b[1])
  for (const [bx, by, br] of clumps)
    for (let y = Math.floor(by - br); y <= by + br; y++)
      for (let x = Math.floor(bx - br); x <= bx + br; x++) {
        const dx = (x - bx) / br, dy = (y - by) / br
        const d2 = dx * dx + dy * dy + (noise(x * 0.4, y * 0.4) - 0.5) * 0.45
        if (d2 > 1) continue
        const light = 0.45 + dx * 0.28 - dy * 0.3 + (noise(x * 0.6 + 5, y * 0.6) - 0.5) * 0.4
        const idx = Math.max(0, Math.min(leaf.length - 1, Math.floor(light * leaf.length + (bayer(x, y) - 0.5))))
        buf.set(x, y, leaf[idx])
      }
  const frames = sway ? [shiftRows(buf, -1), buf, shiftRows(buf, 1), buf] : [buf]
  return frames.map((b) => {
    const copy = new PixelBuffer(b.w, b.h)
    copy.px.set(b.px)
    copy.outline(c32(PAL.outline))
    return copy.toCanvas()
  })
}

export function bush(w: number, h: number, seed: number, ramp = PAL.leafy): HTMLCanvasElement {
  const buf = new PixelBuffer(w, h)
  const leaf = ramp.map((c) => c32(c))
  const noise = valueNoise(seed)
  const r = rng(seed)
  const blobs = 3 + Math.floor(w / 8)
  for (let i = 0; i < blobs; i++) {
    const bx = r.range(w * 0.2, w * 0.8), br = r.range(h * 0.45, h * 0.7)
    const by = h - br * 0.8
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x - bx) / br, dy = (y - by) / br
        if (dx * dx + dy * dy + (noise(x * 0.5, y * 0.5) - 0.5) * 0.5 > 1) continue
        const light = 0.42 + dx * 0.25 - dy * 0.3 + (noise(x * 0.7 + 3, y * 0.7) - 0.5) * 0.4
        buf.set(x, y, leaf[Math.max(0, Math.min(leaf.length - 1, Math.floor(light * leaf.length + (bayer(x, y) - 0.5))))])
      }
  }
  buf.outline(c32(PAL.outline))
  return buf.toCanvas()
}
