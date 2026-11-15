// 100 000 genre presets, generated on demand: 20 genres × 5 roles × 1000 variations.
// A preset is fully determined by (genre, role, number): same number → same sound, nothing is stored.

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export const ROLES = [['bass', 'Basses'], ['lead', 'Leads'], ['pad', 'Pads'], ['keys', 'Claviers'], ['pluck', 'Plucks & FX']];
export const PER_BUCKET = 1000;

// ---- sound families: (r, ctx) => patch. r() in [0,1); ctx.bright / ctx.dirt in [0,1], ctx.bpm
const U = (r, a, b) => a + r() * (b - a), P = (r, arr) => arr[Math.floor(r() * arr.length)], I = (r, a, b) => Math.floor(U(r, a, b + 1));
const syncRate = (r, bpm, divs) => (bpm / 60) / P(r, divs); // LFO Hz locked to the tempo (divs in beats)
const F = {
  sub808: (r, c) => ({ oscA: { on: true, table: 'basic', pos: U(r, 0, 0.12), oct: -1 }, sub: { level: U(r, 0, 0.4), oct: -1 }, filter: { cutoff: U(r, 0.35, 0.6), drive: U(r, 0.15, 0.55) * (0.5 + c.dirt) },
    ampEnv: { a: 0.002, d: U(r, 0.6, 2.2), s: U(r, 0.2, 0.6), r: U(r, 0.2, 0.6) }, mono: true, glide: U(r, 0.04, 0.16), volume: 0.8 }),
  reese: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'supersawish']), pos: U(r, 0.6, 0.72), oct: -1, unison: I(r, 2, 5), detune: U(r, 0.25, 0.55) }, oscB: { on: true, table: 'basic', pos: 0.67, oct: -1, fine: U(r, 8, 22), level: 0.6 },
    sub: { level: U(r, 0.2, 0.5), oct: -1 }, filter: { cutoff: U(r, 0.25, 0.45) + c.bright * 0.15, res: U(r, 1, 4), drive: U(r, 0.2, 0.6) }, lfo1: { rate: U(r, 0.1, 0.6), depth: U(r, 0.05, 0.25), dest: 'cutoff' }, mono: true, glide: U(r, 0.02, 0.1), volume: 0.7 }),
  wobble: (r, c) => ({ oscA: { on: true, table: P(r, ['growl', 'basic', 'fm', 'supersawish']), pos: U(r, 0.3, 0.9), oct: -1, unison: I(r, 1, 4), detune: U(r, 0.1, 0.3) }, sub: { level: U(r, 0.4, 0.7), oct: -1 },
    filter: { cutoff: U(r, 0.2, 0.4), res: U(r, 4, 12), drive: U(r, 0.3, 0.8) }, lfo1: { rate: syncRate(r, c.bpm, [0.25, 0.5, 1 / 3, 0.75, 1]), depth: U(r, 0.5, 0.9), dest: 'cutoff', wave: P(r, ['sine', 'triangle', 'square', 'sawtooth']) },
    wtLfo: { rate: syncRate(r, c.bpm, [0.5, 1, 2]), depth: U(r, 0.3, 0.9) }, mono: true, glide: 0.04, volume: 0.65 }),
  growl: (r, c) => ({ oscA: { on: true, table: P(r, ['growl', 'fold', 'fm', 'fm3']), pos: U(r, 0.2, 0.8), oct: -1 }, oscB: { on: true, table: P(r, ['fm', 'sync', 'digital']), pos: U(r, 0.2, 0.9), oct: P(r, [-1, 0]), level: U(r, 0.3, 0.6) },
    fm: U(r, 0.1, 0.6), sub: { level: U(r, 0.3, 0.6), oct: -1 }, filter: { type: P(r, ['lowpass', 'bandpass', 'lowpass']), cutoff: U(r, 0.35, 0.65), res: U(r, 2, 9), drive: U(r, 0.4, 0.9) },
    wtLfo: { rate: syncRate(r, c.bpm, [0.25, 0.5, 1]), depth: U(r, 0.5, 1) }, lfo1: { rate: syncRate(r, c.bpm, [0.25, 0.5]), depth: U(r, 0.1, 0.4), dest: P(r, ['cutoff', 'fm']) }, mono: true, glide: 0.03, volume: 0.6 }),
  neuro: (r, c) => ({ oscA: { on: true, table: P(r, ['fold', 'sync', 'fm3', 'chaos', 'growl']), pos: U(r, 0.2, 0.9), oct: -1, unison: I(r, 1, 3), detune: U(r, 0.05, 0.2) }, oscB: { on: true, table: P(r, ['basic', 'pwm', 'harm']), pos: U(r, 0, 1), oct: -1, fine: U(r, -15, 15), level: U(r, 0.3, 0.7) },
    fm: U(r, 0, 0.9), sub: { level: U(r, 0.35, 0.6), oct: -1 }, filter: { type: P(r, ['bandpass', 'lowpass', 'notch', 'peaking']), cutoff: U(r, 0.4, 0.7), res: U(r, 3, 14), drive: U(r, 0.5, 1), envAmt: U(r, -0.3, 0.4) },
    wtLfo: { rate: syncRate(r, c.bpm, [0.125, 0.25, 0.5]), depth: U(r, 0.6, 1) }, lfo1: { rate: syncRate(r, c.bpm, [0.25, 0.5, 1 / 3]), depth: U(r, 0.2, 0.6), dest: P(r, ['cutoff', 'fm', 'pitch']), wave: P(r, ['square', 'sawtooth', 'triangle']) }, mono: true, glide: U(r, 0.01, 0.05), volume: 0.6 }),
  acid: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'pwm']), pos: P(r, [0.67, 1, 0.1]), oct: P(r, [-1, 0]) }, filter: { cutoff: U(r, 0.15, 0.35), res: U(r, 10, 20), envAmt: U(r, 0.4, 0.8), drive: U(r, 0.3, 0.7) },
    filtEnv: { a: 0.001, d: U(r, 0.12, 0.35), s: 0, r: 0.1 }, ampEnv: { a: 0.001, d: 0.3, s: 0.7, r: 0.06 }, mono: true, glide: U(r, 0.04, 0.09), volume: 0.6 }),
  moog: (r, c) => ({ oscA: { on: true, table: 'basic', pos: P(r, [0.67, 0.95, 0.33]), oct: -1 }, oscB: { on: true, table: 'basic', pos: 0.67, oct: -1, fine: U(r, -9, 9), level: U(r, 0.3, 0.6) }, sub: { level: U(r, 0.2, 0.5), oct: -1 },
    filter: { cutoff: U(r, 0.22, 0.42) + c.bright * 0.1, res: U(r, 1, 6), envAmt: U(r, 0.2, 0.55), drive: U(r, 0.1, 0.4) }, filtEnv: { a: 0.002, d: U(r, 0.15, 0.5), s: U(r, 0, 0.3), r: 0.15 }, ampEnv: { a: 0.002, d: 0.4, s: U(r, 0.5, 0.9), r: 0.12 }, mono: true, glide: U(r, 0.02, 0.08), volume: 0.7 }),
  fmbass: (r, c) => ({ oscA: { on: true, table: 'basic', pos: 0, oct: -1 }, oscB: { on: true, table: 'basic', pos: 0, oct: P(r, [-1, 0, 1]), semi: P(r, [0, 0, 7, 12]), level: 0.7 }, fm: U(r, 0.3, 1.2), filter: { cutoff: U(r, 0.45, 0.75) },
    ampEnv: { a: 0.002, d: U(r, 0.2, 0.6), s: U(r, 0.2, 0.6), r: 0.1 }, mono: true, volume: 0.7 }),
  supersaw: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'supersawish']), pos: U(r, 0.62, 0.72), unison: I(r, 5, 9), detune: U(r, 0.25, 0.55), spread: U(r, 0.7, 1) }, oscB: { on: r() < 0.7, table: 'basic', pos: 0.67, oct: P(r, [1, -1, 0]), unison: I(r, 1, 5), detune: U(r, 0.1, 0.3), level: U(r, 0.2, 0.45) },
    filter: { cutoff: U(r, 0.6, 0.9) * (0.7 + c.bright * 0.3), res: U(r, 0.5, 3), envAmt: U(r, 0, 0.3) }, ampEnv: { a: U(r, 0.002, 0.05), d: U(r, 0.3, 1), s: U(r, 0.5, 0.9), r: U(r, 0.2, 0.8) }, volume: 0.6 }),
  squarelead: (r, c) => ({ oscA: { on: true, table: P(r, ['pwm', 'basic', 'odd']), pos: U(r, 0, 0.6) }, oscB: { on: r() < 0.5, table: 'pwm', pos: U(r, 0, 1), fine: U(r, -12, 12), level: 0.4 }, wtLfo: { rate: U(r, 0.2, 3), depth: U(r, 0, 0.5) },
    filter: { cutoff: U(r, 0.55, 0.9), res: U(r, 0.5, 4), envAmt: U(r, 0, 0.3) }, lfo2: { rate: U(r, 4.5, 6.5), depth: U(r, 0, 0.015), dest: 'pitch' }, ampEnv: { a: 0.003, d: 0.3, s: 0.8, r: U(r, 0.08, 0.4) }, mono: r() < 0.6, glide: U(r, 0.02, 0.12), volume: 0.6 }),
  synclead: (r, c) => ({ oscA: { on: true, table: P(r, ['sync', 'fold', 'harm']), pos: U(r, 0.2, 0.8), unison: I(r, 1, 3), detune: U(r, 0.05, 0.25) }, wtLfo: { rate: U(r, 0.1, 2), depth: U(r, 0.2, 0.7) }, filter: { cutoff: U(r, 0.6, 0.9), res: U(r, 1, 5), drive: U(r, 0, 0.5) },
    ampEnv: { a: 0.003, d: 0.4, s: 0.75, r: 0.25 }, mono: true, glide: U(r, 0.03, 0.12), volume: 0.6 }),
  hoover: (r, c) => ({ oscA: { on: true, table: 'pwm', pos: U(r, 0.2, 0.5), unison: 7, detune: U(r, 0.4, 0.6), spread: 1 }, oscB: { on: true, table: 'basic', pos: 0.67, oct: -1, unison: 3, detune: 0.4, level: 0.5 }, filter: { cutoff: U(r, 0.55, 0.8) },
    lfo2: { rate: U(r, 0.2, 0.6), depth: U(r, 0.01, 0.04), dest: 'pitch' }, mono: true, glide: U(r, 0.15, 0.35), volume: 0.55 }),
  belllead: (r, c) => ({ oscA: { on: true, table: 'basic', pos: 0 }, oscB: { on: true, table: 'basic', pos: 0, oct: P(r, [1, 2]), semi: P(r, [0, 7, 5, 4]), fine: U(r, 0, 30), level: U(r, 0.4, 0.7) }, fm: U(r, 0.2, 0.7),
    ampEnv: { a: 0.001, d: U(r, 0.6, 2), s: U(r, 0, 0.3), r: U(r, 0.4, 1.2) }, filter: { cutoff: U(r, 0.75, 1) }, volume: 0.6 }),
  chip: (r, c) => ({ oscA: { on: true, table: P(r, ['pwm', 'digital']), pos: U(r, 0, 0.8) }, wtLfo: { rate: U(r, 1, 6), depth: U(r, 0, 0.6) }, filter: { cutoff: 1 }, ampEnv: { a: 0.001, d: U(r, 0.05, 0.3), s: U(r, 0.4, 0.9), r: 0.05 }, lfo2: { rate: U(r, 5, 8), depth: U(r, 0, 0.02), dest: 'pitch' }, volume: 0.5 }),
  warmpad: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'harm', 'supersawish']), pos: U(r, 0.4, 0.7), unison: I(r, 3, 7), detune: U(r, 0.15, 0.4), spread: 0.9 }, oscB: { on: r() < 0.6, table: P(r, ['harm', 'organ', 'basic']), pos: U(r, 0, 0.6), oct: P(r, [1, 0, -1]), level: U(r, 0.2, 0.4) },
    filter: { cutoff: U(r, 0.35, 0.65) * (0.7 + c.bright * 0.4), res: U(r, 0.5, 2.5), envAmt: U(r, 0.05, 0.35) }, filtEnv: { a: U(r, 0.5, 2.5), d: U(r, 1, 3), s: 0.5, r: 2 }, ampEnv: { a: U(r, 0.4, 2), d: 1, s: U(r, 0.75, 1), r: U(r, 1.2, 3.5) },
    lfo1: { rate: U(r, 0.05, 0.4), depth: U(r, 0, 0.2), dest: 'cutoff' }, wtLfo: { rate: U(r, 0.05, 0.3), depth: U(r, 0, 0.5) }, volume: 0.55 }),
  darkpad: (r, c) => ({ oscA: { on: true, table: P(r, ['chaos', 'formant', 'growl', 'fold']), pos: U(r, 0, 1), unison: I(r, 3, 6), detune: U(r, 0.2, 0.45), oct: P(r, [0, -1]) }, wtLfo: { rate: U(r, 0.03, 0.2), depth: U(r, 0.4, 1) },
    filter: { cutoff: U(r, 0.2, 0.45), res: U(r, 1, 5) }, lfo1: { rate: U(r, 0.05, 0.25), depth: U(r, 0.1, 0.35), dest: 'cutoff' }, ampEnv: { a: U(r, 1, 3), d: 1, s: 1, r: U(r, 2, 4) }, volume: 0.55 }),
  choir: (r, c) => ({ oscA: { on: true, table: 'formant', pos: U(r, 0, 1), unison: I(r, 3, 6), detune: U(r, 0.1, 0.3) }, wtLfo: { rate: U(r, 0.05, 0.5), depth: U(r, 0.3, 1) }, filter: { cutoff: U(r, 0.55, 0.85) }, ampEnv: { a: U(r, 0.3, 1.2), d: 1, s: 0.9, r: U(r, 1, 2.5) }, lfo2: { rate: 5, depth: 0.008, dest: 'pitch' }, volume: 0.55 }),
  strings: (r, c) => ({ oscA: { on: true, table: 'basic', pos: U(r, 0.6, 0.7), unison: I(r, 4, 8), detune: U(r, 0.12, 0.25) }, filter: { cutoff: U(r, 0.45, 0.7), res: 0.6, envAmt: 0.1 }, ampEnv: { a: U(r, 0.15, 0.6), d: 0.5, s: 0.9, r: U(r, 0.6, 1.5) }, lfo2: { rate: U(r, 4.5, 6), depth: U(r, 0.005, 0.015), dest: 'pitch' }, volume: 0.55 }),
  epiano: (r, c) => ({ oscA: { on: true, table: 'basic', pos: U(r, 0, 0.2), level: 0.8 }, oscB: { on: true, table: 'basic', pos: 0, oct: 1, semi: P(r, [0, 0, 7]), level: U(r, 0.4, 0.7) }, fm: U(r, 0.15, 0.45), filter: { cutoff: U(r, 0.6, 0.9), drive: U(r, 0, 0.3) },
    lfo1: { rate: U(r, 3.5, 6), depth: U(r, 0, 0.25), dest: 'amp' }, ampEnv: { a: 0.002, d: U(r, 0.8, 2), s: U(r, 0.1, 0.35), r: U(r, 0.3, 0.7) }, volume: 0.65 }),
  organ: (r, c) => ({ oscA: { on: true, table: 'organ', pos: U(r, 0, 1) }, filter: { cutoff: U(r, 0.65, 0.95), drive: U(r, 0, 0.5) }, lfo1: { rate: P(r, [0.8, 6.5]), depth: U(r, 0.05, 0.25), dest: 'amp' }, ampEnv: { a: 0.005, d: 0.1, s: 1, r: 0.08 }, volume: 0.55 }),
  mallet: (r, c) => ({ oscA: { on: true, table: 'basic', pos: U(r, 0, 0.2) }, oscB: { on: true, table: 'basic', pos: 0, oct: P(r, [1, 2]), semi: P(r, [0, 7, 4]), level: U(r, 0.2, 0.5) }, fm: U(r, 0.1, 0.4),
    ampEnv: { a: 0.001, d: U(r, 0.3, 1.2), s: 0, r: U(r, 0.2, 0.6) }, filter: { cutoff: U(r, 0.7, 1) }, volume: 0.65 }),
  lofikeys: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'harm']), pos: U(r, 0.1, 0.35) }, oscB: { on: true, table: 'digital', pos: U(r, 0.4, 0.8), level: U(r, 0.1, 0.3) }, filter: { cutoff: U(r, 0.35, 0.55) },
    lfo2: { rate: U(r, 0.4, 1), depth: U(r, 0.006, 0.018), dest: 'pitch' }, ampEnv: { a: 0.005, d: U(r, 0.6, 1.4), s: U(r, 0.2, 0.45), r: 0.5 }, volume: 0.65 }),
  pluck: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'harm', 'fold', 'supersawish']), pos: U(r, 0.3, 0.85), unison: I(r, 1, 4), detune: U(r, 0.08, 0.25) }, oscB: { on: r() < 0.4, table: 'basic', pos: 0, oct: 1, level: 0.3 },
    filter: { cutoff: U(r, 0.15, 0.35), res: U(r, 1, 6), envAmt: U(r, 0.45, 0.75) }, filtEnv: { a: 0.001, d: U(r, 0.08, 0.3), s: 0, r: 0.15 }, ampEnv: { a: 0.001, d: U(r, 0.2, 0.7), s: 0, r: U(r, 0.15, 0.5) }, volume: 0.65 }),
  stab: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'supersawish', 'organ']), pos: U(r, 0.5, 0.8), unison: I(r, 2, 6), detune: U(r, 0.15, 0.35) }, filter: { cutoff: U(r, 0.3, 0.55), res: U(r, 1, 4), envAmt: U(r, 0.3, 0.6), drive: U(r, 0, 0.4) },
    filtEnv: { a: 0.002, d: U(r, 0.1, 0.25), s: 0.1, r: 0.1 }, ampEnv: { a: 0.002, d: U(r, 0.15, 0.4), s: U(r, 0, 0.3), r: 0.15 }, volume: 0.6 }),
  riser: (r, c) => ({ oscA: { on: true, table: P(r, ['chaos', 'supersawish', 'harm']), pos: U(r, 0, 1), unison: 5, detune: 0.4, level: 0.4 }, noise: { level: U(r, 0.4, 0.9) },
    filter: { type: P(r, ['bandpass', 'highpass', 'lowpass']), cutoff: U(r, 0.15, 0.3), res: U(r, 3, 8), envAmt: U(r, 0.6, 0.9) }, filtEnv: { a: U(r, 2, 5), d: 1, s: 1, r: 1 }, ampEnv: { a: U(r, 1, 3), d: 1, s: 1, r: 1 }, lfo2: { rate: U(r, 4, 12), depth: U(r, 0, 0.05), dest: 'pitch' }, volume: 0.5 }),
  laser: (r, c) => ({ oscA: { on: true, table: P(r, ['basic', 'sync', 'fm']), pos: U(r, 0.3, 1) }, lfo2: { rate: U(r, 4, 14), depth: U(r, 0.3, 0.8), dest: 'pitch', wave: P(r, ['sawtooth', 'square', 'sine']) }, filter: { cutoff: U(r, 0.6, 0.95) },
    ampEnv: { a: 0.001, d: U(r, 0.15, 0.5), s: 0, r: 0.2 }, volume: 0.5 }),
};
const LABEL = { sub808: '808', reese: 'Reese', wobble: 'Wobble', growl: 'Growl', neuro: 'Neuro', acid: 'Acid', moog: 'Moog', fmbass: 'FM Bass', supersaw: 'Supersaw', squarelead: 'Square', synclead: 'Sync', hoover: 'Hoover', belllead: 'Bell', chip: 'Chip',
  warmpad: 'Pad', darkpad: 'Dark Pad', choir: 'Choir', strings: 'Strings', epiano: 'E-Piano', organ: 'Organ', mallet: 'Mallet', lofikeys: 'Keys', pluck: 'Pluck', stab: 'Stab', riser: 'Riser', laser: 'Laser' };
