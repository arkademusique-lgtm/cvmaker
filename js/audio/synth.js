// Polyphonic wavetable synthesizer, Web Audio.
// 3 wavetable oscillators (each with a warp stage), sub, noise, 2 filters (serial / parallel),
// 3 envelopes, 2 LFOs, 4 macros and a free modulation matrix (any source → any destination).
import { getWave } from './wavetables.js';
import { mtof, expMap, clamp, driveCurve, getNoise, releaseParam, deepClone, crushCurve } from '../util.js';

const OSC = (o) => ({ on: false, table: 'basic', pos: 0.33, oct: 0, semi: 0, fine: 0, level: 0.5, unison: 1, detune: 0.2, spread: 0.6, warp: 'none', warpAmt: 0, ...o });
export const DEFAULT_PATCH = {
  name: 'Init',
  oscA: OSC({ on: true, pos: 0.67, level: 0.7 }), oscB: OSC({}), oscC: OSC({ oct: -1 }),
  sub: { level: 0, oct: -1, wave: 'sine' },
  noise: { level: 0 },
  fm: 0,
  filter: { type: 'lowpass', cutoff: 0.75, res: 1, drive: 0, envAmt: 0.2, keytrack: 0.3 },
  filter2: { on: false, type: 'highpass', cutoff: 0.15, res: 1, envAmt: 0, keytrack: 0, route: 'serial' },
  ampEnv: { a: 0.005, d: 0.3, s: 0.8, r: 0.25 },
  filtEnv: { a: 0.005, d: 0.35, s: 0.2, r: 0.3 },
  modEnv: { a: 0.01, d: 0.5, s: 0, r: 0.3 },
  lfo1: { rate: 3, depth: 0, dest: 'cutoff', wave: 'sine' },
  lfo2: { rate: 5, depth: 0, dest: 'pitch', wave: 'triangle' },
  wtLfo: { rate: 0.3, depth: 0 },
  macros: [0, 0, 0, 0],
  mods: [], // { src, dst, amt (-1..1) }
  mono: false, glide: 0.05, volume: 0.7, pan: 0, velSens: 0.6,
};
export const OSCS = ['oscA', 'oscB', 'oscC'];
export const WARPS = [['none', 'Aucune'], ['fold', 'Wavefold'], ['drive', 'Saturation'], ['crush', 'Bitcrush'], ['fm', 'FM (osc suivant)'], ['ring', 'Ring (osc suivant)']];
export const FILTER_TYPES = [['lowpass', 'Passe-bas 12'], ['lowpass24', 'Passe-bas 24 (ladder)'], ['highpass', 'Passe-haut'], ['bandpass', 'Passe-bande'], ['notch', 'Coupe-bande'], ['peaking', 'Peak'], ['allpass', 'Déphaseur']];
export const MOD_SRCS = [['lfo1', 'LFO 1'], ['lfo2', 'LFO 2'], ['env2', 'Env. filtre'], ['env3', 'Env. 3'], ['vel', 'Vélocité'], ['note', 'Note (clavier)'], ['m1', 'Macro 1'], ['m2', 'Macro 2'], ['m3', 'Macro 3'], ['m4', 'Macro 4']];
export const MOD_DSTS = [['cutoff1', 'Cutoff filtre 1'], ['cutoff2', 'Cutoff filtre 2'], ['res1', 'Réso filtre 1'], ['pitch', 'Hauteur (tout)'], ['pitchA', 'Hauteur osc A'], ['pitchB', 'Hauteur osc B'], ['pitchC', 'Hauteur osc C'],
  ['levelA', 'Niveau osc A'], ['levelB', 'Niveau osc B'], ['levelC', 'Niveau osc C'], ['warpA', 'Warp osc A'], ['warpB', 'Warp osc B'], ['warpC', 'Warp osc C'], ['posA', 'Position WT A'], ['posB', 'Position WT B'], ['posC', 'Position WT C'],
  ['amp', 'Volume'], ['pan', 'Panoramique'], ['fm', 'FM B→A']];

