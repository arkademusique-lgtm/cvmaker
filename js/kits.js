// Drum kit library. A kit = 11 drum tracks with voice + params (or a user sample).
import { VOICES } from './audio/drums.js';
import { pick, rand, uid, deepClone } from './util.js';

const DEFAULT_VOICES = ['kick', 'snare', 'htom', 'mtom', 'ltom', 'rim', 'clap', 'cowbell', 'cymbal', 'ohat', 'chat'];

export function makeTrack(voice, o = {}) {
  return { voice, tune: 0.5, tone: 0.5, decay: 0.5, level: 0.75, pan: 0, drive: 0, click: 0, pitch: 0.5, sampleId: null, sampleName: null, choke: voice === 'ohat' || voice === 'chat' ? 'hh' : null, ...o };
}
function kit(name, mods = {}, voices = DEFAULT_VOICES) {
  return { id: 'bi_' + name.replace(/\W+/g, '').toLowerCase(), name, builtin: true, tracks: voices.map((v, i) => makeTrack(v, mods[i] || mods[v] || {})) };
}

export const BUILTIN_KITS = [
  kit('808 Classique', { 0: { decay: 0.55, tone: 0.3 }, 1: { tone: 0.55 }, 9: { decay: 0.4 } }),
  kit('909 Punch', { 0: { tune: 0.65, decay: 0.3, click: 0.6, pitch: 0.8, drive: 0.15 }, 1: { tune: 0.65, tone: 0.8, decay: 0.35, drive: 0.1 }, 6: { tone: 0.7 }, 8: { decay: 0.7, tone: 0.8 } }),
  kit('Trap 808', { 0: { voice: 'sub808', tune: 0.3, decay: 0.9, drive: 0.35 }, 1: { voice: 'clap', tone: 0.6, decay: 0.3 }, 5: { voice: 'snare', tune: 0.9, decay: 0.15, tone: 0.9 }, 10: { decay: 0.15, tone: 0.9 }, 7: { voice: 'zap' } }),
  kit('Lo-Fi Poussière', { 0: { tone: 0.15, decay: 0.4, drive: 0.25 }, 1: { tone: 0.3, tune: 0.35, drive: 0.3 }, 9: { tone: 0.1 }, 10: { tone: 0.1 }, 8: { tone: 0.1, decay: 0.4 } }),
  kit('Techno Indus', { 0: { tune: 0.4, decay: 0.45, drive: 0.7, click: 0.4 }, 1: { voice: 'noise', tone: 0.6, decay: 0.25, tune: 0.6 }, 5: { voice: 'fmperc', tune: 0.7, tone: 0.8 }, 6: { drive: 0.4 }, 7: { voice: 'fmperc', tune: 0.4, tone: 0.3 } }),
  kit('Electro Zap', { 0: { tune: 0.55, decay: 0.35, pitch: 1 }, 2: { voice: 'zap', tune: 0.6 }, 3: { voice: 'zap', tune: 0.4 }, 4: { voice: 'zap', tune: 0.2 }, 7: { voice: 'fmperc' } }),
  kit('Minimal Click', { 0: { decay: 0.2, tone: 0.8, click: 0.3 }, 1: { voice: 'rim', tune: 0.3 }, 6: { decay: 0.15 }, 7: { voice: 'clave' }, 8: { voice: 'shaker' } }),
  kit('Percs Latines', { 2: { voice: 'conga', tune: 0.8 }, 3: { voice: 'conga', tune: 0.5 }, 4: { voice: 'conga', tune: 0.2 }, 5: { voice: 'clave' }, 8: { voice: 'shaker' } }),
  kit('FM Métal', { 0: { voice: 'fmperc', tune: 0.1, tone: 0.2, decay: 0.5 }, 1: { voice: 'fmperc', tune: 0.5, tone: 0.9, decay: 0.3 }, 2: { voice: 'fmperc', tune: 0.7 }, 3: { voice: 'fmperc', tune: 0.55 }, 4: { voice: 'fmperc', tune: 0.4 }, 7: { voice: 'fmperc', tune: 0.8, tone: 0.6 } }),
];

/** Infinite kits: generate a random coherent kit. */
let counter = 1;
export function randomKit() {
  const voices = Object.keys(VOICES);
  const cats = [['kick', 'sub808', 'fmperc'], ['snare', 'clap', 'noise', 'rim'], ['htom', 'conga', 'zap', 'fmperc'], ['mtom', 'conga', 'zap', 'fmperc'], ['ltom', 'conga', 'zap', 'kick'],
    ['rim', 'clave', 'fmperc', 'cowbell'], ['clap', 'snare', 'noise'], voices, ['cymbal', 'noise', 'ohat'], ['ohat', 'shaker', 'cymbal'], ['chat', 'shaker']];
  const k = { id: 'k_' + uid(), name: `Kit aléatoire #${counter++}`, builtin: false,
    tracks: cats.map((c) => makeTrack(pick(c), { tune: rand(0.2, 0.8), tone: rand(0.1, 0.9), decay: rand(0.15, 0.8), level: rand(0.6, 0.85), drive: Math.random() < 0.3 ? rand(0, 0.6) : 0, pan: rand(-0.3, 0.3), click: Math.random() < 0.3 ? rand(0, 0.5) : 0, pitch: rand(0.2, 0.9) })) };
  k.tracks[0].pan = 0; k.tracks[0].level = 0.85;
  return k;
}

export function cloneKit(k, name) { const c = deepClone(k); c.id = 'k_' + uid(); c.builtin = false; c.name = name || k.name + ' (copie)'; return c; }