const ADJ = ['Deep', 'Dirty', 'Wide', 'Warm', 'Cold', 'Gritty', 'Silky', 'Hollow', 'Fat', 'Tight', 'Wet', 'Dusty', 'Shiny', 'Heavy', 'Soft', 'Vapor', 'Night', 'Neon', 'Velvet', 'Rusty', 'Glass', 'Smoky', 'Liquid', 'Crisp', 'Sour', 'Royal', 'Midnight', 'Lazy', 'Rubber', 'Laser'];

// ---- genres: tempo, swing, scale, kit, groove, FX chain, sound families per role, character
export const GENRES = {
  hiphop: { name: 'Hip-hop boom bap', short: 'HipHop', bpm: 90, swing: 0.22, scale: 'minor', kit: 'Lo-Fi Poussière', groove: 'boombap', chain: 'Propre', bright: 0.4, dirt: 0.4, roles: { bass: ['sub808', 'moog', 'fmbass'], lead: ['squarelead', 'belllead', 'synclead'], pad: ['warmpad', 'strings'], keys: ['epiano', 'lofikeys', 'organ'], pluck: ['pluck', 'stab', 'mallet'] } },
  trap: { name: 'Trap', short: 'Trap', bpm: 140, swing: 0, scale: 'minor', kit: 'Trap 808', groove: 'trap', chain: 'Trap', bright: 0.6, dirt: 0.5, roles: { bass: ['sub808', 'sub808', 'reese'], lead: ['belllead', 'squarelead', 'synclead', 'chip'], pad: ['darkpad', 'choir', 'warmpad'], keys: ['mallet', 'epiano', 'organ'], pluck: ['pluck', 'mallet', 'laser'] } },
  drill: { name: 'Drill', short: 'Drill', bpm: 142, swing: 0.05, scale: 'harm', kit: 'Trap 808', groove: 'drill', chain: 'Trap', bright: 0.4, dirt: 0.6, roles: { bass: ['sub808', 'sub808', 'growl'], lead: ['belllead', 'strings', 'synclead'], pad: ['darkpad', 'choir', 'strings'], keys: ['mallet', 'epiano'], pluck: ['pluck', 'mallet', 'riser'] } },
  phonk: { name: 'Phonk', short: 'Phonk', bpm: 130, swing: 0.05, scale: 'phryg', kit: 'Trap 808', groove: 'phonk', chain: 'Lo-fi', bright: 0.4, dirt: 0.8, roles: { bass: ['sub808', 'fmbass'], lead: ['belllead', 'chip', 'squarelead'], pad: ['darkpad', 'choir'], keys: ['mallet', 'organ'], pluck: ['mallet', 'stab', 'laser'] } },
  lofi: { name: 'Lo-fi hip-hop', short: 'LoFi', bpm: 80, swing: 0.3, scale: 'dorian', kit: 'Lo-Fi Poussière', groove: 'lofi', chain: 'Lo-fi', bright: 0.25, dirt: 0.3, roles: { bass: ['moog', 'fmbass', 'sub808'], lead: ['squarelead', 'belllead'], pad: ['warmpad', 'strings', 'choir'], keys: ['lofikeys', 'epiano', 'organ'], pluck: ['mallet', 'pluck'] } },
  dubstep: { name: 'Dubstep', short: 'Dub', bpm: 140, swing: 0, scale: 'phryg', kit: 'Techno Indus', groove: 'halftime', chain: 'Techno indus', bright: 0.7, dirt: 0.9, roles: { bass: ['wobble', 'growl', 'wobble', 'sub808'], lead: ['supersaw', 'synclead', 'hoover'], pad: ['darkpad', 'warmpad'], keys: ['epiano', 'organ'], pluck: ['stab', 'laser', 'riser'] } },
  riddim: { name: 'Riddim', short: 'Riddim', bpm: 150, swing: 0, scale: 'minor', kit: 'Techno Indus', groove: 'halftime', chain: 'Techno indus', bright: 0.6, dirt: 1, roles: { bass: ['wobble', 'growl', 'neuro'], lead: ['synclead', 'chip', 'squarelead'], pad: ['darkpad'], keys: ['organ', 'mallet'], pluck: ['laser', 'stab', 'riser'] } },
  dnb: { name: 'Drum & Bass', short: 'DnB', bpm: 174, swing: 0, scale: 'minor', kit: '909 Punch', groove: 'dnb', chain: 'Club', bright: 0.6, dirt: 0.6, roles: { bass: ['reese', 'sub808', 'growl', 'moog'], lead: ['supersaw', 'synclead', 'hoover'], pad: ['warmpad', 'darkpad', 'strings'], keys: ['epiano', 'organ'], pluck: ['pluck', 'stab', 'riser'] } },
  neuro: { name: 'Neurofunk', short: 'Neuro', bpm: 174, swing: 0, scale: 'phryg', kit: 'Techno Indus', groove: 'dnb', chain: 'Techno indus', bright: 0.6, dirt: 0.9, roles: { bass: ['neuro', 'neuro', 'reese', 'growl'], lead: ['synclead', 'hoover', 'laser'], pad: ['darkpad', 'choir'], keys: ['organ', 'mallet'], pluck: ['stab', 'laser', 'riser'] } },
  liquid: { name: 'Liquid D&B', short: 'Liquid', bpm: 172, swing: 0, scale: 'dorian', kit: '909 Punch', groove: 'dnb', chain: 'Ambient', bright: 0.5, dirt: 0.2, roles: { bass: ['sub808', 'moog', 'reese'], lead: ['belllead', 'supersaw', 'squarelead'], pad: ['warmpad', 'strings', 'choir'], keys: ['epiano', 'mallet'], pluck: ['pluck', 'mallet'] } },
  pop: { name: 'Pop', short: 'Pop', bpm: 118, swing: 0, scale: 'major', kit: '909 Punch', groove: 'pop', chain: 'Propre', bright: 0.75, dirt: 0.2, roles: { bass: ['moog', 'sub808', 'fmbass'], lead: ['supersaw', 'squarelead', 'belllead'], pad: ['warmpad', 'strings', 'choir'], keys: ['epiano', 'mallet', 'organ'], pluck: ['pluck', 'stab'] } },
  futurebass: { name: 'Future bass', short: 'Future', bpm: 150, swing: 0, scale: 'major', kit: '909 Punch', groove: 'halftime', chain: 'Club', bright: 0.85, dirt: 0.3, roles: { bass: ['sub808', 'reese', 'wobble'], lead: ['supersaw', 'chip', 'belllead'], pad: ['warmpad', 'choir'], keys: ['epiano', 'mallet'], pluck: ['stab', 'pluck', 'riser'] } },
  house: { name: 'House', short: 'House', bpm: 124, swing: 0.1, scale: 'minor', kit: '909 Punch', groove: 'house', chain: 'Club', bright: 0.6, dirt: 0.3, roles: { bass: ['moog', 'fmbass', 'acid'], lead: ['stab', 'supersaw', 'organ'], pad: ['warmpad', 'strings', 'choir'], keys: ['organ', 'epiano'], pluck: ['stab', 'pluck', 'mallet'] } },
  techhouse: { name: 'Tech house', short: 'TechH', bpm: 126, swing: 0.08, scale: 'minor', kit: '909 Punch', groove: 'techhouse', chain: 'Club', bright: 0.5, dirt: 0.5, roles: { bass: ['moog', 'acid', 'fmbass'], lead: ['stab', 'synclead', 'chip'], pad: ['darkpad', 'warmpad'], keys: ['organ', 'mallet'], pluck: ['stab', 'pluck', 'laser'] } },
  techno: { name: 'Techno', short: 'Techno', bpm: 132, swing: 0, scale: 'phryg', kit: 'Techno Indus', groove: 'techno', chain: 'Techno indus', bright: 0.4, dirt: 0.8, roles: { bass: ['acid', 'moog', 'reese'], lead: ['synclead', 'stab', 'hoover'], pad: ['darkpad', 'choir'], keys: ['organ', 'mallet'], pluck: ['stab', 'laser', 'riser'] } },
  ukg: { name: 'UK Garage', short: 'UKG', bpm: 132, swing: 0.45, scale: 'minor', kit: '909 Punch', groove: 'ukg', chain: 'Club', bright: 0.55, dirt: 0.3, roles: { bass: ['reese', 'fmbass', 'moog'], lead: ['stab', 'squarelead', 'choir'], pad: ['warmpad', 'choir'], keys: ['organ', 'epiano'], pluck: ['stab', 'pluck'] } },
  synthwave: { name: 'Synthwave', short: 'Wave', bpm: 100, swing: 0, scale: 'minor', kit: '808 Classique', groove: 'synthwave', chain: 'Vaporwave', bright: 0.6, dirt: 0.2, roles: { bass: ['moog', 'fmbass', 'acid'], lead: ['squarelead', 'supersaw', 'hoover'], pad: ['warmpad', 'strings'], keys: ['epiano', 'mallet'], pluck: ['pluck', 'stab', 'laser'] } },
  reggaeton: { name: 'Reggaeton', short: 'Regg', bpm: 95, swing: 0.05, scale: 'minor', kit: 'Percs Latines', groove: 'dembow', chain: 'Trap', bright: 0.65, dirt: 0.3, roles: { bass: ['sub808', 'moog', 'fmbass'], lead: ['squarelead', 'belllead', 'supersaw'], pad: ['warmpad', 'strings'], keys: ['mallet', 'epiano'], pluck: ['pluck', 'mallet', 'stab'] } },
  afro: { name: 'Afrobeats / Amapiano', short: 'Afro', bpm: 108, swing: 0.15, scale: 'major', kit: 'Percs Latines', groove: 'afro', chain: 'Propre', bright: 0.55, dirt: 0.2, roles: { bass: ['sub808', 'fmbass', 'moog'], lead: ['belllead', 'squarelead', 'mallet'], pad: ['warmpad', 'strings'], keys: ['mallet', 'epiano', 'organ'], pluck: ['mallet', 'pluck'] } },
  jumpup: { name: 'D&B Jump-up', short: 'JumpUp', bpm: 174, swing: 0, scale: 'minor', kit: 'D&B Neuro Punch', groove: 'dnb2step', chain: 'D&B Neuro', bright: 0.7, dirt: 0.8, roles: { bass: ['wobble', 'growl', 'hoover', 'neuro'], lead: ['hoover', 'synclead', 'chip'], pad: ['darkpad', 'choir'], keys: ['organ', 'mallet'], pluck: ['stab', 'laser', 'riser'] } },
  jungle: { name: 'Jungle', short: 'Jungle', bpm: 168, swing: 0.1, scale: 'minor', kit: 'Jungle Breaks', groove: 'jungle', chain: 'Jungle Dub', bright: 0.45, dirt: 0.4, roles: { bass: ['sub808', 'sub808', 'reese', 'moog'], lead: ['stab', 'belllead', 'squarelead'], pad: ['warmpad', 'strings', 'choir'], keys: ['organ', 'epiano', 'mallet'], pluck: ['stab', 'mallet', 'riser'] } },
  rollers: { name: 'D&B Rollers', short: 'Roller', bpm: 174, swing: 0, scale: 'minor', kit: 'D&B Rollers', groove: 'rollers', chain: 'D&B Rollers', bright: 0.5, dirt: 0.5, roles: { bass: ['reese', 'moog', 'sub808', 'reese'], lead: ['stab', 'synclead', 'pluck'], pad: ['darkpad', 'warmpad'], keys: ['epiano', 'organ'], pluck: ['pluck', 'stab', 'riser'] } },
  techstep: { name: 'Techstep', short: 'Techstep', bpm: 172, swing: 0, scale: 'phryg', kit: 'D&B Neuro Punch', groove: 'dnb', chain: 'D&B Neuro', bright: 0.4, dirt: 0.85, roles: { bass: ['reese', 'neuro', 'acid', 'growl'], lead: ['hoover', 'synclead', 'laser'], pad: ['darkpad', 'choir'], keys: ['organ', 'mallet'], pluck: ['stab', 'laser', 'riser'] } },
  dancefloor: { name: 'D&B Dancefloor', short: 'Dfloor', bpm: 174, swing: 0, scale: 'minor', kit: 'D&B Rollers', groove: 'dnb', chain: 'Club', bright: 0.75, dirt: 0.5, roles: { bass: ['reese', 'wobble', 'moog', 'growl'], lead: ['supersaw', 'synclead', 'belllead'], pad: ['warmpad', 'choir', 'strings'], keys: ['epiano', 'mallet'], pluck: ['stab', 'pluck', 'riser'] } },
  dnbhalftime: { name: 'D&B Halftime', short: 'Halftime', bpm: 170, swing: 0.05, scale: 'phryg', kit: 'D&B Neuro Punch', groove: 'halftime', chain: 'D&B Neuro', bright: 0.45, dirt: 0.8, roles: { bass: ['neuro', 'growl', 'sub808', 'reese'], lead: ['synclead', 'belllead', 'laser'], pad: ['darkpad', 'choir'], keys: ['mallet', 'organ'], pluck: ['laser', 'stab', 'riser'] } },
  hardstyle: { name: 'Hardstyle', short: 'Hard', bpm: 150, swing: 0, scale: 'harm', kit: 'Techno Indus', groove: 'hard', chain: 'Techno indus', bright: 0.8, dirt: 0.9, roles: { bass: ['reese', 'growl', 'sub808'], lead: ['supersaw', 'hoover', 'synclead'], pad: ['darkpad', 'choir', 'strings'], keys: ['organ'], pluck: ['stab', 'laser', 'riser'] } },
};
export const GENRE_IDS = Object.keys(GENRES);
export const LIBRARY_SIZE = GENRE_IDS.length * ROLES.length * PER_BUCKET;

