// Drum & Bass signature pack: hand-designed presets using the full engine
// (3 oscillators with warp, 2 filters, env 3, macros, modulation matrix, drawn LFO shapes).
import { SHAPES } from './audio/synth.js';

const O = (o) => ({ on: true, table: 'basic', pos: 0.67, level: 0.6, ...o });
const off = { on: false };
const M = (src, dst, amt) => ({ src, dst, amt });
// Macro conventions for the whole pack: M1 = filter / brightness, M2 = warp / grit, M3 = movement, M4 = width or pitch
const P = (name, p) => ({ name: 'DnB ' + name, macros: [0, 0, 0, 0], ...p });

export const DNB_PRESETS = [
  // ---------------- reese & rolling basses
  P('Reese Classique', { oscA: O({ oct: -1, unison: 3, detune: 0.35 }), oscB: O({ oct: -1, fine: 14, level: 0.55 }), oscC: off, sub: { level: 0.45, oct: -1 },
    filter: { type: 'lowpass24', cutoff: 0.38, res: 2, drive: 0.35, envAmt: 0.05 }, filter2: { on: true, type: 'notch', cutoff: 0.45, res: 3 },
    lfo1: { rate: 0.18, depth: 0, dest: 'cutoff' }, mods: [M('lfo1', 'cutoff2', 0.35), M('m1', 'cutoff1', 0.6), M('m3', 'pitchB', 0.08)], mono: true, glide: 0.06, volume: 0.65 }),
  P('Reese Sombre', { oscA: O({ table: 'supersawish', pos: 0.3, oct: -1, unison: 5, detune: 0.45 }), oscB: O({ oct: -1, fine: -18, level: 0.5 }), oscC: off, sub: { level: 0.5, oct: -1 },
    filter: { type: 'lowpass24', cutoff: 0.3, res: 1.5, drive: 0.5 }, filter2: { on: true, type: 'peaking', cutoff: 0.35, res: 6 },
    lfo1: { rate: 0.1, depth: 0, dest: 'cutoff', wave: 'triangle' }, mods: [M('lfo1', 'cutoff2', 0.5), M('m1', 'cutoff1', 0.6)], mono: true, glide: 0.05, volume: 0.62 }),
  P('Reese Phaser', { oscA: O({ oct: -1, unison: 4, detune: 0.3 }), oscB: O({ oct: -1, fine: 9, level: 0.6 }), oscC: off, sub: { level: 0.4, oct: -1 },
    filter: { type: 'lowpass', cutoff: 0.42, res: 1, drive: 0.3 }, filter2: { on: true, type: 'allpass', cutoff: 0.4, res: 5 },
    lfo1: { rate: 0.25, depth: 0, dest: 'cutoff' }, mods: [M('lfo1', 'cutoff2', 0.7), M('m1', 'cutoff1', 0.5)], mono: true, volume: 0.65 }),
  P('Roller Sub', { oscA: O({ table: 'basic', pos: 0.05, oct: -1, level: 0.8 }), oscB: off, oscC: off, sub: { level: 0.25, oct: -1 }, filter: { cutoff: 0.45, drive: 0.25 },
    ampEnv: { a: 0.003, d: 0.6, s: 0.85, r: 0.12 }, modEnv: { a: 0.001, d: 0.06, s: 0, r: 0.05 }, mods: [M('env3', 'pitch', 0.25), M('m2', 'warpA', 0.5)], oscA_warp: 1, mono: true, glide: 0.05, volume: 0.8 }),
  P('Roller Mid', { oscA: O({ table: 'harm', pos: 0.35, oct: -1 }), oscB: O({ table: 'basic', pos: 0.67, oct: -1, unison: 2, detune: 0.15, level: 0.4 }), oscC: off, sub: { level: 0.5, oct: -1 },
    filter: { type: 'lowpass24', cutoff: 0.28, res: 4, envAmt: 0.35, drive: 0.3 }, filtEnv: { a: 0.002, d: 0.22, s: 0.2, r: 0.1 }, mods: [M('m1', 'cutoff1', 0.6), M('vel', 'cutoff1', 0.2)], mono: true, glide: 0.04, volume: 0.68 }),
  P('Rolling Pluck Bass', { oscA: O({ oct: -1, unison: 2, detune: 0.12 }), oscB: off, oscC: off, sub: { level: 0.55, oct: -1 }, filter: { cutoff: 0.18, res: 5, envAmt: 0.6, drive: 0.4 },
    filtEnv: { a: 0.001, d: 0.14, s: 0.05, r: 0.08 }, ampEnv: { a: 0.002, d: 0.35, s: 0.6, r: 0.08 }, mods: [M('m1', 'cutoff1', 0.5)], mono: true, glide: 0.03, volume: 0.7 }),

  // ---------------- neuro & techstep
  P('Neuro Mâchoire', { oscA: O({ table: 'fold', pos: 0.45, oct: -1, warp: 'fold', warpAmt: 0.4 }), oscB: O({ table: 'fm', pos: 0.6, oct: -1, level: 0.5 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.45 }),
    filter: { type: 'bandpass', cutoff: 0.55, res: 6, drive: 0.7 }, filter2: { on: true, type: 'lowpass', cutoff: 0.7, res: 1, route: 'parallel' },
    lfo1: { rate: 5.8, depth: 0, dest: 'cutoff', wave: 'custom', shape: SHAPES.steps }, mods: [M('lfo1', 'cutoff1', 0.55), M('lfo1', 'warpA', 0.4), M('m2', 'warpA', 0.6), M('m1', 'cutoff1', 0.4)], mono: true, glide: 0.02, volume: 0.58 }),
  P('Neuro Métal', { oscA: O({ table: 'sync', pos: 0.6, oct: -1, warp: 'ring', warpAmt: 0.5 }), oscB: O({ table: 'basic', pos: 0.67, oct: 0, semi: 7, level: 0.5 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }),
    filter: { type: 'peaking', cutoff: 0.5, res: 9, drive: 0.6 }, lfo1: { rate: 2.9, depth: 0, dest: 'cutoff', wave: 'square' },
    mods: [M('lfo1', 'cutoff1', 0.5), M('m2', 'warpA', 0.8), M('m3', 'posA', 0.6)], mono: true, glide: 0.02, volume: 0.55 }),
  P('Neuro Formant', { oscA: O({ table: 'formant', pos: 0.2, oct: -1, unison: 2, detune: 0.1, warp: 'drive', warpAmt: 0.5 }), oscB: off, oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }),
    filter: { type: 'bandpass', cutoff: 0.6, res: 5, drive: 0.5 }, lfo1: { rate: 2.9, depth: 0, dest: 'cutoff', wave: 'custom', shape: SHAPES.bounce },
    mods: [M('lfo1', 'posA', 0.8), M('lfo1', 'cutoff1', 0.35), M('m3', 'posA', 0.5)], mono: true, volume: 0.6 }),
  P('Neuro Tordu', { oscA: O({ table: 'growl', pos: 0.5, oct: -1, warp: 'fm', warpAmt: 0.5 }), oscB: O({ table: 'basic', pos: 0, oct: 0, level: 0.6 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.45 }),
    filter: { type: 'lowpass24', cutoff: 0.55, res: 6, drive: 0.8 }, filter2: { on: true, type: 'notch', cutoff: 0.5, res: 4 },
    lfo1: { rate: 1.45, depth: 0, dest: 'cutoff', wave: 'custom', shape: SHAPES.pump }, mods: [M('lfo1', 'warpA', 0.6), M('lfo1', 'cutoff2', 0.5), M('m2', 'warpA', 0.5), M('m1', 'cutoff1', 0.4)], mono: true, glide: 0.03, volume: 0.56 }),
  P('Neuro Laser Bass', { oscA: O({ table: 'fm3', pos: 0.7, oct: -1 }), oscB: O({ table: 'pwm', pos: 0.4, oct: -1, level: 0.5 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }), fm: 0.4,
    filter: { type: 'bandpass', cutoff: 0.45, res: 10, drive: 0.6, envAmt: 0.5 }, filtEnv: { a: 0.001, d: 0.12, s: 0.3, r: 0.1 }, modEnv: { a: 0.001, d: 0.08, s: 0, r: 0.05 },
    mods: [M('env3', 'pitchA', 0.3), M('m2', 'fm', 0.6), M('m1', 'cutoff1', 0.4)], mono: true, volume: 0.56 }),
  P('Techstep Grinder', { oscA: O({ table: 'digital', pos: 0.4, oct: -1, warp: 'crush', warpAmt: 0.4 }), oscB: O({ oct: -1, fine: 20, unison: 2, detune: 0.3, level: 0.5 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.4 }),
    filter: { type: 'lowpass24', cutoff: 0.36, res: 3, drive: 0.7 }, lfo1: { rate: 0.6, depth: 0, dest: 'cutoff', wave: 'triangle' }, mods: [M('lfo1', 'cutoff1', 0.4), M('m2', 'warpA', 0.6)], mono: true, volume: 0.6 }),
  P('Techstep Hoover', { oscA: O({ table: 'pwm', pos: 0.25, unison: 7, detune: 0.55, spread: 1 }), oscB: O({ oct: -1, unison: 3, detune: 0.4, level: 0.5 }), oscC: off, filter: { cutoff: 0.6, drive: 0.3 },
    modEnv: { a: 0.15, d: 0.4, s: 0, r: 0.2 }, mods: [M('env3', 'pitch', -0.15), M('m4', 'pitch', 0.25)], mono: true, glide: 0.25, volume: 0.55 }),

  // ---------------- jump-up & dancefloor
  P('Jump Up Wob', { oscA: O({ table: 'growl', pos: 0.3, oct: -1, warp: 'drive', warpAmt: 0.5 }), oscB: off, oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.55 }),
    filter: { type: 'lowpass24', cutoff: 0.3, res: 8, drive: 0.6 }, lfo1: { rate: 2.9, depth: 0, dest: 'cutoff', wave: 'custom', shape: SHAPES.saw },
    mods: [M('lfo1', 'cutoff1', 0.6), M('m3', 'posA', 0.6), M('m1', 'cutoff1', 0.3)], mono: true, glide: 0.04, volume: 0.6 }),
  P('Jump Up Hoover', { oscA: O({ table: 'pwm', pos: 0.4, oct: -1, unison: 5, detune: 0.5 }), oscB: O({ oct: -1, level: 0.5 }), oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }),
    filter: { cutoff: 0.5, res: 2, drive: 0.5 }, lfo1: { rate: 5.8, depth: 0, dest: 'cutoff', wave: 'square' }, mods: [M('lfo1', 'cutoff1', 0.3), M('m4', 'pitch', 0.3)], mono: true, glide: 0.18, volume: 0.56 }),
  P('Jump Up Siren', { oscA: O({ table: 'sync', pos: 0.4, oct: -1 }), oscB: off, oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }), filter: { cutoff: 0.55, res: 4, drive: 0.5 },
    lfo2: { rate: 0.75, depth: 0, dest: 'pitch', wave: 'triangle' }, mods: [M('lfo2', 'pitchA', 0.15), M('lfo2', 'posA', 0.5), M('m3', 'posA', 0.4)], mono: true, glide: 0.08, volume: 0.58 }),
  P('Dancefloor Saw Bass', { oscA: O({ oct: -1, unison: 3, detune: 0.2 }), oscB: O({ table: 'pwm', pos: 0.2, oct: -1, level: 0.4 }), oscC: off, sub: { level: 0.5, oct: -1 },
    filter: { type: 'lowpass24', cutoff: 0.32, res: 3, envAmt: 0.45, drive: 0.4 }, filtEnv: { a: 0.002, d: 0.3, s: 0.3, r: 0.1 }, mods: [M('m1', 'cutoff1', 0.6)], mono: true, glide: 0.04, volume: 0.66 }),
  P('Dancefloor Stab Bass', { oscA: O({ table: 'supersawish', pos: 0.5, oct: -1, unison: 4, detune: 0.3 }), oscB: off, oscC: O({ table: 'basic', pos: 0, oct: -2, level: 0.5 }),
    filter: { cutoff: 0.25, res: 4, envAmt: 0.6, drive: 0.5 }, filtEnv: { a: 0.001, d: 0.18, s: 0.1, r: 0.1 }, ampEnv: { a: 0.002, d: 0.3, s: 0.4, r: 0.1 }, mono: true, volume: 0.65 }),

  // ---------------- jungle
  P('Jungle Sub Glide', { oscA: O({ table: 'basic', pos: 0, oct: -1, level: 0.85 }), oscB: off, oscC: off, filter: { cutoff: 0.4 }, ampEnv: { a: 0.005, d: 1, s: 0.8, r: 0.25 }, lfo2: { rate: 5, depth: 0.004, dest: 'pitch' }, mono: true, glide: 0.18, volume: 0.82 }),
  P('Jungle Dub Sub', { oscA: O({ table: 'basic', pos: 0.08, oct: -1, level: 0.8, warp: 'drive', warpAmt: 0.25 }), oscB: off, oscC: off, filter: { cutoff: 0.35 },
    lfo1: { rate: 1.45, depth: 0, dest: 'cutoff', wave: 'sine' }, mods: [M('lfo1', 'cutoff1', 0.25), M('m2', 'warpA', 0.6)], mono: true, glide: 0.1, volume: 0.8 }),
  P('Jungle Stab Ragga', { oscA: O({ table: 'organ', pos: 0.6 }), oscB: O({ table: 'basic', pos: 0.67, semi: 7, level: 0.4 }), oscC: off, filter: { cutoff: 0.5, res: 2, envAmt: 0.4 },
    filtEnv: { a: 0.002, d: 0.2, s: 0.1, r: 0.15 }, ampEnv: { a: 0.002, d: 0.3, s: 0, r: 0.2 }, volume: 0.6 }),

  // ---------------- leads, stabs, plucks
  P('Lead Rave', { oscA: O({ unison: 7, detune: 0.4, spread: 1 }), oscB: O({ oct: 1, unison: 3, detune: 0.2, level: 0.35 }), oscC: off, filter: { cutoff: 0.82, res: 1 },
    ampEnv: { a: 0.005, d: 0.4, s: 0.85, r: 0.35 }, mods: [M('m1', 'cutoff1', 0.3), M('vel', 'cutoff1', 0.2)], volume: 0.55 }),
  P('Lead Sync Hurlant', { oscA: O({ table: 'sync', pos: 0.3, unison: 2, detune: 0.1 }), oscB: off, oscC: off, filter: { cutoff: 0.75, res: 3, drive: 0.3 }, modEnv: { a: 0.001, d: 0.6, s: 0, r: 0.2 },
    mods: [M('env3', 'posA', 0.6), M('m3', 'posA', 0.4)], mono: true, glide: 0.07, volume: 0.55 }),
  P('Stab Neuro Accord', { oscA: O({ table: 'supersawish', pos: 0.6, unison: 4, detune: 0.3 }), oscB: O({ table: 'fold', pos: 0.4, level: 0.4, warp: 'fold', warpAmt: 0.3 }), oscC: off,
    filter: { cutoff: 0.35, res: 3, envAmt: 0.55, drive: 0.4 }, filtEnv: { a: 0.001, d: 0.16, s: 0.05, r: 0.12 }, ampEnv: { a: 0.002, d: 0.28, s: 0.1, r: 0.15 }, volume: 0.58 }),
  P('Stab Liquid Accord', { oscA: O({ unison: 5, detune: 0.25 }), oscB: O({ table: 'harm', pos: 0.4, oct: 1, level: 0.3 }), oscC: off, filter: { cutoff: 0.4, res: 1.5, envAmt: 0.4 },
    filtEnv: { a: 0.003, d: 0.3, s: 0.2, r: 0.3 }, ampEnv: { a: 0.003, d: 0.5, s: 0.3, r: 0.4 }, volume: 0.58 }),
  P('Pluck Cristal Liquid', { oscA: O({ table: 'harm', pos: 0.7 }), oscB: O({ table: 'basic', pos: 0, oct: 1, level: 0.35 }), oscC: off, filter: { cutoff: 0.3, res: 2, envAmt: 0.55 },
    filtEnv: { a: 0.001, d: 0.2, s: 0, r: 0.2 }, ampEnv: { a: 0.001, d: 0.6, s: 0, r: 0.5 }, volume: 0.62 }),
  P('Pluck Marimba Roll', { oscA: O({ table: 'basic', pos: 0.1 }), oscB: O({ table: 'basic', pos: 0, oct: 2, level: 0.4 }), oscC: off, fm: 0.2, ampEnv: { a: 0.001, d: 0.35, s: 0, r: 0.25 }, filter: { cutoff: 0.85 }, volume: 0.65 }),

  // ---------------- liquid keys, pads, atmospheres
  P('Rhodes Liquid', { oscA: O({ table: 'basic', pos: 0.05, level: 0.8 }), oscB: O({ table: 'basic', pos: 0, oct: 1, level: 0.55 }), oscC: off, fm: 0.28, filter: { cutoff: 0.72, drive: 0.15 },
    lfo1: { rate: 4.5, depth: 0.15, dest: 'amp' }, ampEnv: { a: 0.002, d: 1.4, s: 0.25, r: 0.5 }, mods: [M('vel', 'fm', 0.3)], volume: 0.62 }),
  P('Piano Atmos', { oscA: O({ table: 'harm', pos: 0.25 }), oscB: O({ table: 'basic', pos: 0, oct: 1, level: 0.35 }), oscC: off, fm: 0.1, filter: { cutoff: 0.65 },
    ampEnv: { a: 0.002, d: 2, s: 0.1, r: 0.9 }, volume: 0.62 }),
  P('Pad Liquid Chaud', { oscA: O({ table: 'basic', pos: 0.55, unison: 6, detune: 0.3, spread: 1 }), oscB: O({ table: 'harm', pos: 0.3, oct: 1, level: 0.3 }), oscC: off,
    filter: { cutoff: 0.45, res: 1.2, envAmt: 0.25 }, filtEnv: { a: 1.5, d: 2, s: 0.5, r: 2 }, ampEnv: { a: 1, d: 1, s: 0.9, r: 2.5 }, lfo1: { rate: 0.15, depth: 0.1, dest: 'cutoff' }, mods: [M('m1', 'cutoff1', 0.5)], volume: 0.55 }),
  P('Pad Choeur Céleste', { oscA: O({ table: 'formant', pos: 0.4, unison: 5, detune: 0.2 }), oscB: off, oscC: off, wtLfo: { rate: 0.1, depth: 0.7 }, filter: { cutoff: 0.7 },
    ampEnv: { a: 0.9, d: 1, s: 0.9, r: 2.5 }, lfo2: { rate: 5, depth: 0.008, dest: 'pitch' }, volume: 0.55 }),
  P('Atmos Sombre', { oscA: O({ table: 'chaos', pos: 0.3, unison: 5, detune: 0.4, oct: -1 }), oscB: O({ table: 'formant', pos: 0.8, level: 0.3 }), oscC: off, wtLfo: { rate: 0.05, depth: 1 },
    filter: { cutoff: 0.32, res: 3 }, filter2: { on: true, type: 'highpass', cutoff: 0.12 }, lfo1: { rate: 0.08, depth: 0.25, dest: 'cutoff' }, ampEnv: { a: 2.5, d: 1, s: 1, r: 4 }, volume: 0.52 }),
  P('Cordes Rollers', { oscA: O({ unison: 7, detune: 0.18 }), oscB: off, oscC: off, filter: { cutoff: 0.55, res: 0.7 }, ampEnv: { a: 0.4, d: 0.6, s: 0.9, r: 1.2 }, lfo2: { rate: 5.5, depth: 0.012, dest: 'pitch' }, volume: 0.55 }),

  // ---------------- FX & transitions
  P('FX Riser 8 temps', { oscA: O({ table: 'supersawish', pos: 0.5, unison: 7, detune: 0.5, level: 0.35 }), oscB: off, oscC: off, noise: { level: 0.7 },
    filter: { type: 'bandpass', cutoff: 0.15, res: 5, envAmt: 0.9 }, filtEnv: { a: 2.7, d: 1, s: 1, r: 0.5 }, ampEnv: { a: 2.5, d: 1, s: 1, r: 0.5 }, modEnv: { a: 2.7, d: 1, s: 1, r: 0.3 }, mods: [M('env3', 'pitch', 0.5)], volume: 0.5 }),
  P('FX Impact Sub', { oscA: O({ table: 'basic', pos: 0, oct: -1, level: 0.9 }), oscB: off, oscC: off, noise: { level: 0.4 }, filter: { cutoff: 0.5 }, ampEnv: { a: 0.001, d: 2.5, s: 0, r: 1 },
    modEnv: { a: 0.001, d: 1.2, s: 0, r: 0.5 }, mods: [M('env3', 'pitch', 0.6)], volume: 0.8 }),
  P('FX Laser Neuro', { oscA: O({ table: 'fm', pos: 0.8 }), oscB: off, oscC: off, lfo2: { rate: 12, depth: 0.5, dest: 'pitch', wave: 'sawtooth' }, filter: { cutoff: 0.8 }, ampEnv: { a: 0.001, d: 0.3, s: 0, r: 0.2 }, volume: 0.5 }),
  P('FX Alarme', { oscA: O({ table: 'pwm', pos: 0 }), oscB: off, oscC: off, lfo2: { rate: 2.9, depth: 0.25, dest: 'pitch', wave: 'square' }, filter: { cutoff: 0.75 }, volume: 0.45 }),
  P('Vocal Robot', { oscA: O({ table: 'formant', pos: 0.5, warp: 'ring', warpAmt: 0.3 }), oscB: O({ table: 'basic', pos: 0.67, oct: 1, level: 0.4 }), oscC: off, filter: { type: 'bandpass', cutoff: 0.6, res: 4 },
    lfo1: { rate: 1.45, depth: 0, dest: 'cutoff', wave: 'custom', shape: SHAPES.steps }, mods: [M('lfo1', 'posA', 0.9), M('m3', 'posA', 0.5)], mono: true, glide: 0.05, volume: 0.55 }),
];
// small fix-up: presets above that ask for warp on osc A without naming it
for (const p of DNB_PRESETS) if (p.oscA_warp) { p.oscA.warp = 'drive'; p.oscA.warpAmt = 0.15; delete p.oscA_warp; }
