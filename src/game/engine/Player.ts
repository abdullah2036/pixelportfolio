import { PLAYER, WORLD } from '../config'
import type { CharacterFrames } from '../render/sprites/characters'
import { OBSTACLES } from '../world/layout'
import { feetY, pathBottom, pathDepth } from '../world/terrain'
import type { Input } from './Input'

export interface AutoTarget {
  x: number
  depth: number
  run?: boolean
  onArrive?: () => void
}

export class Player {
  x: number
  depth: number
  vx = 0
  vDepth = 0
  facing: 1 | -1 = 1
  animT = 0
  walking = false
  alpha = 1
  drawY: number
  auto: AutoTarget | null = null
  frames: { right: CharacterFrames; left: CharacterFrames }

  constructor(frames: { right: CharacterFrames; left: CharacterFrames }, x: number, depth: number) {
    this.frames = frames
    this.x = x
    this.depth = depth
    this.drawY = feetY(x, depth)
  }

  get y() {
    return feetY(this.x, this.depth)
  }

  place(x: number, depth: number) {
    this.x = x
    this.depth = depth
    this.vx = 0
    this.vDepth = 0
    this.drawY = this.y
  }

  update(dt: number, input: Input, frozen: boolean) {
    let ix = 0, iy = 0
    let run = input.run
    if (!frozen) {
      ix = input.axisX
      iy = input.axisY
      if (ix || iy) this.auto = null
      if (this.auto) {
        const dx = this.auto.x - this.x
        const dd = this.auto.depth - this.depth
        run = run || !!this.auto.run
        if (Math.abs(dx) > 1.5) ix = Math.sign(dx) * Math.min(1, Math.abs(dx) / 10 + 0.25)
        if (Math.abs(dd) > 0.04) iy = -Math.sign(dd) * Math.min(1, Math.abs(dd) * 5 + 0.2)
        if (Math.abs(dx) <= 1.5 && Math.abs(dd) <= 0.04) {
          const cb = this.auto.onArrive
          this.auto = null
          ix = iy = 0
          cb?.()
        }
      }
    }

    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed
    const k = Math.min(1, dt * PLAYER.accel)
    this.vx += (ix * speed - this.vx) * k
    // depth speed is normalised so a thin boardwalk doesn't feel faster than the campsite
    const dNorm = 22 / pathDepth(this.x)
    this.vDepth += (-iy * PLAYER.depthSpeed * dNorm * (run ? 1.4 : 1) - this.vDepth) * k
    if (Math.abs(this.vx) < 0.5 && !ix) this.vx = 0
    if (Math.abs(this.vDepth) < 0.01 && !iy) this.vDepth = 0

    let nx = Math.max(WORLD.leftBound, Math.min(WORLD.rightBound, this.x + this.vx * dt))
    let nd = Math.max(0, Math.min(1, this.depth + this.vDepth * dt))

    // walk around solid things (campfire)
    for (const o of OBSTACLES) {
      const py = feetY(nx, nd)
      const ex = (nx - o.x) / o.rx, ey = (py - o.y) / o.ry
      const d = Math.hypot(ex, ey)
      if (d < 1) {
        // push out along the ellipse normal, biased backwards so walking straight slides behind it
        let ux = ex, uy = ey
        if (d < 0.001) { ux = 0; uy = -1 }
        if (uy > -0.35 && Math.abs(this.vx) > 1) uy -= 0.35
        const len = Math.hypot(ux, uy)
        ux /= len
        uy /= len
        nx = o.x + ux * o.rx
        const ny = o.y + uy * o.ry
        nd = Math.max(0, Math.min(1, (pathBottom(nx) - ny) / pathDepth(nx)))
      }
    }

    this.x = nx
    this.depth = nd
    if (this.vx > 4) this.facing = 1
    else if (this.vx < -4) this.facing = -1

    const moving = Math.abs(this.vx) > 6 || Math.abs(this.vDepth) > 0.12
    if (moving !== this.walking) this.animT = 0
    this.walking = moving
    const rate = moving ? 5 + (Math.max(Math.abs(this.vx), Math.abs(this.vDepth) * 40) / PLAYER.walkSpeed) * 3.2 : 1.5
    this.animT += dt * rate

    // ease the drawn height (smooths the stepped stairs)
    const ty = this.y
    this.drawY += (ty - this.drawY) * Math.min(1, dt * 22)
    if (Math.abs(ty - this.drawY) < 0.05) this.drawY = ty
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const set = this.facing === 1 ? this.frames.right : this.frames.left
    const list = this.walking ? set.walk : set.idle
    const img = list[Math.floor(this.animT) % list.length]
    const fx = Math.round(this.x - camX)
    const fy = Math.round(this.drawY - camY)
    ctx.globalAlpha = this.alpha
    // contact shadow
    ctx.fillStyle = 'rgba(2,4,10,0.45)'
    ctx.fillRect(fx - 5, fy, 10, 1)
    ctx.fillRect(fx - 3, fy + 1, 6, 1)
    ctx.drawImage(img, fx - Math.floor(img.width / 2), fy - img.height + 1)
    ctx.globalAlpha = 1
  }

  /** top of the head, for speech bubbles */
  get headY() {
    return this.drawY - 25
  }
}
