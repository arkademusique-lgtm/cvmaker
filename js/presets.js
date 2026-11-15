// Instrument presets for the wavetable/FM synth. Each overrides DEFAULT_PATCH.
const A = (o) => ({ on: true, ...o }), B = (o) => ({ on: true, ...o });
export const PRESETS = [
  { name: 'Init Saw', oscA: A({ table: 'basic', pos: 0.67 }) },
  { name: 'Super Saw Lead', oscA: A({ table: 'basic', pos: 0.67, unison: 7, detune: 0.35, spread: 0.9 }), oscB: B({ table: 'basic', pos: 0.67, oct: 1, unison: 3, detune: 0.2, level: 0.3 }), filter: { cutoff: 0.8, res: 1.5, envAmt: 0.15 }, ampEnv: { a: 0.01, d: 0.4, s: 0.8, r: 0.35 } },
  { name: 'Acid Bass 303', oscA: A({ table: 'basic', pos: 0.67 }), filter: { cutoff: 0.25, res: 14, envAmt: 0.55, drive: 0.4, keytrack: 0.2 }, filtEnv: { a: 0.002, d: 0.25, s: 0, r: 0.1 }, ampEnv: { a: 0.002, d: 0.3, s: 0.7, r: 0.08 }, mono: true, glide: 0.07 },
  { name: 'Reese Bass', oscA: A({ table: 'basic', pos: 0.67, oct: -1, unison: 2, detune: 0.35 }), oscB: B({ table: 'basic', pos: 0.67, oct: -1, fine: 13, level: 0.6 }), filter: { cutoff: 0.35, res: 2, envAmt: 0.05, drive: 0.3 }, lfo1: { rate: 0.3, depth: 0.15, dest: 'cutoff' }, mono: true },
  { name: 'Sub Bass 808', oscA: A({ table: 'basic', pos: 0, oct: -1 }), sub: { level: 0.3, oct: -1 }, filter: { cutoff: 0.5, drive: 0.25 }, ampEnv: { a: 0.002, d: 1.2, s: 0.4, r: 0.4 }, mono: true, glide: 0.08 },
  { name: 'Wobble Dubstep', oscA: A({ table: 'growl', pos: 0.4, oct: -1, unison: 3, detune: 0.2 }), sub: { level: 0.5, oct: -1 }, filter: { cutoff: 0.35, res: 6, drive: 0.4 }, lfo1: { rate: 3, depth: 0.7, dest: 'cutoff', wave: 'sine' }, wtLfo: { rate: 1.5, depth: 0.6 }, mono: true },
  { name: 'Growl Bass', oscA: A({ table: 'growl', pos: 0.6, oct: -1 }), oscB: B({ table: 'fm', pos: 0.5, oct: -1, level: 0.4 }), fm: 0.2, filter: { cutoff: 0.5, res: 3, drive: 0.6 }, wtLfo: { rate: 4, depth: 0.8 }, mono: true },
  { name: 'Pluck', oscA: A({ table: 'basic', pos: 0.67, unison: 3, detune: 0.15 }), filter: { cutoff: 0.2, res: 3, envAmt: 0.65 }, filtEnv: { a: 0.001, d: 0.18, s: 0, r: 0.2 }, ampEnv: { a: 0.001, d: 0.35, s: 0, r: 0.3 } },
  { name: 'Pad Chaud', oscA: A({ table: 'basic', pos: 0.55, unison: 5, detune: 0.3 }), oscB: B({ table: 'harm', pos: 0.3, oct: 1, level: 0.35 }), filter: { cutoff: 0.45, res: 1, envAmt: 0.2 }, filtEnv: { a: 1.2, d: 2, s: 0.5, r: 2 }, ampEnv: { a: 0.9, d: 1, s: 0.85, r: 2.2 }, lfo1: { rate: 0.2, depth: 0.1, dest: 'cutoff' } },
  { name: 'Pad Voix (formant)', oscA: A({ table: 'formant', pos: 0, unison: 4, detune: 0.2 }), wtLfo: { rate: 0.15, depth: 1 }, filter: { cutoff: 0.7 }, ampEnv: { a: 0.6, d: 1, s: 0.9, r: 1.8 } },
  { name: 'Cordes', oscA: A({ table: 'basic', pos: 0.67, unison: 6, detune: 0.18 }), filter: { cutoff: 0.55, res: 0.5, envAmt: 0.1 }, ampEnv: { a: 0.35, d: 0.5, s: 0.9, r: 0.9 }, lfo2: { rate: 5.5, depth: 0.012, dest: 'pitch' } },
  { name: 'Cuivres synth', oscA: A({ table: 'basic', pos: 0.67, unison: 2, detune: 0.1 }), oscB: B({ table: 'basic', pos: 0.67, fine: 7, level: 0.5 }), filter: { cutoff: 0.3, res: 1, envAmt: 0.45 }, filtEnv: { a: 0.08, d: 0.4, s: 0.5, r: 0.3 }, ampEnv: { a: 0.04, d: 0.3, s: 0.8, r: 0.3 } },
  { name: 'Piano électrique FM', oscA: A({ table: 'basic', pos: 0, level: 0.8 }), oscB: B({ table: 'basic', pos: 0, oct: 1, level: 0.6 }), fm: 0.35, filter: { cutoff: 0.85 }, ampEnv: { a: 0.002, d: 1.5, s: 0.15, r: 0.6 }, lfo1: { rate: 4, depth: 0.15, dest: 'amp' } },
  { name: 'Cloche FM', oscA: A({ table: 'basic', pos: 0 }), oscB: B({ table: 'basic', pos: 0, semi: 7, oct: 1, fine: 30 }), fm: 0.6, filter: { cutoff: 1 }, ampEnv: { a: 0.001, d: 2.5, s: 0, r: 2 } },
  { name: 'Kalimba', oscA: A({ table: 'basic', pos: 0 }), oscB: B({ table: 'basic', pos: 0, oct: 2, semi: 7, level: 0.4 }), fm: 0.25, ampEnv: { a: 0.001, d: 0.5, s: 0, r: 0.4 }, filter: { cutoff: 0.8 } },
  { name: 'Marimba', oscA: A({ table: 'basic', pos: 0.15 }), oscB: B({ table: 'basic', pos: 0, oct: 2, level: 0.3 }), fm: 0.15, ampEnv: { a: 0.001, d: 0.35, s: 0, r: 0.3 } },
  { name: 'Orgue', oscA: A({ table: 'organ', pos: 0.33 }), filter: { cutoff: 0.9 }, ampEnv: { a: 0.005, d: 0.1, s: 1, r: 0.08 }, lfo1: { rate: 6, depth: 0.15, dest: 'amp' } },
  { name: 'Flûte', oscA: A({ table: 'basic', pos: 0.1 }), noise: { level: 0.08 }, filter: { cutoff: 0.6 }, ampEnv: { a: 0.08, d: 0.2, s: 0.9, r: 0.2 }, lfo2: { rate: 5, depth: 0.01, dest: 'pitch' } },
  { name: 'Chiptune', oscA: A({ table: 'pwm', pos: 0.4 }), wtLfo: { rate: 2, depth: 0.5 }, filter: { cutoff: 1 }, ampEnv: { a: 0.001, d: 0.1, s: 0.8, r: 0.05 } },
  { name: 'Sync Lead', oscA: A({ table: 'sync', pos: 0.5, unison: 2, detune: 0.1 }), wtLfo: { rate: 0.5, depth: 0.5 }, filter: { cutoff: 0.8, res: 2 }, mono: true, glide: 0.06 },
  { name: 'Hoover', oscA: A({ table: 'pwm', pos: 0.3, unison: 7, detune: 0.5, spread: 1 }), oscB: B({ table: 'basic', pos: 0.67, oct: -1, unison: 3, detune: 0.4 }), filter: { cutoff: 0.65 }, mono: true, glide: 0.25, lfo2: { rate: 0.4, depth: 0.03, dest: 'pitch' } },
  { name: 'Clavinet', oscA: A({ table: 'pwm', pos: 0.75 }), filter: { type: 'bandpass', cutoff: 0.55, res: 3, envAmt: 0.4 }, filtEnv: { a: 0.001, d: 0.15, s: 0.2, r: 0.1 }, ampEnv: { a: 0.001, d: 0.4, s: 0.3, r: 0.1 } },
  { name: 'Bitcrush Lead', oscA: A({ table: 'digital', pos: 0.7, unison: 2 }), filter: { cutoff: 0.9, drive: 0.4 } },
  { name: 'Drone Chaos', oscA: A({ table: 'chaos', pos: 0.2, unison: 5, detune: 0.4, oct: -1 }), oscB: B({ table: 'fold', pos: 0.4, oct: -2, level: 0.4 }), wtLfo: { rate: 0.07, depth: 1 }, filter: { cutoff: 0.5, res: 4 }, lfo1: { rate: 0.1, depth: 0.3, dest: 'cutoff' }, ampEnv: { a: 2, d: 1, s: 1, r: 3 } },
  { name: 'Arp Pluck Fold', oscA: A({ table: 'fold', pos: 0.3 }), filter: { cutoff: 0.3, res: 5, envAmt: 0.5 }, filtEnv: { a: 0.001, d: 0.12, s: 0, r: 0.1 }, ampEnv: { a: 0.001, d: 0.25, s: 0, r: 0.2 } },
];

