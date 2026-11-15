// Visual editing: draggable envelopes, drawable LFO shapes, drag-a-source-onto-a-knob modulation.
import { h } from './ui.js';
import { SHAPES, shapeAt, MOD_SRCS } from './audio/synth.js';
import { clamp } from './util.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#ff7a1a';
function hiDpi(cv, w, hgt) { const r = Math.min(2, window.devicePixelRatio || 1); cv.width = w * r; cv.height = hgt * r; cv.style.width = '100%'; cv.style.aspectRatio = `${w} / ${hgt}`; const g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); return g; }
const relPos = (cv, e, W, H) => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H]; };

// ---------------------------------------------------------------- envelope: drag A / D+S / R points
const TMIN = 0.001, TMAX = { a: 5, d: 5, r: 8 };
const tToX = (t, k) => Math.log(clamp(t, TMIN, TMAX[k]) / TMIN) / Math.log(TMAX[k] / TMIN);
const xToT = (x, k) => TMIN * Math.pow(TMAX[k] / TMIN, clamp(x, 0, 1));
export function envEditor(get, set, color = '--org') {
  const W = 320, H = 120, pad = 10, seg = (W - 2 * pad) / 4, cv = h('canvas', { class: 'enved', 'aria-label': 'Enveloppe : fais glisser les points' }), g = hiDpi(cv, W, H);
  const pts = () => { const e = get(); const xa = pad + tToX(e.a, 'a') * seg, xd = xa + tToX(e.d, 'd') * seg, xs = pad + seg * 3 - 4, xr = xs + tToX(e.r, 'r') * seg; const ys = pad + (1 - e.s) * (H - 2 * pad);
    return { a: [xa, pad], d: [xd, ys], s: [xs, ys], r: [Math.min(W - pad, xr), H - pad] }; };
  const draw = () => {
    const p = pts(), col = css(color); g.clearRect(0, 0, W, H);
    g.strokeStyle = '#2c2f36'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(pad + i * seg, pad); g.lineTo(pad + i * seg, H - pad); g.stroke(); }
    g.beginPath(); g.moveTo(pad, H - pad); g.lineTo(...p.a); g.quadraticCurveTo(p.a[0] + (p.d[0] - p.a[0]) * 0.15, p.d[1], ...p.d); g.lineTo(...p.s); g.quadraticCurveTo(p.s[0] + (p.r[0] - p.s[0]) * 0.15, H - pad, ...p.r);
    g.strokeStyle = col; g.lineWidth = 2.5; g.stroke(); g.lineTo(p.r[0], H - pad); g.lineTo(pad, H - pad); g.closePath(); g.globalAlpha = 0.12; g.fillStyle = col; g.fill(); g.globalAlpha = 1;
    for (const [k, [x, y]] of Object.entries(p)) { g.beginPath(); g.arc(x, y, k === drag ? 8 : 6, 0, Math.PI * 2); g.fillStyle = k === drag ? '#fff' : col; g.fill(); }
    const e = get(), ms = (t) => (t < 1 ? Math.round(t * 1000) + ' ms' : t.toFixed(2) + ' s');
    g.fillStyle = '#8d9099'; g.font = '11px Archivo, system-ui'; g.fillText(`A ${ms(e.a)}  D ${ms(e.d)}  S ${Math.round(e.s * 100)}%  R ${ms(e.r)}`, pad + 2, 14);
  };
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { const [x, y] = relPos(cv, e, W, H), p = pts(); let best = null, bd = 30; for (const [k, [px, py]] of Object.entries(p)) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = k; } } if (!best) return; drag = best; cv.setPointerCapture(e.pointerId); e.preventDefault(); draw(); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return; const [x, y] = relPos(cv, e, W, H), e0 = get(), p = pts();
    if (drag === 'a') set('a', xToT((x - pad) / seg, 'a'));
    if (drag === 'd') { set('d', xToT((x - p.a[0]) / seg, 'd')); set('s', clamp(1 - (y - pad) / (H - 2 * pad), 0, 1)); }
    if (drag === 's') set('s', clamp(1 - (y - pad) / (H - 2 * pad), 0, 1));
    if (drag === 'r') set('r', xToT((x - p.s[0]) / seg, 'r'));
    void e0; draw();
  });
  const end = () => { drag = null; draw(); }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.redraw = draw; draw(); return cv;
}

