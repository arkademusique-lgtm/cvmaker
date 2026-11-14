// Look-ahead step sequencer (16 steps, swing, looper / beat-repeat, pattern chain / song).
export function emptyPattern(name = '') {
  return {
    name, length: 16,
    drums: Array.from({ length: 11 }, () => Array(16).fill(0)), // 0 off, 1 on, 2 accent
    bass: Array.from({ length: 16 }, () => ({ on: false, note: 36, acc: false, slide: false })),
    synth: Array.from({ length: 16 }, () => []), // midi notes per step
    synthGate: 1, // in steps
  };
}

export class Sequencer {
  constructor(engine, onStep, onUi) {
    this.engine = engine; this.onStep = onStep; this.onUi = onUi;
    this.bpm = 120; this.swing = 0; this.playing = false;
    this.step = 0; this.counter = 0; this.looper = 0; this.loopStart = 0;
  }
  get stepDur() { return 60 / this.bpm / 4; }
  start() {
    if (this.playing) return;
    this.playing = true; this.step = 0; this.counter = 0;
    this.next = this.engine.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 20);
    this.tick();
  }
  stop() { this.playing = false; clearInterval(this.timer); this.onUi(-1); }
  setLooper(n) {
    this.looper = n;
    if (n) this.loopStart = this.step - (this.step % n);
  }
  tick() {
    const ctx = this.engine.ctx;
    while (this.next < ctx.currentTime + 0.12) {
      let t = this.next;
      if (this.step % 2 === 1) t += this.swing * this.stepDur * 0.5;
      const s = this.step;
      this.onStep(s, t, this.stepDur);
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => this.playing && this.onUi(s), delay);
      this.advance();
    }
  }
  advance() {
    this.next += this.stepDur;
    this.counter++;
    const len = this.getLength();
    if (this.looper) {
      this.step = this.loopStart + ((this.step - this.loopStart + 1) % this.looper);
      if (this.step >= len) this.step = this.loopStart;
      return;
    }
    this.step++;
    if (this.step >= len) { this.step = 0; this.onBar && this.onBar(); }
  }
  getLength() { return 16; }
}