// ---- more instruments ----
PRESETS.push(
  { name: 'Moog Bass', oscA: A({ table: 'basic', pos: 0.67, oct: -1 }), oscB: B({ table: 'basic', pos: 0.95, oct: -1, fine: -6, level: 0.5 }), sub: { level: 0.4, oct: -1 }, filter: { cutoff: 0.3, res: 4, envAmt: 0.4, drive: 0.2 }, filtEnv: { a: 0.002, d: 0.3, s: 0.1, r: 0.15 }, ampEnv: { a: 0.002, d: 0.4, s: 0.8, r: 0.1 }, mono: true, glide: 0.04 },
  { name: 'FM Bass', oscA: A({ table: 'basic', pos: 0, oct: -1 }), oscB: B({ table: 'basic', pos: 0, oct: -1, level: 0.7 }), fm: 0.8, filter: { cutoff: 0.6 }, ampEnv: { a: 0.002, d: 0.35, s: 0.4, r: 0.1 }, mono: true },
  { name: 'Dub Sub', oscA: A({ table: 'basic', pos: 0.1, oct: -1 }), filter: { cutoff: 0.35 }, lfo1: { rate: 2, depth: 0.15, dest: 'cutoff' }, ampEnv: { a: 0.01, d: 0.8, s: 0.7, r: 0.3 }, mono: true, glide: 0.1 },
  { name: 'Trance Lead', oscA: A({ table: 'basic', pos: 0.67, unison: 9, detune: 0.45, spread: 1 }), oscB: B({ table: 'basic', pos: 0.67, oct: 1, unison: 5, detune: 0.3, level: 0.35 }), filter: { cutoff: 0.85, res: 1 }, ampEnv: { a: 0.005, d: 0.5, s: 0.85, r: 0.5 } },
  { name: 'Square Lead', oscA: A({ table: 'pwm', pos: 0.1 }), filter: { cutoff: 0.7, res: 2, envAmt: 0.2 }, lfo2: { rate: 5.5, depth: 0.01, dest: 'pitch' }, mono: true, glide: 0.05 },
  { name: 'Brass Stab', oscA: A({ table: 'basic', pos: 0.67, unison: 3, detune: 0.2 }), filter: { cutoff: 0.25, res: 2, envAmt: 0.6 }, filtEnv: { a: 0.01, d: 0.25, s: 0.2, r: 0.2 }, ampEnv: { a: 0.005, d: 0.3, s: 0.3, r: 0.2 } },
  { name: 'Glass Pad', oscA: A({ table: 'harm', pos: 0.4, unison: 4, detune: 0.2 }), oscB: B({ table: 'basic', pos: 0, oct: 2, level: 0.2 }), wtLfo: { rate: 0.2, depth: 0.6 }, ampEnv: { a: 1, d: 1, s: 0.9, r: 2.5 }, filter: { cutoff: 0.75 } },
  { name: 'Dark Pad', oscA: A({ table: 'chaos', pos: 0.1, unison: 6, detune: 0.3 }), filter: { cutoff: 0.3, res: 2 }, lfo1: { rate: 0.1, depth: 0.25, dest: 'cutoff' }, ampEnv: { a: 1.5, d: 1, s: 1, r: 3 } },
  { name: 'Vibraphone', oscA: A({ table: 'basic', pos: 0 }), oscB: B({ table: 'basic', pos: 0, oct: 2, level: 0.5 }), fm: 0.12, lfo1: { rate: 5, depth: 0.25, dest: 'amp' }, ampEnv: { a: 0.001, d: 2, s: 0, r: 1.5 } },
  { name: 'Steel Drum', oscA: A({ table: 'basic', pos: 0 }), oscB: B({ table: 'basic', pos: 0, semi: 4, oct: 1, fine: 40, level: 0.6 }), fm: 0.4, ampEnv: { a: 0.001, d: 0.7, s: 0, r: 0.5 } },
  { name: 'Wurly', oscA: A({ table: 'basic', pos: 0.25 }), oscB: B({ table: 'basic', pos: 0, oct: 1, level: 0.4 }), fm: 0.2, filter: { cutoff: 0.7, drive: 0.25 }, lfo1: { rate: 5.5, depth: 0.2, dest: 'amp' }, ampEnv: { a: 0.002, d: 1.2, s: 0.3, r: 0.4 } },
  { name: 'Harpe', oscA: A({ table: 'basic', pos: 0.33 }), filter: { cutoff: 0.5, envAmt: 0.4 }, filtEnv: { a: 0.001, d: 0.4, s: 0, r: 0.5 }, ampEnv: { a: 0.001, d: 1.5, s: 0, r: 1.2 } },
  { name: 'Sitar', oscA: A({ table: 'sync', pos: 0.7 }), oscB: B({ table: 'fold', pos: 0.6, level: 0.3 }), filter: { type: 'bandpass', cutoff: 0.65, res: 4 }, ampEnv: { a: 0.001, d: 1.5, s: 0.1, r: 0.8 } },
  { name: 'Orgue Rock', oscA: A({ table: 'organ', pos: 1 }), filter: { cutoff: 0.8, drive: 0.5 }, lfo1: { rate: 6.5, depth: 0.2, dest: 'amp' }, ampEnv: { a: 0.005, d: 0.1, s: 1, r: 0.1 } },
  { name: 'Lo-fi Keys', oscA: A({ table: 'basic', pos: 0.2 }), oscB: B({ table: 'digital', pos: 0.6, level: 0.25 }), filter: { cutoff: 0.45 }, lfo2: { rate: 0.6, depth: 0.012, dest: 'pitch' }, ampEnv: { a: 0.005, d: 0.9, s: 0.3, r: 0.5 } },
  { name: 'Laser FX', oscA: A({ table: 'basic', pos: 1 }), lfo2: { rate: 8, depth: 0.6, dest: 'pitch', wave: 'sawtooth' }, filter: { cutoff: 0.8 }, ampEnv: { a: 0.001, d: 0.3, s: 0, r: 0.2 } },
  { name: 'Noise Riser', oscA: A({ table: 'chaos', pos: 0.9, level: 0.3 }), noise: { level: 0.8 }, filter: { type: 'bandpass', cutoff: 0.2, res: 6, envAmt: 0.8 }, filtEnv: { a: 4, d: 1, s: 1, r: 1 }, ampEnv: { a: 2, d: 1, s: 1, r: 1 } },
  { name: 'Bell Pad', oscA: A({ table: 'basic', pos: 0, unison: 3, detune: 0.1 }), oscB: B({ table: 'basic', pos: 0, oct: 2, semi: 7, level: 0.4 }), fm: 0.3, ampEnv: { a: 0.4, d: 2, s: 0.5, r: 2.5 } },
  { name: 'Acid Squelch', oscA: A({ table: 'pwm', pos: 0 }), filter: { cutoff: 0.2, res: 18, envAmt: 0.7, drive: 0.6 }, filtEnv: { a: 0.001, d: 0.18, s: 0, r: 0.1 }, ampEnv: { a: 0.001, d: 0.3, s: 0.6, r: 0.05 }, mono: true, glide: 0.06 },
  { name: 'Pluck Cristal', oscA: A({ table: 'harm', pos: 0.8 }), oscB: B({ table: 'basic', pos: 0, oct: 1, level: 0.3 }), filter: { cutoff: 0.3, envAmt: 0.6 }, filtEnv: { a: 0.001, d: 0.15, s: 0, r: 0.2 }, ampEnv: { a: 0.001, d: 0.5, s: 0, r: 0.4 } },
);

