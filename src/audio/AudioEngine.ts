/**
 * Ambient sound, synthesised live with the Web Audio API — no files needed.
 *   nature: crickets, soft wind, lake lapping, waterfall and fire (both louder
 *           as you walk closer), and a distant owl now and then
 *   music:  a slow lo-fi loop (warm keys, round bass, brushed drums, vinyl hiss)
 * If you set ASSET_OVERRIDES.audio.nature / .music, those files are looped instead.
 * Nothing plays until the visitor turns sound on.
 */
import { ASSET_OVERRIDES, assetUrl } from '../game/assets'

export interface Mix {
  fire: number
  water: number
  lake: number
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

// ii – V – I – vi in C, rootless voicings
const PROGRESSION = [
  { bass: 38, keys: [53, 57, 60, 64] }, // Dm9
  { bass: 43, keys: [53, 59, 64, 69] }, // G13
  { bass: 36, keys: [52, 55, 59, 62] }, // Cmaj9
  { bass: 45, keys: [55, 59, 60, 64] }, // Am9
]
const PENTA = [69, 72, 74, 76, 79, 81]

export class AudioEngine {
  private ctx: AudioContext
  private master: GainNode
  private natureBus: GainNode
  private musicBus: GainNode
  private noise: AudioBuffer
  private fireGain: GainNode
  private waterGain: GainNode
  private lakeGain: GainNode
  private keysBus: GainNode
  private wow: OscillatorNode
  private wowDepth: GainNode
  private delay: DelayNode
  private timer = 0
  private started = false
  private nextStep = 0
  private step = 0
  private nextCricket = [0, 0, 0]
  private nextCrackle = 0
  private nextOwl = 0
  private nextVinyl = 0
  private natureOn = true
  private musicOn = true
  private volume = 0.7
  private enabled = false
  private fileNature: HTMLAudioElement | null = null
  private fileMusic: HTMLAudioElement | null = null
  private mix: Mix = { fire: 0.6, water: 0, lake: 0.35 }

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AC({ latencyHint: 'playback' })
    const c = this.ctx
    const comp = c.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    this.master = c.createGain()
    this.master.gain.value = 0
    this.master.connect(comp).connect(c.destination)
    this.natureBus = c.createGain()
    this.natureBus.connect(this.master)
    const musicTone = c.createBiquadFilter()
    musicTone.type = 'lowpass'
    musicTone.frequency.value = 3400
    this.musicBus = c.createGain()
    this.musicBus.gain.value = 0.42
    this.musicBus.connect(musicTone).connect(this.master)

    this.noise = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

    this.fireGain = c.createGain()
    this.waterGain = c.createGain()
    this.lakeGain = c.createGain()
    for (const g of [this.fireGain, this.waterGain, this.lakeGain]) g.connect(this.natureBus)

    // keys run through a warm lowpass and a gentle echo
    this.keysBus = c.createGain()
    const keysLp = c.createBiquadFilter()
    keysLp.type = 'lowpass'
    keysLp.frequency.value = 1900
    this.keysBus.connect(keysLp).connect(this.musicBus)
    this.delay = c.createDelay(1)
    this.delay.delayTime.value = 0.42
    const fb = c.createGain()
    fb.gain.value = 0.32
    const dLp = c.createBiquadFilter()
    dLp.type = 'lowpass'
    dLp.frequency.value = 1600
    const wet = c.createGain()
    wet.gain.value = 0.3
    this.delay.connect(dLp).connect(fb).connect(this.delay)
    dLp.connect(wet).connect(this.musicBus)

    // tape wow: a slow shared LFO on every oscillator's detune
    this.wow = c.createOscillator()
    this.wow.frequency.value = 0.45
    this.wowDepth = c.createGain()
    this.wowDepth.gain.value = 7
    this.wow.connect(this.wowDepth)

    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (!this.enabled) return
    if (document.hidden) this.ctx.suspend()
    else this.ctx.resume()
  }

  private noiseSource(loop = true) {
    const s = this.ctx.createBufferSource()
    s.buffer = this.noise
    s.loop = loop
    s.loopStart = Math.random()
    return s
  }

