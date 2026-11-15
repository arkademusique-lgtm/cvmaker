// Import of Vital presets (.vital = JSON). Approximate translation to the RM-808 Studio synth:
// 2 oscillators with their wavetables, unison, transpose, filter, amp & filter envelopes, LFO 1 routing, glide.
import { registerFrames } from './audio/wavetables.js';
import { clamp, invExpMap } from './util.js';

const b64Floats = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer, 0, Math.floor(u.length / 4)); };
const quartic = (v) => Math.pow(Math.max(0, v), 4); // Vital envelope times are stored on a quartic scale (seconds = value^4)
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tableFrom(wt, id, name) {
  try {
    const frames = [];
    for (const g of wt.groups || []) for (const c of g.components || []) {
      for (const k of c.keyframes || []) if (k.wave_data) frames.push({ pos: k.position ?? 0, data: b64Floats(k.wave_data) });
    }
    if (!frames.length) return null;
    frames.sort((a, b) => a.pos - b.pos);
    // spread keyframes over the table: interpolate up to 32 frames between keyframes
    const out = []; const steps = Math.min(32, Math.max(frames.length, 2));
    for (let i = 0; i < steps; i++) {
      const x = (i / (steps - 1)) * (frames.length - 1), j = Math.min(frames.length - 2, Math.floor(x)), t = frames.length > 1 ? x - j : 0;
      const a = frames[Math.max(0, j)].data, b = frames[Math.min(frames.length - 1, j + 1)].data, n = Math.min(a.length, b.length);
      out.push(Float32Array.from({ length: n }, (_, k) => a[k] * (1 - t) + b[k] * t));
    }
    return registerFrames(id, '⇪ ' + name, out);
  } catch (e) { return null; }
}

export function importVital(text, fileName = 'Vital') {
  const j = JSON.parse(text), s = j.settings || {};
  const name = (j.preset_name || fileName.replace(/\.vital$/i, '')).slice(0, 40);
  const g = (k, d) => (s[k] ?? d);
  const slug = name.replace(/\W+/g, '_').slice(0, 24) + '_' + Math.random().toString(36).slice(2, 6);
  const tables = [];
  const osc = (i) => {
    const on = g(`osc_${i}_on`, i === 1 ? 1 : 0) > 0.5;
    const wt = (s.wavetables || [])[i - 1], tid = on && wt ? tableFrom(wt, `vital_${slug}_${i}`, `${name} ${i}`) : null; if (tid) tables.push(tid);
    const tr = g(`osc_${i}_transpose`, 0), oct = clamp(Math.round(tr / 12), -3, 3);
    const frames = 256, pos = clamp(g(`osc_${i}_wave_frame`, 0) / frames, 0, 1);
    const det = g(`osc_${i}_unison_detune`, 4.47); // cents = value^2
    return { on, table: tid || 'basic', pos: tid ? pos : 0.67, oct, semi: clamp(Math.round(tr - oct * 12), -12, 12), fine: clamp(Math.round(g(`osc_${i}_tune`, 0) * 100), -100, 100),
      level: clamp(g(`osc_${i}_level`, 0.707), 0, 1), unison: clamp(Math.round(g(`osc_${i}_unison_voices`, 1)), 1, 9), detune: clamp((det * det) / 60, 0, 1), spread: clamp(g(`osc_${i}_stereo_spread`, 1), 0, 1) };
  };
  const oscA = osc(1), oscB = osc(2);
  if (!oscA.on && oscB.on) { Object.assign(oscA, oscB); oscB.on = false; }
  const fOn = g('filter_1_on', 0) > 0.5 || g('filter_2_on', 0) > 0.5, fi = g('filter_1_on', 0) > 0.5 ? 1 : 2;
  const blend = g(`filter_${fi}_blend`, 0), model = g(`filter_${fi}_model`, 0);
  const type = !fOn ? 'lowpass' : model === 5 ? 'bandpass' : model === 6 ? 'notch' : blend < 0.5 ? 'lowpass' : blend < 1.5 ? 'bandpass' : 'highpass';
  const cutoffHz = fOn ? mtof(g(`filter_${fi}_cutoff`, 60)) : 20000;
  // modulation matrix: env_2 → filter cutoff gives the filter envelope; lfo_1 → cutoff / pitch / level
  const mods = (s.modulations || []).map((m, k) => ({ ...m, amount: g(`modulation_${k + 1}_amount`, 0) })).filter((m) => m.source && m.destination);
  const envToCut = mods.find((m) => /^env_[2-6]$/.test(m.source) && /filter_\d_cutoff/.test(m.destination));
  const fEnv = envToCut ? envToCut.source.split('_')[1] : 2;
  const lfo = mods.find((m) => /^lfo_\d$/.test(m.source));
  const lfoDest = lfo ? (/cutoff/.test(lfo.destination) ? 'cutoff' : /transpose|tune|pitch/.test(lfo.destination) ? 'pitch' : /level|volume/.test(lfo.destination) ? 'amp' : /pan/.test(lfo.destination) ? 'pan' : /wave_frame/.test(lfo.destination) ? 'wt' : 'cutoff') : null;
  const lfoN = lfo ? lfo.source.split('_')[1] : 1, lfoHz = Math.pow(2, g(`lfo_${lfoN}_frequency`, 1));
  const patch = {
    name: '⇪ ' + name, oscA, oscB,
    sub: { level: 0, oct: -1 }, noise: { level: g('sample_on', 0) > 0.5 ? clamp(g('sample_level', 0.5), 0, 1) * 0.5 : 0 },
    filter: { type, cutoff: clamp(invExpMap(clamp(cutoffHz, 25, 20000), 25, 20000), 0, 1), res: 0.5 + clamp(g(`filter_${fi}_resonance`, 0.5), 0, 1) * 14, drive: fOn ? clamp(g(`filter_${fi}_drive`, 0) / 20, 0, 1) : 0,
      envAmt: envToCut ? clamp(envToCut.amount, -1, 1) * 0.8 : 0, keytrack: clamp(g(`filter_${fi}_keytrack`, 0), 0, 1) },
    ampEnv: { a: Math.max(0.001, quartic(g('env_1_attack', 0.1495))), d: Math.max(0.01, quartic(g('env_1_decay', 1))), s: clamp(g('env_1_sustain', 1), 0, 1), r: Math.max(0.01, quartic(g('env_1_release', 0.5476))) },
    filtEnv: { a: Math.max(0.001, quartic(g(`env_${fEnv}_attack`, 0.1495))), d: Math.max(0.01, quartic(g(`env_${fEnv}_decay`, 1))), s: clamp(g(`env_${fEnv}_sustain`, 1), 0, 1), r: Math.max(0.01, quartic(g(`env_${fEnv}_release`, 0.5476))) },
    lfo1: { rate: clamp(lfoHz, 0.02, 20), depth: lfo && lfoDest !== 'wt' ? clamp(Math.abs(lfo.amount), 0, 1) * (lfoDest === 'pitch' ? 0.2 : 0.8) : 0, dest: lfoDest && lfoDest !== 'wt' ? lfoDest : 'cutoff', wave: 'sine' },
    wtLfo: { rate: clamp(lfoHz, 0.02, 10), depth: lfoDest === 'wt' ? clamp(Math.abs(lfo.amount) * 2, 0, 1) : 0 },
    mono: g('voice_override', 0) > 0.5 || g('polyphony', 8) <= 1, glide: clamp(g('portamento_time', -10) > -7 ? Math.pow(2, g('portamento_time', -10)) : 0, 0, 1),
    volume: 0.65, vital: true,
  };
  return { patch, tables, author: j.author || '' };
}
