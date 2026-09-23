/**
 * The walkable path is a band with a front edge (`bottom`) and a depth.
 * The player stores a 0..1 depth fraction, so slopes and stairs "just work".
 *
 *   top(x)    ─────────  back edge of the path (further from the camera)
 *   bottom(x) ─────────  front edge of the path (cliff lip)
 */
import { WORLD } from '../config'

/** [x, bottom, depth] control points, linearly interpolated. */
export const PATH_POINTS: [number, number, number][] = [
  [0, 236, 24],
  [860, 236, 24],
  [900, 241, 18],
  [962, 256, 12],
  [1318, 256, 12],
  [1380, 241, 18],
  [1420, 236, 24],
  [1944, 236, 22],
  [1954, 236, 14],
  [2046, 236, 14],
  [2056, 236, 20],
  [2112, 236, 16],
  [2272, 164, 16],
  [2292, 164, 22],
  [WORLD.width, 164, 22],
]

function sample(x: number, idx: 1 | 2) {
  const p = PATH_POINTS
  if (x <= p[0][0]) return p[0][idx]
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [x0] = p[i - 1], [x1] = p[i]
      const t = (x - x0) / (x1 - x0 || 1)
      return p[i - 1][idx] + (p[i][idx] - p[i - 1][idx]) * t
    }
  }
  return p[p.length - 1][idx]
}

/** Special stretches of path that are drawn as constructed surfaces. */
export const SURFACES = {
  slopeDown: [860, 962] as const,
  boardwalk: [962, 1318] as const,
  slopeUp: [1318, 1420] as const,
  bridge: [1950, 2050] as const,
  stairs: [2112, 2272] as const,
  creek: [1968, 2034] as const,
  cliffWall: [1880, 2300] as const,
}

export const STAIR_STEPS = 16
const [S0, S1] = SURFACES.stairs
const STAIR_FROM = 236, STAIR_TO = 164

/** Stairs are stepped, everything else is interpolated. */
export const pathBottom = (x: number) => {
  if (x > S0 && x < S1) {
    const k = Math.min(STAIR_STEPS, Math.floor(((x - S0) / (S1 - S0)) * STAIR_STEPS) + 1)
    return STAIR_FROM - ((STAIR_FROM - STAIR_TO) * k) / STAIR_STEPS
  }
  return sample(x, 1)
}
export const pathDepth = (x: number) => sample(x, 2)
export const pathTop = (x: number) => pathBottom(x) - pathDepth(x)
export const feetY = (x: number, depthT: number) => pathBottom(x) - depthT * pathDepth(x)
