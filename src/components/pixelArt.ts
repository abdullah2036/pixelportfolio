/**
 * Pixel icons for the UI (drawn from ASCII grids, auto-outlined) and the
 * little illustrations pinned to each project quest when there is no screenshot.
 */
import type { ProjectArt } from '../data/portfolio'
import { c32, gridToBuffer, makeCanvas, rng } from '../game/render/pixel'
import { buildPlayerFrames } from '../game/render/sprites/characters'

type IconDef = { rows: string[]; pal: Record<string, string>; outline?: boolean; tintKey?: string }

const WOOD = { '-': '#5a3a22', '#': '#8a5a34', '+': '#b07a48' }

export const ICONS = {
  journal: { rows: ['-######', '-#aaaa#', '-######', '-#aaa##', '-######', '-######', '-######'], pal: { '-': '#5a2a24', '#': '#9d3b35', a: '#e0b560' } },
  board: { rows: ['...a...', '+++++++', '+-----+', '+++++++', '+----++', '+++++++', '+++++++'], pal: { '+': '#e8dcc0', '-': '#8f8469', a: '#d9534a' } },
  hammer: { rows: ['.####..', '######.', '.####..', '...-...', '...-...', '...-...', '...-...'], pal: { '#': '#9aa2b8', '-': '#8a5a34' }, tintKey: '#' },
  house: { rows: ['...#...', '..###..', '.#####.', '#######', '.+a+a+.', '.+++++.', '.++-++.'], pal: { '#': '#3b4866', '+': '#8a5a34', a: '#ffcf6b', '-': '#2a1d15' } },
  scroll: { rows: ['+++++..', '++++++.', '+----++', '+++++++', '+---+++', '+++++++', '+----++', '+++++++'], pal: { '+': '#e8dcc0', '-': '#8f8469' } },
  fire: { rows: ['...a...', '..aa...', '..aaa.a', '.aa#aa.', '.a###a.', '..###..', '-.-.-.-'], pal: { a: '#f08b2e', '#': '#ffd97a', '-': '#6e4d34' } },
  map: { rows: ['.+++++.', '+..a..+', '+..a..+', '+.a#a.+', '+..-..+', '+..-..+', '.+++++.'], pal: { '+': '#e0b560', a: '#d9534a', '#': '#efe7d6', '-': '#9aa6d8' } },
  soundOn: { rows: ['...#....', '..##..a.', '####.a.a', '####.a.a', '####.a.a', '..##..a.', '...#....'], pal: { '#': '#efe7d6', a: '#e0b560' } },
  soundOff: { rows: ['...#....', '..##....', '####a.a.', '####.a..', '####a.a.', '..##....', '...#....'], pal: { '#': '#9aa3bf', a: '#d9534a' } },
  close: { rows: ['#....#', '.#..#.', '..##..', '..##..', '.#..#.', '#....#'], pal: { '#': '#efe7d6' } },
  back: { rows: ['..#....', '.##....', '#######', '.##....', '..#....'], pal: { '#': '#efe7d6' } },
  external: { rows: ['...####', '.....##', '....#.#', '...#..#', '..#....', '.#.....'], pal: { '#': '#efe7d6' } },
  download: { rows: ['...#...', '...#...', '...#...', '.#####.', '..###..', '...#...', '#######'], pal: { '#': '#efe7d6' } },
  github: { rows: ['.#....#.', '.##..##.', '.######.', '########', '##.##.##', '########', '.######.', '..#..#..'], pal: { '#': '#efe7d6' } },
  linkedin: { rows: ['########', '#+######', '########', '#+#++###', '#+#+#+##', '#+#+#+##', '#+#+#+##', '########'], pal: { '#': '#4a86c8', '+': '#efe7d6' } },
  globe: { rows: ['..###..', '.#.#.#.', '#..#..#', '#######', '#..#..#', '.#.#.#.', '..###..'], pal: { '#': '#7fb0ff' } },
  mail: { rows: ['#######', '++#+#++', '+++#+++', '+++++++', '+++++++'], pal: { '#': '#8f8469', '+': '#e8dcc0' } },
  copy: { rows: ['####..', '#..#..', '#.####', '###..#', '..#..#', '..####'], pal: { '#': '#efe7d6' } },
  check: { rows: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'], pal: { '#': '#5fd0a8' } },
  pin: { rows: ['.##.', '####', '.##.', '..#.'], pal: { '#': '#d9534a' } },
  location: { rows: ['.###.', '##.##', '##.##', '.###.', '..#..'], pal: { '#': '#e0b560' } },
  star: { rows: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'], pal: { '#': '#e0b560' } },
  // skill bags
  tome: { rows: ['.######', '-#++++#', '-#+aa+#', '-#++++#', '-######', '-######'], pal: { '-': '#3a2418', '#': '#8a3a30', '+': '#e8dcc0', a: '#e0b560' }, tintKey: '#' },
  potion: { rows: ['..##..', '..++..', '.#..#.', '#aaaa#', '#aaaa#', '.####.'], pal: { '#': '#c9d6e8', '+': '#8a5a34', a: '#5fd0a8' } },
  crate: { rows: ['#######', '#-+++-#', '#+-+-+#', '#++-++#', '#+-+-+#', '#-+++-#', '#######'], pal: WOOD, tintKey: '+' },
  shield: { rows: ['#######', '#+++a+#', '#++aa+#', '#+aaa+#', '.#+a+#.', '..#+#..', '...#...'], pal: { '#': '#9aa2b8', '+': '#3b4866', a: '#ff8f70' } },
  gem: { rows: ['.#####.', '#+++a+#', '.#aaa#.', '..#a#..', '...#...'], pal: { '#': '#8a6ac9', '+': '#e3d4ff', a: '#c79bff' } },
} satisfies Record<string, IconDef>

export type IconName = keyof typeof ICONS

const urlCache = new Map<string, string>()

export function iconURL(name: IconName, tint?: string): { url: string; w: number; h: number } {
  const def: IconDef = ICONS[name]
  const w = Math.max(...def.rows.map((r) => r.length)) + 2
  const h = def.rows.length + 2
  const key = name + (tint ?? '')
  let url = urlCache.get(key)
  if (!url) {
    const pal = tint ? { ...def.pal, [def.tintKey ?? 'a']: tint } : def.pal
    const buf = gridToBuffer(def.rows, pal, 1)
    if (def.outline !== false) buf.outline(c32('#05070f'))
    url = buf.toCanvas().toDataURL()
    urlCache.set(key, url)
  }
  return { url, w, h }
}

/* ------------------------------------------------------------------ */
/* Quest illustrations                                                 */
/* ------------------------------------------------------------------ */

const artCache = new Map<string, string>()

export function projectArtURL(kind: ProjectArt): string {
  const hit = artCache.get(kind)
  if (hit) return hit
  const W = 64, H = 40
  const [c, ctx] = makeCanvas(W, H)
  const r = rng(kind.length * 97 + kind.charCodeAt(0))
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col
    ctx.fillRect(x, y, w, h)
  }
  const stars = (n: number, col = '#9aa6d8') => {
    for (let i = 0; i < n; i++) px(r.int(0, W - 1), r.int(0, H * 0.5), 1, 1, col)
  }
  switch (kind) {
    case 'os': {
      for (let y = 0; y < H; y++) px(0, y, W, 1, y < 20 ? '#2b3a78' : y < 30 ? '#3b3f8a' : '#5a4a96')
      px(6, 5, 30, 20, '#e6e8f0'); px(6, 5, 30, 3, '#b9bfd6')
      px(7, 6, 1, 1, '#ff6b5e'); px(9, 6, 1, 1, '#ffc24a'); px(11, 6, 1, 1, '#4fd06a')
      for (let i = 0; i < 4; i++) px(9, 11 + i * 3, 18 - i * 3, 1, '#8a90a8')
      px(30, 12, 28, 18, '#1b1d26'); px(30, 12, 28, 3, '#343a4d')
      px(32, 17, 8, 1, '#7fe0b0'); px(32, 20, 14, 1, '#7fe0b0'); px(32, 23, 5, 1, '#f0c060'); px(38, 23, 1, 1, '#efe7d6')
      px(14, 34, 36, 5, '#c9cde0')
      ;['#ff8f70', '#7fb0ff', '#5fd0a8', '#e0b560', '#c79bff', '#ff6b9e'].forEach((col, i) => px(16 + i * 6, 35, 4, 3, col))
      break
    }
    case 'room': {
      px(0, 0, W, H, '#0b0f24')
      for (let i = 0; i < 9; i++) ctx.fillStyle = '#1e2a5a', ctx.fillRect(32 + (i - 4) * 9, 26, 1, 14)
      for (let x = 0; x < W; x++) {
        for (let k = 0; k < 5; k++) {
          const y = 26 + k * k * 0.7
          px(x, Math.round(y), 1, 1, '#1e2a5a')
        }
      }
      px(14, 18, 36, 3, '#6e4d34'); px(16, 21, 2, 8, '#4e3727'); px(46, 21, 2, 8, '#4e3727')
      px(22, 4, 20, 13, '#1b1d26'); px(23, 5, 18, 11, '#3fd0e0'); px(23, 5, 18, 5, '#7fb0ff')
      px(29, 17, 6, 1, '#343a4d'); px(26, 16, 12, 1, '#343a4d')
      px(20, 17, 8, 1, '#8a90a4')
      px(50, 8, 6, 10, '#343a4d'); px(51, 9, 4, 1, '#c79bff'); px(51, 12, 4, 1, '#5fd0a8')
      stars(4, '#7fb0ff')
      break
    }
    case 'city': {
      for (let y = 0; y < H; y++) px(0, y, W, 1, y < 16 ? '#150a2a' : y < 26 ? '#2a0f3a' : '#3a1440')
      stars(10, '#c79bff')
      let x = 0
      while (x < W) {
        const w = r.int(4, 9), h = r.int(8, 26)
        px(x, H - 10 - h, w, h, r.chance(0.5) ? '#0c0616' : '#140a22')
        for (let wy = H - 8 - h; wy < H - 12; wy += 3)
          for (let wx = x + 1; wx < x + w - 1; wx += 2) if (r.chance(0.35)) px(wx, wy, 1, 1, r.chance(0.5) ? '#ff5fd1' : '#4fe6ff')
        x += w + 1
      }
      px(0, H - 10, W, 10, '#0a0514')
      for (let i = -6; i < 7; i++) {
        ctx.strokeStyle = '#ff5fd1'
        ctx.beginPath(); ctx.moveTo(32.5, H - 10); ctx.lineTo(32.5 + i * 14, H); ctx.stroke()
      }
      px(0, H - 10, W, 1, '#4fe6ff')
      break
    }
    case 'terminal': {
      px(0, 0, W, H, '#050a08')
      for (let y = 0; y < H; y += 2) px(0, y, W, 1, '#07100c')
      const lines = [22, 34, 18, 40, 28, 12, 36]
      lines.forEach((l, i) => {
        px(4, 4 + i * 5, 3, 2, '#3fd08a')
        px(9, 4 + i * 5, l, 2, i === 3 ? '#e0b560' : '#2fa870')
      })
      px(9, 39 - 4, 4, 2, '#8affc4')
      break
    }
    case 'chess': {
      px(0, 0, W, H, '#10141f')
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 8; col++) {
          const y = 14 + row * 5, x = 4 + col * 7
          px(x, y, 7, 5, (row + col) % 2 ? '#3a2f28' : '#d9d0bc')
        }
      // knight
      const k = ['..###.', '.####.', '###.#.', '..###.', '..###.', '.####.', '######']
      k.forEach((rw, y) => [...rw].forEach((ch, xx) => ch === '#' && px(28 + xx, 3 + y, 1, 1, '#efe7d6')))
      px(46, 4, 14, 8, '#1e3b52'); px(47, 6, 6, 1, '#7fe0d0'); px(47, 8, 10, 1, '#e0b560')
      break
    }
    case 'book': {
      px(0, 0, W, H, '#1a1026')
      px(8, 8, 23, 26, '#e8dcc0'); px(33, 8, 23, 26, '#d8cba8'); px(31, 7, 2, 28, '#8a5a34')
      for (let i = 0; i < 6; i++) { px(11, 12 + i * 3, 16 - (i % 2) * 4, 1, '#8f8469'); px(36, 12 + i * 3, 17 - (i % 3) * 3, 1, '#8f8469') }
      px(46, 2, 2, 14, '#efe7d6'); px(47, 16, 1, 3, '#2a1d15')
      px(8, 34, 48, 2, '#6e3a2a')
      stars(6, '#e0b560')
      break
    }
    case 'map': {
      px(0, 0, W, H, '#0f2a24')
      const blob = [[14, 10, 30, 6], [10, 16, 40, 8], [12, 24, 36, 6], [20, 30, 22, 4]]
      blob.forEach(([x, y, w, h]) => px(x, y, w, h, '#2f8a5a'))
      px(22, 12, 18, 16, '#3fae6a')
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#e0b560'
        ctx.strokeRect(27.5 - i * 2, 16.5 - i * 1.5, 6 + i * 4, 5 + i * 3)
      }
      ;[[6, 6], [54, 8], [50, 30], [8, 32], [40, 4]].forEach(([x, y], i) => px(x, y, 2, 2, ['#ff8f70', '#7fb0ff', '#ffcf6b', '#c79bff', '#5fd0a8'][i]))
      break
    }
    case 'shield': {
      px(0, 0, W, H, '#0c0f1c')
      for (let i = 0; i < 12; i++) px(r.int(0, W), r.int(0, H), r.int(4, 12), 1, '#16324a')
      const sh = ['###########', '#+++++++++#', '#+++#+#+++#', '#++#####++#', '#+++###+++#', '.#+++#+++#.', '..#+++++#..', '...#+++#...', '....#+#....', '.....#.....']
      sh.forEach((rw, y) => [...rw].forEach((ch, x) => ch !== '.' && px(26 + x, 10 + y * 2, 1, 2, ch === '#' ? '#9aa2b8' : '#1e3b52')))
      px(31, 14, 1, 10, '#efe7d6'); px(32, 14, 5, 3, '#ff8f70')
      px(6, 32, 16, 2, '#3fd08a'); px(44, 8, 12, 2, '#3fd08a')
      break
    }
    case 'eye': {
      px(0, 0, W, H, '#0b1020')
      ctx.fillStyle = '#e8dcc0'
      ctx.beginPath(); ctx.ellipse(32, 20, 18, 9, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#3a7fbf'; ctx.beginPath(); ctx.arc(32, 20, 7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0b1020'; ctx.beginPath(); ctx.arc(32, 20, 3, 0, Math.PI * 2); ctx.fill()
      px(34, 17, 2, 2, '#efe7d6')
      ctx.strokeStyle = '#5fd0a8'
      ctx.strokeRect(4.5, 4.5, 14, 10); ctx.strokeRect(45.5, 25.5, 14, 10)
      px(5, 16, 10, 1, '#5fd0a8'); px(46, 37, 9, 1, '#5fd0a8')
      break
    }
    case 'chart': {
      px(0, 0, W, H, '#0e1424')
      for (let y = 6; y < 36; y += 6) px(4, y, 56, 1, '#1a2340')
      const bars = [10, 16, 12, 22, 18, 26, 20, 30]
      bars.forEach((b, i) => px(7 + i * 7, 36 - b, 4, b, i % 2 ? '#3a7fbf' : '#2a5a8f'))
      let py = 30
      for (let i = 0; i < 8; i++) {
        const ny = 34 - bars[i] - 2
        ctx.strokeStyle = '#e0b560'
        ctx.beginPath(); ctx.moveTo(9 + (i - 1) * 7 + 0.5, py + 0.5); ctx.lineTo(9 + i * 7 + 0.5, ny + 0.5); ctx.stroke()
        py = ny
      }
      px(4, 36, 56, 1, '#6f7898')
      break
    }
  }
  const url = c.toDataURL()
  artCache.set(kind, url)
  return url
}

let portrait: string | null = null
/** The player sprite, used as the portrait in the About journal. */
export function portraitURL() {
  if (!portrait) portrait = buildPlayerFrames().right.idle[0].toDataURL()
  return portrait
}
