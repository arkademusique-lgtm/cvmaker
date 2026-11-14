// Polyphonic wavetable + FM synthesizer ("Serum-like" architecture, Web Audio).
import { getWave } from './wavetables.js';
import { mtof, expMap, clamp, driveCurve, getNoise, releaseParam, deepClone } from '../util.js';

export const DEFAULT_PATCH = {
  name: 'Init',
  oscA: { on: true, table: 'basic', pos: 0.67, oct: 0, semi: 0, fine: 0, level: 0.7, unison: 1, detune: 0.2, spread: 0.6 },
  oscB: { on: false, table: 'basic', pos: 0.33, oct: 0, semi: 0, fine: 0, level: 0.5, unison: 1, detune: 0.2, spread: 0.6 },
  sub: { level: 0, oct: -1, wave: 'sine' },
  noise: { level: 0 },
  fm: 0,
  filter: { type: 'lowpass', cutoff: 0.75, res: 1, drive: 0, envAmt: 0.2, keytrack: 0.3 },
  ampEnv: { a: 0.005, d: 0.3, s: 0.8, r: 0.25 },
  filtEnv: { a: 0.005, d: 0.35, s: 0.2, r: 0.3 },
  lfo1: { rate: 3, depth: 0, dest: 'cutoff', wave: 'sine' },
  lfo2: { rate: 5, depth: 0, dest: 'pitch', wave: 'triangle' },
  wtLfo: { rate: 0.3, depth: 0 },
  mono: false, glide: 0.05, volume: 0.7, pan: 0, velSens: 0.6,
};

export function mergePatch(p) {
  const out = deepClone(DEFAULT_PATCH);
  for (const [k, v] of Object.entries(p || {})) out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...out[k], ...v } : v;
  return out;
}

const LFO_DEST = { pitch: 'Hauteur', cutoff: 'Filtre', amp: 'Volume (trémolo)', pan: 'Panoramique', fm: 'FM' };
export const LFO_DESTS = Object.entries(LFO_DEST);

export class Synth {
  constructor(ctx, dest, patch) {
    this.ctx = ctx;
    this.patch = mergePatch(patch);
    this.out = ctx.createGain();
    this.panner = ctx.createStereoPanner();
    this.out.connect(this.panner).connect(dest);
    this.voices = [];
    this.held = new Map();
    this.lfos = [this.makeLfo(this.patch.lfo1), this.makeLfo(this.patch.lfo2)];
    this.wtPhase = 0; this._rel = 0;
    this.applyGlobal();
    this.wtTimer = setInterval(() => this.wtTick(), 40);
  }
  makeLfo(cfg) { const o = this.ctx.createOscillator(); o.type = cfg.wave; o.frequency.value = cfg.rate; o.start(); return o; }
  applyGlobal() {
    const p = this.patch;
    this.out.gain.setTargetAtTime(p.volume, this.ctx.currentTime, 0.02);
    this.panner.pan.setTargetAtTime(p.pan, this.ctx.currentTime, 0.02);
    [p.lfo1, p.lfo2].forEach((c, i) => { this.lfos[i].type = c.wave; this.lfos[i].frequency.setTargetAtTime(c.rate, this.ctx.currentTime, 0.02); });
  }
  setPatch(patch) { this.allOff(); this.patch = mergePatch(patch); this.applyGlobal(); }

  /** Set param by path, e.g. 'filter.cutoff'. Live-updates running voices where possible. */
  set(path, value) {
    const [a, b] = path.split('.');
    if (b) this.patch[a][b] = value; else this.patch[a] = value;
    const t = this.ctx.currentTime, p = this.patch;
    if (['volume', 'pan', 'lfo1', 'lfo2'].includes(a)) this.applyGlobal();
    for (const v of this.voices) {
      if (a === 'filter' && (b === 'cutoff' || b === 'keytrack')) v.filter.frequency.setTargetAtTime(this.cutoffFor(v.note), t, 0.01);
      if (a === 'filter' && b === 'res') v.filter.Q.setTargetAtTime(p.filter.res, t, 0.01);
      if (a === 'filter' && b === 'type') v.filter.type = value;
      if ((a === 'oscA' || a === 'oscB') && b === 'pos') for (const o of v.oscs) if (o.which === a) o.osc.setPeriodicWave(getWave(this.ctx, p[a].table, p[a].pos));
      if ((a === 'oscA' || a === 'oscB') && b === 'level') v[a + 'Gain'] && v[a + 'Gain'].gain.setTargetAtTime(p[a].level / Math.sqrt(p[a].unison), t, 0.01);
      if (a === 'fm' && v.fmGain) v.fmGain.gain.setTargetAtTime(p.fm * mtof(v.note) * 4, t, 0.01);
      if (a.startsWith('lfo') && v.lfoGains) this.updateLfoGains(v);
      if (a === 'sub' && b === 'level' && v.subGain) v.subGain.gain.setTargetAtTime(p.sub.level, t, 0.01);
      if (a === 'noise' && v.noiseGain) v.noiseGain.gain.setTargetAtTime(p.noise.level, t, 0.01);
    }
  }
  cutoffFor(note) { const f = this.patch.filter; return clamp(expMap(f.cutoff, 25, 20000) * Math.pow(2, ((note - 60) / 12) * f.keytrack), 20, 20000); }
  lfoScale(dest, depth) { return { pitch: depth * 1200, cutoff: depth * 4800, amp: depth * 0.5, pan: depth, fm: depth * 400 }[dest] ?? 0; }
  updateLfoGains(v) {
    const t = this.ctx.currentTime;
    [this.patch.lfo1, this.patch.lfo2].forEach((c, i) => {
      for (const [dest, g] of Object.entries(v.lfoGains[i])) g.gain.setTargetAtTime(dest === c.dest ? this.lfoScale(dest, c.depth) : 0, t, 0.02);
    });
  }

