// Effects rack: unlimited chain of effects, reorderable, each with dry/wet + bypass.
import { driveCurve, crushCurve, expMap, uid, mtof } from '../util.js';
import { worklets } from './worklets.js';

const DIV = { '1/32': 0.125, '1/16': 0.25, '1/16T': 1 / 6, '1/8': 0.5, '1/8T': 1 / 3, '3/16': 0.75, '1/4': 1, '1/4T': 2 / 3, '3/8': 1.5, '1/2': 2, '1/1': 4 };
export const DIVISIONS = Object.keys(DIV);

const P = (label, min, max, def, extra = {}) => ({ label, min, max, def, ...extra });

export const FX_TYPES = {
  distortion: {
    name: 'Distorsion', mix: 1,
    params: { drive: P('Drive', 0, 1, 0.4), tone: P('Tone', 300, 20000, 8000, { curve: 'exp' }), out: P('Sortie', 0, 1.5, 0.7) },
    build(c, fx) { fx.ws = c.createWaveShaper(); fx.ws.oversample = '4x'; fx.lp = c.createBiquadFilter(); fx.og = c.createGain(); fx.input.connect(fx.ws).connect(fx.lp).connect(fx.og).connect(fx.wet); },
    update(fx, k, v) { if (k === 'drive') fx.ws.curve = driveCurve(v); if (k === 'tone') fx.lp.frequency.value = v; if (k === 'out') fx.og.gain.value = v; },
  },
  crusher: {
    name: 'Bitcrusher', mix: 1,
    params: { bits: P('Bits', 1, 16, 5, { step: 1 }), tone: P('Tone', 300, 20000, 12000, { curve: 'exp' }) },
    build(c, fx) { fx.ws = c.createWaveShaper(); fx.lp = c.createBiquadFilter(); fx.input.connect(fx.ws).connect(fx.lp).connect(fx.wet); },
    update(fx, k, v) { if (k === 'bits') fx.ws.curve = crushCurve(v); if (k === 'tone') fx.lp.frequency.value = v; },
  },
  filter: {
    name: 'Filtre', mix: 1,
    params: { type: { label: 'Type', options: ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking'], def: 'lowpass' }, freq: P('Fréq', 20, 20000, 1200, { curve: 'exp' }), q: P('Réso', 0.1, 25, 4), lfoRate: P('LFO Hz', 0.05, 15, 0.5, { curve: 'exp' }), lfoDepth: P('LFO amt', 0, 1, 0) },
    build(c, fx) { fx.f = c.createBiquadFilter(); fx.lfo = c.createOscillator(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.f.detune); fx.lfo.start(); fx.input.connect(fx.f).connect(fx.wet); },
    update(fx, k, v) { if (k === 'type') fx.f.type = v; if (k === 'freq') fx.f.frequency.setTargetAtTime(v, fx.ctx.currentTime, 0.02); if (k === 'q') fx.f.Q.value = v; if (k === 'lfoRate') fx.lfo.frequency.value = v; if (k === 'lfoDepth') fx.lg.gain.value = v * 4800; },
  },
  eq3: {
    name: 'EQ 3 bandes', mix: 1,
    params: { low: P('Graves dB', -24, 24, 0), midF: P('Méd Hz', 200, 6000, 1000, { curve: 'exp' }), mid: P('Méd dB', -24, 24, 0), high: P('Aigus dB', -24, 24, 0) },
    build(c, fx) { fx.l = c.createBiquadFilter(); fx.l.type = 'lowshelf'; fx.l.frequency.value = 200; fx.m = c.createBiquadFilter(); fx.m.type = 'peaking'; fx.m.Q.value = 0.9; fx.h = c.createBiquadFilter(); fx.h.type = 'highshelf'; fx.h.frequency.value = 4500; fx.input.connect(fx.l).connect(fx.m).connect(fx.h).connect(fx.wet); },
    update(fx, k, v) { if (k === 'low') fx.l.gain.value = v; if (k === 'mid') fx.m.gain.value = v; if (k === 'midF') fx.m.frequency.value = v; if (k === 'high') fx.h.gain.value = v; },
  },
  chorus: {
    name: 'Chorus', mix: 0.5,
    params: { rate: P('Vitesse', 0.05, 8, 0.8, { curve: 'exp' }), depth: P('Profondeur', 0, 1, 0.5) },
    build(c, fx) {
      fx.lfo = c.createOscillator(); fx.lfo.start(); fx.parts = [];
      [[0.012, -1], [0.019, 1]].forEach(([d, pan], i) => {
        const dl = c.createDelay(0.1); dl.delayTime.value = d; const g = c.createGain(); const p = c.createStereoPanner(); p.pan.value = pan;
        const inv = c.createGain(); inv.gain.value = i ? -1 : 1; fx.lfo.connect(inv).connect(g).connect(dl.delayTime);
        fx.input.connect(dl).connect(p).connect(fx.wet); fx.parts.push(g);
      });
    },
    update(fx, k, v) { if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'depth') fx.parts.forEach((g) => (g.gain.value = v * 0.006)); },
  },
  flanger: {
    name: 'Flanger', mix: 0.5,
    params: { rate: P('Vitesse', 0.02, 5, 0.25, { curve: 'exp' }), depth: P('Profondeur', 0, 1, 0.7), feedback: P('Feedback', 0, 0.95, 0.6) },
    build(c, fx) { fx.dl = c.createDelay(0.05); fx.dl.delayTime.value = 0.004; fx.fb = c.createGain(); fx.lfo = c.createOscillator(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.dl.delayTime); fx.lfo.start(); fx.input.connect(fx.dl); fx.dl.connect(fx.fb).connect(fx.dl); fx.dl.connect(fx.wet); },
    update(fx, k, v) { if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'depth') fx.lg.gain.value = v * 0.0035; if (k === 'feedback') fx.fb.gain.value = v; },
  },
  phaser: {
    name: 'Phaser', mix: 0.5,
    params: { rate: P('Vitesse', 0.02, 8, 0.4, { curve: 'exp' }), depth: P('Profondeur', 0, 1, 0.7), freq: P('Centre', 100, 4000, 800, { curve: 'exp' }), feedback: P('Feedback', 0, 0.9, 0.5) },
    build(c, fx) {
      fx.lfo = c.createOscillator(); fx.lfo.start(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg); fx.aps = [];
      let n = fx.input; for (let i = 0; i < 6; i++) { const a = c.createBiquadFilter(); a.type = 'allpass'; a.Q.value = 0.5; fx.lg.connect(a.frequency); n.connect(a); n = a; fx.aps.push(a); }
      fx.fb = c.createGain(); n.connect(fx.fb).connect(fx.aps[0]); n.connect(fx.wet);
    },
    update(fx, k, v) { if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'freq') fx.aps.forEach((a) => (a.frequency.value = v)); if (k === 'depth' || k === 'freq') fx.lg.gain.value = fx.params.depth * fx.params.freq * 0.9; if (k === 'feedback') fx.fb.gain.value = v; },
  },
  delay: {
    name: 'Delay ping-pong', mix: 0.25,
    params: { div: { label: 'Temps', options: DIVISIONS, def: '3/16' }, feedback: P('Feedback', 0, 0.95, 0.45), tone: P('Tone', 300, 20000, 5000, { curve: 'exp' }), spread: P('Stéréo', 0, 1, 1) },
    build(c, fx) {
      fx.l = c.createDelay(4); fx.r = c.createDelay(4); fx.fbl = c.createGain(); fx.fbr = c.createGain(); fx.lp = c.createBiquadFilter();
      fx.pl = c.createStereoPanner(); fx.pr = c.createStereoPanner();
      fx.input.connect(fx.lp).connect(fx.l); fx.l.connect(fx.fbl).connect(fx.r); fx.r.connect(fx.fbr).connect(fx.l);
      fx.l.connect(fx.pl).connect(fx.wet); fx.r.connect(fx.pr).connect(fx.wet);
    },
    update(fx, k, v) {
      if (k === 'div' || k === 'tempo') { const s = (60 / fx.bpm) * DIV[fx.params.div]; fx.l.delayTime.setTargetAtTime(s, fx.ctx.currentTime, 0.02); fx.r.delayTime.setTargetAtTime(s, fx.ctx.currentTime, 0.02); }
      if (k === 'feedback') { fx.fbl.gain.value = v; fx.fbr.gain.value = v; }
      if (k === 'tone') fx.lp.frequency.value = v;
      if (k === 'spread') { fx.pl.pan.value = -v; fx.pr.pan.value = v; }
    },
  },
  reverb: {
    name: 'Réverbe', mix: 0.25,
    params: { size: P('Taille s', 0.2, 10, 2.2, { curve: 'exp' }), damp: P('Amorti', 500, 20000, 7000, { curve: 'exp' }), predelay: P('Pré-délai', 0, 0.25, 0.01) },
    build(c, fx) { fx.pd = c.createDelay(1); fx.cv = c.createConvolver(); fx.lp = c.createBiquadFilter(); fx.input.connect(fx.pd).connect(fx.cv).connect(fx.lp).connect(fx.wet); },
    update(fx, k, v) {
      if (k === 'size') { clearTimeout(fx.irT); fx.irT = setTimeout(() => { fx.cv.buffer = impulse(fx.ctx, v); }, 60); }
      if (k === 'damp') fx.lp.frequency.value = v; if (k === 'predelay') fx.pd.delayTime.value = v;
    },
  },
  compressor: {
    name: 'Compresseur', mix: 1,
    params: { threshold: P('Seuil dB', -60, 0, -18), ratio: P('Ratio', 1, 20, 4), attack: P('Attaque', 0.001, 0.3, 0.01, { curve: 'exp' }), release: P('Relâche', 0.02, 1, 0.2, { curve: 'exp' }), makeup: P('Gain', 0, 4, 1.4) },
    build(c, fx) { fx.cp = c.createDynamicsCompressor(); fx.mg = c.createGain(); fx.input.connect(fx.cp).connect(fx.mg).connect(fx.wet); },
    update(fx, k, v) { if (k === 'makeup') fx.mg.gain.value = v; else fx.cp[k].value = v; },
  },
  tremolo: {
    name: 'Trémolo / Auto-pan', mix: 1,
    params: { rate: P('Vitesse', 0.1, 20, 4, { curve: 'exp' }), depth: P('Profondeur', 0, 1, 0.6), pan: P('Auto-pan', 0, 1, 0) },
    build(c, fx) { fx.g = c.createGain(); fx.p = c.createStereoPanner(); fx.lfo = c.createOscillator(); fx.lfo.start(); fx.dg = c.createGain(); fx.pg = c.createGain(); fx.lfo.connect(fx.dg).connect(fx.g.gain); fx.lfo.connect(fx.pg).connect(fx.p.pan); fx.input.connect(fx.g).connect(fx.p).connect(fx.wet); },
    update(fx, k, v) { if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'depth') { fx.dg.gain.value = v / 2; fx.g.gain.value = 1 - v / 2; } if (k === 'pan') fx.pg.gain.value = v; },
  },
  gate: {
    name: 'Trance gate', mix: 1,
    params: { div: { label: 'Rythme', options: DIVISIONS, def: '1/16' }, depth: P('Profondeur', 0, 1, 0.9), smooth: P('Lissage', 0, 1, 0.2) },
    build(c, fx) { fx.g = c.createGain(); fx.lfo = c.createOscillator(); fx.lfo.type = 'square'; fx.lfo.start(); fx.sm = c.createBiquadFilter(); fx.sm.type = 'lowpass'; fx.dg = c.createGain(); fx.lfo.connect(fx.sm).connect(fx.dg).connect(fx.g.gain); fx.input.connect(fx.g).connect(fx.wet); },
    update(fx, k, v) {
      if (k === 'div' || k === 'tempo') fx.lfo.frequency.value = 1 / ((60 / fx.bpm) * DIV[fx.params.div]);
      if (k === 'depth') { fx.dg.gain.value = v / 2; fx.g.gain.value = 1 - v / 2; }
      if (k === 'smooth') fx.sm.frequency.value = expMap(1 - v, 20, 3000);
    },
  },
  ringmod: {
    name: 'Ring modulator', mix: 0.5,
    params: { freq: P('Fréq', 1, 3000, 220, { curve: 'exp' }) },
    build(c, fx) { fx.g = c.createGain(); fx.g.gain.value = 0; fx.o = c.createOscillator(); fx.o.start(); fx.o.connect(fx.g.gain); fx.input.connect(fx.g).connect(fx.wet); },
    update(fx, k, v) { if (k === 'freq') fx.o.frequency.value = v; },
  },
  tape: {
    name: 'Tape / Lo-fi wobble', mix: 1,
    params: { wow: P('Wow', 0, 1, 0.3), rate: P('Vitesse', 0.1, 8, 0.7, { curve: 'exp' }), tone: P('Tone', 500, 20000, 6000, { curve: 'exp' }), sat: P('Saturation', 0, 1, 0.2) },
    build(c, fx) { fx.dl = c.createDelay(0.1); fx.dl.delayTime.value = 0.02; fx.lfo = c.createOscillator(); fx.lfo.start(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.dl.delayTime); fx.ws = c.createWaveShaper(); fx.lp = c.createBiquadFilter(); fx.input.connect(fx.ws).connect(fx.dl).connect(fx.lp).connect(fx.wet); },
    update(fx, k, v) { if (k === 'wow') fx.lg.gain.value = v * 0.004; if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'tone') fx.lp.frequency.value = v; if (k === 'sat') fx.ws.curve = driveCurve(v * 0.5); },
  },
  widener: {
    name: 'Élargisseur stéréo', mix: 1,
    params: { width: P('Largeur', 0, 1, 0.5) },
    build(c, fx) { fx.d = c.createDelay(0.05); fx.d.delayTime.value = 0.012; fx.pl = c.createStereoPanner(); fx.pr = c.createStereoPanner(); fx.input.connect(fx.pl).connect(fx.wet); fx.input.connect(fx.d).connect(fx.pr).connect(fx.wet); fx.g = c.createGain(); },
    update(fx, k, v) { if (k === 'width') { fx.pl.pan.value = -v; fx.pr.pan.value = v; } },
  },
  // ---------- plugins v2 ----------
  djfilter: {
    name: 'Filtre DJ (1 bouton)', mix: 1, cat: 'filter',
    params: { pos: P('← LP · HP →', -1, 1, 0), q: P('Réso', 0.5, 15, 2) },
    build(c, fx) { fx.lp = c.createBiquadFilter(); fx.hp = c.createBiquadFilter(); fx.hp.type = 'highpass'; fx.input.connect(fx.lp).connect(fx.hp).connect(fx.wet); },
    update(fx, k, v) { const p = fx.params, t = fx.ctx.currentTime; fx.lp.frequency.setTargetAtTime(p.pos < 0 ? expMap(1 + p.pos, 80, 20000) : 20000, t, 0.02); fx.hp.frequency.setTargetAtTime(p.pos > 0 ? expMap(p.pos, 20, 8000) : 10, t, 0.02); fx.lp.Q.value = p.pos < -0.02 ? p.q : 0.7; fx.hp.Q.value = p.pos > 0.02 ? p.q : 0.7; },
  },
  saturator: {
    name: 'Saturation lampe', mix: 1, cat: 'drive',
    params: { drive: P('Drive', 0, 1, 0.35), warmth: P('Chaleur', 0, 1, 0.5), out: P('Sortie', 0, 1.5, 0.85) },
    build(c, fx) { fx.ws = c.createWaveShaper(); fx.ws.oversample = '4x'; fx.lp = c.createBiquadFilter(); fx.og = c.createGain(); fx.input.connect(fx.ws).connect(fx.lp).connect(fx.og).connect(fx.wet); },
    update(fx, k, v) {
      const p = fx.params; if (k === 'out') return (fx.og.gain.value = v);
      if (k === 'drive' || k === 'warmth') { const n = 2048, cv = new Float32Array(n), d = 1 + p.drive * 12, b = p.warmth * 0.3; for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; cv[i] = Math.tanh(d * (x + b)) - Math.tanh(d * b); } fx.ws.curve = cv; fx.lp.frequency.value = expMap(1 - p.warmth * 0.6, 2000, 20000); }
    },
  },
  fuzz: {
    name: 'Fuzz', mix: 1, cat: 'drive',
    params: { gain: P('Gain', 1, 100, 30, { curve: 'exp' }), tone: P('Tone', 300, 12000, 3000, { curve: 'exp' }), out: P('Sortie', 0, 1, 0.4) },
    build(c, fx) { fx.pre = c.createGain(); fx.ws = c.createWaveShaper(); fx.ws.oversample = '4x'; const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; cv[i] = Math.max(-0.7, Math.min(0.9, x)); } fx.ws.curve = cv; fx.lp = c.createBiquadFilter(); fx.og = c.createGain(); fx.input.connect(fx.pre).connect(fx.ws).connect(fx.lp).connect(fx.og).connect(fx.wet); },
    update(fx, k, v) { if (k === 'gain') fx.pre.gain.value = v; if (k === 'tone') fx.lp.frequency.value = v; if (k === 'out') fx.og.gain.value = v; },
  },
  wavefolder: {
    name: 'Wavefolder', mix: 1, cat: 'drive',
    params: { folds: P('Plis', 1, 8, 2.5), out: P('Sortie', 0, 1.5, 0.7) },
    build(c, fx) { fx.ws = c.createWaveShaper(); fx.ws.oversample = '4x'; fx.og = c.createGain(); fx.input.connect(fx.ws).connect(fx.og).connect(fx.wet); },
    update(fx, k, v) { if (k === 'out') fx.og.gain.value = v; if (k === 'folds') { const n = 2048, cv = new Float32Array(n); for (let i = 0; i < n; i++) cv[i] = Math.sin(((i * 2) / n - 1) * v * Math.PI / 2); fx.ws.curve = cv; } },
  },
  decimator: {
    name: 'Décimateur (sample-rate)', mix: 1, cat: 'drive',
    params: { rate: P('Réduction', 1, 48, 6, { step: 1 }), bits: P('Bits', 2, 16, 10, { step: 1 }) },
    build(c, fx) { try { if (!worklets.ok) throw 0; fx.node = new AudioWorkletNode(c, 'rm-decimator', { outputChannelCount: [2] }); } catch (e) { fx.node = c.createWaveShaper(); fx.fallback = true; } fx.input.connect(fx.node).connect(fx.wet); },
    update(fx, k, v) { if (fx.fallback) { if (k === 'bits') fx.node.curve = crushCurve(v); return; } fx.node.parameters.get(k)?.setValueAtTime(v, fx.ctx.currentTime); },
  },
  exciter: {
    name: 'Exciter (brillance)', mix: 0.35, cat: 'eq',
    params: { freq: P('Fréq', 1000, 12000, 3500, { curve: 'exp' }), drive: P('Drive', 0, 1, 0.5) },
    build(c, fx) { fx.hp = c.createBiquadFilter(); fx.hp.type = 'highpass'; fx.ws = c.createWaveShaper(); fx.input.connect(fx.hp).connect(fx.ws).connect(fx.wet); },
    update(fx, k, v) { if (k === 'freq') fx.hp.frequency.value = v; if (k === 'drive') fx.ws.curve = driveCurve(0.2 + v * 0.8); },
  },
  limiter: {
    name: 'Limiteur', mix: 1, cat: 'dyn',
    params: { threshold: P('Seuil dB', -30, 0, -6), gain: P('Gain', 0.5, 4, 1.5) },
    build(c, fx) { fx.g = c.createGain(); fx.cp = c.createDynamicsCompressor(); fx.cp.ratio.value = 20; fx.cp.knee.value = 0; fx.cp.attack.value = 0.001; fx.cp.release.value = 0.08; fx.input.connect(fx.g).connect(fx.cp).connect(fx.wet); },
    update(fx, k, v) { if (k === 'threshold') fx.cp.threshold.value = v; if (k === 'gain') fx.g.gain.value = v; },
  },
  pump: {
    name: 'Sidechain pump', mix: 1, cat: 'dyn',
    params: { div: { label: 'Rythme', options: DIVISIONS, def: '1/4' }, depth: P('Profondeur', 0, 1, 0.7), shape: P('Relâche', 0.05, 1, 0.45) },
    build(c, fx) { fx.g = c.createGain(); fx.g.gain.value = 0; fx.ws = c.createWaveShaper(); fx.input.connect(fx.g).connect(fx.wet); fx.sync(c.currentTime); },
    update(fx, k, v) {
      const p = fx.params;
      if (k === 'depth' || k === 'shape') { const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const ph = i / (n - 1); cv[i] = 1 - p.depth * Math.pow(1 - Math.min(1, ph / p.shape), 2); } fx.ws.curve = cv; }
      if ((k === 'div' || k === 'tempo') && fx.osc) fx.osc.frequency.value = 1 / ((60 / fx.bpm) * DIV[p.div]);
    },
    sync(fx, t) { try { fx.osc?.stop(); fx.osc?.disconnect(); } catch (e) { /* */ } fx.osc = fx.ctx.createOscillator(); fx.osc.type = 'sawtooth'; fx.osc.frequency.value = 1 / ((60 / fx.bpm) * DIV[fx.params?.div || '1/4']); fx.osc.connect(fx.ws).connect(fx.g.gain); fx.osc.start(t); },
  },
  vibrato: {
    name: 'Vibrato', mix: 1, cat: 'mod',
    params: { rate: P('Vitesse', 0.5, 12, 5, { curve: 'exp' }), depth: P('Profondeur', 0, 1, 0.3) },
    build(c, fx) { fx.dl = c.createDelay(0.05); fx.dl.delayTime.value = 0.008; fx.lfo = c.createOscillator(); fx.lfo.start(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.dl.delayTime); fx.input.connect(fx.dl).connect(fx.wet); },
    update(fx, k, v) { if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'depth') fx.lg.gain.value = v * 0.004; },
  },
  autowah: {
    name: 'Auto-wah', mix: 1, cat: 'filter',
    params: { rate: P('Vitesse', 0.1, 10, 2, { curve: 'exp' }), low: P('Bas', 100, 2000, 300, { curve: 'exp' }), high: P('Haut', 500, 8000, 2500, { curve: 'exp' }), q: P('Réso', 1, 20, 6) },
    build(c, fx) { fx.f = c.createBiquadFilter(); fx.f.type = 'bandpass'; fx.lfo = c.createOscillator(); fx.lfo.type = 'triangle'; fx.lfo.start(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.f.frequency); fx.og = c.createGain(); fx.og.gain.value = 2; fx.input.connect(fx.f).connect(fx.og).connect(fx.wet); },
    update(fx, k, v) { const p = fx.params; if (k === 'rate') fx.lfo.frequency.value = v; if (k === 'q') fx.f.Q.value = v; if (k === 'low' || k === 'high') { fx.f.frequency.value = (p.low + p.high) / 2; fx.lg.gain.value = Math.abs(p.high - p.low) / 2; } },
  },
  formant: {
    name: 'Filtre voyelles', mix: 1, cat: 'filter',
    params: { vowel: P('A-E-I-O-U', 0, 4, 0), q: P('Réso', 2, 25, 9), shift: P('Décalage', 0.6, 1.6, 1) },
    build(c, fx) { fx.bands = [0, 1, 2].map(() => { const b = c.createBiquadFilter(); b.type = 'bandpass'; const g = c.createGain(); fx.input.connect(b).connect(g).connect(fx.wet); return [b, g]; }); },
    update(fx, k, v) {
      const V = [[800, 1150, 2900], [400, 1700, 2600], [270, 2300, 3000], [450, 800, 2830], [325, 700, 2530]], p = fx.params, i = Math.min(3, Math.floor(p.vowel)), f = p.vowel - i;
      fx.bands.forEach(([b, g], j) => { b.frequency.setTargetAtTime((V[i][j] * (1 - f) + V[i + 1][j] * f) * p.shift, fx.ctx.currentTime, 0.02); b.Q.value = p.q; g.gain.value = [3, 2, 1][j] * Math.sqrt(p.q) / 3; });
    },
  },
  comb: {
    name: 'Résonateur (comb)', mix: 0.5, cat: 'creative',
    params: { note: P('Note', 24, 96, 48, { step: 1 }), feedback: P('Résonance', 0, 0.98, 0.85), tone: P('Tone', 500, 15000, 5000, { curve: 'exp' }) },
    build(c, fx) { fx.dl = c.createDelay(0.1); fx.fb = c.createGain(); fx.lp = c.createBiquadFilter(); fx.input.connect(fx.dl); fx.dl.connect(fx.lp).connect(fx.fb).connect(fx.dl); fx.dl.connect(fx.wet); },
    update(fx, k, v) { if (k === 'note') fx.dl.delayTime.setTargetAtTime(1 / mtof(v), fx.ctx.currentTime, 0.01); if (k === 'feedback') fx.fb.gain.value = v; if (k === 'tone') fx.lp.frequency.value = v; },
  },
  space: {
    name: 'Espace (hall, plate, spring, inversée)', mix: 0.3, cat: 'space',
    params: { type: { label: 'Type', options: ['hall', 'room', 'plate', 'spring', 'reverse', 'shimmer'], def: 'plate' }, size: P('Taille s', 0.3, 8, 2, { curve: 'exp' }), damp: P('Amorti', 500, 20000, 9000, { curve: 'exp' }) },
    build(c, fx) { fx.cv = c.createConvolver(); fx.lp = c.createBiquadFilter(); fx.input.connect(fx.cv).connect(fx.lp).connect(fx.wet); },
    update(fx, k, v) { if (k === 'damp') fx.lp.frequency.value = v; if (k === 'type' || k === 'size') { clearTimeout(fx.irT); fx.irT = setTimeout(() => { fx.cv.buffer = impulse(fx.ctx, fx.params.size, fx.params.type); }, 60); } },
  },
  tapeecho: {
    name: 'Écho à bande', mix: 0.3, cat: 'space',
    params: { div: { label: 'Temps', options: DIVISIONS, def: '1/8' }, feedback: P('Répétitions', 0, 0.95, 0.55), wow: P('Wow', 0, 1, 0.3), tone: P('Tone', 500, 10000, 2500, { curve: 'exp' }), sat: P('Saturation', 0, 1, 0.4) },
    build(c, fx) {
      fx.dl = c.createDelay(4); fx.fb = c.createGain(); fx.lp = c.createBiquadFilter(); fx.hp = c.createBiquadFilter(); fx.hp.type = 'highpass'; fx.hp.frequency.value = 150; fx.ws = c.createWaveShaper();
      fx.lfo = c.createOscillator(); fx.lfo.frequency.value = 0.6; fx.lfo.start(); fx.lg = c.createGain(); fx.lfo.connect(fx.lg).connect(fx.dl.delayTime);
      fx.input.connect(fx.dl); fx.dl.connect(fx.lp).connect(fx.hp).connect(fx.ws).connect(fx.fb).connect(fx.dl); fx.ws.connect(fx.wet);
    },
    update(fx, k, v) {
      if (k === 'div' || k === 'tempo') fx.dl.delayTime.setTargetAtTime((60 / fx.bpm) * DIV[fx.params.div], fx.ctx.currentTime, 0.05);
      if (k === 'feedback') fx.fb.gain.value = v; if (k === 'wow') fx.lg.gain.value = v * 0.003; if (k === 'tone') fx.lp.frequency.value = v; if (k === 'sat') fx.ws.curve = driveCurve(v * 0.6);
    },
  },
  radio: {
    name: 'Radio / téléphone', mix: 1, cat: 'creative',
    params: { low: P('Bas', 100, 1500, 450, { curve: 'exp' }), high: P('Haut', 1500, 8000, 3200, { curve: 'exp' }), drive: P('Grésillement', 0, 1, 0.4), noise: P('Souffle', 0, 0.3, 0.03) },
    build(c, fx) {
      fx.hp = c.createBiquadFilter(); fx.hp.type = 'highpass'; fx.lp = c.createBiquadFilter(); fx.ws = c.createWaveShaper(); fx.input.connect(fx.hp).connect(fx.lp).connect(fx.ws).connect(fx.wet);
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      fx.n = c.createBufferSource(); fx.n.buffer = b; fx.n.loop = true; fx.ng = c.createGain(); fx.n.connect(fx.ng).connect(fx.lp); fx.n.start(); fx.o = fx.n;
    },
    update(fx, k, v) { if (k === 'low') fx.hp.frequency.value = v; if (k === 'high') fx.lp.frequency.value = v; if (k === 'drive') fx.ws.curve = driveCurve(v * 0.7); if (k === 'noise') fx.ng.gain.value = v; },
  },
  pitch: {
    name: 'Pitch shifter', mix: 1, cat: 'creative',
    params: { semi: P('Demi-tons', -12, 12, -5, { step: 1 }), window: P('Fenêtre', 0.03, 0.2, 0.08) },
    build(c, fx) {
      const saw = (shift) => { const n = 64, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = (shift && k % 2 ? -1 : 1) * (k % 2 ? 1 : -1) * 2 / (Math.PI * k); return c.createPeriodicWave(re, im, { disableNormalization: true }); };
      const win = c.createWaveShaper(); const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) cv[i] = Math.cos(((i * 2) / n - 1) * Math.PI / 2); win.curve = cv;
      fx.voices = [false, true].map((shift) => {
        const o = c.createOscillator(); o.setPeriodicWave(saw(shift)); const dl = c.createDelay(1), dg = c.createGain(), g = c.createGain(); g.gain.value = 0; const w = c.createWaveShaper(); w.curve = cv;
        o.connect(dg).connect(dl.delayTime); o.connect(w).connect(g.gain); fx.input.connect(dl).connect(g).connect(fx.wet); o.start(); return { o, dl, dg };
      });
      fx.lfo = fx.voices[0].o; fx.o = fx.voices[1].o;
    },
    update(fx, k, v) {
      const p = fx.params, r = Math.pow(2, p.semi / 12), W = p.window, f = Math.abs(1 - r) / W;
      fx.voices.forEach(({ o, dl, dg }) => { o.frequency.value = f; dl.delayTime.value = W / 2; dg.gain.value = (r < 1 ? 1 : -1) * W / 2; });
    },
  },
  rotary: {
    name: 'Cabine rotative (Leslie)', mix: 1, cat: 'mod',
    params: { speed: { label: 'Vitesse', options: ['lente', 'rapide'], def: 'lente' }, depth: P('Profondeur', 0, 1, 0.6) },
    build(c, fx) { fx.dl = c.createDelay(0.05); fx.dl.delayTime.value = 0.005; fx.p = c.createStereoPanner(); fx.g = c.createGain(); fx.lfo = c.createOscillator(); fx.lfo.start(); fx.a = c.createGain(); fx.b = c.createGain(); fx.cc = c.createGain(); fx.lfo.connect(fx.a).connect(fx.dl.delayTime); fx.lfo.connect(fx.b).connect(fx.p.pan); fx.lfo.connect(fx.cc).connect(fx.g.gain); fx.input.connect(fx.dl).connect(fx.g).connect(fx.p).connect(fx.wet); },
    update(fx, k, v) { const p = fx.params; fx.lfo.frequency.setTargetAtTime(p.speed === 'rapide' ? 6.5 : 0.8, fx.ctx.currentTime, 0.6); fx.a.gain.value = p.depth * 0.0012; fx.b.gain.value = p.depth * 0.8; fx.cc.gain.value = p.depth * 0.2; fx.g.gain.value = 1 - p.depth * 0.2; },
  },
};
const CAT = { distortion: 'drive', crusher: 'drive', filter: 'filter', eq3: 'eq', chorus: 'mod', flanger: 'mod', phaser: 'mod', delay: 'space', reverb: 'space', compressor: 'dyn', tremolo: 'mod', gate: 'dyn', ringmod: 'creative', tape: 'creative', widener: 'eq' };
for (const [k, c] of Object.entries(CAT)) FX_TYPES[k].cat = c;
export const FX_CATS = [['dyn', 'Dynamique'], ['eq', 'EQ & stéréo'], ['filter', 'Filtres'], ['drive', 'Saturation'], ['mod', 'Modulation'], ['space', 'Espace'], ['creative', 'Créatif']];

