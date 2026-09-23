/**
 * Hand-authored ASCII pixel sprites for the player and the camp's wildlife.
 * Outlines are added automatically, so the grids only hold fill colours.
 * Replace any of these with PNG sprite sheets via src/game/assets.ts.
 */
import { PAL } from '../palette'
import { c32, flipH, gridToBuffer, type GridPalette } from '../pixel'

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

const PLAYER_PAL: GridPalette = {
  h: '#2a1d1a', H: '#4d362d',
  s: '#c98f64', S: '#9a6444', e: '#191320',
  C: '#27425f', c: '#375b7e', L: '#5a86ad',
  B: '#5a341d', b: '#80502d', k: '#e2b04a', t: '#4fb8a0', m: '#3b2616',
  p: '#2e3552', P: '#1e2338', f: '#1a1720',
}

// Right-facing, 12 x 17 upper body (rows 0-16)
const UPPER = [
  '...hhhhhhh..',
  '..hhhHHhhhh.',
  '.hhhhhhhhhhh',
  '.hhhhhhhhhss',
  '.hhhhhssssss',
  '.hhhhSssses.',
  '.hhhhsssssss',
  '..hhhssssss.',
  '...hhsssSS..',
  '.....SSS....',
  '.BBBCcccccc.',
  'bbbbmCccccL.',
  'bkbbmCccccL.',
  'btbbmCccccL.',
  'bbbbmCccccL.',
  'BbbbmCccccL.',
  '.BBBCCCCCC..',
]

// Leg poses, rows 17-21
const LEGS = {
  stand: ['....PPppp...', '.....PPpp...', '.....PPpp...', '.....PPpp...', '.....fffff..'],
  contactA: ['....PPpp....', '....PP.pp...', '...PP...pp..', '...PP...pp..', '..fff...fff.'],
  passA: ['....PPpp....', '....PPpp....', '.....Ppp....', '.....fpp....', '......fff...'],
  contactB: ['....ppPP....', '....pp.PP...', '...pp...PP..', '...pp...PP..', '..fff...fff.'],
  passB: ['....ppPP....', '....ppPP....', '.....pPP....', '.....fPP....', '......fff...'],
}

type Arm = 'neutral' | 'fwd' | 'back'
const ARMS: Record<Arm, [number, number][]> = {
  neutral: [[7, 12], [7, 13], [7, 14], [7, 15]],
  fwd: [[7, 12], [8, 13], [8, 14], [9, 15]],
  back: [[7, 12], [6, 13], [6, 14], [5, 15]],
}

function composePlayer(legs: string[], arm: Arm, bodyDrop: number) {
  const rows: string[] = Array.from({ length: 22 }, () => '.'.repeat(12))
  const put = (x: number, y: number, ch: string) => {
    if (y < 0 || y >= rows.length || ch === '.') return
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1)
  }
  legs.forEach((r, i) => [...r].forEach((ch, x) => put(x, 17 + i, ch)))
  UPPER.forEach((r, i) => [...r].forEach((ch, x) => put(x, i + bodyDrop, ch)))
  const pts = ARMS[arm]
  pts.forEach(([x, y]) => put(x, y + bodyDrop, 'C'))
  const [hx, hy] = pts[pts.length - 1]
  put(hx, hy + 1 + bodyDrop, 's')
  const buf = gridToBuffer(rows, PLAYER_PAL, 1)
  buf.outline(c32(PAL.outline))
  return buf.toCanvas()
}

export interface CharacterFrames {
  idle: HTMLCanvasElement[]
  walk: HTMLCanvasElement[]
}

export function buildPlayerFrames(): { right: CharacterFrames; left: CharacterFrames } {
  const right: CharacterFrames = {
    idle: [composePlayer(LEGS.stand, 'neutral', 0), composePlayer(LEGS.stand, 'neutral', 1)],
    walk: [
      composePlayer(LEGS.contactA, 'back', 1),
      composePlayer(LEGS.passA, 'neutral', 0),
      composePlayer(LEGS.contactB, 'fwd', 1),
      composePlayer(LEGS.passB, 'neutral', 0),
    ],
  }
  const left: CharacterFrames = { idle: right.idle.map(flipH), walk: right.walk.map(flipH) }
  return { right, left }
}

/* ------------------------------------------------------------------ */
/* Wildlife                                                            */
/* ------------------------------------------------------------------ */

