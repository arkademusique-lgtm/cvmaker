import { FxRack } from './fx.js';
import { PerfFx } from './perf.js';
import { loadWorklets, worklets } from './worklets.js';
import { VOICES, playSample } from './drums.js';
import { Synth } from './synth.js';

export const TRACKS = ['Bass Drum', 'Snare Drum', 'Hi Tom', 'Mid Tom', 'Low Tom', 'Rim Shot', 'Hand Clap', 'Cow Bell', 'Cymbal', 'Open HH', 'Closed HH', 'Bass Line'];
export const DRUM_TRACKS = 11;

export class Engine {
  constructor() { this.ctx = null; this.samples = new Map(); this.chokes = new Map(); }
  async init() {
    if (this.ctx) return this.ctx.resume();
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new C({ latencyHint: 'interactive' }));
    const resumed = ctx.resume(); // inside the user gesture (iOS)
    this.fxIn = ctx.createGain();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2; this.limiter.ratio.value = 20; this.limiter.attack.value = 0.002; this.limiter.release.value = 0.1; this.limiter.knee.value = 0;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
    worklets.ok = await loadWorklets(ctx);
    this.perfIn = ctx.createGain();
    this.rack = new FxRack(ctx, this.fxIn, this.perfIn);
    this.perf = new PerfFx(ctx, this.perfIn, this.master);
    this.master.connect(this.limiter).connect(this.analyser).connect(ctx.destination);
    this.recDest = ctx.createMediaStreamDestination(); this.limiter.connect(this.recDest);
    this.drumBus = ctx.createGain(); this.drumBus.connect(this.fxIn);
    this.trackOut = TRACKS.slice(0, DRUM_TRACKS).map(() => { const g = ctx.createGain(); const p = ctx.createStereoPanner(); g.connect(p).connect(this.drumBus); g.pan = p; return g; });
    this.bassSynth = new Synth(ctx, this.fxIn);
    this.leadSynth = new Synth(ctx, this.fxIn);
    return ctx.resume();
  }
  get now() { return this.ctx.currentTime; }

  /** Trigger drum track i using kit track settings. */
  triggerDrum(i, tr, vel = 1, t = this.ctx.currentTime) {
    if (!tr) return;
    const ctx = this.ctx;
    const vg = ctx.createGain(); vg.connect(this.trackOut[i]);
    if (tr.choke) { const prev = this.chokes.get(tr.choke); if (prev) { prev.gain.cancelScheduledValues(t); prev.gain.setTargetAtTime(0, t, 0.006); } this.chokes.set(tr.choke, vg); }
    const p = { ...tr };
    const v = vel * 0.9;
    if (tr.sampleId && this.samples.has(tr.sampleId)) playSample(ctx, t, p, vg, v, this.samples.get(tr.sampleId));
    else (VOICES[tr.voice] || VOICES.kick)[1](ctx, t, p, vg, v);
    setTimeout(() => { try { vg.disconnect(); } catch (e) { /* */ } }, ((t - ctx.currentTime) + 6) * 1000);
  }
  setTrackMix(i, level, pan, muted) {
    const g = this.trackOut[i]; if (!g) return;
    g.gain.setTargetAtTime(muted ? 0 : level * level * 1.3, this.ctx.currentTime, 0.01);
    g.pan.pan.setTargetAtTime(pan || 0, this.ctx.currentTime, 0.01);
  }
}
