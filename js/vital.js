// Import of Vital presets (.vital = JSON). Approximate translation to the RM-808 Studio synth:
// 2 oscillators with their wavetables, unison, transpose, filter, amp & filter envelopes, LFO 1 routing, glide.
import { registerFrames } from './audio/wavetables.js';
import { clamp, invExpMap } from './util.js';

// Scales checked against Vital's source (src/common/synth_parameters.cpp, GPLv3): envelopes quartic (s = v^4),
// levels quadratic (gain = v^2), detune quadratic (% = v^2), cutoff in MIDI note 8..136, LFO frequency log2(Hz), wave_frame 0..256.
const b64Bytes = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const SYNC_RATIO = [0, 1 / 128, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 16]; // Freeze, 32/1 … 1/64 (cycles per beat)
const b64Floats = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer, 0, Math.floor(u.length / 4)); };
const quartic = (v) => Math.pow(Math.max(0, v), 4); // Vital envelope times are stored on a quartic scale (seconds = value^4)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function lineWave(line) {
  // Vital line generator: points = [x0, y0, x1, y1, …] in 0..1, y = 0 is the top (+1)
  const pts = line?.points || [], n = Math.floor(pts.length / 2); if (n < 2) return null;
  const P = []; for (let i = 0; i < n; i++) P.push([pts[2 * i], 1 - 2 * pts[2 * i + 1]]);
  return Float32Array.from({ length: 2048 }, (_, k) => { const x = k / 2048; let i = 0; while (i < P.length - 2 && P[i + 1][0] < x) i++; const [x0, y0] = P[i], [x1, y1] = P[i + 1]; const t = x1 > x0 ? Math.min(1, Math.max(0, (x - x0) / (x1 - x0))) : 0; return y0 + (y1 - y0) * t; });
}
function componentFrames(c) {
  const out = [];
  if (c.audio_file) { // Audio File Source: 16-bit PCM, one window per keyframe
    const u = b64Bytes(c.audio_file), pcm = new Int16Array(u.buffer, 0, Math.floor(u.length / 2)), win = Math.max(64, Math.round(c.window_size || 2048));
    for (const k of c.keyframes || []) { const st = Math.max(0, Math.round(k.start_position || 0)); if (st + win <= pcm.length) out.push({ pos: k.position ?? 0, data: Float32Array.from(pcm.subarray(st, st + win), (x) => x / 32768) }); }
    return out;
  }
  for (const k of c.keyframes || []) {
    if (k.wave_data) out.push({ pos: k.position ?? 0, data: b64Floats(k.wave_data) });
    else if (k.line) { const w = lineWave(k.line); if (w) out.push({ pos: k.position ?? 0, data: w }); }
  }
  return out;
}
function tableFrom(wt, id, name) {
  try {
    let frames = [];
    for (const g of wt.groups || []) for (const c of g.components || []) { const f = componentFrames(c); if (f.length) { frames = f; break; } }
    if (!frames.length) return null;
    frames.sort((a, b) => a.pos - b.pos);
    // keyframes sit at positions 0..256: resample the table to 32 evenly spaced frames
    const out = [], steps = frames.length === 1 ? 1 : 32, lo = frames[0].pos, hi = frames[frames.length - 1].pos || 1;
    for (let i = 0; i < steps; i++) {
      const p = steps === 1 ? lo : lo + (i / (steps - 1)) * (hi - lo);
      let j = 0; while (j < frames.length - 2 && frames[j + 1].pos < p) j++;
      const A = frames[j], B = frames[Math.min(frames.length - 1, j + 1)], t = B.pos > A.pos ? Math.min(1, Math.max(0, (p - A.pos) / (B.pos - A.pos))) : 0, n = Math.min(A.data.length, B.data.length);
      out.push(Float32Array.from({ length: n }, (_, k) => A.data[k] * (1 - t) + B.data[k] * t));
    }
    return registerFrames(id, '⇪ ' + name, out);
  } catch (e) { return null; }
}

