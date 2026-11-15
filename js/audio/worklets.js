// AudioWorklet processors (loaded from a Blob so the app stays dependency-free).
const SRC = `
class Decimator extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'rate', defaultValue: 4, minValue: 1, maxValue: 64 }, { name: 'bits', defaultValue: 16, minValue: 1, maxValue: 16 }]; }
  constructor() { super(); this.hold = [0, 0]; this.n = 0; }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0]; if (!inp.length) return true;
    const rate = Math.max(1, Math.round(p.rate[0])), steps = Math.pow(2, p.bits[0]) / 2;
    for (let i = 0; i < out[0].length; i++) {
      if (this.n++ % rate === 0) for (let c = 0; c < out.length; c++) { const x = (inp[c] || inp[0])[i]; this.hold[c] = steps >= 32768 ? x : Math.round(x * steps) / steps; }
      for (let c = 0; c < out.length; c++) out[c][i] = this.hold[c];
    }
    return true;
  }
}
registerProcessor('rm-decimator', Decimator);

// Live looper: beat-repeat, tape-stop, reverse. Records continuously while idle.
class Looper extends AudioWorkletProcessor {
  constructor() {
    super(); this.N = Math.floor(sampleRate * 8); this.buf = [new Float32Array(this.N), new Float32Array(this.N)]; this.w = 0; this.mode = 'pass';
    this.port.onmessage = (e) => {
      const m = e.data; this.fadeIn = 0;
      if (m.cmd === 'repeat') { this.len = Math.max(64, Math.min(this.N / 2, Math.round(m.len))); this.start = (this.w - this.len + this.N) % this.N; this.p = 0; this.mode = 'repeat'; }
      else if (m.cmd === 'tapestop') { this.T = Math.max(64, Math.round(m.time * sampleRate)); this.r = (this.w - this.T / 2 + this.N) % this.N; this.t = 0; this.mode = 'tapestop'; }
      else if (m.cmd === 'reverse') { this.r = this.w; this.t = 0; this.mode = 'reverse'; }
      else { this.mode = 'pass'; }
    };
  }
  read(c, pos) { const b = this.buf[c], i = Math.floor(pos), f = pos - i; return b[(i + this.N) % this.N] * (1 - f) + b[(i + 1 + this.N) % this.N] * f; }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0], n = out[0].length, chans = out.length;
    for (let i = 0; i < n; i++) {
      const x0 = inp.length ? inp[0][i] : 0, x1 = inp.length ? (inp[1] || inp[0])[i] : 0;
      if (this.mode === 'pass') { this.buf[0][this.w] = x0; this.buf[1][this.w] = x1; this.w = (this.w + 1) % this.N; out[0][i] = x0; if (chans > 1) out[1][i] = x1; continue; }
      let y0, y1, g = 1;
      if (this.mode === 'repeat') { const pos = (this.start + this.p) % this.N; y0 = this.buf[0][pos]; y1 = this.buf[1][pos]; g = Math.min(1, this.p / 48, (this.len - this.p) / 48); this.p = (this.p + 1) % this.len; }
      else if (this.mode === 'tapestop') { const s = Math.max(0, 1 - this.t / this.T); y0 = this.read(0, this.r); y1 = this.read(1, this.r); this.r += s; this.t++; g = s > 0 ? 1 : 0; }
      else { y0 = this.buf[0][(this.r + this.N) % this.N]; y1 = this.buf[1][(this.r + this.N) % this.N]; this.r--; this.t++; g = this.t < this.N - 1 ? 1 : 0; }
      if (this.fadeIn < 256) { const a = this.fadeIn++ / 256; y0 = y0 * a + x0 * (1 - a); y1 = y1 * a + x1 * (1 - a); }
      out[0][i] = y0 * g; if (chans > 1) out[1][i] = y1 * g;
    }
    return true;
  }
}
registerProcessor('rm-looper', Looper);
`;
let ready = null;
export function loadWorklets(ctx) {
  if (!ctx.audioWorklet) return Promise.resolve(false);
  if (!ready) {
    const url = URL.createObjectURL(new Blob([SRC], { type: 'application/javascript' }));
    const load = ctx.audioWorklet.addModule(url).then(() => true).catch((e) => { console.warn('AudioWorklet indisponible', e); return false; });
    ready = Promise.race([load, new Promise((r) => setTimeout(() => r(false), 2500))]); // never block audio start
  }
  return ready;
}
export const worklets = { ok: false };
