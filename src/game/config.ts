/** Tunable constants for the world, camera and player. All units are world pixels. */

export const WORLD = {
  width: 2560,
  /** y of the lake surface in the foreground */
  waterY: 262,
  /** ground level the vertical camera is calibrated against */
  baseFeetY: 224,
  leftBound: 44,
  rightBound: 2528,
}

export const VIEW = {
  /** landscape: pick an integer scale so the view is roughly this many pixels tall */
  targetHeight: 270,
  /** portrait: pick an integer scale so the view is roughly this many pixels wide */
  portraitTargetWidth: 210,
  /** distance from the player's feet to the bottom of the screen, as a share of the view height */
  feetFromBottom: 0.3,
  /** touch screens keep more room at the bottom for the on-screen pad */
  feetFromBottomTouchMin: 118,
}

export const PLAYER = {
  walkSpeed: 74,
  runSpeed: 138,
  depthSpeed: 1.9, // depth-fraction per second
  accel: 14,
  spawnX: 424,
  spawnDepth: 0.55,
}

export const CAMERA = {
  followX: 3.2,
  followY: 2.6,
  lookAhead: 26,
}

/** Parallax factors (x, y) for every background layer. 1 = moves with the world. */
export const PARALLAX = {
  sky: [0.03, 0.08],
  mountainsFar: [0.08, 0.16],
  mountainsNear: [0.13, 0.22],
  farForest: [0.24, 0.34],
  farLake: [0.24, 0.34],
  midForest: [0.5, 0.62],
  foreground: [1.28, 1.1],
} as const