export function mergePatch(p) {
  const out = deepClone(DEFAULT_PATCH);
  for (const [k, v] of Object.entries(p || {})) out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...out[k], ...v } : Array.isArray(v) ? deepClone(v) : v;
  return out;
}

const LFO_DEST = { pitch: 'Hauteur', cutoff: 'Filtre', amp: 'Volume (trémolo)', pan: 'Panoramique', fm: 'FM' };
export const LFO_DESTS = Object.entries(LFO_DEST);
const WARP_CURVES = {};
function warpCurve(type) {
  if (WARP_CURVES[type]) return WARP_CURVES[type];
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = ((i * 2) / n - 1) * 4; c[i] = type === 'fold' ? Math.sin(x * Math.PI / 2) : Math.tanh(x); }
  return (WARP_CURVES[type] = type === 'crush' ? crushCurve(4) : c);
}
const NEXT = { oscA: 'oscB', oscB: 'oscC', oscC: 'oscA' };

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
    this.macroSrc = [0, 1, 2, 3].map(() => { const s = ctx.createConstantSource(); s.offset.value = 0; s.start(); return s; });
    this.wtPhase = 0; this._rel = 0; this.t0 = ctx.currentTime;
    this.applyGlobal();
    this.wtTimer = setInterval(() => this.wtTick(), 40);
  }
  makeLfo(cfg) { const o = this.ctx.createOscillator(); o.type = cfg.wave; o.frequency.value = cfg.rate; o.start(); return o; }
  applyGlobal() {
    const p = this.patch, t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(p.volume, t, 0.02);
    this.panner.pan.setTargetAtTime(p.pan, t, 0.02);
    [p.lfo1, p.lfo2].forEach((c, i) => { this.lfos[i].type = c.wave; this.lfos[i].frequency.setTargetAtTime(c.rate, t, 0.02); });
    this.macroSrc.forEach((s, i) => s.offset.setTargetAtTime(p.macros[i] || 0, t, 0.01));
  }
  setPatch(patch) { this.allOff(); this.patch = mergePatch(patch); this.applyGlobal(); }

  /** Set param by path ('filter.cutoff', 'macros.2', 'mods.0.amt'). Live-updates running voices where possible. */
  set(path, value) {
    const keys = path.split('.'), [a, b] = keys;
    let o = this.patch; for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]; o[keys[keys.length - 1]] = value;
    const t = this.ctx.currentTime, p = this.patch;
    if (['volume', 'pan', 'lfo1', 'lfo2', 'macros'].includes(a)) this.applyGlobal();
    for (const v of this.voices) {
      if ((a === 'filter' || a === 'filter2') && (b === 'cutoff' || b === 'keytrack')) this.retuneFilters(v, v.note, t, 0.01);
      if (a === 'filter' && b === 'res') v.f1.forEach((f) => f.Q.setTargetAtTime(p.filter.res, t, 0.01));
      if (a === 'filter2' && b === 'res' && v.f2) v.f2.forEach((f) => f.Q.setTargetAtTime(p.filter2.res, t, 0.01));
      if (a === 'filter' && b === 'type') v.f1.forEach((f) => (f.type = value === 'lowpass24' ? 'lowpass' : value));
      if (a === 'filter' && b === 'envAmt') v.env2ToF1.gain.setTargetAtTime(value * 7200, t, 0.01);
      if (a === 'filter2' && b === 'envAmt' && v.env2ToF2) v.env2ToF2.gain.setTargetAtTime(value * 7200, t, 0.01);
      if (OSCS.includes(a) && b === 'pos') for (const x of v.oscs) if (x.which === a) x.osc.setPeriodicWave(getWave(this.ctx, p[a].table, p[a].pos));
      if (OSCS.includes(a) && b === 'level' && v.groups[a]) v.groups[a].level.gain.setTargetAtTime(p[a].level / Math.sqrt(p[a].unison), t, 0.01);
      if (OSCS.includes(a) && b === 'warpAmt' && v.groups[a]?.warpIn) this.applyWarp(v, a, t);
      if (a === 'fm' && v.fmGain) v.fmGain.gain.setTargetAtTime(p.fm * mtof(v.note) * 4, t, 0.01);
      if (a.startsWith('lfo') && v.lfoGains) this.updateLfoGains(v);
      if (a === 'sub' && b === 'level' && v.subGain) v.subGain.gain.setTargetAtTime(p.sub.level, t, 0.01);
      if (a === 'noise' && v.noiseGain) v.noiseGain.gain.setTargetAtTime(p.noise.level, t, 0.01);
      if (a === 'mods' && keys[2] === 'amt' && v.modGains[+b]) v.modGains[+b].gain.gain.setTargetAtTime(value * v.modGains[+b].scale, t, 0.01);
    }
  }
  cutoffFor(note, f = this.patch.filter) { return clamp(expMap(f.cutoff, 25, 20000) * Math.pow(2, ((note - 60) / 12) * f.keytrack), 20, 20000); }
  retuneFilters(v, note, t, tc) {
    v.f1.forEach((f) => f.frequency.setTargetAtTime(this.cutoffFor(note), t, tc));
    if (v.f2) v.f2.forEach((f) => f.frequency.setTargetAtTime(this.cutoffFor(note, this.patch.filter2), t, tc));
  }
  lfoScale(dest, depth) { return { pitch: depth * 1200, cutoff: depth * 4800, amp: depth * 0.5, pan: depth, fm: depth * 400 }[dest] ?? 0; }
  updateLfoGains(v) {
    const t = this.ctx.currentTime;
    [this.patch.lfo1, this.patch.lfo2].forEach((c, i) => {
      for (const [dest, g] of Object.entries(v.lfoGains[i])) g.gain.setTargetAtTime(dest === c.dest ? this.lfoScale(dest, c.depth) : 0, t, 0.02);
    });
  }
  applyWarp(v, which, t) {
    const c = this.patch[which], g = v.groups[which];
    if (c.warp === 'ring') { g.warpIn.gain.setTargetAtTime(1 - c.warpAmt, t, 0.01); g.ringAmt.gain.setTargetAtTime(c.warpAmt, t, 0.01); }
    else if (c.warp === 'fm') g.fmAmt.gain.setTargetAtTime(c.warpAmt * mtof(v.note) * 3, t, 0.01);
    else g.warpIn.gain.setTargetAtTime(1 + c.warpAmt * 6, t, 0.01);
  }
  makeFilter(cfg, ctx) {
    const n = cfg.type === 'lowpass24' ? 2 : 1, list = [];
    for (let i = 0; i < n; i++) { const f = ctx.createBiquadFilter(); f.type = cfg.type === 'lowpass24' ? 'lowpass' : cfg.type; f.Q.value = n === 2 ? cfg.res * 0.6 : cfg.res; if (i) list[i - 1].connect(f); list.push(f); }
    return list;
  }
  envSource(t) { const s = this.ctx.createConstantSource(); s.offset.value = 0; s.start(t); return s; }

  noteOn(note, vel = 1, t = this.ctx.currentTime, slide = false) {
    const p = this.patch, ctx = this.ctx;
    vel = 1 - p.velSens + p.velSens * vel;
    if (p.mono && this.voices.length) {
      const v = this.voices[this.voices.length - 1];
      if (!v.released || slide) {
        const gl = slide || !v.released ? Math.max(0.002, p.glide) : 0.002;
        for (const o of v.oscs) o.osc.frequency.setTargetAtTime(mtof(note + o.semis), t, gl / 3);
        this.retuneFilters(v, note, t, gl / 3);
        v.note = note; v.noteSrc.offset.setTargetAtTime((note - 60) / 48, t, gl / 3);
        if (v.released) this.reattack(v, vel, t);
        return v;
      }
    }
    if (p.mono) this.voices.forEach((v) => this.noteOff(v, t, 0.005));
    if (this.voices.length >= 24) this.noteOff(this.voices[0], t, 0.01);

    const v = { note, oscs: [], stops: [], released: false, groups: {}, modGains: [] };
    const mix = ctx.createGain();
    let pre = mix;
    if (p.filter.drive > 0) { const ws = ctx.createWaveShaper(); ws.curve = driveCurve(p.filter.drive); ws.oversample = '2x'; mix.connect(ws); pre = ws; }
    const f1 = this.makeFilter(p.filter, ctx), f1out = f1[f1.length - 1];
    const trem = ctx.createGain(); trem.gain.value = 1;
    const vca = ctx.createGain(); vca.gain.value = 0;
    const pan = ctx.createStereoPanner();
    let f2 = null;
    pre.connect(f1[0]);
    if (p.filter2.on) {
      f2 = this.makeFilter(p.filter2, ctx); const f2out = f2[f2.length - 1];
      if (p.filter2.route === 'parallel') { pre.connect(f2[0]); f1out.connect(trem); f2out.connect(trem); } else { f1out.connect(f2[0]); f2out.connect(trem); }
    } else f1out.connect(trem);
    trem.connect(vca); vca.connect(pan); pan.connect(this.out);
    Object.assign(v, { mix, f1, f2, filter: f1[0], trem, vca, pan });
    this.retuneFilters(v, note, t, 0.001);

    // oscillator groups: raw (unit gain, used as modulator) → level → warp → mix
    const semisOf = (c) => c.oct * 12 + c.semi + c.fine / 100;
    for (const which of OSCS) {
      const c = p[which]; if (!c.on) continue;
      const raw = ctx.createGain(), level = ctx.createGain(); level.gain.value = c.level / Math.sqrt(c.unison);
      raw.connect(level); const grp = { raw, level, list: [] }; v.groups[which] = grp;
      if (c.warp === 'fold' || c.warp === 'drive' || c.warp === 'crush') {
        const wi = ctx.createGain(), ws = ctx.createWaveShaper(), comp = ctx.createGain(); ws.curve = warpCurve(c.warp); ws.oversample = '2x'; comp.gain.value = 0.8;
        level.connect(wi).connect(ws).connect(comp).connect(mix); grp.warpIn = wi;
      } else if (c.warp === 'ring') { const wi = ctx.createGain(), ra = ctx.createGain(), rm = ctx.createGain(); rm.gain.value = 0; level.connect(wi).connect(mix); level.connect(rm).connect(ra).connect(mix); grp.warpIn = wi; grp.ringAmt = ra; grp.ringMul = rm; }
      else { level.connect(mix); if (c.warp === 'fm') { grp.fmAmt = ctx.createGain(); grp.warpIn = grp.fmAmt; } }
      for (let i = 0; i < c.unison; i++) {
        const o = ctx.createOscillator(); o.setPeriodicWave(getWave(ctx, c.table, c.pos));
        const semis = semisOf(c); o.frequency.value = mtof(note + semis);
        const sp = c.unison > 1 ? (i / (c.unison - 1)) * 2 - 1 : 0;
        o.detune.value = sp * c.detune * 60 + (c.unison > 1 ? (Math.random() - 0.5) * 4 : 0);
        const op = ctx.createStereoPanner(); op.pan.value = sp * c.spread;
        o.connect(op).connect(raw); o.start(t, 0);
        v.oscs.push({ osc: o, semis, which }); v.stops.push(o); grp.list.push(o);
      }
    }
    // inter-oscillator warps (FM / ring take the next oscillator as modulator)
    for (const which of OSCS) {
      const g = v.groups[which], src = v.groups[NEXT[which]]; if (!g) continue;
      if (g.fmAmt && src) { src.raw.connect(g.fmAmt); g.list.forEach((o) => g.fmAmt.connect(o.frequency)); }
      if (g.ringMul && src) src.raw.connect(g.ringMul.gain);
      if (g.warpIn) this.applyWarp(v, which, t);
    }
    if (p.fm > 0 && v.groups.oscA && v.groups.oscB) {
      const fmGain = ctx.createGain(); fmGain.gain.value = p.fm * mtof(note) * 4; v.fmGain = fmGain;
      v.groups.oscB.raw.connect(fmGain); v.groups.oscA.list.forEach((a) => fmGain.connect(a.frequency));
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
    // envelopes 2 & 3 and per-voice constants as modulation sources
    v.env2 = this.envSource(t); v.env3 = this.envSource(t); v.velSrc = this.envSource(t); v.noteSrc = this.envSource(t);
    v.velSrc.offset.value = vel; v.noteSrc.offset.value = (note - 60) / 48; v.stops.push(v.env2, v.env3, v.velSrc, v.noteSrc);
    v.env2ToF1 = ctx.createGain(); v.env2ToF1.gain.value = p.filter.envAmt * 7200; v.env2.connect(v.env2ToF1); f1.forEach((f) => v.env2ToF1.connect(f.detune));
    if (f2) { v.env2ToF2 = ctx.createGain(); v.env2ToF2.gain.value = p.filter2.envAmt * 7200; v.env2.connect(v.env2ToF2); f2.forEach((f) => v.env2ToF2.connect(f.detune)); }
    // legacy LFO routing (per voice gains so depth/dest changes are live)
    v.lfoGains = this.lfos.map((lfo) => {
      const gs = {};
      const targets = { pitch: v.oscs.map((o) => o.osc.detune), cutoff: f1.map((f) => f.detune), amp: [trem.gain], pan: [pan.pan], fm: v.fmGain ? [v.fmGain.gain] : [] };
      for (const [dest, params] of Object.entries(targets)) { const g = ctx.createGain(); g.gain.value = 0; lfo.connect(g); params.forEach((pp) => g.connect(pp)); gs[dest] = g; }
      return gs;
    });
    this.updateLfoGains(v);
    if (p.lfo1.dest === 'amp' || p.lfo2.dest === 'amp') trem.gain.value = 1 - Math.max(p.lfo1.dest === 'amp' ? p.lfo1.depth : 0, p.lfo2.dest === 'amp' ? p.lfo2.depth : 0) * 0.5;
    this.buildMatrix(v);
    this.reattack(v, vel, t);
    this.voices.push(v);
    return v;
  }
  /** Modulation matrix: each row = source node → gain(amount × scale) → destination AudioParams. */
  buildMatrix(v) {
    const ctx = this.ctx, src = { lfo1: this.lfos[0], lfo2: this.lfos[1], env2: v.env2, env3: v.env3, vel: v.velSrc, note: v.noteSrc, m1: this.macroSrc[0], m2: this.macroSrc[1], m3: this.macroSrc[2], m4: this.macroSrc[3] };
    const oscDet = (w) => (w ? v.oscs.filter((o) => o.which === w) : v.oscs).map((o) => o.osc.detune);
    const dst = {
      cutoff1: [v.f1.map((f) => f.detune), 7200], cutoff2: [(v.f2 || []).map((f) => f.detune), 7200], res1: [v.f1.map((f) => f.Q), 15],
      pitch: [oscDet(), 2400], pitchA: [oscDet('oscA'), 2400], pitchB: [oscDet('oscB'), 2400], pitchC: [oscDet('oscC'), 2400],
      levelA: [[v.groups.oscA?.level.gain].filter(Boolean), 0.8], levelB: [[v.groups.oscB?.level.gain].filter(Boolean), 0.8], levelC: [[v.groups.oscC?.level.gain].filter(Boolean), 0.8],
      warpA: [[v.groups.oscA?.warpIn?.gain].filter(Boolean), 6], warpB: [[v.groups.oscB?.warpIn?.gain].filter(Boolean), 6], warpC: [[v.groups.oscC?.warpIn?.gain].filter(Boolean), 6],
      amp: [[v.trem.gain], 0.8], pan: [[v.pan.pan], 1], fm: [[v.fmGain?.gain].filter(Boolean), 400],
    };
    (this.patch.mods || []).forEach((m, i) => {
      const s = src[m.src], d = dst[m.dst]; if (!s || !d || !d[0].length) { v.modGains[i] = null; return; }
      const g = ctx.createGain(); g.gain.value = m.amt * d[1]; s.connect(g); d[0].forEach((pp) => g.connect(pp)); v.modGains[i] = { gain: g, scale: d[1] };
    });
  }
  adsr(param, env, peak, t) {
    param.cancelScheduledValues(t); param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + Math.max(0.002, env.a));
    param.setTargetAtTime(peak * env.s, t + Math.max(0.002, env.a), Math.max(0.005, env.d / 3));
  }
  reattack(v, vel, t) {
    const { ampEnv: ae } = this.patch;
    v.released = false; v.vel = vel;
    const g = v.vca.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value > 0.0001 && v.started ? g.value : 0, t);
    g.linearRampToValueAtTime(vel, t + Math.max(0.002, ae.a));
    g.setTargetAtTime(vel * ae.s, t + Math.max(0.002, ae.a), Math.max(0.005, ae.d / 3));
    this.adsr(v.env2.offset, this.patch.filtEnv, 1, t);
    this.adsr(v.env3.offset, this.patch.modEnv, 1, t);
    v.started = true;
  }
  noteOff(v, t = this.ctx.currentTime, forceR) {
    if (!v || v.released === 'dead') return;
    const p = this.patch, r = forceR ?? Math.max(0.01, p.ampEnv.r);
    v.released = true;
    releaseParam(v.vca.gain, t, 0, r / 4);
    releaseParam(v.env2.offset, t, 0, (forceR ?? Math.max(0.01, p.filtEnv.r)) / 4);
    releaseParam(v.env3.offset, t, 0, (forceR ?? Math.max(0.01, p.modEnv.r)) / 4);
    const end = t + r * 1.6 + 0.05;
    for (const s of v.stops) { try { s.stop(end); } catch (e) { /* already stopped */ } }
    const id = ++this._rel;
    v.relId = id;
    setTimeout(() => {
      if (v.relId !== id || !v.released) return;
      v.released = 'dead';
      this.voices = this.voices.filter((x) => x !== v);
      try { v.pan.disconnect(); v.modGains.forEach((m) => m && m.gain.disconnect()); Object.values(v.lfoGains || []).forEach((gs) => Object.values(gs).forEach((g) => g.disconnect())); } catch (e) { /* ignore */ }
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
  /** Wavetable position can't be an AudioParam: wtLfo and matrix rows aimed at posA/B/C are applied here (25 Hz). */
  wtTick() {
    const p = this.patch, w = p.wtLfo, posMods = (p.mods || []).filter((m) => /^pos[ABC]$/.test(m.dst) && m.amt);
    if ((!w.depth && !posMods.length) || !this.voices.length) return;
    this.wtPhase += 0.04 * w.rate * Math.PI * 2;
    const now = this.ctx.currentTime - this.t0, lfoVal = (i) => { const c = [p.lfo1, p.lfo2][i], ph = (now * c.rate) % 1; return c.wave === 'square' ? (ph < 0.5 ? 1 : -1) : c.wave === 'sawtooth' ? ph * 2 - 1 : c.wave === 'triangle' ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(ph * 2 * Math.PI); };
    for (const which of OSCS) {
      const c = p[which]; if (!c.on) continue;
      let off = w.depth ? Math.sin(this.wtPhase) * w.depth * 0.5 : 0;
      for (const v of this.voices) {
        let o2 = off;
        for (const m of posMods) if (m.dst === 'pos' + which.slice(3)) o2 += m.amt * ({ lfo1: lfoVal(0), lfo2: lfoVal(1), vel: v.vel, note: (v.note - 60) / 48, m1: p.macros[0], m2: p.macros[1], m3: p.macros[2], m4: p.macros[3], env2: v.released ? 0 : 1, env3: v.released ? 0 : 1 }[m.src] ?? 0);
        const wave = getWave(this.ctx, c.table, clamp(c.pos + o2, 0, 1));
        for (const o of v.oscs) if (o.which === which) o.osc.setPeriodicWave(wave);
      }
    }
  }
  destroy() { this.allOff(); clearInterval(this.wtTimer); this.lfos.forEach((l) => l.stop()); this.macroSrc.forEach((s) => s.stop()); this.panner.disconnect(); }
}
