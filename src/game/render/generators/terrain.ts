/**
 * Bakes the main ground layer into three world-sized canvases:
 *   back    – ground behind the path, the shore bank and the waterfall cliff
 *   front   – the walkable path, cliff faces, boardwalk, bridge, stairs, rocks
 *   overlay – bits drawn in front of the player (bridge rail, tall grass)
 */
import { WORLD } from '../../config'
import { pathBottom, pathDepth, pathTop, STAIR_STEPS, SURFACES } from '../../world/terrain'
import { PAL } from '../palette'
import { bayer, c32, ditherIndex, hash1, makeCanvas, PixelBuffer, rng, valueNoise } from '../pixel'
import { boulder } from '../sprites/objects'
import { bush } from './trees'

export const TERRAIN_H = 286

const inR = (x: number, r: readonly [number, number]) => x >= r[0] && x <= r[1]

export function wallTop(x: number, n: (x: number, y: number) => number) {
  const [w0, w1] = SURFACES.cliffWall
  if (x < w0 || x > w1) return Infinity
  if (x < 1906) return 206 - (206 - 122) * Math.pow((x - w0) / 26, 0.55)
  if (x < 2240) {
    let y = 120 + Math.round((n(x * 0.05, 3) - 0.5) * 8)
    if (x > 1984 && x < 2026) y = Math.max(y, 123)
    return y
  }
  const t = (x - 2240) / (w1 - 2240)
  return 120 + (133 - 120) * t * t
}

export interface TerrainLayers {
  back: HTMLCanvasElement
  front: HTMLCanvasElement
  overlay: HTMLCanvasElement
  reflect: HTMLCanvasElement
}

