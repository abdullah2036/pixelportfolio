/**
 * Level design: where everything lives in the world.
 * x is in world pixels (0..WORLD.width); y is the object's base line.
 * Portfolio *content* lives in src/data/portfolio.ts — this file only places things.
 */
import { worldText } from '../../data/portfolio'
import { pathBottom, pathTop } from './terrain'

export type PanelId = 'about' | 'projects' | 'skills' | 'contact' | 'resume'

export interface InteractableDef {
  id: string
  /** text in the floating prompt, e.g. "[E] Projects" */
  label: string
  x: number
  /** world y the prompt floats at */
  promptY: number
  /** horizontal activation distance */
  radius: number
  panel?: PanelId
  dialogue?: string[]
  speaker?: string
  /** where the player walks to when this is picked from the map / tapped */
  stand: { x: number; depth: number }
  /** clickable area in world space (for tap / click to walk) */
  hit: { x: number; y: number; w: number; h: number }
}

const back = (x: number) => pathTop(x) - 0.5

export const PLACES = {
  telescope: { x: 104, y: back(104) },
  aboutSign: { x: 196, y: back(196) },
  journal: { x: 226, y: pathTop(226) + 2 },
  cat: { x: 258, y: pathTop(258) + 3 },
  tent: { x: 300, y: back(300) },
  backpack: { x: 339, y: pathTop(339) + 1.5 },
  campLantern: { x: 358, y: back(358) },
  carvedSign: { x: 398, y: back(398) },
  bench: { x: 468, y: pathTop(468) + 2 },
  campfire: { x: 484, y: pathBottom(484) - 5 },
  laptopCrate: { x: 516, y: pathTop(516) + 2.5 },
  board: { x: 634, y: back(634) },
  mugStump: { x: 684, y: pathTop(684) + 2 },
  dockLantern: { x: 1098, y: back(1098) },
  mailbox: { x: 1134, y: back(1134) },
  resumeSign: { x: 1166, y: back(1166) },
  boat: { x: 1046, y: 269 },
  skillsSign: { x: 1500, y: back(1500) },
  workshop: { x: 1604, y: back(1604) },
  fox: { x: 1693, y: pathTop(1693) + 3 },
  woodpile: { x: 1716, y: back(1716) },
  chess: { x: 1752, y: pathTop(1752) + 2 },
  waterfall: { x: 1992, w: 28 },
  contactSign: { x: 2322, y: back(2322) },
  cabin: { x: 2412, y: back(2412) },
  owlTree: { x: 2490, y: back(2490) },
  flag: { x: 2516, y: back(2516) },
}

export const SPAWN = { x: 424, depth: 0.55 }

export const ZONES = [
  { id: 'pines', name: 'Whispering Pines', from: 0, to: 170 },
  { id: 'camp', name: 'The Campsite', from: 170, to: 870 },
  { id: 'dock', name: 'Moonlit Boardwalk', from: 870, to: 1420 },
  { id: 'workshop', name: 'The Workshop', from: 1420, to: 1890 },
  { id: 'falls', name: 'Waterfall Bridge', from: 1890, to: 2110 },
  { id: 'cabin', name: 'Cliffside Cabin', from: 2110, to: 99999 },
]

/** Thoughts pop up above the player when they walk past a spot. */
export const THOUGHTS = [
  { id: 'intro', x: 410, radius: 46, text: worldText.intro },
  { id: 'lake', x: 1252, radius: 34, text: worldText.lake },
  { id: 'stairs', x: 2150, radius: 24, text: worldText.stairs },
]

/** Solid things the player walks around (ellipses in path space). */
export const OBSTACLES = [{ x: 484, y: pathBottom(484) - 6, rx: 13, ry: 4.5 }]

const dlg = (id: string, label: string, x: number, promptY: number, lines: string[], radius = 16, speaker?: string): InteractableDef => ({
  id,
  label,
  x,
  promptY,
  radius,
  dialogue: lines,
  speaker,
  stand: { x: x - 16, depth: 0.7 },
  hit: { x: x - 10, y: promptY + 4, w: 20, h: 20 },
})

export const INTERACTABLES: InteractableDef[] = [
  {
    id: 'about', label: 'About Me', panel: 'about', x: 205, promptY: 178, radius: 34,
    stand: { x: 212, depth: 0.55 }, hit: { x: 170, y: 184, w: 70, h: 32 },
  },
  {
    id: 'projects', label: 'Projects', panel: 'projects', x: 634, promptY: 138, radius: 46,
    stand: { x: 626, depth: 0.5 }, hit: { x: 596, y: 146, w: 76, h: 66 },
  },
  {
    id: 'resume', label: 'Resume', panel: 'resume', x: 1146, promptY: 214, radius: 34,
    stand: { x: 1140, depth: 0.6 }, hit: { x: 1120, y: 222, w: 64, h: 24 },
  },
  {
    id: 'skills', label: 'Skills', panel: 'skills', x: 1590, promptY: 126, radius: 72,
    stand: { x: 1590, depth: 0.5 }, hit: { x: 1484, y: 132, w: 186, h: 80 },
  },
  {
    id: 'contact', label: 'Contact', panel: 'contact', x: 2372, promptY: 90, radius: 64,
    stand: { x: 2380, depth: 0.5 }, hit: { x: 2300, y: 50, w: 170, h: 92 },
  },
  dlg('telescope', 'Look', 104, 186, worldText.telescope, 18),
  dlg('cat', 'Pet', 258, 204, worldText.cat, 14, 'Camp cat'),
  dlg('backpack', 'Inspect', 339, 198, worldText.backpack, 12),
  dlg('laptop', 'Laptop', 516, 188, worldText.laptop, 14),
  dlg('mug', 'Inspect', 684, 194, worldText.mug, 13),
  dlg('boat', 'Inspect', 1046, 240, worldText.boat, 20),
  dlg('fox', 'Pet', 1693, 200, worldText.fox, 14, 'Fox'),
  dlg('chess', 'Inspect', 1752, 198, worldText.chess, 13),
  dlg('owl', 'Listen', 2490, 92, worldText.owl, 18, 'Owl'),
  dlg('flag', 'Read', 2516, 118, worldText.flag, 12),
]

export const panelTargets: Record<PanelId, string> = {
  about: 'about',
  projects: 'projects',
  skills: 'skills',
  contact: 'contact',
  resume: 'resume',
}
