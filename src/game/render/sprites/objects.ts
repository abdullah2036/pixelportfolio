/**
 * Campsite props. Small props are ASCII grids; larger structures are drawn
 * procedurally into pixel buffers so they keep a consistent hand-shaded look.
 * Every builder returns plain canvases so they can be swapped for PNGs later.
 */
import { drawPixelText, measureText } from '../font'
import { PAL } from '../palette'
import { bayer, c32, gridToBuffer, hash1, makeCanvas, PixelBuffer, rng, valueNoise, type GridPalette } from '../pixel'

const cache = new Map<string, number>()
const C = (hex: string, a = 255) => {
  const k = hex + a
  let v = cache.get(k)
  if (v === undefined) cache.set(k, (v = c32(hex, a)))
  return v
}
const OUT = () => C(PAL.outline)

function grid(rows: string[], pal: GridPalette, outline = true) {
  const buf = gridToBuffer(rows, pal, outline ? 1 : 0)
  if (outline) buf.outline(OUT())
  return buf.toCanvas()
}

type Pt = [number, number]
function edge(a: Pt, b: Pt, p: Pt) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
}
function inTri(p: Pt, a: Pt, b: Pt, c: Pt) {
  const d1 = edge(a, b, p), d2 = edge(b, c, p), d3 = edge(c, a, p)
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

/* ------------------------------------------------------------------ */
/* Small grid props                                                    */
/* ------------------------------------------------------------------ */

const LANTERN_PAL: GridPalette = { k: '#2b2622', K: '#4a4038', y: '#f0a84a', Y: '#ffd584', w: '#fff3c4' }
export function lantern() {
  return grid(['.k.k.', '..k..', '.KkK.', 'kyYyk', 'kYwYk', 'kyYyk', '.kkk.'], LANTERN_PAL)
}

/** A wooden post with an arm and a hanging lantern. Light source at `light`. */
export function lanternPost() {
  const buf = new PixelBuffer(13, 31)
  const w = PAL.wood
  buf.rect(2, 4, 2, 27, C(w[3]))
  buf.vline(2, 4, 30, C(w[2]))
  buf.hline(2, 9, 4, C(w[3]))
  buf.hline(3, 9, 5, C(w[2]))
  buf.set(9, 6, C('#2b2622'))
  const lan = gridToBuffer(['.k.', 'KkK', 'yYy', 'YwY', 'yYy', '.k.'], LANTERN_PAL)
  for (let y = 0; y < lan.h; y++) for (let x = 0; x < lan.w; x++) if (lan.filled(x, y)) buf.set(8 + x, 7 + y, lan.get(x, y))
  buf.outline(OUT())
  return { img: buf.toCanvas(), light: { x: 9.5, y: 10 } }
}

export function laptop() {
  return grid(
    ['.kkkkkkk..', '.kssssssk.', '.kscccsk..', '.ksoccsk..', '.kssssssk.', '.kkkkkkk..', 'mmmmmmmmmm', '.MMMMMMMM.'],
    { k: '#1b1d26', s: '#16324a', c: '#8fe0d0', o: '#f0a84a', m: '#8a90a4', M: '#4e5468' },
  )
}

export function mug() {
  return grid(['wwww..', 'mmmmh.', 'mMmm.h', 'mmmmh.', '.MM...'], {
    w: '#cfd6e0', m: '#3d6285', M: '#2a4560', h: '#3d6285',
  })
}

export function backpack() {
  return grid(
    ['..mmmm..', '.bbbbbb.', 'bbkbbbrb', 'bbbbbbbb', 'bBtbbbbB', 'bBbbbwbB', 'BBbbbbBB', 'BBBBBBBB', '.m....m.'],
    { b: '#80502d', B: '#5a341d', m: '#3b2616', k: '#e2b04a', r: '#c0504a', t: '#4fb8a0', w: '#d9d6cf' },
  )
}

export function telescope() {
  return grid(
    [
      '...........ww',
      '.........mMMw',
      '.......mMMm..',
      '.....mMMm....',
      '...kmMm......',
      '...kkm.......',
      '....k........',
      '....k........',
      '...k.k.......',
      '...k.k.......',
      '..k...k......',
      '..k...k......',
      '.k.....k.....',
    ],
    { m: '#6a7188', M: '#9aa2b8', w: '#d6dcef', k: '#3a2f28' },
  )
}

export function mailbox() {
  return grid(
    [
      '.MMMMMM..',
      'MmmmmmmM.',
      'MmmmmmmMf',
      'MmmmmmmMf',
      'MpppmmmMf',
      'MMMMMMMM.',
      '...ww....',
      '...wW....',
      '...wW....',
      '...wW....',
      '...wW....',
      '...wW....',
      '..wwWW...',
    ],
    { M: '#2a3348', m: '#435074', p: '#e8dfc1', f: '#b8433a', w: '#4e3727', W: '#35241a' },
  )
}

export function rowboat() {
  return grid(
    [
      '.w....................w.',
      'wWwwwwwwwwwwwwwwwwwwwwWw',
      '.WWWWWWWWWWWWWWWWWWWWWW.',
      '..BBBBBBBBBBBBBBBBBBBB..',
      '...BBbBBBBBBBBBBBBbBB...',
      '.....BBBBBBBBBBBBBB.....',
    ],
    { w: '#6e4d34', W: '#583d2a', B: '#35241a', b: '#8b7355' },
  )
}

export function flag() {
  const pal = { p: '#8a8f9e', r: '#9d3b35', R: '#7a2c28', w: '#d9d0bc' }
  const a = ['prrrrrr.', 'prwwwwrr', 'prrrrrr.', 'pRRRRR..', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......']
  const b = ['prrrrr..', 'prwwwwr.', 'prrrrrrr', 'pRRRRRR.', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......', 'p.......']
  return [grid(a, pal), grid(b, pal)]
}

export function toolbox() {
  return grid(['...kkkk...', '..k....k..', 'rrrrrrrrrr', 'rRRRyyRRRr', 'rrrrrrrrrr', 'RRRRRRRRRR'], {
    k: '#555d75', r: '#8a3a30', R: '#6a2a24', y: '#c9a45a',
  })
}

/* ------------------------------------------------------------------ */
/* Procedural wooden props                                             */
/* ------------------------------------------------------------------ */

export function stump(w = 12, h = 8, seed = 1) {
  const buf = new PixelBuffer(w, h)
  const r = rng(seed)
  const wd = PAL.wood
  for (let x = 0; x < w; x++) {
    for (let y = 2; y < h; y++) {
      const edge = x === 0 || x === w - 1
      const v = edge ? 1 : x > w * 0.6 ? 3 : 2
      buf.set(x, y, C(wd[v + (hash1(x * 7 + y, seed) > 0.8 ? -1 : 0)]))
    }
  }
  // top rings
  buf.hline(1, w - 2, 0, C(wd[4]))
  buf.hline(0, w - 1, 1, C(wd[5]))
  buf.hline(2, w - 3, 1, C('#8a6a48'))
  buf.set(Math.floor(w / 2), 1, C(wd[3]))
  // roots
  buf.set(0, h - 1, C(wd[1])); buf.set(w - 1, h - 1, C(wd[2]))
  if (r.chance(0.5)) buf.set(1, h - 1, C(wd[1]))
  buf.outline(OUT())
  return buf.toCanvas()
}

export function crate(w = 14, h = 11) {
  const buf = new PixelBuffer(w, h)
  const wd = PAL.wood
  buf.rect(0, 0, w, h, C(wd[3]))
  for (let y = 0; y < h; y += 4) buf.hline(0, w - 1, y, C(wd[2]))
  buf.rect(0, 0, 2, h, C(wd[4]))
  buf.rect(w - 2, 0, 2, h, C(wd[4]))
  buf.line(2, h - 1, w - 3, 0, C(wd[4]))
  buf.hline(0, w - 1, 0, C(wd[5]))
  buf.outline(OUT())
  return buf.toCanvas()
}

export function logBench(w = 34) {
  const h = 8
  const buf = new PixelBuffer(w, h)
  const wd = PAL.wood
  for (let x = 0; x < w; x++) {
    buf.set(x, 1, C(wd[4]))
    buf.set(x, 2, C(wd[3]))
    buf.set(x, 3, C(wd[3]))
    buf.set(x, 4, C(wd[2]))
    buf.set(x, 5, C(wd[1]))
    if (hash1(x, 3) > 0.75) buf.set(x, 3, C(wd[2]))
  }
  // log end
  buf.rect(w - 4, 1, 4, 5, C('#7d5a3c'))
  buf.set(w - 2, 3, C('#5a3f2a'))
  buf.hline(0, w - 1, 0, C(wd[5]))
  // legs
  buf.rect(3, 6, 2, 2, C(wd[1]))
  buf.rect(w - 7, 6, 2, 2, C(wd[1]))
  buf.outline(OUT())
  return buf.toCanvas()
}

export function woodpile() {
  const buf = new PixelBuffer(22, 13)
  const ends: [number, number][] = [[3, 10], [8, 10], [13, 10], [18, 10], [5, 6], [10, 6], [15, 6], [8, 2], [13, 2]]
  for (const [cx, cy] of ends) {
    buf.disc(cx, cy, 2, C('#7d5a3c'))
    buf.set(cx, cy, C('#5a3f2a'))
    buf.set(cx + 1, cy - 1, C('#9a7550'))
  }
  buf.outline(OUT())
  return buf.toCanvas()
}

export function chessStump() {
  const buf = new PixelBuffer(16, 11)
  const wd = PAL.wood
  buf.rect(1, 4, 14, 7, C(wd[2]))
  buf.rect(9, 4, 6, 7, C(wd[3]))
  // board top, 2 rows of checks seen at an angle
  for (let x = 0; x < 16; x++) {
    buf.set(x, 2, C(x % 2 ? '#d9d0bc' : '#3a2f28'))
    buf.set(x, 3, C(x % 2 ? '#3a2f28' : '#d9d0bc'))
  }
  // pieces
  buf.vline(4, 0, 1, C('#e8e2d2'))
  buf.set(4, 0, C('#e8e2d2'))
  buf.vline(10, 0, 1, C('#241c1a'))
  buf.set(12, 1, C('#241c1a'))
  buf.outline(OUT())
  return buf.toCanvas()
}

export function journalStump() {
  const buf = new PixelBuffer(16, 11)
  const wd = PAL.wood
  buf.rect(2, 4, 12, 7, C(wd[2]))
  buf.rect(9, 4, 5, 7, C(wd[3]))
  buf.hline(2, 13, 4, C(wd[4]))
  // open book
  const p = PAL.paper
  buf.rect(1, 1, 7, 3, C(p[2]))
  buf.rect(8, 1, 7, 3, C(p[3]))
  buf.vline(8, 1, 3, C(p[0]))
  buf.hline(2, 6, 2, C(p[1]))
  buf.hline(9, 13, 2, C(p[1]))
  buf.set(3, 1, C('#b8433a'))
  buf.hline(1, 14, 0, C('#6e3a2a'))
  buf.outline(OUT())
  return buf.toCanvas()
}

/** Wooden sign board with a painted label and one or two posts. */
export function signBoard(label: string, opts: { posts?: 1 | 2; postH?: number } = {}) {
  const posts = opts.posts ?? 2
  const postH = opts.postH ?? 11
  const tw = measureText(label)
  const bw = tw + 12
  const bh = 13
  const buf = new PixelBuffer(bw, bh + postH)
  const wd = PAL.wood
  // posts
  const postXs = posts === 2 ? [3, bw - 5] : [Math.floor(bw / 2) - 1]
  for (const px of postXs) {
    buf.rect(px, bh - 2, 2, postH + 2, C(wd[3]))
    buf.vline(px, bh - 2, bh + postH - 1, C(wd[2]))
  }
  // board: two planks with grain
  const noise = valueNoise(label.length * 13)
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const n = noise(x * 0.35, y * 1.4)
      const plank = y < 6 ? 0 : 1
      let v = 3 + (n > 0.62 ? 1 : n < 0.3 ? -1 : 0)
      if (y === 6) v = 1
      if (plank === 1 && y === bh - 1) v = 2
      buf.set(x, y, C(wd[Math.max(0, Math.min(5, v))]))
    }
  // frame
  buf.hline(0, bw - 1, 0, C(wd[5]))
  buf.hline(0, bw - 1, bh - 1, C(wd[1]))
  buf.vline(0, 0, bh - 1, C(wd[2]))
  buf.vline(bw - 1, 0, bh - 1, C(wd[1]))
  // nails
  for (const [nx, ny] of [[2, 2], [bw - 3, 2], [2, bh - 3], [bw - 3, bh - 3]]) buf.set(nx, ny, C('#8891a8'))
  buf.outline(OUT())
  const canvas = buf.toCanvas()
  const ctx = canvas.getContext('2d')!
  drawPixelText(ctx, label, 6, 3, '#eadfc4', '#1c130f')
  return canvas
}

/** A sign that hangs from an arm on a single post (used for CONTACT). */
export function hangingSign(label: string) {
  const board = signBoard(label, { posts: 1, postH: 0 })
  const w = board.width + 8
  const h = board.height + 30
  const [c, ctx] = makeCanvas(w, h)
  const wd = PAL.wood
  ctx.fillStyle = PAL.outline
  ctx.fillRect(0, 0, 5, h)
  ctx.fillRect(0, 2, w - 1, 5)
  ctx.fillStyle = wd[3]
  ctx.fillRect(1, 1, 3, h - 1)
  ctx.fillRect(1, 3, w - 3, 3)
  ctx.fillStyle = wd[4]
  ctx.fillRect(1, 3, w - 3, 1)
  ctx.fillStyle = '#6a7188'
  ctx.fillRect(10, 6, 1, 4)
  ctx.fillRect(w - 6, 6, 1, 4)
  ctx.drawImage(board, 6, 9)
  return c
}

/** Small carved sign with unreadable "writing" — the text appears as a thought. */
export function carvedSign() {
  const buf = new PixelBuffer(20, 22)
  const wd = PAL.wood
  buf.rect(9, 9, 2, 13, C(wd[3]))
  buf.vline(9, 9, 21, C(wd[2]))
  buf.rect(0, 0, 20, 10, C(wd[3]))
  buf.hline(0, 19, 0, C(wd[5]))
  buf.hline(0, 19, 9, C(wd[1]))
  buf.hline(3, 12, 3, C('#1c130f'))
  buf.hline(3, 16, 5, C('#1c130f'))
  buf.hline(3, 9, 7, C('#1c130f'))
  buf.set(15, 3, C('#b8433a'))
  buf.outline(OUT())
  return buf.toCanvas()
}

/* ------------------------------------------------------------------ */
/* Tent                                                                */
/* ------------------------------------------------------------------ */

export function tent() {
  const W = 64, H = 42
  const cl = PAL.cloth
  const frames: HTMLCanvasElement[] = []
  const A: Pt = [42, 2], B: Pt = [18, 6], BL: Pt = [3, 39], FL: Pt = [24, 40], FR: Pt = [60, 40]
  for (let f = 0; f < 3; f++) {
    const buf = new PixelBuffer(W, H)
    const doorApex: Pt = [42, 13], doorL: Pt = [34 - (f === 1 ? 1 : 0), 40], doorR: Pt = [50 + (f === 2 ? 1 : 0), 40]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p: Pt = [x + 0.5, y + 0.5]
        if (inTri(p, A, FL, FR)) {
          if (inTri(p, doorApex, doorL, doorR)) {
            // bright interior
            const d = Math.hypot(x - 42, (y - 38) * 1.4) / 20
            const v = 1 - d
            const idx = v > 0.62 ? 3 : v > 0.35 ? 2 : v > 0.15 ? 1 : 0
            const inner = ['#c9782f', '#f0a84a', '#ffd584', '#fff0c0']
            buf.set(x, y, C(inner[idx]))
          } else {
            const d = Math.abs(x - 42) / 18
            const v = 0.78 - d * 0.35 + (y / H) * 0.15
            const i = v + (bayer(x, y) - 0.5) * 0.15 > 0.62 ? 4 : v > 0.5 ? 3 : 2
            buf.set(x, y, C(cl[i]))
          }
        } else if (inTri(p, A, B, BL) || inTri(p, A, BL, FL)) {
          const t = (x - 3) / 40
          const v = 0.35 + t * 0.35 + (y / H) * 0.12 + (bayer(x, y) - 0.5) * 0.12
          buf.set(x, y, C(cl[v > 0.56 ? 3 : v > 0.4 ? 2 : 1]))
        }
      }
    // seams on the side panel
    buf.line(A[0] - 6, A[1] + 3, FL[0] - 8, FL[1] - 1, C(cl[1]))
    buf.line(A[0] - 14, A[1] + 4, FL[0] - 16, FL[1] - 1, C(cl[1]))
    // ridge + door flaps
    buf.line(A[0], A[1], B[0], B[1], C(cl[1]))
    buf.line(doorApex[0], doorApex[1], doorL[0], doorL[1], C(cl[2]))
    buf.line(doorApex[0], doorApex[1], doorR[0], doorR[1], C(cl[2]))
    buf.line(doorApex[0] - 1, doorApex[1] + 3, doorL[0] - 2, doorL[1], C(cl[5]))
    // sleeping bag glimpse
    buf.hline(38, 47, 38, C('#8a4f1f'))
    buf.hline(39, 46, 37, C('#a8622a'))
    // front pole tip
    buf.set(A[0], A[1] - 1, C('#6a5a48'))
    buf.set(A[0], A[1] - 2, C('#6a5a48'))
    buf.outline(OUT())
    // guy rope (after outline so it stays thin)
    buf.line(A[0] + 1, A[1] + 1, W - 1, H - 2, C('#6b5a44', 200))
    buf.line(B[0] - 1, B[1] + 1, 0, 30, C('#6b5a44', 180))
    frames.push(buf.toCanvas())
  }
  return frames
}

/* ------------------------------------------------------------------ */
/* Project board                                                       */
/* ------------------------------------------------------------------ */

export function projectBoard() {
  const W = 76, H = 66
  const buf = new PixelBuffer(W, H)
  const wd = PAL.wood
  const r = rng(77)
  // posts
  for (const px of [7, 66]) {
    buf.rect(px, 8, 3, H - 8, C(wd[3]))
    buf.vline(px, 8, H - 1, C(wd[2]))
    buf.vline(px + 2, 8, H - 1, C(wd[4]))
  }
  // roof (shingles)
  for (let y = 2; y < 11; y++) {
    const inset = Math.round((10 - y) * 0.7)
    for (let x = inset; x < W - inset; x++) {
      const row = y % 3
      const brick = Math.floor((x + (row === 0 ? 0 : 2) * (y % 2)) / 5)
      let v = 2 + (hash1(brick * 13 + y, 5) > 0.6 ? 1 : 0)
      if (row === 0) v = 1
      buf.set(x, y, C(['#141a2a', '#1d2538', '#27314a', '#313d5a'][v]))
    }
  }
  buf.hline(Math.round(8 * 0.7), W - 1 - Math.round(8 * 0.7), 2, C('#3b4866'))
  buf.hline(0, W - 1, 11, C(wd[1]))
  // header plank
  for (let y = 12; y < 23; y++)
    for (let x = 4; x < W - 4; x++) buf.set(x, y, C(wd[y === 12 ? 5 : y === 22 ? 1 : hash1(x + y * 3, 9) > 0.8 ? 4 : 3]))
  // board backing
  for (let y = 23; y < 57; y++)
    for (let x = 9; x < W - 9; x++) {
      const v = hash1(x * 3 + y * 7, 2)
      buf.set(x, y, C(v > 0.85 ? '#3a2a1e' : v > 0.4 ? '#2c2018' : '#261b14'))
    }
  buf.hline(9, W - 10, 23, C(wd[4]))
  buf.hline(9, W - 10, 56, C(wd[1]))
  buf.vline(9, 23, 56, C(wd[4]))
  buf.vline(W - 10, 23, 56, C(wd[2]))
  // pinned notes
  const notes: [number, number, number, number][] = [
    [12, 26, 13, 11], [28, 25, 11, 14], [42, 27, 10, 10], [55, 25, 9, 12],
    [13, 40, 11, 13], [27, 42, 14, 10], [44, 40, 10, 13], [56, 41, 8, 11],
  ]
  const pins = ['#b8433a', '#e2b04a', '#4fb8a0', '#d9d0bc']
  notes.forEach(([x, y, w, h], i) => {
    const tone = PAL.paper[1 + (i % 3 === 0 ? 1 : 0)]
    buf.rect(x, y, w, h, C(tone))
    buf.hline(x, x + w - 1, y + h - 1, C(PAL.paper[0]))
    for (let ly = y + 3; ly < y + h - 2; ly += 2) {
      const len = Math.max(2, w - 3 - r.int(0, 4))
      buf.hline(x + 1, x + len, ly, C('#6b604c'))
    }
    if (i === 5) {
      // a tiny map
      buf.rect(x + 1, y + 1, w - 2, h - 2, C('#b9aa82'))
      buf.line(x + 2, y + h - 3, x + w - 3, y + 2, C('#7a4a2a'))
      buf.set(x + w - 4, y + 3, C('#b8433a'))
      buf.set(x + 4, y + 4, C('#4a6a58'))
      buf.set(x + 5, y + 5, C('#4a6a58'))
    }
    buf.set(x + Math.floor(w / 2), y, C(pins[i % pins.length]))
  })
  // lantern hanging from the roof corner
  const lan = gridToBuffer(['.k.', 'KkK', 'yYy', 'YwY', 'yYy', '.k.'], LANTERN_PAL)
  buf.vline(W - 4, 11, 13, C('#2b2622'))
  for (let y = 0; y < lan.h; y++) for (let x = 0; x < lan.w; x++) if (lan.filled(x, y)) buf.set(W - 5 + x, 14 + y, lan.get(x, y))
  buf.outline(OUT())
  const canvas = buf.toCanvas()
  const ctx = canvas.getContext('2d')!
  const tw = measureText('PROJECTS')
  drawPixelText(ctx, 'PROJECTS', Math.floor((W - tw) / 2), 14, '#eadfc4', '#1c130f')
  return { img: canvas, light: { x: W - 3.5, y: 17 } }
}

/* ------------------------------------------------------------------ */
/* Workshop (skills)                                                   */
/* ------------------------------------------------------------------ */

export function workshop() {
  const W = 132, H = 80
  const buf = new PixelBuffer(W, H)
  const wd = PAL.wood
  const mt = PAL.metal
  // back wall planks
  for (let y = 18; y < H - 2; y++)
    for (let x = 8; x < W - 8; x++) {
      const plank = Math.floor((x - 8) / 7)
      const gap = (x - 8) % 7 === 0
      const v = gap ? 0 : 1 + (hash1(plank * 17, 4) > 0.5 ? 1 : 0) + (hash1(x * 5 + y * 11, 8) > 0.9 ? 1 : 0)
      buf.set(x, y, C(wd[v]))
    }
  // roof: lean-to band of shingles
  for (let y = 4; y < 18; y++) {
    const inset = Math.max(0, Math.round((17 - y) * 0.6))
    for (let x = inset; x < W - inset; x++) {
      const row = (y - 4) % 3
      const off = Math.floor((y - 4) / 3) % 2 ? 3 : 0
      const brick = Math.floor((x + off) / 6)
      let v = row === 0 ? 1 : 2 + (hash1(brick * 31 + y, 6) > 0.55 ? 1 : 0)
      if (y === 4) v = 3
      buf.set(x, y, C(['#141a2a', '#1d2538', '#27314a', '#34405e'][v]))
    }
  }
  buf.hline(0, W - 1, 18, C(wd[4]))
  buf.hline(0, W - 1, 19, C(wd[2]))
  // posts
  for (const px of [3, W - 6]) {
    buf.rect(px, 18, 3, H - 18, C(wd[3]))
    buf.vline(px + 2, 18, H - 1, C(wd[4]))
  }
  // pegboard with tools
  buf.rect(18, 28, 44, 24, C('#3a2a1e'))
  for (let y = 30; y < 51; y += 3) for (let x = 20; x < 61; x += 3) buf.set(x, y, C('#241a13'))
  // hammer
  buf.vline(24, 32, 44, C(wd[5]))
  buf.rect(21, 31, 7, 3, C(mt[2]))
  buf.hline(21, 27, 31, C(mt[3]))
  // wrench
  buf.vline(33, 33, 46, C(mt[2]))
  buf.rect(32, 31, 3, 3, C(mt[2]))
  buf.set(33, 32, C('#3a2a1e'))
  buf.rect(32, 46, 3, 2, C(mt[2]))
  // saw
  for (let x = 40; x < 56; x++) {
    buf.vline(x, 36, 39, C(mt[2]))
    if (x % 2) buf.set(x, 40, C(mt[1]))
  }
  buf.hline(40, 55, 36, C(mt[3]))
  buf.rect(55, 34, 4, 6, C(wd[4]))
  // screwdriver
  buf.vline(58, 43, 49, C(mt[3]))
  buf.rect(57, 41, 3, 3, C('#9d3b35'))
  // shelf with jars
  buf.hline(72, 118, 38, C(wd[4]))
  buf.hline(72, 118, 39, C(wd[1]))
  const jars: [number, string][] = [[74, '#4a6a88'], [80, '#6a8a5a'], [86, '#8a6a3a'], [100, '#5a7aa0'], [108, '#7a5a7a']]
  for (const [jx, col] of jars) {
    buf.rect(jx, 32, 4, 6, C(col))
    buf.hline(jx, jx + 3, 31, C('#2b2622'))
    buf.set(jx + 1, 34, C('#c9d6e8', 180))
  }
  buf.rect(91, 33, 7, 5, C(wd[4]))
  buf.hline(91, 97, 33, C(wd[5]))
  // workbench
  buf.rect(26, 58, 80, 3, C(wd[5]))
  buf.hline(26, 105, 58, C('#8a6a48'))
  buf.rect(26, 61, 80, 2, C(wd[2]))
  for (const lx of [28, 102]) buf.rect(lx, 63, 3, H - 63, C(wd[3]))
  buf.hline(30, 101, 72, C(wd[2]))
  // vise
  buf.rect(30, 53, 7, 5, C(mt[2]))
  buf.hline(30, 36, 53, C(mt[3]))
  buf.hline(37, 40, 55, C(mt[1]))
  // circuit board + chip
  buf.rect(46, 55, 12, 3, C('#2f6a4f'))
  buf.rect(50, 54, 4, 1, C('#1b1d26'))
  buf.set(47, 55, C('#e2b04a')); buf.set(56, 56, C('#e2b04a'))
  // small keyboard / terminal
  buf.rect(64, 50, 12, 8, C('#1b1d26'))
  buf.rect(65, 51, 10, 6, C('#16324a'))
  buf.hline(66, 71, 52, C('#8fe0d0'))
  buf.hline(66, 69, 54, C('#8fe0d0'))
  buf.hline(66, 72, 56, C('#f0a84a'))
  // potted sapling ("skill tree")
  buf.rect(90, 53, 6, 5, C('#8a4f2f'))
  buf.hline(90, 95, 53, C('#a8633a'))
  buf.vline(93, 45, 52, C(wd[4]))
  const leaves: Pt[] = [[91, 46], [92, 45], [94, 44], [95, 46], [90, 48], [96, 48], [93, 43], [94, 47], [92, 49], [95, 50]]
  leaves.forEach(([lx, ly], i) => buf.set(lx, ly, C(i % 3 === 0 ? '#5fd0a8' : i % 2 ? '#2f8a6a' : '#3fae88')))
  // sawhorse + plank in front
  buf.line(10, H - 1, 14, H - 10, C(wd[3]))
  buf.line(18, H - 1, 14, H - 10, C(wd[3]))
  buf.hline(8, 20, H - 10, C(wd[4]))
  buf.outline(OUT())
  // hanging lantern from the roof beam
  const lan = gridToBuffer(['.k.', 'KkK', 'yYy', 'YwY', 'yYy', '.k.'], LANTERN_PAL)
  buf.vline(66, 20, 22, C('#2b2622'))
  for (let y = 0; y < lan.h; y++) for (let x = 0; x < lan.w; x++) if (lan.filled(x, y)) buf.set(65 + x, 23 + y, lan.get(x, y))
  return { img: buf.toCanvas(), light: { x: 66.5, y: 26 } }
}

/* ------------------------------------------------------------------ */
/* Cabin (contact)                                                     */
/* ------------------------------------------------------------------ */

export function cabin() {
  const W = 108, H = 92
  const buf = new PixelBuffer(W, H)
  const wd = PAL.wood
  const apex: Pt = [54, 4], eL: Pt = [0, 46], eR: Pt = [W - 1, 46]
  // chimney (behind roof on the right slope)
  for (let y = 8; y < 36; y++)
    for (let x = 76; x < 86; x++) {
      const brick = (Math.floor(y / 3) % 2 ? Math.floor((x + 2) / 4) : Math.floor(x / 4)) + Math.floor(y / 3) * 7
      const mortar = y % 3 === 0 || (x + (Math.floor(y / 3) % 2 ? 2 : 0)) % 4 === 0
      buf.set(x, y, C(mortar ? '#1a1f31' : hash1(brick, 3) > 0.5 ? '#3a4058' : '#2e344a'))
    }
  buf.hline(75, 86, 7, C('#454c66'))
  buf.hline(75, 86, 8, C('#2a2f42'))
  // gable face (vertical planks)
  const gApex: Pt = [54, 12], gL: Pt = [14, 44], gR: Pt = [94, 44]
  // walls: horizontal logs
  for (let y = 44; y < H - 4; y++) {
    const band = (y - 44) % 5
    for (let x = 10; x < W - 10; x++) {
      const v = band === 0 ? 5 : band === 1 ? 4 : band === 4 ? 1 : 3
      const n = hash1(x * 13 + Math.floor((y - 44) / 5) * 101, 7)
      buf.set(x, y, C(wd[Math.max(0, v - (n > 0.85 ? 1 : 0))]))
    }
    // log ends at the corners
    if (band === 2) {
      for (const cx of [9, W - 10]) {
        buf.rect(cx - 2, y - 2, 4, 5, C('#7d5a3c'))
        buf.set(cx - 1, y, C('#5a3f2a'))
      }
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p: Pt = [x + 0.5, y + 0.5]
      if (y < 46 && inTri(p, apex, eL, eR)) {
        if (inTri(p, gApex, gL, gR)) {
          const plank = Math.floor(x / 5)
          const v = x % 5 === 0 ? 1 : 2 + (hash1(plank, 12) > 0.6 ? 1 : 0)
          buf.set(x, y, C(wd[v]))
        } else {
          // roof shingles, lit on the right slope (moon side)
          const right = x > 54
          const row = Math.floor(y / 3)
          const off = row % 2 ? 3 : 0
          const brick = Math.floor((x + off) / 6)
          let v = y % 3 === 0 ? 0 : 1 + (hash1(brick * 7 + row * 31, 21) > 0.6 ? 1 : 0)
          if (right) v += 1
          buf.set(x, y, C(['#10141f', '#1b2233', '#252e45', '#303b58'][Math.min(3, v)]))
        }
      }
    }
  // roof edge trim
  buf.line(apex[0], apex[1], eL[0], eL[1], C('#3b4866'))
  buf.line(apex[0], apex[1], eR[0], eR[1], C('#4a5a80'))
  buf.hline(2, W - 3, 46, C(wd[1]))
  buf.hline(4, W - 5, 47, C(wd[0]))
  // attic round window
  buf.disc(54, 28, 4, C(wd[1]))
  buf.disc(54, 28, 3, C(PAL.window[2]))
  buf.set(53, 27, C(PAL.window[3])); buf.set(54, 27, C(PAL.window[3]))
  buf.vline(54, 25, 31, C(wd[1]))
  buf.hline(51, 57, 28, C(wd[1]))
  // windows
  const windows: [number, number][] = [[20, 56], [70, 56]]
  for (const [wx, wy] of windows) {
    buf.rect(wx - 2, wy - 2, 20, 18, C(wd[1]))
    buf.rect(wx - 1, wy - 1, 18, 16, C(wd[4]))
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 16; x++) {
        const v = 0.55 + (1 - y / 14) * 0.3 + (bayer(x, y) - 0.5) * 0.2
        buf.set(wx + x, wy + y, C(PAL.window[v > 0.75 ? 3 : v > 0.55 ? 2 : 1]))
      }
    buf.vline(wx + 8, wy, wy + 13, C(wd[1]))
    buf.hline(wx, wx + 15, wy + 7, C(wd[1]))
    buf.hline(wx - 3, wx + 18, wy + 15, C(wd[5]))
    buf.hline(wx - 3, wx + 18, wy + 16, C(wd[2]))
  }
  // monitor silhouette inside the left window
  buf.rect(22, 58, 5, 5, C('#10131c'))
  buf.vline(24, 63, 64, C('#10131c'))
  // door
  buf.rect(46, 60, 16, H - 64, C(wd[1]))
  buf.rect(47, 61, 14, H - 65, C(wd[3]))
  for (let x = 48; x < 60; x += 4) buf.vline(x, 61, H - 5, C(wd[2]))
  buf.vline(61, 61, H - 5, C(PAL.window[2]))
  buf.vline(60, 62, H - 5, C(PAL.window[1]))
  buf.set(57, 75, C('#e2b04a'))
  // stone foundation + step
  for (let x = 8; x < W - 8; x++)
    for (let y = H - 4; y < H; y++) {
      const s = Math.floor(x / 5) + (y > H - 3 ? 3 : 0)
      buf.set(x, y, C((x % 5 === 0 || y === H - 3) ? '#1a1f31' : hash1(s, 44) > 0.5 ? '#3a4058' : '#2e344a'))
    }
  buf.rect(42, H - 3, 24, 3, C('#454c66'))
  buf.hline(42, 65, H - 3, C('#5a627e'))
  buf.outline(OUT())
  // porch lantern by the door
  const lan = gridToBuffer(['.k.', 'KkK', 'yYy', 'YwY', 'yYy', '.k.'], LANTERN_PAL)
  buf.hline(64, 66, 62, C('#2b2622'))
  for (let y = 0; y < lan.h; y++) for (let x = 0; x < lan.w; x++) if (lan.filled(x, y)) buf.set(65 + x, 63 + y, lan.get(x, y))
  return {
    img: buf.toCanvas(),
    windows: windows.map(([x, y]) => ({ x: x + 8, y: y + 7 })),
    door: { x: 54, y: 72 },
    lantern: { x: 66.5, y: 66 },
    attic: { x: 54, y: 28 },
    chimney: { x: 81, y: 6 },
    /** where the little terminal lines are drawn every frame */
    terminal: { x: 22, y: 58, w: 5, h: 4 },
  }
}

/* ------------------------------------------------------------------ */
/* Campfire base                                                       */
/* ------------------------------------------------------------------ */

export function campfireBase() {
  return grid(
    [
      '.....LLl....LLl.....',
      '..LLLLlll.LLLLll....',
      '.sSs.LLLLLLLl..sSs..',
      'sSSSsLlllllLLsSSSSs.',
      '.ssS.sSs..sSSs.sss..',
    ],
    { L: '#5a3f2a', l: '#7d5a3c', s: '#3a4058', S: '#555d75' },
  )
}

/* ------------------------------------------------------------------ */
/* Rocks                                                               */
/* ------------------------------------------------------------------ */

export function boulder(w: number, h: number, seed: number, wet = false) {
  const buf = new PixelBuffer(w, h)
  const noise = valueNoise(seed)
  const ramp = PAL.rock
  const cx = w / 2, cy = h * 0.62
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h * 0.62)
      const r = dx * dx + dy * dy + (noise(x * 0.3, y * 0.3) - 0.5) * 0.35
      if (r > 1 || (y > h * 0.62 && Math.abs(dx) > 0.98)) continue
      const light = 0.5 - dy * 0.35 + dx * 0.22 + (noise(x * 0.5 + 9, y * 0.5) - 0.5) * 0.3
      const v = Math.max(0, Math.min(5, Math.round(light * 4 + (bayer(x, y) - 0.5))))
      buf.set(x, y, C(ramp[Math.max(1, v)]))
    }
  if (wet) for (let x = 0; x < w; x++) for (let y = h - 3; y < h; y++) if (buf.filled(x, y)) buf.set(x, y, C('#0b0e18'))
  buf.outline(OUT())
  return buf.toCanvas()
}
