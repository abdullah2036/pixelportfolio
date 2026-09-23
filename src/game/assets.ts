/**
 * ─────────────────────────────────────────────────────────────
 *  ASSET OVERRIDES
 *  Every piece of art in the world is generated in code, so the site
 *  works with zero image files. To use hand-made pixel art instead,
 *  drop a PNG into /public/assets/... and put its path here.
 *  `null` = keep the procedural version.
 * ─────────────────────────────────────────────────────────────
 *
 *  Conventions
 *  - Draw at 1x (world pixels). The engine scales everything up.
 *  - Object sprites are anchored bottom-centre on their spot in layout.ts.
 *  - Sprite sheets: one row per animation, frames left → right, facing right.
 */

export interface SheetSpec {
  src: string
  frameWidth: number
  frameHeight: number
  animations: { idle: { row: number; frames: number }; walk: { row: number; frames: number } }
}

export interface LayerSpec {
  src: string
  /** world y of the image's bottom edge at the reference camera */
  bottomY: number
}

export const ASSET_OVERRIDES = {
  characters: {
    /** e.g. { src: 'assets/characters/player.png', frameWidth: 16, frameHeight: 24, animations: { idle: { row: 0, frames: 2 }, walk: { row: 1, frames: 4 } } } */
    player: null as SheetSpec | null,
  },
  environment: {
    /** Parallax layers. Width should be at least worldWidth * parallax + 900. */
    mountains: null as LayerSpec | null, // e.g. { src: 'assets/environment/mountains.png', bottomY: 196 }
    farForest: null as LayerSpec | null,
    midForest: null as LayerSpec | null,
  },
  objects: {
    tent: null as string | null, // 'assets/objects/tent.png'
    projectBoard: null as string | null,
    workshop: null as string | null,
    cabin: null as string | null,
    campfireBase: null as string | null,
    mailbox: null as string | null,
    telescope: null as string | null,
    rowboat: null as string | null,
  },
  audio: {
    /** Looping ambience file. When null the ambience is synthesised live. */
    nature: null as string | null, // 'assets/audio/night-forest.mp3'
    /** Looping music file. When null a soft lo-fi loop is synthesised live. */
    music: null as string | null, // 'assets/audio/lofi.mp3'
  },
}

export const assetUrl = (p: string) => (/^(https?:)?\/\//.test(p) ? p : import.meta.env.BASE_URL + p.replace(/^\//, ''))

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.warn(`[assets] could not load ${src} — using the generated version`)
      resolve(null)
    }
    img.src = assetUrl(src)
  })
}

/** Loads every non-null override in parallel; failures fall back silently. */
export async function loadOverrides() {
  const out: Record<string, HTMLImageElement> = {}
  const jobs: Promise<void>[] = []
  const add = (key: string, src: string | null | undefined) => {
    if (!src) return
    jobs.push(loadImage(src).then((img) => { if (img) out[key] = img }))
  }
  add('player', ASSET_OVERRIDES.characters.player?.src)
  for (const [k, v] of Object.entries(ASSET_OVERRIDES.environment)) add(k, v?.src)
  for (const [k, v] of Object.entries(ASSET_OVERRIDES.objects)) add(k, v)
  await Promise.all(jobs)
  return out
}

/** Cuts a sprite sheet row into frames. */
export function sliceSheet(img: HTMLImageElement, spec: SheetSpec, row: number, frames: number) {
  const out: HTMLCanvasElement[] = []
  for (let i = 0; i < frames; i++) {
    const c = document.createElement('canvas')
    c.width = spec.frameWidth
    c.height = spec.frameHeight
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, i * spec.frameWidth, row * spec.frameHeight, spec.frameWidth, spec.frameHeight, 0, 0, spec.frameWidth, spec.frameHeight)
    out.push(c)
  }
  return out
}