function sprite(rows: string[], pal: GridPalette) {
  const buf = gridToBuffer(rows, pal, 1)
  buf.outline(c32(PAL.outline))
  return buf.toCanvas()
}

const CAT_PAL: GridPalette = { g: '#a8683a', G: '#7a4827', l: '#c98f5a', w: '#e2cfae', d: '#2a1a14', T: '#8a5530' }
export function buildCat() {
  const a = [
    '..g.g........',
    '.gggg..GGGG..',
    '.gldggGggggG.',
    'gwwgggggggggG',
    '.gggggggggggG',
    '..TTTTgggggG.',
    '...TTTTTTTT..',
  ]
  const b = [
    '..g.g..GGG...',
    '.gggg.GggggG.',
    '.gldgggggggGG',
    'gwwgggggggggG',
    '.gggggggggggG',
    '..TTTTgggggG.',
    '...TTTTTTTT..',
  ]
  return [sprite(a, CAT_PAL), sprite(b, CAT_PAL)]
}

const RABBIT_PAL: GridPalette = { r: '#8e8a98', R: '#65627a', w: '#d4d0dc', e: '#15111c', p: '#c79aa4' }
export function buildRabbit() {
  const sitA = [
    '....r.r..',
    '....rprp.',
    '....rprp.',
    '...rrrrr.',
    '..rrrrerr',
    '.rrrrrrrr',
    'wRrrrrrr.',
    'wRRrrrR..',
    '.RRRRRR..',
  ]
  const sitB = [
    '.....r.r.',
    '....rprp.',
    '....rprp.',
    '...rrrrr.',
    '..rrrrerr',
    '.rrrrrrrr',
    'wRrrrrrr.',
    'wRRrrrR..',
    '.RRRRRR..',
  ]
  const hop = [
    '.......r.r',
    '......rprp',
    '.....rrrr.',
    '...rrrrerr',
    '.wrrrrrrrr',
    'wRRrrrrrr.',
    '.RR....RR.',
    'RR......R.',
  ]
  const right = [sprite(sitA, RABBIT_PAL), sprite(sitB, RABBIT_PAL), sprite(hop, RABBIT_PAL)]
  return { right, left: right.map(flipH) }
}

const FOX_PAL: GridPalette = { f: '#b3602f', F: '#874321', l: '#d98a4a', w: '#e9dcc6', d: '#1d1515', e: '#1a1212' }
export function buildFox() {
  // curled up asleep, facing left, tail over the nose
  const a = [
    '.d.d..........',
    '.fff...FFFF...',
    'ffffffFffffF..',
    'fefffffffffFF.',
    'dffwwwwfffffF.',
    '.wwwwwwwwlffF.',
    '..llllllllfF..',
  ]
  const b = [
    '.d.d..........',
    '.fff..FFFFF...',
    'ffffffffffffF.',
    'fefffffffffFF.',
    'dffwwwwfffffF.',
    '.wwwwwwwwlffF.',
    '..llllllllfF..',
  ]
  return [sprite(a, FOX_PAL), sprite(b, FOX_PAL)]
}

const OWL_PAL: GridPalette = { o: '#6b5a4a', O: '#473a30', b: '#b8a68a', y: '#e8c160', k: '#1a1414', n: '#c9a060' }
export function buildOwl() {
  const open = ['O.....O', 'ooooooo', 'oyyoyyo', 'oykoyko', 'oooneoo', 'Oobbboo', 'Oobbboo', '.Obbbo.', '..n.n..']
  const shut = ['O.....O', 'ooooooo', 'ooooooo', 'oOOoOOo', 'oooneoo', 'Oobbboo', 'Oobbboo', '.Obbbo.', '..n.n..']
  const pal = { ...OWL_PAL, e: '#473a30' }
  return [sprite(open, pal), sprite(shut, pal)]
}

const DUCK_PAL: GridPalette = { m: '#2a5a46', b: '#c9983a', e: '#0f0f12', w: '#d9d6cf', d: '#6d625a', D: '#4a423d', t: '#2b2724' }
export function buildDuck() {
  const a = ['.mm.......', 'bmem......', '.mm.......', '.wdddddt..', 'ddddddddt.', '.DDDDDDD..']
  const b = ['..........', '.mm.......', 'bmem......', '.mmdddddt.', 'wdddddddt.', '.DDDDDDD..']
  const left = [sprite(a, DUCK_PAL), sprite(b, DUCK_PAL)]
  return { left, right: left.map(flipH) }
}
