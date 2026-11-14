// Synthesised drum voices (808/909-style analog models) + sample playback.
// Every voice: (ctx, t, p, out, vel) with p.{tune,tone,decay} in 0..1 plus character params.
import { getNoise, driveCurve, expMap } from '../util.js';

function env(param, t, peak, dec, att = 0.001) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + att);
  param.exponentialRampToValueAtTime(0.0001, t + att + dec);
}
function osc(ctx, type, f, t, stop) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; }
function noise(ctx, t, stop) { const s = ctx.createBufferSource(); s.buffer = getNoise(ctx); s.loop = true; s.start(t, Math.random() * 1.5); s.stop(stop); return s; }
function filt(ctx, type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function gain(ctx, v = 0) { const g = ctx.createGain(); g.gain.value = v; return g; }
function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
function withDrive(ctx, node, amt) { if (!amt) return node; const w = ctx.createWaveShaper(); w.curve = driveCurve(amt); w.oversample = '2x'; node.connect(w); return w; }

function kick(ctx, t, p, out, vel) {
  const f = (30 + p.tune * 50) * (p.base || 1);
  const dec = 0.1 + p.decay * p.decay * 2.4;
  const o = osc(ctx, 'sine', f * (2 + (p.pitch ?? 0.5) * 8), t, t + dec + 0.2);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.015 + 0.09 * (1 - p.tone));
  const g = gain(ctx); env(g.gain, t, vel, dec, 0.002);
  chain(withDrive(ctx, o, p.drive), g, out);
  const click = (p.click || 0) + Math.max(0, p.tone - 0.55);
  if (click > 0) {
    const n = noise(ctx, t, t + 0.05), hp = filt(ctx, 'highpass', 2500), cg = gain(ctx);
    env(cg.gain, t, vel * click * 0.8, 0.012); chain(n, hp, cg, out);
  }
}

function snare(ctx, t, p, out, vel) {
  const f = 140 + p.tune * 160, dec = 0.07 + p.decay * 0.55, stop = t + dec + 0.2;
  const body = gain(ctx); env(body.gain, t, vel * (1 - p.tone * 0.6) * 0.8, dec * 0.5);
  for (const m of [1, 1.62]) { const o = osc(ctx, 'triangle', f * m * 1.3, t, stop); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.03); o.connect(body); }
  withDrive(ctx, body, p.drive).connect(out);
  const n = noise(ctx, t, stop), hp = filt(ctx, 'highpass', 900 + p.tone * 2500), bp = filt(ctx, 'peaking', 5000); bp.gain.value = 6;
  const ng = gain(ctx); env(ng.gain, t, vel * (0.35 + p.tone * 0.65), dec);
  chain(n, hp, bp, ng, out);
}

const tomFactory = (base) => (ctx, t, p, out, vel) => {
  const f = base * (0.55 + p.tune * 0.9) * (p.base || 1), dec = 0.08 + p.decay * 0.9;
  const o = osc(ctx, 'sine', f * 1.6, t, t + dec + 0.2); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  const g = gain(ctx); env(g.gain, t, vel, dec); chain(withDrive(ctx, o, p.drive), g, out);
  if (p.tone > 0.2) { const n = noise(ctx, t, t + 0.1), lp = filt(ctx, 'lowpass', f * 6), ng = gain(ctx); env(ng.gain, t, vel * (p.tone - 0.2) * 0.4, 0.04); chain(n, lp, ng, out); }
};

function rim(ctx, t, p, out, vel) {
  const f = 1400 + p.tune * 1200, dec = 0.015 + p.decay * 0.06;
  const g = gain(ctx); env(g.gain, t, vel * 0.9, dec);
  const bp = filt(ctx, 'bandpass', f, 3 + p.tone * 6);
  osc(ctx, 'triangle', f, t, t + dec + 0.1).connect(bp); osc(ctx, 'square', f * 0.33, t, t + dec + 0.1).connect(bp);
  chain(bp, g, out);
}

function clap(ctx, t, p, out, vel) {
  const dec = 0.08 + p.decay * 0.6, stop = t + dec + 0.2;
  const n = noise(ctx, t, stop), bp = filt(ctx, 'bandpass', 900 + p.tune * 1600, 1.2 + p.tone * 3);
  const g = gain(ctx); g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 3; i++) { const s = t + i * 0.011; g.gain.setValueAtTime(vel, s); g.gain.exponentialRampToValueAtTime(vel * 0.15, s + 0.009); }
  g.gain.setValueAtTime(vel * 0.8, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.033 + dec);
  chain(n, bp, g, out);
}

function cowbell(ctx, t, p, out, vel) {
  const k = 0.6 + p.tune * 0.8, dec = 0.04 + p.decay * 0.7, stop = t + dec + 0.2;
  const bp = filt(ctx, 'bandpass', 2000 * k, 1 + p.tone * 3), g = gain(ctx);
  g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + dec);
  osc(ctx, 'square', 540 * k, t, stop).connect(bp); osc(ctx, 'square', 800 * k, t, stop).connect(bp);
  chain(bp, g, out);
}