  private startBeds() {
    const c = this.ctx
    const now = c.currentTime
    this.wow.start()

    if (ASSET_OVERRIDES.audio.nature) {
      this.fileNature = this.fileLoop(ASSET_OVERRIDES.audio.nature, this.natureBus)
    } else {
      // wind: filtered noise with a slowly wandering cutoff and level
      const wind = this.noiseSource()
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 480
      lp.Q.value = 0.8
      const lfo = c.createOscillator()
      lfo.frequency.value = 0.05
      const lfoAmt = c.createGain()
      lfoAmt.gain.value = 260
      lfo.connect(lfoAmt).connect(lp.frequency)
      const wg = c.createGain()
      wg.gain.value = 0.05
      const glfo = c.createOscillator()
      glfo.frequency.value = 0.085
      const gAmt = c.createGain()
      gAmt.gain.value = 0.028
      glfo.connect(gAmt).connect(wg.gain)
      wind.connect(lp).connect(wg).connect(this.natureBus)
      wind.start(now)
      lfo.start(now)
      glfo.start(now)

      // waterfall: broadband hiss + low rumble
      const wf = this.noiseSource()
      const hp = c.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 260
      const wlp = c.createBiquadFilter()
      wlp.type = 'lowpass'
      wlp.frequency.value = 2600
      wf.connect(hp).connect(wlp).connect(this.waterGain)
      const rumble = this.noiseSource()
      const rlp = c.createBiquadFilter()
      rlp.type = 'lowpass'
      rlp.frequency.value = 160
      const rg = c.createGain()
      rg.gain.value = 1.6
      rumble.connect(rlp).connect(rg).connect(this.waterGain)
      wf.start(now)
      rumble.start(now)

      // lake lapping: band-passed noise with a slow swell
      const lap = this.noiseSource()
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 650
      bp.Q.value = 1.4
      const lg = c.createGain()
      lg.gain.value = 0.02
      const llfo = c.createOscillator()
      llfo.frequency.value = 0.21
      const lAmt = c.createGain()
      lAmt.gain.value = 0.018
      llfo.connect(lAmt).connect(lg.gain)
      lap.connect(bp).connect(lg).connect(this.lakeGain)
      lap.start(now)
      llfo.start(now)

      // fire bed: soft low roar
      const roar = this.noiseSource()
      const flp = c.createBiquadFilter()
      flp.type = 'lowpass'
      flp.frequency.value = 380
      const fg = c.createGain()
      fg.gain.value = 0.07
      roar.connect(flp).connect(fg).connect(this.fireGain)
      roar.start(now)
    }

    if (ASSET_OVERRIDES.audio.music) {
      this.fileMusic = this.fileLoop(ASSET_OVERRIDES.audio.music, this.musicBus)
    } else {
      const vinyl = this.noiseSource()
      const vbp = c.createBiquadFilter()
      vbp.type = 'bandpass'
      vbp.frequency.value = 3200
      vbp.Q.value = 0.6
      const vg = c.createGain()
      vg.gain.value = 0.006
      vinyl.connect(vbp).connect(vg).connect(this.musicBus)
      vinyl.start(now)
    }

    this.nextStep = now + 0.2
    this.nextCricket = [now + 0.4, now + 1.1, now + 2.3]
    this.nextCrackle = now + 0.1
    this.nextOwl = now + 18
    this.nextVinyl = now + 0.3
    this.timer = window.setInterval(() => this.schedule(), 60)
  }

  private fileLoop(src: string, bus: GainNode) {
    const el = new Audio(assetUrl(src))
    el.loop = true
    el.crossOrigin = 'anonymous'
    const node = this.ctx.createMediaElementSource(el)
    node.connect(bus)
    el.play().catch(() => {})
    return el
  }

  /* ------------------------------------------------------------------ */
  /* scheduling                                                          */
  /* ------------------------------------------------------------------ */

  private schedule() {
    const c = this.ctx
    const horizon = c.currentTime + 0.3
    const synthNature = !ASSET_OVERRIDES.audio.nature
    const synthMusic = !ASSET_OVERRIDES.audio.music

    if (synthNature && this.natureOn) {
      for (let i = 0; i < 3; i++)
        while (this.nextCricket[i] < horizon) {
          this.cricket(this.nextCricket[i], i)
          this.nextCricket[i] += 0.55 + Math.random() * 0.9 + (Math.random() < 0.12 ? 2.5 : 0)
        }
      while (this.nextCrackle < horizon) {
        if (this.mix.fire > 0.02) this.crackle(this.nextCrackle, Math.random() < 0.08)
        this.nextCrackle += Math.random() * Math.random() * 0.35 + 0.02
      }
      if (this.nextOwl < horizon) {
        this.owl(this.nextOwl)
        this.nextOwl += 40 + Math.random() * 45
      }
    }

    if (synthMusic && this.musicOn) {
      const eighth = 60 / 72 / 2
      while (this.nextStep < horizon) {
        this.musicStep(this.nextStep, this.step, eighth)
        this.step = (this.step + 1) % 32
        this.nextStep += eighth
      }
      while (this.nextVinyl < horizon) {
        this.click(this.nextVinyl, 0.012 + Math.random() * 0.02, 2600 + Math.random() * 3000, this.musicBus)
        this.nextVinyl += 0.12 + Math.random() * 0.7
      }
    } else {
      this.nextStep = Math.max(this.nextStep, c.currentTime + 0.1)
    }
  }