function impulse(ctx, secs, type = 'hall') {
  const sr = ctx.sampleRate, len = Math.max(1, Math.floor(sr * secs)), b = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len, n = Math.random() * 2 - 1;
      let v = n * Math.pow(1 - t, type === 'room' ? 6 : type === 'plate' ? 2.2 : 3);
      if (type === 'room') v *= i < sr * 0.02 ? 1.6 : 1;
      if (type === 'spring') v = (n * 0.4 + Math.sin(i * (0.06 + 0.02 * Math.sin(i / 900)) + c)) * Math.pow(1 - t, 2.5) * (0.6 + 0.4 * Math.sin(i / 400));
      if (type === 'shimmer') v = n * Math.pow(1 - t, 1.2) * (0.5 + 0.5 * Math.sin(t * 40));
      d[i] = v;
    }
    if (type === 'reverse') d.reverse();
  }
  return b;
}

export class Effect {
  constructor(ctx, type, saved = {}) {
    const def = FX_TYPES[type];
    this.ctx = ctx; this.type = type; this.id = saved.id || uid(); this.def = def; this.bpm = 120;
    this.input = ctx.createGain(); this.output = ctx.createGain(); this.dry = ctx.createGain(); this.wet = ctx.createGain();
    this.input.connect(this.dry).connect(this.output); this.wet.connect(this.output);
    this.params = {}; for (const [k, p] of Object.entries(def.params)) this.params[k] = saved.params?.[k] ?? p.def;
    this.mix = saved.mix ?? def.mix; this.enabled = saved.enabled ?? true;
    def.build(ctx, this);
    for (const [k, v] of Object.entries(this.params)) def.update(this, k, v);
    this.applyMix();
  }
  set(k, v) { this.params[k] = v; this.def.update(this, k, v); }
  setMix(v) { this.mix = v; this.applyMix(); }
  setEnabled(on) { this.enabled = on; this.applyMix(); }
  setTempo(bpm) { this.bpm = bpm; if (this.def.params.div) this.def.update(this, 'tempo'); }
  sync(t) { this.def.sync?.(this, t); }
  applyMix() {
    const t = this.ctx.currentTime;
    this.dry.gain.setTargetAtTime(this.enabled ? 1 - this.mix * (this.def.mix === 1 ? 1 : 0.5) : 1, t, 0.015);
    this.wet.gain.setTargetAtTime(this.enabled ? this.mix : 0, t, 0.015);
  }
  serialize() { return { id: this.id, type: this.type, params: { ...this.params }, mix: this.mix, enabled: this.enabled }; }
  dispose() { try { this.output.disconnect(); this.input.disconnect(); this.lfo?.stop(); this.o?.stop(); this.osc?.stop(); } catch (e) { /* ignore */ } }
}

