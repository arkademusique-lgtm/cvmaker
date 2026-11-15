// Wavetable library. Each table = list of single-cycle frames (Float32Array of N samples).
// Morphing interpolates frames in the time domain, then converts to a PeriodicWave (cached).
import { clamp } from '../util.js';

export const N = 256;
const H = 96;
const TAU = Math.PI * 2;

const frame = (fn) => { const f = new Float32Array(N); for (let i = 0; i < N; i++) f[i] = fn(i / N); return normalize(f); };
function normalize(f) {
  let mean = 0; for (const v of f) mean += v; mean /= f.length;
  let peak = 0; for (let i = 0; i < f.length; i++) { f[i] -= mean; peak = Math.max(peak, Math.abs(f[i])); }
  if (peak > 0) for (let i = 0; i < f.length; i++) f[i] /= peak;
  return f;
}
const additive = (amps, phases) => frame((p) => { let s = 0; for (let k = 0; k < amps.length; k++) if (amps[k]) s += amps[k] * Math.sin(TAU * (k + 1) * p + (phases ? phases[k] : 0)); return s; });
const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(n === 1 ? 0 : i / (n - 1), i));

const sine = (p) => Math.sin(TAU * p);
const tri = (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5);
const saw = (p) => 2 * ((p + 0.5) % 1) - 1;
const sq = (p) => (p < 0.5 ? 1 : -1);

function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const VOWELS = [[800, 1150, 2900], [400, 1700, 2600], [270, 2300, 3000], [450, 800, 2830], [325, 700, 2530]];

export const TABLES = {
  basic: { name: 'Basique (Sin→Tri→Saw→Carré)', frames: [frame(sine), frame(tri), frame(saw), frame(sq)] },
  pwm: { name: 'PWM', frames: range(8, (t) => frame((p) => (p < 0.5 - 0.46 * t ? 1 : -1))) },
  harm: { name: 'Harmoniques', frames: range(16, (t) => additive(Array.from({ length: 1 + Math.round(t * 47) }, (_, k) => 1 / (k + 1)))) },
  odd: { name: 'Harmoniques impaires', frames: range(12, (t) => additive(Array.from({ length: 1 + Math.round(t * 47) }, (_, k) => (k % 2 ? 0 : 1 / (k + 1))))) },
  sync: { name: 'Hard Sync', frames: range(16, (t) => frame((p) => saw((p * (1 + t * 7)) % 1) * (1 - p * 0.3))) },
  fm: { name: 'FM', frames: range(16, (t) => frame((p) => Math.sin(TAU * p + t * 7 * Math.sin(TAU * p * 2)))) },
  fm3: { name: 'FM 3:1', frames: range(12, (t) => frame((p) => Math.sin(TAU * p + t * 5 * Math.sin(TAU * p * 3)))) },
  fold: { name: 'Wavefolder', frames: range(16, (t) => frame((p) => Math.sin((1 + t * 8) * Math.sin(TAU * p)))) },
  formant: {
    name: 'Voyelles (A-E-I-O-U)',
    frames: VOWELS.map(([f1, f2, f3]) => additive(Array.from({ length: 60 }, (_, k) => {
      const f = (k + 1) * 110;
      return Math.exp(-(((f - f1) / 90) ** 2)) + 0.7 * Math.exp(-(((f - f2) / 120) ** 2)) + 0.3 * Math.exp(-(((f - f3) / 160) ** 2)) + 0.02 / (k + 1);
    }))),
  },
  digital: { name: 'Digital / Bitcrush', frames: range(10, (t) => { const lv = Math.max(2, Math.round(Math.pow(2, 6 - t * 5))); return frame((p) => Math.round(Math.sin(TAU * p) * lv) / lv); }) },
  organ: {
    name: 'Orgue (tirettes)',
    frames: [[1, 1, 0, 1, 0, 0, 0, 1], [1, 0.8, 0.8, 0.5, 0, 0.4, 0, 0.6], [1, 0, 1, 0, 0.7, 0, 0.5, 0.5], [1, 1, 1, 1, 1, 1, 1, 1]].map((a) => additive(a)),
  },
  chaos: { name: 'Chaos (aléatoire)', frames: range(12, (t, i) => { const r = seeded(1234 + i * 77); return additive(Array.from({ length: 40 }, (_, k) => r() / (1 + k * (1 - t) * 0.6)), Array.from({ length: 40 }, () => r() * TAU)); }) },
  growl: { name: 'Growl', frames: range(12, (t) => frame((p) => Math.tanh((2 + t * 10) * (saw(p) * 0.6 + Math.sin(TAU * p * (2 + t * 3)) * 0.4)))) },
  supersawish: { name: 'Saw empilées', frames: range(8, (t) => frame((p) => saw(p) + 0.5 * saw((p * 2 + t * 0.5) % 1) + 0.33 * saw((p * 3 + t) % 1))) },
  custom: { name: 'Dessin perso', frames: [frame(saw)] },
};