  private cricket(t: number, voice: number) {
    const c = this.ctx
    const osc = c.createOscillator()
    osc.frequency.value = [4700, 5150, 4400][voice] + Math.random() * 60
    const g = c.createGain()
    g.gain.value = 0
    const pan = c.createStereoPanner()
    pan.pan.value = [-0.6, 0.55, 0.1][voice]
    const pulses = 3 + Math.floor(Math.random() * 2)
    const vol = 0.009 + Math.random() * 0.005
    for (let i = 0; i < pulses; i++) {
      const p = t + i * 0.042
      g.gain.setValueAtTime(0, p)
      g.gain.linearRampToValueAtTime(vol, p + 0.006)
      g.gain.linearRampToValueAtTime(0, p + 0.026)
    }
    osc.connect(g).connect(pan).connect(this.natureBus)
    osc.start(t)
    osc.stop(t + pulses * 0.042 + 0.05)
  }

  private click(t: number, dur: number, freq: number, dest: AudioNode, level = 0.05) {
    const c = this.ctx
    const s = this.noiseSource(false)
    s.playbackRate.value = 0.6 + Math.random()
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = freq
    const g = c.createGain()
    g.gain.setValueAtTime(level, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(hp).connect(g).connect(dest)
    s.start(t, Math.random() * 2)
    s.stop(t + dur + 0.02)
  }

  private crackle(t: number, pop: boolean) {
    this.click(t, pop ? 0.06 : 0.012 + Math.random() * 0.03, pop ? 900 : 1400 + Math.random() * 2600, this.fireGain, pop ? 0.22 : 0.08 + Math.random() * 0.08)
  }

  private owl(t: number) {
    const c = this.ctx
    const hoot = (at: number, len: number, f: number) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(f, at)
      o.frequency.linearRampToValueAtTime(f * 0.94, at + len)
      const g = c.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.028, at + 0.06)
      g.gain.linearRampToValueAtTime(0, at + len)
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const pan = c.createStereoPanner()
      pan.pan.value = 0.7
      o.connect(g).connect(lp).connect(pan).connect(this.natureBus)
      o.start(at)
      o.stop(at + len + 0.05)
    }
    hoot(t, 0.5, 360)
    hoot(t + 0.75, 0.22, 380)
    hoot(t + 1.05, 0.55, 350)
  }

  private keyNote(t: number, n: number, dur: number, vel: number) {
    const c = this.ctx
    const f = midi(n)
    const car = c.createOscillator()
    car.frequency.value = f
    const mod = c.createOscillator()
    mod.frequency.value = f
    const mg = c.createGain()
    mg.gain.setValueAtTime(f * 1.1, t)
    mg.gain.exponentialRampToValueAtTime(f * 0.06, t + 0.7)
    mod.connect(mg).connect(car.frequency)
    this.wowDepth.connect(car.detune)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.02 * vel, t + 1.2)
    g.gain.setValueAtTime(0.02 * vel, t + dur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7)
    car.connect(g).connect(this.keysBus)
    car.start(t)
    mod.start(t)
    car.stop(t + dur + 0.8)
    mod.stop(t + dur + 0.8)
    car.onended = () => { try { this.wowDepth.disconnect(car.detune) } catch { /* already gone */ } }
  }

  private bell(t: number, n: number) {
    const c = this.ctx
    const f = midi(n)
    const o = c.createOscillator()
    o.frequency.value = f
    const o2 = c.createOscillator()
    o2.frequency.value = f * 3
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.03, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
    const g2 = c.createGain()
    g2.gain.value = 0.15
    o.connect(g)
    o2.connect(g2).connect(g)
    g.connect(this.musicBus)
    g.connect(this.delay)
    o.start(t)
    o2.start(t)
    o.stop(t + 1.7)
    o2.stop(t + 1.7)
  }

  private bass(t: number, n: number, dur: number) {
    const c = this.ctx
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.value = midi(n)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.16, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.06, t + dur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
    o.connect(lp).connect(g).connect(this.musicBus)
    o.start(t)
    o.stop(t + dur + 0.3)
  }

  private kick(t: number, vel = 1) {
    const c = this.ctx
    const o = c.createOscillator()
    o.frequency.setValueAtTime(115, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
    const g = c.createGain()
    g.gain.setValueAtTime(0.32 * vel, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
    o.connect(g).connect(this.musicBus)
    o.start(t)
    o.stop(t + 0.35)
  }

  private snare(t: number) {
    const c = this.ctx
    const s = this.noiseSource(false)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.7
    const g = c.createGain()
    g.gain.setValueAtTime(0.09, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    s.connect(bp).connect(g).connect(this.musicBus)
    s.start(t, Math.random())
    s.stop(t + 0.22)
    const o = c.createOscillator()
    o.frequency.value = 185
    const og = c.createGain()
    og.gain.setValueAtTime(0.05, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    o.connect(og).connect(this.musicBus)
    o.start(t)
    o.stop(t + 0.1)
  }

  private hat(t: number, vel: number) {
    this.click(t, 0.035, 7200, this.musicBus, 0.028 * vel)
  }

  private musicStep(t: number, step: number, eighth: number) {
    const inBar = step % 8
    const bar = Math.floor(step / 8)
    const chord = PROGRESSION[bar]
    const swing = inBar % 2 === 1 ? eighth * 0.18 : 0
    const at = t + swing
    if (inBar === 0) {
      chord.keys.forEach((n, i) => this.keyNote(t + i * 0.028, n, eighth * 3.2, 1))
      this.bass(t, chord.bass, eighth * 3)
    }
    if (inBar === 5) {
      chord.keys.forEach((n, i) => this.keyNote(at + i * 0.02, n, eighth * 2.6, 0.55))
      this.bass(at, chord.bass + (bar === 1 ? 7 : 0), eighth * 1.6)
    }
    if (inBar === 0 || inBar === 4 || (inBar === 3 && Math.random() < 0.35)) this.kick(at, inBar === 3 ? 0.6 : 1)
    if (inBar === 2 || inBar === 6) this.snare(at)
    this.hat(at, inBar % 2 === 0 ? 1 : 0.6)
    if (inBar > 0 && Math.random() < 0.13) this.bell(at, PENTA[Math.floor(Math.random() * PENTA.length)])
  }

  /* ------------------------------------------------------------------ */
  /* public API                                                          */
  /* ------------------------------------------------------------------ */

  async setEnabled(on: boolean) {
    this.enabled = on
    const c = this.ctx
    const now = c.currentTime
    if (on) {
      await c.resume()
      if (!this.started) {
        this.started = true
        this.startBeds()
      }
      this.fileNature?.play().catch(() => {})
      this.fileMusic?.play().catch(() => {})
      this.master.gain.cancelScheduledValues(c.currentTime)
      this.master.gain.setTargetAtTime(this.volume, c.currentTime, 0.4)
      this.applyChannels()
      this.applyMix()
    } else {
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(0, now, 0.15)
      window.setTimeout(() => {
        if (!this.enabled) {
          this.fileNature?.pause()
          this.fileMusic?.pause()
          c.suspend()
        }
      }, 700)
    }
  }

  setChannels(nature: boolean, music: boolean) {
    this.natureOn = nature
    this.musicOn = music
    this.applyChannels()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.enabled) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1)
  }

  setMix(m: Mix) {
    this.mix = m
    if (this.enabled) this.applyMix()
  }

  private applyChannels() {
    const now = this.ctx.currentTime
    this.natureBus.gain.setTargetAtTime(this.natureOn ? 1 : 0, now, 0.3)
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.42 : 0, now, 0.3)
  }

  private applyMix() {
    const now = this.ctx.currentTime
    const m = this.mix
    this.fireGain.gain.setTargetAtTime(0.1 + m.fire * 0.9, now, 0.5)
    this.waterGain.gain.setTargetAtTime(0.004 + m.water * m.water * 0.09, now, 0.5)
    this.lakeGain.gain.setTargetAtTime(0.4 + m.lake * 0.9, now, 0.8)
  }

  dispose() {
    window.clearInterval(this.timer)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.ctx.close()
  }
}
