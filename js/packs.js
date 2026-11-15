// Genre sample packs, rendered offline by the app's own engines: every sound is original and royalty-free.
// A pack = ~50 one-shots (kicks, snares, claps, hats, percs, cymbals, bass shots, stabs, FX), downloadable as a ZIP of WAVs.
import { VOICES } from './audio/drums.js';
import { Synth } from './audio/synth.js';
import { GENRES, genrePreset } from './genres.js';
import { BUILTIN_KITS } from './kits.js';
import { encodeWav } from './util.js';

const SR = 44100;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const jit = (r, v, amt) => Math.min(1, Math.max(0, v + (r() - 0.5) * 2 * amt));

async function renderDrum(voice, p, secs) {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
  const g = ctx.createGain(); g.gain.value = 1; g.connect(ctx.destination);
  (VOICES[voice] || VOICES.kick)[1](ctx, 0.002, p, g, 1);
  return normalize(await ctx.startRendering());
}
async function renderSynth(patch, notes, secs, hold) {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
  const sy = new Synth(ctx, ctx.destination, patch);
  const vs = notes.map((n) => sy.noteOn(n, 0.95, 0.002)); vs.forEach((v) => sy.noteOff(v, hold));
  const buf = await ctx.startRendering(); sy.destroy?.();
  return normalize(buf);
}
function normalize(buf) {
  let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++) for (const x of buf.getChannelData(c)) pk = Math.max(pk, Math.abs(x));
  if (pk > 0) { const g = 0.89 / pk; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; } }
  // trim trailing silence (keep 20 ms)
  const d0 = buf.getChannelData(0); let end = d0.length; while (end > 1 && Math.abs(d0[end - 1]) < 0.0008) end--;
  end = Math.min(d0.length, end + Math.round(SR * 0.02));
  if (end >= d0.length - 10) return buf;
  const out = new AudioBuffer({ numberOfChannels: buf.numberOfChannels, length: Math.max(1, end), sampleRate: SR });
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(0, end), c);
  return out;
}

/** Render the pack of a genre. onProgress(done, total). Returns [{ folder, name, buffer }]. */
export async function renderPack(g, seed = 1, onProgress = () => {}) {
  const G = GENRES[g], r = rng(seed * 7919 + g.length), kit = BUILTIN_KITS.find((k) => k.name === G.kit) || BUILTIN_KITS[0];
  const tr = (i) => kit.tracks[i], jobs = [];
  const drum = (folder, name, base, n, secs, amt = 0.18, voice) => { for (let i = 0; i < n; i++) { const p = { ...base, tune: jit(r, base.tune, amt), tone: jit(r, base.tone, amt), decay: jit(r, base.decay, amt), drive: base.drive ? jit(r, base.drive, 0.1) : r() < 0.25 ? r() * 0.3 : 0 }; jobs.push([folder, `${name} ${String(i + 1).padStart(2, '0')}`, () => renderDrum(voice || base.voice, p, secs)]); } };
  drum('Kicks', 'Kick', tr(0), 8, 1.6);
  drum('Snares', 'Snare', tr(1), 8, 0.9);
  drum('Claps', 'Clap', tr(6), 4, 0.9);
  drum('Hats', 'Closed Hat', tr(10), 6, 0.4);
  drum('Hats', 'Open Hat', tr(9), 4, 1.2);
  drum('Cymbals', 'Crash', { ...tr(8), voice: 'cymbal', decay: 0.7 }, 3, 3);
  const percs = ['rim', 'clave', 'conga', 'cowbell', 'fmperc', 'shaker', 'zap', 'htom', 'ltom'];
  for (let i = 0; i < 8; i++) { const v = percs[Math.floor(r() * percs.length)]; drum('Percs', `Perc ${v}`, { voice: v, tune: r(), tone: r(), decay: 0.2 + r() * 0.5, drive: 0 }, 1, 1, 0.1); }
  const root = 36; // C2 for basses, C4 for stabs
  for (let i = 0; i < 6; i++) { const n = Math.floor(r() * 1000), p = genrePreset(g, 'bass', n); jobs.push(['Bass', `Bass ${p.name.replace(/^\S+ /, '')} (C)`, () => renderSynth(p, [root], 1.6, 0.9)]); }
  const chords = [[0, 3, 7], [0, 3, 7, 10], [0, 4, 7], [0, 5, 7], [0, 3, 7, 14]];
  for (let i = 0; i < 4; i++) { const role = r() < 0.5 ? 'pluck' : 'keys', n = Math.floor(r() * 1000), p = genrePreset(g, role, n), ch = chords[Math.floor(r() * chords.length)]; jobs.push(['Stabs', `Stab ${p.name.replace(/^\S+ /, '')} (C)`, () => renderSynth(p, ch.map((x) => 60 + x), 1.4, 0.3)]); }
  for (let i = 0; i < 2; i++) { const n = Math.floor(r() * 1000), p = genrePreset(g, 'pad', n); jobs.push(['Pads', `Pad ${p.name.replace(/^\S+ /, '')} (Cm)`, () => renderSynth(p, [48, 55, 63], 4, 2.5)]); }
  jobs.push(['FX', 'Impact', () => renderDrum('kick', { tune: 0.2, tone: 0.9, decay: 1, drive: 0.6, click: 0.8, pitch: 1 }, 3)]);
  jobs.push(['FX', 'Noise Sweep', () => renderDrum('noise', { tune: 0.5, tone: 0.9, decay: 1, drive: 0 }, 2.5)]);
  jobs.push(['FX', 'Laser', () => renderDrum('zap', { tune: 0.9, tone: 0.7, decay: 0.8, drive: 0.2 }, 1)]);
  const out = [];
  for (let i = 0; i < jobs.length; i++) { const [folder, name, fn] = jobs[i]; try { out.push({ folder, name, buffer: await fn() }); } catch (e) { console.warn('render', name, e); } onProgress(i + 1, jobs.length); }
  return out;
}

// ---- minimal ZIP writer (stored, no compression)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export async function zipFiles(files) { // files: [{ path, data: Uint8Array }]
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.path), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name); offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
export async function packToZip(genreName, items) {
  const files = [];
  for (const it of items) files.push({ path: `RM-808 ${genreName}/${it.folder}/${it.name.replace(/[\\/:*?"<>|]/g, '-')}.wav`, data: new Uint8Array(await encodeWav(it.buffer).arrayBuffer()) });
  files.push({ path: `RM-808 ${genreName}/LISEZ-MOI.txt`, data: new TextEncoder().encode(`Pack ${genreName} généré par RM-808 Studio.\nSons originaux synthétisés par l'application : libres de droits, utilisables dans tes morceaux.\n`) });
  return zipFiles(files);
}