  noteOn(note, vel = 1, t = this.ctx.currentTime, slide = false) {
    const p = this.patch, ctx = this.ctx;
    vel = 1 - p.velSens + p.velSens * vel;
    if (p.mono && this.voices.length) {
      const v = this.voices[this.voices.length - 1];
      if (!v.released || slide) {
        const gl = slide || !v.released ? Math.max(0.002, p.glide) : 0.002;
        for (const o of v.oscs) o.osc.frequency.setTargetAtTime(mtof(note + o.semis), t, gl / 3);
        v.filter.frequency.setTargetAtTime(this.cutoffFor(note), t, gl / 3);
        v.note = note;
        if (v.released) { this.reattack(v, vel, t); }
        return v;
      }
    }
    if (p.mono) this.voices.forEach((v) => this.noteOff(v, t, 0.005));
    if (this.voices.length >= 24) this.noteOff(this.voices[0], t, 0.01);

    const v = { note, oscs: [], stops: [], released: false };
    const mix = ctx.createGain();
    let pre = mix;
    if (p.filter.drive > 0) { const ws = ctx.createWaveShaper(); ws.curve = driveCurve(p.filter.drive); ws.oversample = '2x'; mix.connect(ws); pre = ws; }
    const filter = ctx.createBiquadFilter(); filter.type = p.filter.type; filter.Q.value = p.filter.res;
    filter.frequency.value = this.cutoffFor(note);
    const trem = ctx.createGain(); trem.gain.value = 1;
    const vca = ctx.createGain(); vca.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pre.connect(filter); filter.connect(trem); trem.connect(vca); vca.connect(pan); pan.connect(this.out);
    Object.assign(v, { mix, filter, trem, vca, pan });

    const mkOscs = (which) => {
      const c = p[which]; if (!c.on) return [];
      const g = ctx.createGain(); g.gain.value = c.level / Math.sqrt(c.unison); v[which + 'Gain'] = g; g.connect(mix);
      const list = [];
      for (let i = 0; i < c.unison; i++) {
        const o = ctx.createOscillator(); o.setPeriodicWave(getWave(ctx, c.table, c.pos));
        const semis = c.oct * 12 + c.semi + c.fine / 100;
        o.frequency.value = mtof(note + semis);
        const spreadPos = c.unison > 1 ? (i / (c.unison - 1)) * 2 - 1 : 0;
        o.detune.value = spreadPos * c.detune * 60 + (c.unison > 1 ? (Math.random() - 0.5) * 4 : 0);
        const op = ctx.createStereoPanner(); op.pan.value = spreadPos * c.spread;
        o.connect(op).connect(g);
        o.start(t, 0);
        v.oscs.push({ osc: o, semis, which }); v.stops.push(o); list.push(o);
      }
      return list;
    };
    const aList = mkOscs('oscA');
    const bList = mkOscs('oscB');
    if (p.fm > 0 && bList.length && aList.length) {
      const fmGain = ctx.createGain(); fmGain.gain.value = p.fm * mtof(note) * 4; v.fmGain = fmGain;
      bList.forEach((b) => b.connect(fmGain)); aList.forEach((a) => fmGain.connect(a.frequency));
    }
    if (p.sub.level > 0) {
      const s = ctx.createOscillator(); s.type = p.sub.wave; const semis = p.sub.oct * 12; s.frequency.value = mtof(note + semis);
      const sg = ctx.createGain(); sg.gain.value = p.sub.level; s.connect(sg).connect(mix); s.start(t); v.subGain = sg;
      v.oscs.push({ osc: s, semis, which: 'sub' }); v.stops.push(s);
    }
    if (p.noise.level > 0) {
      const n = ctx.createBufferSource(); n.buffer = getNoise(ctx); n.loop = true; const ng = ctx.createGain(); ng.gain.value = p.noise.level * 0.5;
      n.connect(ng).connect(mix); n.start(t, Math.random()); v.noiseGain = ng; v.stops.push(n);
    }
    // LFO routing (per voice gains so depth/dest changes are live)
    v.lfoGains = this.lfos.map((lfo) => {
      const gs = {};
      const targets = { pitch: v.oscs.map((o) => o.osc.detune), cutoff: [filter.detune], amp: [trem.gain], pan: [pan.pan], fm: v.fmGain ? [v.fmGain.gain] : [] };
      for (const [dest, params] of Object.entries(targets)) { const g = ctx.createGain(); g.gain.value = 0; lfo.connect(g); params.forEach((pp) => g.connect(pp)); gs[dest] = g; }
      return gs;
    });
    this.updateLfoGains(v);
    if (p.lfo1.dest === 'amp' || p.lfo2.dest === 'amp') trem.gain.value = 1 - Math.max(p.lfo1.dest === 'amp' ? p.lfo1.depth : 0, p.lfo2.dest === 'amp' ? p.lfo2.depth : 0) * 0.5;

    this.reattack(v, vel, t);
    this.voices.push(v);
    return v;
  }
  reattack(v, vel, t) {
    const { ampEnv: ae, filtEnv: fe, filter: f } = this.patch;
    v.released = false; v.vel = vel;
    const g = v.vca.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value > 0.0001 && v.started ? g.value : 0, t);
    g.linearRampToValueAtTime(vel, t + Math.max(0.002, ae.a));
    g.setTargetAtTime(vel * ae.s, t + Math.max(0.002, ae.a), Math.max(0.005, ae.d / 3));
    const d = v.filter.detune, amt = f.envAmt * 7200;
    d.cancelScheduledValues(t); d.setValueAtTime(0, t);
    d.linearRampToValueAtTime(amt, t + Math.max(0.002, fe.a));
    d.setTargetAtTime(amt * fe.s, t + Math.max(0.002, fe.a), Math.max(0.005, fe.d / 3));
    v.started = true;
  }
  noteOff(v, t = this.ctx.currentTime, forceR) {
    if (!v || v.released === 'dead') return;
    const r = forceR ?? Math.max(0.01, this.patch.ampEnv.r), fr = forceR ?? Math.max(0.01, this.patch.filtEnv.r);
    v.released = true;
    releaseParam(v.vca.gain, t, 0, r / 4);
    releaseParam(v.filter.detune, t, 0, fr / 4);
    const end = t + r * 1.6 + 0.05;
    for (const s of v.stops) { try { s.stop(end); } catch (e) { /* already stopped */ } }
    const id = ++this._rel;
    v.relId = id;
    setTimeout(() => {
      if (v.relId !== id || !v.released) return;
      v.released = 'dead';
      this.voices = this.voices.filter((x) => x !== v);
      try { v.pan.disconnect(); } catch (e) { /* ignore */ }
    }, (end - this.ctx.currentTime) * 1000 + 100);
  }
  /** Live play helpers */
  keyDown(note, vel = 1) { if (this.held.has(note)) this.noteOff(this.held.get(note)); this.held.set(note, this.noteOn(note, vel)); }
  keyUp(note) {
    const v = this.held.get(note); this.held.delete(note);
    if (!v) return;
    if (this.patch.mono && this.held.size) { const last = [...this.held.keys()].pop(); this.noteOn(last, v.vel, this.ctx.currentTime, true); this.held.set(last, v); return; }
    this.noteOff(v);
  }
  play(note, vel, t, dur, slide) { const v = this.noteOn(note, vel, t, slide); v.relId = undefined; this.scheduleOff(v, t + dur); return v; }
  scheduleOff(v, t) {
    const token = (v.offToken = (v.offToken || 0) + 1);
    const wait = (t - this.ctx.currentTime) * 1000 - 30;
    setTimeout(() => { if (v.offToken === token) this.noteOff(v, Math.max(t, this.ctx.currentTime)); }, Math.max(0, wait));
  }
  allOff() { for (const v of [...this.voices]) this.noteOff(v, this.ctx.currentTime, 0.01); this.held.clear(); }
  wtTick() {
    const w = this.patch.wtLfo; if (!w.depth || !this.voices.length) return;
    this.wtPhase += 0.04 * w.rate * Math.PI * 2;
    const off = Math.sin(this.wtPhase) * w.depth * 0.5;
    for (const which of ['oscA', 'oscB']) {
      const c = this.patch[which]; if (!c.on) continue;
      const wave = getWave(this.ctx, c.table, clamp(c.pos + off, 0, 1));
      for (const v of this.voices) for (const o of v.oscs) if (o.which === which) o.osc.setPeriodicWave(wave);
    }
  }
  destroy() { this.allOff(); clearInterval(this.wtTimer); this.lfos.forEach((l) => l.stop()); this.panner.disconnect(); }
}