/** Category of an instrument preset, for one-tap filtering. */
export const PRESET_CATS = [['all', 'Tous'], ['bass', 'Basses'], ['lead', 'Leads'], ['pad', 'Pads'], ['keys', 'Claviers'], ['pluck', 'Plucks & percs'], ['fx', 'FX']];
export function presetCat(name) {
  const n = name.toLowerCase();
  if (/bass|sub|303|reese|wobble|growl|squelch/.test(n)) return 'bass';
  if (/pad|cordes|drone|choir|voix/.test(n)) return 'pad';
  if (/piano|orgue|organ|clav|wurly|keys|vibra|marimba|kalimba|cloche|bell|steel/.test(n)) return 'keys';
  if (/pluck|harpe|sitar|arp/.test(n)) return 'pluck';
  if (/laser|riser|chaos|fx/.test(n)) return 'fx';
  return 'lead';
}

// ---- one-tap effect chains ----
export const FX_CHAINS = [
  { name: 'Propre', chain: [['eq3'], ['compressor', { threshold: -14, ratio: 3, makeup: 1.2 }]] },
  { name: 'Club', chain: [['djfilter'], ['eq3', { low: 3, high: 2 }], ['pump', { depth: 0.55 }], ['delay', {}, 0.15], ['space', { type: 'plate', size: 1.6 }, 0.15], ['limiter', { threshold: -4, gain: 1.3 }]] },
  { name: 'Lo-fi', chain: [['djfilter'], ['decimator', { rate: 4, bits: 10 }], ['saturator', { drive: 0.4, warmth: 0.8 }], ['tape', { wow: 0.5, tone: 4500 }], ['space', { type: 'room', size: 0.8 }, 0.2]] },
  { name: 'Dub', chain: [['djfilter'], ['tapeecho', { div: '3/16', feedback: 0.7 }, 0.4], ['space', { type: 'spring', size: 2.5 }, 0.3], ['compressor']] },
  { name: 'Techno indus', chain: [['djfilter'], ['fuzz', { gain: 20, out: 0.35 }, 0.5], ['decimator', { rate: 2, bits: 8 }, 0.4], ['space', { type: 'hall', size: 1.2 }, 0.15], ['limiter']] },
  { name: 'Ambient', chain: [['djfilter'], ['chorus'], ['tapeecho', { div: '1/4', feedback: 0.6 }, 0.3], ['space', { type: 'shimmer', size: 6 }, 0.45]] },
  { name: 'Vaporwave', chain: [['djfilter'], ['pitch', { semi: -3 }], ['tape', { wow: 0.7 }], ['chorus'], ['space', { type: 'hall', size: 4 }, 0.35]] },
  { name: 'Radio vintage', chain: [['djfilter'], ['radio'], ['saturator', { warmth: 0.9 }], ['space', { type: 'room', size: 0.6 }, 0.15]] },
  { name: 'Trap', chain: [['djfilter'], ['saturator', { drive: 0.25 }], ['eq3', { low: 4, high: 3 }], ['space', { type: 'plate', size: 1.2 }, 0.12], ['limiter', { threshold: -3, gain: 1.4 }]] },
  { name: 'Psyché', chain: [['djfilter'], ['phaser'], ['flanger', {}, 0.35], ['tapeecho', { div: '1/8', feedback: 0.6 }, 0.3], ['space', { type: 'hall', size: 3 }, 0.25]] },
  { name: 'Gate trance', chain: [['djfilter'], ['gate', { div: '1/16', depth: 0.9 }], ['delay', {}, 0.2], ['space', { type: 'hall', size: 2.5 }, 0.25]] },
  { name: 'Robot', chain: [['djfilter'], ['ringmod', { freq: 120 }, 0.6], ['formant', { vowel: 2 }], ['decimator', { rate: 3, bits: 8 }, 0.5]] },
];