export function tableOptions() { return Object.entries(TABLES).map(([k, v]) => [k, v.name]); }

export function framesAt(tableId, pos) {
  const t = TABLES[tableId] || TABLES.basic;
  const fr = t.frames;
  if (fr.length === 1) return fr[0];
  const x = clamp(pos, 0, 1) * (fr.length - 1);
  const i = Math.min(fr.length - 2, Math.floor(x)), f = x - i;
  const a = fr[i], b = fr[i + 1], out = new Float32Array(N);
  for (let n = 0; n < N; n++) out[n] = a[n] + (b[n] - a[n]) * f;
  return out;
}

const COS = new Float32Array(N * H), SIN = new Float32Array(N * H);
for (let k = 0; k < H; k++) for (let n = 0; n < N; n++) { COS[k * N + n] = Math.cos((TAU * (k + 1) * n) / N); SIN[k * N + n] = Math.sin((TAU * (k + 1) * n) / N); }

const cache = new WeakMap();
let version = 0; // bump when tables change
export function invalidateTables() { version++; }

export function getWave(ctx, tableId, pos) {
  const q = Math.round(clamp(pos, 0, 1) * 64);
  let m = cache.get(ctx); if (!m) { m = new Map(); cache.set(ctx, m); }
  const key = `${version}:${tableId}:${q}`;
  let w = m.get(key);
  if (w) return w;
  const f = framesAt(tableId, q / 64);
  const real = new Float32Array(H + 1), imag = new Float32Array(H + 1);
  for (let k = 0; k < H; k++) {
    let re = 0, im = 0; const o = k * N;
    for (let n = 0; n < N; n++) { re += f[n] * COS[o + n]; im += f[n] * SIN[o + n]; }
    real[k + 1] = (re * 2) / N; imag[k + 1] = (im * 2) / N;
  }
  w = ctx.createPeriodicWave(real, imag);
  if (m.size > 3000) m.clear();
  m.set(key, w);
  return w;
}

export function setCustomFrames(frames) { TABLES.custom.frames = frames.map((f) => normalize(Float32Array.from(f))); invalidateTables(); }

/** Import an AudioBuffer as a wavetable (Serum style: frames of 2048 samples). */
export function importWavetable(name, audioBuffer, frameSize = 2048) {
  const d = audioBuffer.getChannelData(0);
  const count = Math.max(1, Math.min(256, Math.floor(d.length / frameSize)));
  const size = d.length < frameSize ? d.length : frameSize;
  const frames = [];
  for (let f = 0; f < count; f++) frames.push(normalize(Float32Array.from({ length: N }, (_, i) => d[f * size + Math.floor((i / N) * size)] || 0)));
  const id = 'imp_' + name.replace(/\W+/g, '_').slice(0, 30);
  TABLES[id] = { name: '⇪ ' + name, frames, imported: true };
  invalidateTables();
  return id;
}

export function exportUserTables() {
  const out = {};
  for (const [k, v] of Object.entries(TABLES)) if (v.imported || k === 'custom') out[k] = { name: v.name, imported: !!v.imported, frames: v.frames.map((f) => Array.from(f, (x) => +x.toFixed(4))) };
  return out;
}
export function importUserTables(obj) {
  for (const [k, v] of Object.entries(obj || {})) TABLES[k] = { name: v.name, imported: v.imported, frames: v.frames.map((f) => Float32Array.from(f)) };
  invalidateTables();
}

/** Register a wavetable from raw single-cycle frames of any length (resampled to N). */
export function registerFrames(id, name, rawFrames) {
  const frames = rawFrames.slice(0, 64).map((f) => normalize(Float32Array.from({ length: N }, (_, i) => { const x = (i / N) * f.length, j = Math.floor(x), t = x - j; return f[j % f.length] * (1 - t) + f[(j + 1) % f.length] * t; })));
  TABLES[id] = { name, frames, imported: true };
  invalidateTables();
  return id;
}
