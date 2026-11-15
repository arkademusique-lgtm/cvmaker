// Performance FX: momentary "hold to apply" effects on the master bus (DJ-style), tempo-synced.
import { crushCurve } from '../util.js';
import { worklets } from './worklets.js';

export const PERF = [
  ['rep4', '⟳ 1/4'], ['rep8', '⟳ 1/8'], ['rep16', '⟳ 1/16'], ['rep32', '⟳ 1/32'],
  ['lp', 'Filtre ↓'], ['hp', 'Filtre ↑'], ['stop', 'Tape stop'], ['rev', 'Reverse'],
  ['verb', 'Réverbe throw'], ['echo', 'Écho throw'], ['gate', 'Hachoir 1/16'], ['crush', 'Crush'],
];

export class PerfFx {
  constructor(ctx, input, output) {
    this.ctx = ctx; this.bpm = 120; this.active = new Set();
    const c = ctx;
    this.lp = c.createBiquadFilter(); this.lp.frequency.value = 20000; this.lp.Q.value = 6;
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10; this.hp.Q.value = 6;
    this.ws = c.createWaveShaper();
    this.gate = c.createGain();
    try { if (!worklets.ok) throw 0; this.looper = new AudioWorkletNode(c, 'rm-looper', { outputChannelCount: [2] }); } catch (e) { this.looper = c.createGain(); this.noLooper = true; }
    input.connect(this.lp).connect(this.hp).connect(this.ws).connect(this.looper).connect(this.gate).connect(output);
    // throws (sends whose tail keeps ringing after release)
    this.sendV = c.createGain(); this.sendV.gain.value = 0; this.sendE = c.createGain(); this.sendE.gain.value = 0;
    this.cv = c.createConvolver(); const len = c.sampleRate * 3, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2); }
    this.cv.buffer = b; const vg = c.createGain(); vg.gain.value = 0.7;
    this.dl = c.createDelay(4); this.fb = c.createGain(); this.fb.gain.value = 0.6; const elp = c.createBiquadFilter(); elp.frequency.value = 3000;
    input.connect(this.sendV).connect(this.cv).connect(vg).connect(output);
    input.connect(this.sendE).connect(this.dl); this.dl.connect(elp).connect(this.fb).connect(this.dl); elp.connect(output);
  }
  get beat() { return 60 / this.bpm; }
  setTempo(bpm) { this.bpm = bpm; this.dl.delayTime.setTargetAtTime(this.beat * 0.75, this.ctx.currentTime, 0.05); }
  start(id) {
    const t = this.ctx.currentTime, b = this.beat; this.active.add(id);
    const loop = (div) => this.looper.port?.postMessage({ cmd: 'repeat', len: b * div * this.ctx.sampleRate });
    switch (id) {
      case 'rep4': return loop(1); case 'rep8': return loop(0.5); case 'rep16': return loop(0.25); case 'rep32': return loop(0.125);
      case 'stop': return this.looper.port?.postMessage({ cmd: 'tapestop', time: b * 1.5 });
      case 'rev': return this.looper.port?.postMessage({ cmd: 'reverse' });
      case 'lp': this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setValueAtTime(this.lp.frequency.value, t); this.lp.frequency.exponentialRampToValueAtTime(250, t + b * 2); return;
      case 'hp': this.hp.frequency.cancelScheduledValues(t); this.hp.frequency.setValueAtTime(Math.max(20, this.hp.frequency.value), t); this.hp.frequency.exponentialRampToValueAtTime(2500, t + b * 2); return;
      case 'crush': this.ws.curve = crushCurve(4); return;
      case 'verb': this.sendV.gain.setTargetAtTime(1, t, 0.01); return;
      case 'echo': this.sendE.gain.setTargetAtTime(1, t, 0.01); return;
      case 'gate': {
        this.gLfo = this.ctx.createOscillator(); this.gLfo.type = 'square'; this.gLfo.frequency.value = 4 / b; const g = this.ctx.createGain(); g.gain.value = 0.5;
        this.gate.gain.setValueAtTime(0.5, t); this.gLfo.connect(g).connect(this.gate.gain); this.gLfo.start(t); return;
      }
    }
  }
  stop(id) {
    const t = this.ctx.currentTime; this.active.delete(id);
    if (['rep4', 'rep8', 'rep16', 'rep32', 'stop', 'rev'].includes(id)) { if (!['rep4', 'rep8', 'rep16', 'rep32', 'stop', 'rev'].some((x) => this.active.has(x))) this.looper.port?.postMessage({ cmd: 'off' }); return; }
    if (id === 'lp') { this.lp.frequency.cancelScheduledValues(t); this.lp.frequency.setTargetAtTime(20000, t, 0.06); }
    if (id === 'hp') { this.hp.frequency.cancelScheduledValues(t); this.hp.frequency.setTargetAtTime(10, t, 0.06); }
    if (id === 'crush') this.ws.curve = null;
    if (id === 'verb') this.sendV.gain.setTargetAtTime(0, t, 0.02);
    if (id === 'echo') this.sendE.gain.setTargetAtTime(0, t, 0.02);
    if (id === 'gate' && this.gLfo) { this.gLfo.stop(); this.gLfo.disconnect(); this.gLfo = null; this.gate.gain.cancelScheduledValues(t); this.gate.gain.setValueAtTime(1, t); }
  }
  stopAll() { [...this.active].forEach((id) => this.stop(id)); }
}