function metal(ctx, t, p, out, vel, dec, hp) {
  const f = 40 * (0.6 + p.tune * 0.8), stop = t + dec + 0.2;
  const bp = filt(ctx, 'bandpass', 10000, 0.8), hpf = filt(ctx, 'highpass', hp), g = gain(ctx);
  for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) osc(ctx, 'square', f * r, t, stop).connect(bp);
  env(g.gain, t, vel * 0.7, dec); chain(bp, hpf, g, out);
}
const chat = (ctx, t, p, out, vel) => metal(ctx, t, p, out, vel, 0.02 + p.decay * 0.14, 6000 + p.tone * 4000);
const ohat = (ctx, t, p, out, vel) => metal(ctx, t, p, out, vel, 0.12 + p.decay * 0.9, 5500 + p.tone * 4000);
const cymbal = (ctx, t, p, out, vel) => { metal(ctx, t, p, out, vel * 0.8, 0.4 + p.decay * 2.5, 3500 + p.tone * 4000); noiseHit(ctx, t, { tune: 1, tone: 0.9, decay: p.decay * 0.6 }, out, vel * 0.3); };

function shaker(ctx, t, p, out, vel) {
  const dec = 0.03 + p.decay * 0.2, n = noise(ctx, t, t + dec + 0.2), hp = filt(ctx, 'highpass', 4000 + p.tone * 5000), g = gain(ctx);
  env(g.gain, t, vel * 0.6, dec, 0.01 + (1 - p.tune) * 0.03); chain(n, hp, g, out);
}
function conga(ctx, t, p, out, vel) {
  const f = 180 + p.tune * 320, dec = 0.08 + p.decay * 0.5, o = osc(ctx, 'sine', f * 1.15, t, t + dec + 0.2);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.02); const g = gain(ctx); env(g.gain, t, vel, dec); chain(o, g, out);
}
function clave(ctx, t, p, out, vel) {
  const f = 1800 + p.tune * 1600, dec = 0.02 + p.decay * 0.1, g = gain(ctx); env(g.gain, t, vel * 0.8, dec);
  chain(osc(ctx, 'sine', f, t, t + dec + 0.1), filt(ctx, 'bandpass', f, 4 + p.tone * 8), g, out);
}
function zap(ctx, t, p, out, vel) {
  const dec = 0.05 + p.decay * 0.4, o = osc(ctx, p.tone > 0.5 ? 'square' : 'sine', 1500 + p.tune * 5000, t, t + dec + 0.1);
  o.frequency.exponentialRampToValueAtTime(40 + p.tune * 100, t + dec); const g = gain(ctx); env(g.gain, t, vel * 0.7, dec); chain(o, g, out);
}
function fmperc(ctx, t, p, out, vel) {
  const f = 80 * Math.pow(2, p.tune * 5), dec = 0.04 + p.decay * 0.8, stop = t + dec + 0.2;
  const c = osc(ctx, 'sine', f, t, stop), m = osc(ctx, 'sine', f * (1.5 + Math.round(p.tone * 6) * 0.5 + 0.01), t, stop), mg = gain(ctx);
  mg.gain.setValueAtTime(f * (2 + p.tone * 10), t); mg.gain.exponentialRampToValueAtTime(1, t + dec * 0.6);
  chain(m, mg, c.frequency); const g = gain(ctx); env(g.gain, t, vel * 0.8, dec); chain(c, g, out);
}
function noiseHit(ctx, t, p, out, vel) {
  const dec = 0.03 + p.decay * 1.2, n = noise(ctx, t, t + dec + 0.2), f = filt(ctx, 'lowpass', expMap(p.tone, 300, 18000), 1 + p.tune * 8), g = gain(ctx);
  env(g.gain, t, vel * 0.7, dec); chain(n, f, g, out);
}
function sub808(ctx, t, p, out, vel) { kick(ctx, t, { ...p, decay: 0.55 + p.decay * 0.45, pitch: 0.15, drive: p.drive ?? 0.3 }, out, vel); }

export const VOICES = {
  kick: ['Grosse caisse', kick], sub808: ['808 Boom', sub808], snare: ['Caisse claire', snare],
  htom: ['Tom aigu', tomFactory(220)], mtom: ['Tom médium', tomFactory(150)], ltom: ['Tom grave', tomFactory(100)],
  rim: ['Rim shot', rim], clap: ['Clap', clap], cowbell: ['Cloche', cowbell], cymbal: ['Cymbale', cymbal],
  ohat: ['Charley ouvert', ohat], chat: ['Charley fermé', chat], shaker: ['Shaker', shaker], conga: ['Conga', conga],
  clave: ['Claves', clave], zap: ['Zap laser', zap], fmperc: ['Perc FM', fmperc], noise: ['Bruit filtré', noiseHit],
};

/** Plays a sample buffer with tune/tone/decay. */
export function playSample(ctx, t, p, out, vel, buffer) {
  const s = ctx.createBufferSource(); s.buffer = buffer;
  s.playbackRate.value = Math.pow(2, ((p.tune - 0.5) * 24) / 12);
  const lp = filt(ctx, 'lowpass', expMap(p.tone, 150, 20000), 0.5);
  const g = gain(ctx, vel);
  const len = buffer.duration / s.playbackRate.value;
  const dec = p.decay >= 0.98 ? len : Math.min(len, 0.03 + p.decay * p.decay * 3);
  g.gain.setValueAtTime(vel, t); g.gain.setValueAtTime(vel, t + dec * 0.7); g.gain.linearRampToValueAtTime(0, t + dec);
  chain(withDrive(ctx, s, p.drive), lp, g, out);
  s.start(t); s.stop(t + dec + 0.05);
}