export function importVital(text, fileName = 'Vital', bpm = 120) {
  const j = JSON.parse(text), s = j.settings || {};
  const name = (j.preset_name || fileName.replace(/\.vital$/i, '')).slice(0, 40);
  const g = (k, d) => (s[k] ?? d);
  const slug = name.replace(/\W+/g, '_').slice(0, 24) + '_' + Math.random().toString(36).slice(2, 6);
  const tables = [];
  const osc = (i) => {
    const on = g(`osc_${i}_on`, i === 1 ? 1 : 0) > 0.5;
    const wt = (s.wavetables || [])[i - 1], tid = on && wt ? tableFrom(wt, `vital_${slug}_${i}`, `${name} ${i}`) : null; if (tid) tables.push(tid);
    const tr = g(`osc_${i}_transpose`, 0), oct = clamp(Math.round(tr / 12), -3, 3);
    const pos = clamp(g(`osc_${i}_wave_frame`, 0) / 256, 0, 1);
    const det = g(`osc_${i}_unison_detune`, 4.47); // cents = value^2
    return { on, table: tid || 'basic', pos: tid ? pos : 0.67, oct, semi: clamp(Math.round(tr - oct * 12), -12, 12), fine: clamp(Math.round(g(`osc_${i}_tune`, 0) * 100), -100, 100),
      level: clamp(Math.pow(g(`osc_${i}_level`, 0.707), 2) * 1.4, 0, 1), unison: clamp(Math.round(g(`osc_${i}_unison_voices`, 1)), 1, 9), detune: clamp((det * det) / 60, 0, 1), spread: clamp(g(`osc_${i}_stereo_spread`, 1), 0, 1) };
  };
  const oscA = osc(1), oscB = osc(2);
  if (!oscA.on && oscB.on) { Object.assign(oscA, oscB); oscB.on = false; }
  const fOn = g('filter_1_on', 0) > 0.5 || g('filter_2_on', 0) > 0.5, fi = g('filter_1_on', 0) > 0.5 ? 1 : 2;
  const blend = g(`filter_${fi}_blend`, 0), model = g(`filter_${fi}_model`, 0);
  const style = g(`filter_${fi}_style`, 0); // 0 12dB, 1 24dB, 2 notch blend, 3 notch spread, 4 B/P/N
  const type = !fOn ? 'lowpass' : model === 5 ? 'bandpass' : model === 6 ? 'peaking' : model === 7 ? 'notch' : style === 2 || style === 3 ? 'notch' : blend < 0.5 ? 'lowpass' : blend < 1.5 ? 'bandpass' : 'highpass';
  const cutoffHz = fOn ? mtof(g(`filter_${fi}_cutoff`, 60)) : 20000;
  // modulation matrix: env_2 → filter cutoff gives the filter envelope; lfo_1 → cutoff / pitch / level
  const mods = (s.modulations || []).map((m, k) => ({ ...m, amount: g(`modulation_${k + 1}_amount`, 0) })).filter((m) => m.source && m.destination);
  const envToCut = mods.find((m) => /^env_[2-6]$/.test(m.source) && /filter_\d_cutoff/.test(m.destination));
  const fEnv = envToCut ? envToCut.source.split('_')[1] : 2;
  const lfo = mods.find((m) => /^lfo_\d$/.test(m.source));
  const lfoDest = lfo ? (/cutoff/.test(lfo.destination) ? 'cutoff' : /transpose|tune|pitch/.test(lfo.destination) ? 'pitch' : /level|volume/.test(lfo.destination) ? 'amp' : /pan/.test(lfo.destination) ? 'pan' : /wave_frame/.test(lfo.destination) ? 'wt' : 'cutoff') : null;
  const lfoN = lfo ? lfo.source.split('_')[1] : 1, sync = Math.round(g(`lfo_${lfoN}_sync`, 1)), tempoI = Math.round(g(`lfo_${lfoN}_tempo`, 7));
  const beatHz = (SYNC_RATIO[tempoI] ?? 1) * bpm / 60, lfoHz = sync === 1 ? beatHz : sync === 2 ? beatHz * 2 / 3 : sync === 3 ? beatHz * 1.5 : Math.pow(2, g(`lfo_${lfoN}_frequency`, 1));
  // modulation amounts are fractions of the destination range: cutoff 128 st, transpose 96 st
  const lfoDepth = !lfo ? 0 : lfoDest === 'cutoff' ? Math.abs(lfo.amount) * 128 / 48 : lfoDest === 'pitch' ? Math.abs(lfo.amount) * 96 / 12 : Math.abs(lfo.amount);
  const osc3 = g('osc_3_on', 0) > 0.5;
  const patch = {
    name: '⇪ ' + name, oscA, oscB,
    sub: { level: osc3 ? clamp(Math.pow(g('osc_3_level', 0.707), 2) * 1.4, 0, 1) : 0, oct: osc3 && g('osc_3_transpose', 0) <= -18 ? -2 : -1 }, noise: { level: g('sample_on', 0) > 0.5 ? clamp(g('sample_level', 0.5), 0, 1) * 0.5 : 0 },
    filter: { type, cutoff: clamp(invExpMap(clamp(cutoffHz, 25, 20000), 25, 20000), 0, 1), res: 0.5 + clamp(g(`filter_${fi}_resonance`, 0.5), 0, 1) * 14, drive: fOn ? clamp(g(`filter_${fi}_drive`, 0) / 20, 0, 1) : 0,
      envAmt: envToCut ? clamp(envToCut.amount * 128 / 72, -1, 1) : 0, keytrack: clamp(g(`filter_${fi}_keytrack`, 0), 0, 1) },
    ampEnv: { a: Math.max(0.001, quartic(g('env_1_attack', 0.1495))), d: Math.max(0.01, quartic(g('env_1_decay', 1))), s: clamp(g('env_1_sustain', 1), 0, 1), r: Math.max(0.01, quartic(g('env_1_release', 0.5476))) },
    filtEnv: { a: Math.max(0.001, quartic(g(`env_${fEnv}_attack`, 0.1495))), d: Math.max(0.01, quartic(g(`env_${fEnv}_decay`, 1))), s: clamp(g(`env_${fEnv}_sustain`, 1), 0, 1), r: Math.max(0.01, quartic(g(`env_${fEnv}_release`, 0.5476))) },
    lfo1: { rate: clamp(lfoHz, 0.02, 20), depth: lfo && lfoDest !== 'wt' ? clamp(lfoDepth, 0, 1) : 0, dest: lfoDest && lfoDest !== 'wt' ? lfoDest : 'cutoff', wave: 'triangle' },
    wtLfo: { rate: clamp(lfoHz, 0.02, 10), depth: lfoDest === 'wt' ? clamp(Math.abs(lfo.amount) * 2, 0, 1) : 0 },
    mono: g('polyphony', 8) <= 1 || g('legato', 0) > 0.5, glide: clamp(g('portamento_time', -10) > -7 ? Math.pow(2, g('portamento_time', -10)) : 0, 0, 1),
    volume: 0.65, vital: true,
  };
  return { patch, tables, author: j.author || '' };
}
