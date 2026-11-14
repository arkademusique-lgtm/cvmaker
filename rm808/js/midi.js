// Web MIDI: device handling, monitor, generic MIDI-learn mapping (works with any controller, incl. the RM-808).
import { ls } from './storage.js';

export class Midi {
  constructor() {
    this.access = null; this.inputs = []; this.outputs = []; this.map = ls.get('midimap', {});
    this.listeners = new Set(); this.statusListeners = new Set(); this.learnTarget = null; this.inputFilter = ls.get('midiInput', 'all');
    this.lastVal = {};
  }
  get supported() { return !!navigator.requestMIDIAccess; }
  async init() {
    if (!this.supported) return false;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => this.refresh();
      this.refresh();
      return true;
    } catch (e) { console.warn('MIDI refusé', e); return false; }
  }
  refresh() {
    this.inputs = [...this.access.inputs.values()];
    this.outputs = [...this.access.outputs.values()];
    for (const i of this.inputs) i.onmidimessage = (e) => { if (this.inputFilter === 'all' || this.inputFilter === i.id) this.handle(e.data, i); };
    this.statusListeners.forEach((f) => f());
  }
  setInput(id) { this.inputFilter = id; ls.set('midiInput', id); }
  parse(d) {
    const st = d[0] & 0xf0, ch = (d[0] & 0x0f) + 1;
    if (d[0] === 0xf8) return { type: 'clock' };
    if (d[0] === 0xfa) return { type: 'start' };
    if (d[0] === 0xfb) return { type: 'continue' };
    if (d[0] === 0xfc) return { type: 'stop' };
    if (d[0] >= 0xf0) return { type: 'sys' };
    if (st === 0x90 && d[2] > 0) return { type: 'noteon', ch, num: d[1], val: d[2], key: `note:${ch}:${d[1]}` };
    if (st === 0x80 || (st === 0x90 && d[2] === 0)) return { type: 'noteoff', ch, num: d[1], val: 0, key: `note:${ch}:${d[1]}` };
    if (st === 0xb0) return { type: 'cc', ch, num: d[1], val: d[2], key: `cc:${ch}:${d[1]}` };
    if (st === 0xe0) return { type: 'pb', ch, num: 0, val: ((d[2] << 7) | d[1]) / 128, key: `pb:${ch}` };
    if (st === 0xc0) return { type: 'pc', ch, num: d[1], val: 0, key: `pc:${ch}:${d[1]}` };
    if (st === 0xa0 || st === 0xd0) return { type: 'at', ch, num: d[1], val: d[2] ?? d[1], key: `at:${ch}` };
    return { type: 'other' };
  }
  handle(data, input) {
    const m = this.parse(data); m.raw = [...data]; m.input = input.name;
    const fresh = !(this.lastLearn && this.lastLearn.key === m.key && performance.now() - this.lastLearn.t < 1200);
    if (this.learnTarget && fresh && (m.type === 'noteon' || m.type === 'cc' || m.type === 'pb' || m.type === 'pc')) {
      const target = this.learnTarget; this.learnTarget = null; this.lastLearn = { key: m.key, t: performance.now() };
      for (const [k, v] of Object.entries(this.map)) if (v.id === target.id) delete this.map[k];
      this.map[m.key] = { id: target.id, mode: 'abs' };
      this.save(); target.done && target.done(m);
      this.listeners.forEach((f) => f({ ...m, learned: target.id }));
      return;
    }
    if (this.learnTarget && !fresh) { this.lastLearn.t = performance.now(); return; }
    this.listeners.forEach((f) => f(m));
  }
  learn(id, done) { this.learnTarget = { id, done }; }
  cancelLearn() { this.learnTarget = null; }
  save() { ls.set('midimap', this.map); this.statusListeners.forEach((f) => f()); }
  unmap(key) { delete this.map[key]; this.save(); }
  clearMap() { this.map = {}; this.save(); }
  /** Convert an incoming CC value to normalized [0,1] respecting relative modes. */
  normalized(m, entry, current) {
    if (m.type === 'pb') return m.val / 128;
    if (entry.mode === 'rel2c') { const d = m.val > 64 ? m.val - 128 : m.val; return Math.min(1, Math.max(0, current + d / 100)); }
    if (entry.mode === 'relbin') { const d = m.val - 64; return Math.min(1, Math.max(0, current + d / 100)); }
    return m.val / 127;
  }
  send(bytes) { for (const o of this.outputs) try { o.send(bytes); } catch (e) { /* */ } }
}
