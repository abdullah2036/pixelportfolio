/**
 * The whole world is painted from these ramps.
 * Cold night tones everywhere; warm tones are reserved for light sources.
 */
export const PAL = {
  outline: '#0b0a14',

  sky: ['#050816', '#070b1e', '#0a1028', '#0e1533', '#121b3e', '#172249', '#1c2853'],
  star: ['#5d6796', '#98a3d4', '#d9e0ff', '#fff4d6'],
  moon: { light: '#ece7d2', mid: '#d3cdb4', shade: '#aea88f', crater: '#bdb79e', glow: '#8f9bd4' },
  aurora: ['#1f8f7a', '#2fc596', '#63e6b3', '#3a7fbf', '#6a4fb3'],

  mountFar: { dark: '#1b2352', lit: '#26306a', snow: '#8a97c7', snowShade: '#5a6598', haze: '#1d2656' },
  mountNear: { dark: '#141b40', lit: '#1d2654', snow: '#7583b6', snowShade: '#48548a', haze: '#161d45' },

  farForest: ['#0b1430', '#0e1937', '#12203f'],
  farLake: ['#0a1330', '#0c1736', '#101c3e'],

  midForest: ['#07131c', '#0a1922', '#0e2129', '#142c32', '#1c3b3e'],
  nearTree: ['#061210', '#0a1a17', '#0f251f', '#163228', '#1f4234', '#2a5442'],
  trunk: ['#120c0b', '#1d1411', '#2a1d17', '#3a2a20'],
  leafy: ['#0a1814', '#10221b', '#173024', '#21402e', '#2c523a'],

  grass: ['#0d1f1a', '#122820', '#173226', '#1d3d2d', '#264b36', '#315a40'],
  dirt: ['#1c1717', '#241d1c', '#2e2522', '#392d28', '#46372f'],
  rock: ['#0d1019', '#131725', '#1a1f31', '#21283e', '#2a334c', '#36405c'],
  moss: ['#13261f', '#1a3327', '#244331'],

  water: ['#050a18', '#08102a', '#0b1533', '#0f1b3d', '#172652', '#243669', '#3b5089'],
  waterfall: ['#2f4a7e', '#46659c', '#6585bd', '#93acd8', '#cfdcf5'],

  wood: ['#1c130f', '#281b14', '#35241a', '#452f21', '#583d2a', '#6e4d34'],
  woodLit: ['#4a2e1c', '#6b4127', '#8c5733', '#ad6f40'],
  rope: '#8b7355',
  cloth: ['#3a2a1a', '#5e3c20', '#8a5528', '#b8742f', '#e09a45', '#f5c070'],
  paper: ['#8f8469', '#b3a684', '#d3c7a3', '#e8dfc1'],
  metal: ['#1e2230', '#343a4d', '#555d75', '#8891a8'],

  fire: ['#00000000', '#3a0f0c', '#6e1d12', '#a8331b', '#d95a22', '#f08b2e', '#ffb847', '#ffd97a', '#fff3c4'],
  warm: '#ffb45c',
  window: ['#8a4f1f', '#c9782f', '#f0a84a', '#ffd584'],
  screen: ['#0c1a2a', '#1e3b52', '#3f7a8f', '#9fe3d5'],
}

export type PaletteKey = keyof typeof PAL