export function buildTerrain(): TerrainLayers {
  const W = WORLD.width, H = TERRAIN_H, WL = WORLD.waterY
  const back = new PixelBuffer(W, H)
  const front = new PixelBuffer(W, H)
  const overlay = new PixelBuffer(W, H)
  const n1 = valueNoise(11), n2 = valueNoise(23), n3 = valueNoise(37)
  const r = rng(99)
  const G = PAL.grass.map((c) => c32(c))
  const D = PAL.dirt.map((c) => c32(c))
  const R = PAL.rock.map((c) => c32(c))
  const M = PAL.moss.map((c) => c32(c))
  const Wd = PAL.wood.map((c) => c32(c))
  const OUT = c32(PAL.outline)

  /** Cellular "boulder" texture: stones lit from the upper right with dark cracks between them. */
  const rockAt = (x: number, y: number, faceTop: number, cw = 11, ch = 7) => {
    const gx = Math.floor(x / cw), gy = Math.floor(y / ch)
    let d1 = 1e9, d2 = 1e9, fx = 0, fy = 0, id = 0
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const cx = gx + i, cy = gy + j
        const k = cx * 7919 + cy * 104729
        const px = (cx + 0.15 + hash1(k, 1) * 0.7) * cw
        const py = (cy + 0.15 + hash1(k, 2) * 0.7) * ch
        const dx = (x - px) / cw, dy = (y - py) / ch
        const d = dx * dx + dy * dy
        if (d < d1) { d2 = d1; d1 = d; fx = dx; fy = dy; id = k }
        else if (d < d2) d2 = d
      }
    const edge = Math.sqrt(d2) - Math.sqrt(d1)
    let light = 0.3 + hash1(id, 3) * 0.2 - fy * 0.5 + fx * 0.16 + (n3(x * 0.35, y * 0.35) - 0.5) * 0.16
    light -= (y - faceTop) * 0.0045
    if (edge < 0.07) return R[0]
    if (edge < 0.14) light -= 0.14
    if (fy < -0.22 && edge > 0.12 && n2(x * 0.08, y * 0.08) > 0.6) return M[ditherIndex(light + 0.15, x, y, M.length)]
    return R[ditherIndex(light, x, y, R.length)]
  }

  /* ---------------- back layer ---------------- */
  for (let x = 0; x < W; x++) {
    const top = Math.floor(pathTop(x))
    const wt = wallTop(x, n1)
    if (wt < Infinity) {
      const wtop = Math.floor(wt)
      for (let y = wtop; y < WL + 2; y++) {
        let col = rockAt(x, y, wtop - 30, 21, 13)
        if (y - wtop < 2) col = G[3 + (y - wtop === 0 ? 1 : 0)]
        if (x > 1986 && x < 2024 && y > wtop + 1) col = R[ditherIndex(0.12 + n3(x * 0.3, y * 0.2) * 0.2, x, y, R.length)]
        back.set(x, y, col)
      }
      // grass fringe and drips on the lip
      if (hash1(x, 41) > 0.55) back.set(x, wtop - 1, G[4])
      if (hash1(x, 42) > 0.8) back.vline(x, wtop + 2, wtop + 2 + Math.floor(hash1(x, 43) * 4), G[2])
      continue
    }
    if (x > 880 && x < 1400) {
      // grassy shore bank behind the boardwalk
      const edge = Math.min(1, Math.min(x - 880, 1400 - x) / 40)
      const bankTop = Math.round(212 - 9 * edge - n1(x * 0.08, 2) * 4)
      for (let y = bankTop; y < WL + 3; y++) {
        const d = (y - bankTop) / (WL - bankTop)
        let col: number
        const edgeN = 0.42 + n2(x * 0.06, 1) * 0.25
        if (d < edgeN) col = G[ditherIndex(0.18 + (1 - d) * 0.3 + (n3(x * 0.2, y * 0.2) - 0.5) * 0.3, x, y, 4)]
        else if (d < edgeN + 0.08) col = D[ditherIndex(0.25 + (n3(x * 0.3, y * 0.3) - 0.5) * 0.4, x, y, 3)]
        else col = rockAt(x, y, bankTop, 13, 8)
        if (y > WL - 4) col = R[ditherIndex(0.1, x, y, 3)]
        back.set(x, y, col)
      }
      continue
    }
    const stripTop = top - 9 - Math.round(n1(x * 0.1, 0) * 4)
    for (let y = stripTop; y <= top; y++) {
      const t = (y - stripTop) / Math.max(1, top - stripTop)
      back.set(x, y, G[ditherIndex(0.12 + t * 0.3 + (n2(x * 0.2, y * 0.2) - 0.5) * 0.28, x, y, 4)])
    }
    if (hash1(x, 7) > 0.7) back.vline(x, stripTop - 1 - Math.floor(hash1(x, 8) * 2), stripTop - 1, G[2])
  }

  /* ---------------- front layer: path surface ---------------- */
  const [bw0, bw1] = SURFACES.boardwalk
  const [br0, br1] = SURFACES.bridge
  const [st0, st1] = SURFACES.stairs
  const [cr0, cr1] = SURFACES.creek
  const stepW = (st1 - st0) / STAIR_STEPS

  const pathHalf = (x: number) => {
    let h = 0.2 + 0.05 * Math.sin(x * 0.023 + 1)
    if (x > 230 && x < 720) h += 0.18 * Math.min(1, Math.min(x - 230, 720 - x) / 60)
    if (x > 1500 && x < 1720) h += 0.12 * Math.min(1, Math.min(x - 1500, 1720 - x) / 40)
    if (x > 2300 && x < 2480) h += 0.12 * Math.min(1, Math.min(x - 2300, 2480 - x) / 40)
    return h
  }

  for (let x = 0; x < W; x++) {
    const b = Math.floor(pathBottom(x))
    const depth = pathDepth(x)
    const top = Math.floor(b - depth)

    if (inR(x, [bw0, bw1]) || inR(x, [br0, br1])) {
      // plank deck
      const board = inR(x, [bw0, bw1])
      const off = board ? bw0 : br0
      const gap = (x - off) % 5 === 0
      for (let y = top; y <= b; y++) {
        const f = (b - y) / depth
        const v = gap ? 0.1 : 0.55 - f * 0.25 + (hash1(Math.floor((x - off) / 5) * 13, 2) - 0.5) * 0.25 + (n3(x * 0.4, y * 0.8) - 0.5) * 0.2
        front.set(x, y, Wd[ditherIndex(v, x, y, 6)])
      }
      front.set(x, b + 1, Wd[5])
      front.set(x, b + 2, Wd[3])
      front.set(x, b + 3, Wd[2])
      front.set(x, b + 4, OUT)
      continue
    }

    if (inR(x, [st0, st1])) {
      // wooden steps: tread + stringer
      const s = Math.floor((x - st0) / stepW)
      const edgeX = (x - st0) - s * stepW < 1
      for (let y = top; y <= b; y++) {
        const f = (b - y) / depth
        const v = edgeX ? 0.08 : 0.58 - f * 0.28 + (n3(x * 0.5, y * 0.9) - 0.5) * 0.2
        front.set(x, y, Wd[ditherIndex(v, x, y, 6)])
      }
      front.set(x, b + 1, Wd[5])
      for (let y = b + 2; y < b + 6; y++) front.set(x, y, Wd[y === b + 5 ? 1 : 2])
      front.set(x, b + 6, OUT)
      // the rock face continues beneath the stairs
      for (let y = b + 7; y < WL + 2; y++) front.set(x, y, rockAt(x, y, b, 19, 12))
      continue
    }

    if (inR(x, [cr0 + 1, cr1 - 1])) continue

    const slope = inR(x, SURFACES.slopeDown) || inR(x, SURFACES.slopeUp)
    const pc = 0.5 + 0.12 * Math.sin(x * 0.011)
    const ph = pathHalf(x)
    for (let y = top; y <= b; y++) {
      const f = (b - y) / depth
      const inPath = Math.abs(f - pc) < ph + (n1(x * 0.15, y * 0.3) - 0.5) * 0.14
      let col: number
      if (inPath || slope) {
        let v = 0.42 + (n2(x * 0.25, y * 0.4) - 0.5) * 0.35 - f * 0.18
        if (slope && (x % 9 === 0)) v = 0.05
        else if (slope && x % 9 === 1) v = 0.8
        col = D[ditherIndex(v, x, y, D.length)]
        if (!slope && hash1(x * 977 + y * 31, 3) > 0.985) col = c32('#5c5462')
      } else {
        const v = 0.22 + (1 - f) * 0.34 + (n3(x * 0.3, y * 0.3) - 0.5) * 0.3
        col = G[ditherIndex(v, x, y, 5)]
      }
      if (y === b) col = G[4 + (bayer(x, 0) > 0.6 ? 1 : 0)]
      front.set(x, y, col)
    }

    // cliff / bank face below the path
    const faceBottom = WL + 1 + Math.round(hash1(x, 13) * 2)
    const drip = hash1(x, 19) > 0.78 ? 1 + Math.floor(hash1(x, 20) * 3) : 0
    const soil = 4 + Math.round(n2(x * 0.1, 5) * 3)
    for (let y = b + 1; y <= faceBottom; y++) {
      const d = y - b
      let col: number
      if (d <= 2 + drip) col = G[d === 1 ? 3 : 2]
      else if (d <= soil) col = D[ditherIndex(0.2 + (n3(x * 0.3, y * 0.4) - 0.5) * 0.4, x, y, 3)]
      else col = x > 2270 ? rockAt(x, y, b, 20, 12) : rockAt(x, y, b)
      if (y >= WL - 2) col = R[ditherIndex(0.08 + (n1(x * 0.3, 1) * 0.15), x, y, 3)]
      front.set(x, y, col)
    }
    // roots poking out of the soil
    if (hash1(x, 30) > 0.93) front.line(x, b + soil - 1, x + 1, b + soil + 2, D[3])
  }

  /* ---------------- details ---------------- */
  const flowerCols = ['#8fa3d6', '#d9d0bc', '#b59ad0'].map((c) => c32(c))
  for (let x = 0; x < W; x++) {
    if (inR(x, [bw0, bw1]) || inR(x, [br0, br1]) || inR(x, [st0, st1]) || inR(x, [cr0, cr1])) continue
    const b = Math.floor(pathBottom(x))
    const top = Math.floor(pathTop(x))
    // tufts on the front lip (some in the overlay so they overlap feet)
    if (hash1(x, 51) > 0.72) {
      const hgt = 1 + Math.floor(hash1(x, 52) * 3)
      const target = hash1(x, 53) > 0.7 ? overlay : front
      for (let i = 0; i < hgt; i++) target.set(x, b - 1 - i, G[i === hgt - 1 ? 5 : 4])
    }
    // tufts at the back edge
    if (hash1(x, 54) > 0.75) for (let i = 0; i < 2; i++) front.set(x, top - i, G[3 + i])
    // flowers in the grass
    if (hash1(x, 60) > 0.975) {
      const fy = top + 2 + Math.floor(hash1(x, 61) * (b - top - 4))
      front.set(x, fy, flowerCols[Math.floor(hash1(x, 62) * 3)])
      front.set(x, fy + 1, G[3])
    }
  }

  /* ---------------- boardwalk + bridge structure ---------------- */
  // boardwalk support posts into the lake
  for (let x = bw0 + 6; x < bw1; x += 22) {
    front.rect(x, 260, 2, 8, Wd[2])
    front.vline(x + 1, 260, 267, Wd[3])
    front.vline(x - 1, 260, 267, OUT)
    front.vline(x + 2, 260, 267, OUT)
  }
  // boardwalk back rail
  for (let x = bw0 + 2; x < bw1; x += 44) {
    front.rect(x, 236, 2, 8, Wd[3])
    front.vline(x + 1, 236, 243, Wd[4])
  }
  for (let x = bw0 + 2; x < bw1 - 2; x++) {
    const t = ((x - bw0 - 2) % 44) / 44
    front.set(x, Math.round(238 + Math.sin(t * Math.PI) * 2), c32(PAL.rope))
  }
  // bridge posts, knee braces, rails
  const bTop = Math.floor(pathTop(2000)), bBot = Math.floor(pathBottom(2000))
  for (const px of [br0, br1 - 2]) {
    front.rect(px, bTop - 10, 3, WL + 6 - (bTop - 10), Wd[2])
    front.vline(px + 2, bTop - 10, WL + 5, Wd[4])
  }
  front.line(br0 + 3, 252, br0 + 13, bBot + 4, Wd[2])
  front.line(br1 - 3, 252, br1 - 13, bBot + 4, Wd[2])
  const railPosts = [br0 + 1, 1978, 2000, 2022, br1 - 1]
  for (const px of railPosts) {
    front.rect(px, bTop - 9, 2, 9, Wd[3])
    overlay.rect(px, bBot - 10, 2, 11, Wd[3])
    overlay.vline(px + 1, bBot - 10, bBot, Wd[4])
  }
  for (let i = 0; i < railPosts.length - 1; i++) {
    const a = railPosts[i], z = railPosts[i + 1]
    for (let x = a; x <= z; x++) {
      const t = (x - a) / (z - a)
      front.set(x, Math.round(bTop - 7 + Math.sin(t * Math.PI) * 2), c32(PAL.rope))
      overlay.set(x, Math.round(bBot - 8 + Math.sin(t * Math.PI) * 2.5), c32(PAL.rope))
    }
  }
  overlay.outline(OUT)

  const backC = back.toCanvas()
  const frontC = front.toCanvas()
  const overlayC = overlay.toCanvas()
  const bctx = backC.getContext('2d')!
  const fctx = frontC.getContext('2d')!

  // bushes on the cliff lip and along the back strip
  for (let x = 1890; x < 2290; x += r.range(8, 22)) {
    const y = wallTop(x, n1)
    const img = bush(r.int(8, 16), r.int(5, 9), r.int(1, 1e6))
    bctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 3))
  }

  // shoreline rocks
  let x = 20
  while (x < W) {
    const step = r.range(10, 34)
    const inCreek = inR(x, [cr0 - 4, cr1 + 4])
    const underBoard = inR(x, [bw0 - 4, bw1 + 4])
    if (!inCreek) {
      const tall = x > 2112
      const w = Math.round(r.range(6, tall ? 22 : 15))
      const h = Math.round(r.range(4, tall ? 10 : 8))
      const img = boulder(w, h, r.int(1, 1e6), true)
      const ctx = underBoard ? bctx : fctx
      ctx.drawImage(img, Math.round(x - w / 2), WL + 5 - img.height + r.int(0, 2))
    }
    x += step
  }
  // a few larger rocks resting on the path's back edge
  for (const [rx, rw, rh] of [[150, 16, 10], [770, 14, 8], [1450, 18, 11], [1880, 22, 14], [2520, 18, 12]] as const) {
    const img = boulder(rw, rh, rx, false)
    fctx.drawImage(img, Math.round(rx - rw / 2), Math.round(pathTop(rx) - rh + 4))
  }

  // tall cliff under the cabin: ledges, vines and moss
  for (let lx = 2140; lx < W; lx += r.range(14, 36)) {
    const b = pathBottom(lx)
    const ly = Math.round(b + r.range(18, WL - b - 12))
    const len = r.int(6, 16)
    fctx.fillStyle = PAL.moss[1]
    fctx.fillRect(lx, ly, len, 1)
    fctx.fillStyle = PAL.grass[3]
    for (let i = 0; i < len; i += 2) fctx.fillRect(lx + i, ly - 1, 1, 1)
  }
  fctx.fillStyle = PAL.moss[0]
  for (let vx = 2150; vx < W; vx += r.range(6, 20)) {
    const b = pathBottom(vx)
    const len = r.int(4, 22)
    for (let i = 0; i < len; i++) fctx.fillRect(vx + (i % 5 === 4 ? 1 : 0), Math.round(b + 3 + i), 1, 1)
  }

  const [rc, rctx] = makeCanvas(W, H)
  rctx.drawImage(backC, 0, 0)
  rctx.drawImage(frontC, 0, 0)
  return { back: backC, front: frontC, overlay: overlayC, reflect: rc }
}