// ---------------------------------------------------------------- LFO: drawable shape with playhead
export function lfoEditor(getCfg, setShape, phaseFn) {
  const W = 320, H = 120, pad = 10, cv = h('canvas', { class: 'enved lfoed', 'aria-label': 'LFO : fais glisser les points, double-touche pour ajouter ou retirer un point' }), g = hiDpi(cv, W, H);
  const toXY = ([x, y]) => [pad + x * (W - 2 * pad), H / 2 - y * (H / 2 - pad)], fromXY = (px, py) => [clamp((px - pad) / (W - 2 * pad), 0, 1), clamp((H / 2 - py) / (H / 2 - pad), -1, 1)];
  const shape = () => { const c = getCfg(); return c.wave === 'custom' && c.shape ? c.shape : SHAPES[{ sine: 'sine', triangle: 'triangle', square: 'square', sawtooth: 'ramp' }[c.wave] || 'triangle']; };
  let drag = -1, raf = null, lastTap = 0;
  const draw = () => {
    const pts = shape(), col = css('--blue'); g.clearRect(0, 0, W, H);
    g.strokeStyle = '#2c2f36'; g.beginPath(); g.moveTo(pad, H / 2); g.lineTo(W - pad, H / 2); g.stroke();
    g.beginPath(); for (let i = 0; i <= 200; i++) { const [x, y] = toXY([i / 200, shapeAt(pts, i / 200)]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = 2.5; g.stroke();
    pts.forEach((p, i) => { const [x, y] = toXY(p); g.beginPath(); g.arc(x, y, i === drag ? 7 : 5, 0, Math.PI * 2); g.fillStyle = i === drag ? '#fff' : col; g.fill(); });
    const ph = phaseFn(); if (Number.isFinite(ph)) { const [x, y] = toXY([ph, shapeAt(pts, ph)]); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 0.25; g.fillRect(x - 1, pad, 2, H - 2 * pad); g.globalAlpha = 1; }
  };
  const loop = () => { if (!cv.isConnected) { raf = null; return; } if (cv.offsetParent) draw(); raf = requestAnimationFrame(loop); };
  const commit = (pts) => { setShape(pts.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)])); };
  cv.addEventListener('pointerdown', (e) => {
    const [px, py] = relPos(cv, e, W, H), pts = shape().map((p) => [...p]); let hit = -1;
    pts.forEach((p, i) => { const [x, y] = toXY(p); if (Math.hypot(x - px, y - py) < 16) hit = i; });
    const now = performance.now(), dbl = now - lastTap < 320; lastTap = now;
    if (dbl) { // double tap: remove a point (not the ends) or add one
      if (hit > 0 && hit < pts.length - 1) pts.splice(hit, 1); else { const [x, y] = fromXY(px, py); pts.push([x, y]); pts.sort((a, b) => a[0] - b[0]); }
      commit(pts); draw(); return;
    }
    if (hit < 0) return; drag = hit; cv.setPointerCapture(e.pointerId); e.preventDefault(); if (getCfg().wave !== 'custom') commit(pts);
  });
  cv.addEventListener('pointermove', (e) => {
    if (drag < 0) return; const pts = shape().map((p) => [...p]), [px, py] = relPos(cv, e, W, H); let [x, y] = fromXY(px, py);
    if (drag === 0) x = 0; else if (drag === pts.length - 1) x = 1; else x = clamp(x, pts[drag - 1][0] + 0.001, pts[drag + 1][0] - 0.001);
    pts[drag] = [x, y]; commit(pts);
  });
  const end = () => { drag = -1; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  raf = requestAnimationFrame(loop); return cv;
}
export const SHAPE_NAMES = [['sine', 'Sinus'], ['triangle', 'Triangle'], ['ramp', 'Rampe'], ['saw', 'Scie'], ['square', 'Carré'], ['steps', 'Escalier'], ['pump', 'Pump'], ['bounce', 'Rebond']];