/** Preset number n (0..999) of a genre & role → full patch (deterministic). */
export function genrePreset(g, role, n) {
  const G = GENRES[g], r = rng(hash(`${g}|${role}|${n}`));
  const fam = G.roles[role][Math.floor(r() * G.roles[role].length)];
  const ctx = { bpm: G.bpm, bright: Math.min(1, Math.max(0, G.bright + (r() - 0.5) * 0.3)), dirt: Math.min(1, Math.max(0, G.dirt + (r() - 0.5) * 0.3)) };
  const patch = F[fam](r, ctx);
  if (patch.filter?.cutoff != null) patch.filter.cutoff = Math.min(1, Math.max(0.08, patch.filter.cutoff));
  patch.name = `${G.short} ${ADJ[Math.floor(r() * ADJ.length)]} ${LABEL[fam]} ${String(n + 1).padStart(3, '0')}`;
  patch.lib = { g, role, n };
  return patch;
}

/** Drum / bass / lead pattern for a genre (16 steps). Returns {drums, bass, synth} to merge into a pattern. */
export function genreGroove(g, seed = Math.random() * 1e9) {
  const r = rng(seed >>> 0), on = (arr, steps, v = 1) => steps.forEach((s) => (arr[s] = v));
  const d = Array.from({ length: 11 }, () => Array(16).fill(0)); // 0 kick 1 snare 2-4 toms 5 rim 6 clap 7 cowbell 8 cymbal 9 ohat 10 chat
  const hats = (every, acc = 0.2) => { for (let s = 0; s < 16; s += every) d[10][s] = r() < acc ? 2 : 1; };
  const G = GENRES[g].groove;
  if (G === 'boombap' || G === 'lofi') { on(d[0], [0, 7, 10]); if (r() < 0.5) d[0][15] = 1; on(d[1], [4, 12], 2); hats(2); if (G === 'lofi') d[5][14] = 1; }
  else if (G === 'trap') { on(d[0], [0, 10]); if (r() < 0.6) d[0][3] = 1; if (r() < 0.5) d[0][14] = 1; on(d[6], [8], 2); hats(1, 0.3); if (r() < 0.5) on(d[9], [6, 14]); }
  else if (G === 'drill') { on(d[0], [0, 3, 11]); if (r() < 0.5) d[0][14] = 1; on(d[6], [6, 14], 2); on(d[1], [6, 14]); for (const s of [0, 2, 3, 5, 8, 10, 11, 13]) d[10][s] = 1; }
  else if (G === 'phonk') { on(d[0], [0, 10]); if (r() < 0.5) d[0][6] = 1; on(d[6], [8], 2); hats(2); on(d[7], [0, 3, 6, 8, 11, 14]); }
  else if (G === 'halftime') { on(d[0], [0]); if (r() < 0.7) d[0][10] = 1; if (r() < 0.4) d[0][3] = 1; on(d[1], [8], 2); on(d[6], [8]); hats(2, 0.1); }
  else if (G === 'dnb') { on(d[0], [0, 10]); if (r() < 0.4) d[0][7] = 1; on(d[1], [4, 12], 2); hats(2); if (r() < 0.5) on(d[5], [6, 14]); }
  else if (G === 'pop') { on(d[0], [0, 8]); if (r() < 0.6) d[0][10] = 1; on(d[6], [4, 12], 2); on(d[1], [4, 12]); hats(2); }
  else if (G === 'house' || G === 'techhouse') { on(d[0], [0, 4, 8, 12]); on(d[6], [4, 12], 2); on(d[9], [2, 6, 10, 14]); hats(1, 0.15); if (G === 'techhouse') { on(d[5], [3, 7, 11]); if (r() < 0.5) on(d[3], [13]); } }
  else if (G === 'techno') { on(d[0], [0, 4, 8, 12]); on(d[9], [2, 6, 10, 14]); on(d[5], [7, 15].filter(() => r() < 0.8)); if (r() < 0.5) on(d[6], [4, 12]); }
  else if (G === 'ukg') { on(d[0], [0, 10]); if (r() < 0.5) d[0][7] = 1; on(d[1], [4, 12], 2); for (const s of [2, 6, 10, 14]) d[10][s] = 1; on(d[5], [3, 11].filter(() => r() < 0.7)); }
  else if (G === 'synthwave') { on(d[0], [0, 8]); if (r() < 0.4) d[0][6] = 1; on(d[1], [4, 12], 2); hats(2); }
  else if (G === 'dembow') { on(d[0], [0, 4, 8, 12]); on(d[1], [3, 6, 11, 14], 1); on(d[5], [3, 6, 11, 14]); hats(2); }
  else if (G === 'afro') { on(d[0], [0, 7, 10]); on(d[5], [3, 6, 11]); for (let s = 0; s < 16; s++) d[10][s] = s % 4 === 2 ? 2 : r() < 0.7 ? 1 : 0; if (r() < 0.6) on(d[2], [13]); }
  else if (G === 'dnb2step') { on(d[0], [0, 10]); on(d[1], [4, 12], 2); hats(2, 0.3); if (r() < 0.6) on(d[9], [14]); if (r() < 0.5) on(d[5], [7, 15]); }
  else if (G === 'rollers') { on(d[0], [0, 10]); if (r() < 0.5) d[0][7] = 1; on(d[1], [4, 12], 2); for (let s = 0; s < 16; s++) d[10][s] = s % 2 === 0 ? (s % 4 === 2 ? 2 : 1) : r() < 0.45 ? 1 : 0; on(d[8], [2, 6, 10, 14].filter(() => r() < 0.5)); if (r() < 0.6) on(d[5], [3, 11]); }
  else if (G === 'jungle') { on(d[0], [0, 10]); if (r() < 0.6) d[0][3] = 1; on(d[1], [4, 12], 2); for (const s of [7, 9, 14, 15]) if (r() < 0.55) d[1][s] = 1; hats(2, 0.2); for (const s of [2, 6, 11, 13]) if (r() < 0.4) d[3][s] = 1; if (r() < 0.5) on(d[8], [0]); }
  else if (G === 'hard') { on(d[0], [0, 4, 8, 12], 2); on(d[6], [4, 12]); on(d[9], [2, 6, 10, 14]); }
  // bass & lead follow the chosen scale degrees (filled in by the app, which knows the scale)
  const bassSteps = { boombap: [0, 7, 10], lofi: [0, 7, 10], trap: [0, 10, 14], drill: [0, 3, 11], phonk: [0, 10], halftime: [0, 10], dnb: [0, 10], pop: [0, 3, 8, 11], house: [2, 6, 10, 14], techhouse: [2, 3, 6, 10, 11, 14],
    techno: [2, 6, 10, 14], ukg: [0, 3, 10], dnb2step: [0, 3, 10, 13], rollers: [0, 3, 6, 10, 13], jungle: [0, 7, 10], synthwave: [0, 2, 4, 6, 8, 10, 12, 14], dembow: [0, 3, 8, 11], afro: [0, 7, 10, 13], hard: [2, 6, 10, 14] }[G] || [0, 8];
  const bassDeg = bassSteps.map((s, i) => [s, i === 0 ? 0 : r() < 0.6 ? 0 : Math.floor(r() * 5) - 1]);
  const leadDeg = []; for (let s = 0; s < 16; s += 2) if (r() < 0.55) leadDeg.push([s, Math.floor(r() * 8)]);
  return { drums: d, bassDeg, leadDeg, slide: G === 'trap' || G === 'drill' || G === 'phonk' || G === 'synthwave' };
}