export class FxRack {
  constructor(ctx, input, output) { this.ctx = ctx; this.input = input; this.output = output; this.list = []; this.bpm = 120; this.rebuild(); }
  add(type, saved) { const fx = new Effect(this.ctx, type, saved); fx.setTempo(this.bpm); this.list.push(fx); this.rebuild(); return fx; }
  remove(fx) { this.list = this.list.filter((f) => f !== fx); this.rebuild(); fx.dispose(); }
  move(fx, dir) { const i = this.list.indexOf(fx), j = i + dir; if (j < 0 || j >= this.list.length) return; [this.list[i], this.list[j]] = [this.list[j], this.list[i]]; this.rebuild(); }
  rebuild() {
    this.input.disconnect();
    this.list.forEach((f) => f.output.disconnect());
    let n = this.input;
    for (const f of this.list) { n.connect(f.input); n = f.output; }
    n.connect(this.output);
  }
  setTempo(bpm) { this.bpm = bpm; this.list.forEach((f) => f.setTempo(bpm)); }
  sync(t) { this.list.forEach((f) => f.sync(t)); }
  clear() { [...this.list].forEach((f) => this.remove(f)); }
  serialize() { return this.list.map((f) => f.serialize()); }
  load(arr) { this.clear(); (arr || []).forEach((s) => FX_TYPES[s.type] && this.add(s.type, s)); }
}