// ---------------------------------------------------------------- drag a modulation source onto a knob
const ARM = { src: null, listening: false };
export const SRC_COLORS = { lfo1: '#3fd0ff', lfo2: '#7c8cff', env2: '#ff7a1a', env3: '#ffd23f', vel: '#4ade80', note: '#f472b6', m1: '#ff5d5d', m2: '#f59e0b', m3: '#a3e635', m4: '#22d3ee' };
/** Knob learn-id suffix → matrix destination. */
export function dstForKnob(id) {
  const k = id.replace(/^(lead|bass)\./, '');
  const m = { 'filter.cutoff': 'cutoff1', 'filter2.cutoff': 'cutoff2', 'filter.res': 'res1', volume: 'amp', pan: 'pan', fm: 'fm' }[k]; if (m) return m;
  const o = k.match(/^osc([ABC])\.(\w+)$/); if (!o) return null;
  return { pos: 'pos', level: 'level', warpAmt: 'warp', semi: 'pitch', fine: 'pitch', oct: 'pitch' }[o[2]] ? { pos: 'pos', level: 'level', warpAmt: 'warp', semi: 'pitch', fine: 'pitch', oct: 'pitch' }[o[2]] + o[1] : null;
}
export function modSourceBar(part, addMod) {
  const bar = h('div', { class: 'modbar' }, h('span', { class: 'hint' }, 'Glisse une source sur un potard (ou touche-la puis touche le potard) :'));

  const disarm = () => { ARM.src = null; document.body.classList.remove('mod-armed'); bar.querySelectorAll('.modsrc').forEach((c) => c.classList.remove('on')); };

  const target = (x, y) => { const el = document.elementFromPoint(x, y)?.closest?.('[data-learn]'); return el && dstForKnob(el.dataset.learn) && el.dataset.learn.startsWith(part + '.') ? el : null; };
  MOD_SRCS.forEach(([src, label]) => {
    const chip = h('div', { class: 'modsrc', style: { '--c': SRC_COLORS[src] }, 'data-src': src }, label);
    chip.addEventListener('pointerdown', (e) => {
      e.preventDefault(); chip.setPointerCapture(e.pointerId);
      if (ARM.bar !== bar) { ARM.disarm?.(); Object.assign(ARM, { part, addMod, bar, disarm }); } // this bar's tab becomes the target
      const ghost = h('div', { class: 'modghost', style: { '--c': SRC_COLORS[src] } }, label); document.body.append(ghost);
      let moved = false, over = null;
      const mv = (ev) => { moved ||= Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6; ghost.style.transform = `translate(${ev.clientX + 8}px, ${ev.clientY + 8}px)`; const t = target(ev.clientX, ev.clientY); if (t !== over) { over?.classList.remove('dropover'); over = t; over?.classList.add('dropover'); } };
      const up = (ev) => { chip.removeEventListener('pointermove', mv); ghost.remove(); over?.classList.remove('dropover');
        if (moved) { const t = target(ev.clientX, ev.clientY); if (t) addMod(src, dstForKnob(t.dataset.learn)); disarm(); }
        else { if (ARM.src === src) return disarm(); disarm(); ARM.src = src; chip.classList.add('on'); document.body.classList.add('mod-armed'); } };
      chip.addEventListener('pointermove', mv); chip.addEventListener('pointerup', up, { once: true }); mv(e);
    });
    bar.append(chip);
  });
  if (!ARM.listening) { // one global listener for tap-tap mode
    ARM.listening = true;
    document.addEventListener('pointerdown', (e) => {
      if (!ARM.src || !ARM.bar?.isConnected || e.target.closest('.modsrc')) return;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-learn]'), d = el && el.dataset.learn.startsWith(ARM.part + '.') ? dstForKnob(el.dataset.learn) : null;
      if (d) { e.preventDefault(); e.stopPropagation(); ARM.addMod(ARM.src, d); }
      ARM.disarm();
    }, true);
  }
  return bar;
}
/** Paint a coloured ring on every knob that is the destination of a matrix row. */
export function decorateMods(part, mods) {
  document.querySelectorAll(`.view-${part} .knob.modded`).forEach((k) => { k.classList.remove('modded'); k.style.removeProperty('--mc'); k.style.removeProperty('--ma'); k.querySelector('.modbadge')?.remove(); });
  (mods || []).forEach((m) => {
    document.querySelectorAll(`.view-${part} [data-learn^="${part}."]`).forEach((el) => {
      if (dstForKnob(el.dataset.learn) !== m.dst || !el.classList.contains('knob')) return;
      el.classList.add('modded'); el.style.setProperty('--mc', SRC_COLORS[m.src]); el.style.setProperty('--ma', Math.abs(m.amt));
      const b = el.querySelector('.modbadge') || h('span', { class: 'modbadge' }); b.textContent = (b.textContent ? b.textContent + ' ' : '') + (MOD_SRCS.find(([s]) => s === m.src)?.[1] || m.src).replace('Macro ', 'M').replace('LFO ', 'L').replace('Env. ', 'E'); b.style.background = SRC_COLORS[m.src]; el.append(b);
    });
  });
}
