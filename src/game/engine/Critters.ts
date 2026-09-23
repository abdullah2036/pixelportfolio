/** Small ambient animals with just enough behaviour to feel alive. */
import type { Img } from '../render/pixel'
import { feetY } from '../world/terrain'

export interface Drawable {
  /** sort key: base line in world y */
  y: number
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number): void
  update?(dt: number, t: number, playerX: number, playerY: number): void
}

const blit = (ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, camX: number, camY: number) =>
  ctx.drawImage(img, Math.round(x - img.width / 2 - camX), Math.round(y - img.height + 1 - camY))

/** Breathing loop between two frames (cat, fox). */
export class Sleeper implements Drawable {
  x: number
  y: number
  frames: Img[]
  period: number
  zzz: boolean
  constructor(frames: Img[], x: number, y: number, period = 1.6, zzz = true) {
    this.frames = frames
    this.x = x
    this.y = y
    this.period = period
    this.zzz = zzz
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const f = Math.floor(t / this.period) % 2
    blit(ctx, this.frames[f], this.x, this.y, camX, camY)
    if (this.zzz) {
      // a tiny drifting "z"
      const k = (t % 3.2) / 3.2
      if (k < 0.8) {
        const zx = Math.round(this.x - 6 - camX - k * 3), zy = Math.round(this.y - 10 - camY - k * 8)
        ctx.globalAlpha = 1 - k / 0.8
        ctx.fillStyle = '#9aa6d8'
        ctx.fillRect(zx, zy, 3, 1)
        ctx.fillRect(zx + 1, zy + 1, 1, 1)
        ctx.fillRect(zx, zy + 2, 3, 1)
        ctx.globalAlpha = 1
      }
    }
  }
}

export class Owl implements Drawable {
  x: number
  y: number
  frames: Img[]
  private nextBlink = 2
  private blinkUntil = 0
  constructor(frames: Img[], x: number, y: number) {
    this.frames = frames
    this.x = x
    this.y = y
  }
  update(_dt: number, t: number) {
    if (t > this.nextBlink) {
      this.blinkUntil = t + 0.16
      this.nextBlink = t + 2.5 + Math.random() * 4
    }
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    blit(ctx, this.frames[t < this.blinkUntil ? 1 : 0], this.x, this.y, camX, camY)
  }
}

export class Rabbit implements Drawable {
  x: number
  depth = 0.3
  y = 0
  private frames: { left: Img[]; right: Img[] }
  private dir: 1 | -1 = -1
  private state: 'sit' | 'hop' = 'sit'
  private timer = 2
  private hopT = 0
  private hopFrom = 0
  private hopTo = 0
  private min: number
  private max: number
  constructor(frames: { left: Img[]; right: Img[] }, x: number, min: number, max: number) {
    this.frames = frames
    this.x = x
    this.min = min
    this.max = max
    this.y = feetY(x, this.depth)
  }
  update(dt: number, _t: number, px: number) {
    const near = Math.abs(px - this.x) < 42
    this.timer -= dt
    if (this.state === 'sit' && (this.timer <= 0 || near)) {
      let dir: 1 | -1 = Math.random() < 0.5 ? -1 : 1
      if (near) dir = px < this.x ? 1 : -1
      if (this.x < this.min + 10) dir = 1
      if (this.x > this.max - 10) dir = -1
      this.dir = dir
      this.state = 'hop'
      this.hopT = 0
      this.hopFrom = this.x
      this.hopTo = Math.max(this.min, Math.min(this.max, this.x + dir * (near ? 16 : 7 + Math.random() * 6)))
    }
    if (this.state === 'hop') {
      this.hopT += dt / (near ? 0.26 : 0.36)
      const k = Math.min(1, this.hopT)
      this.x = this.hopFrom + (this.hopTo - this.hopFrom) * k
      if (k >= 1) {
        this.state = 'sit'
        this.timer = near ? 0.15 : 1.5 + Math.random() * 4
      }
    }
    this.y = feetY(this.x, this.depth)
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const set = this.dir === 1 ? this.frames.right : this.frames.left
    let img = set[Math.floor(t * 0.7) % 3 === 0 ? 1 : 0]
    let lift = 0
    if (this.state === 'hop') {
      img = set[2]
      lift = Math.round(Math.sin(Math.min(1, this.hopT) * Math.PI) * 4)
    }
    blit(ctx, img, this.x, this.y - lift, camX, camY)
  }
}

export class Duck implements Drawable {
  x: number
  y: number
  private frames: { left: Img[]; right: Img[] }
  private dir: 1 | -1 = -1
  private min: number
  private max: number
  constructor(frames: { left: Img[]; right: Img[] }, x: number, y: number, min: number, max: number) {
    this.frames = frames
    this.x = x
    this.y = y
    this.min = min
    this.max = max
  }
  update(dt: number) {
    this.x += this.dir * 4.5 * dt
    if (this.x < this.min) this.dir = 1
    if (this.x > this.max) this.dir = -1
  }
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, t: number) {
    const set = this.dir === 1 ? this.frames.right : this.frames.left
    const bob = Math.sin(t * 1.6) > 0.6 ? 1 : 0
    blit(ctx, set[Math.floor(t * 0.5) % 5 === 0 ? 1 : 0], this.x, this.y + bob, camX, camY)
    // wake ripples
    const sx = Math.round(this.x - camX), sy = Math.round(this.y + 2 - camY)
    const k = (t * 0.8) % 1
    ctx.fillStyle = `rgba(120,140,200,${(0.35 * (1 - k)).toFixed(3)})`
    const spread = Math.round(4 + k * 6)
    ctx.fillRect(sx - spread - this.dir * 3, sy, 3, 1)
    ctx.fillRect(sx + spread - this.dir * 3 - 2, sy, 3, 1)
  }
}
