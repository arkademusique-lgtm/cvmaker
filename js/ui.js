import { clamp } from './util.js';
import { splitGlyph, icon } from './icons.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    if (c.nodeType) { el.append(c); continue; }
    const str = String(c), g = splitGlyph(str);
    if (g) { const sp = document.createElement('span'); sp.className = 'lbl'; sp.innerHTML = g[0].map((n) => icon(n)).join(''); if (g[1]) sp.append(document.createTextNode(g[1])); el.append(sp); continue; }
    el.append(document.createTextNode(str));
  }
  return el;
}

/** Registry of every control that can be driven by MIDI (MIDI learn). */
export const controls = new Map();
let learnHandler = null;
export function setLearnHandler(fn) { learnHandler = fn; document.body.classList.toggle('learning', !!fn); }

export function registerControl(id, el, api) {
  if (!id) return;
  el.dataset.learn = id;
  controls.set(id, { el, ...api });
  el.addEventListener('pointerdown', (e) => {
    if (learnHandler) { e.preventDefault(); e.stopImmediatePropagation(); learnHandler(id, el); }
  }, true);
}

/** Rotary knob. value is in [min,max]. */
export function knob({ label = '', min = 0, max = 1, value = 0, def, step = 0, fmt, onInput, learn, size = 'md', curve }) {
  def = def ?? value;
  const toNorm = (v) => curve === 'exp' ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const fromNorm = (n) => {
    n = clamp(n, 0, 1);
    let v = curve === 'exp' ? min * Math.pow(max / min, n) : min + n * (max - min);
    if (step) v = Math.round(v / step) * step;
    return v;
  };
  const ind = h('div', { class: 'knob-ind' });
  const dial = h('div', { class: 'knob-dial' }, ind);
  const val = h('div', { class: 'knob-val' });
  const el = h('div', { class: `knob knob-${size}`, title: label }, dial, label ? h('div', { class: 'knob-label' }, label) : null, val);
  let cur = value;
  const draw = () => {
    const n = toNorm(cur);
    ind.style.transform = `rotate(${-135 + n * 270}deg)`;
    dial.style.setProperty('--n', n);
    val.textContent = fmt ? fmt(cur) : (Math.abs(cur) >= 100 ? cur.toFixed(0) : cur.toFixed(2));
  };
  el.setValue = (v, silent) => { cur = clamp(v, Math.min(min, max), Math.max(min, max)); draw(); if (!silent && onInput) onInput(cur); };
  el.getValue = () => cur;
  el.setNorm = (n, silent) => el.setValue(fromNorm(n), silent);
  el.getNorm = () => toNorm(cur);
  let startY, startN;
  dial.addEventListener('pointerdown', (e) => {
    if (document.body.classList.contains('learning')) return;
    dial.setPointerCapture(e.pointerId); startY = e.clientY; startN = toNorm(cur); e.preventDefault();
  });
  dial.addEventListener('pointermove', (e) => {
    if (startY == null) return;
    const sens = e.shiftKey ? 600 : 160;
    el.setNorm(startN + (startY - e.clientY) / sens);
  });
  const end = () => { startY = null; };
  dial.addEventListener('pointerup', end); dial.addEventListener('pointercancel', end);
  dial.addEventListener('dblclick', () => el.setValue(def));
  dial.addEventListener('wheel', (e) => { e.preventDefault(); el.setNorm(toNorm(cur) - Math.sign(e.deltaY) * (e.shiftKey ? 0.005 : 0.03)); }, { passive: false });
  draw();
  registerControl(learn, el, { setNorm: (n) => el.setNorm(n), getNorm: () => el.getNorm(), kind: 'knob' });
  return el;
}

export function button(label, onClick, { learn, cls = '', title } = {}) {
  const el = h('button', { class: `btn ${cls}`, title }, label);
  el.addEventListener('click', (e) => { if (!document.body.classList.contains('learning')) onClick && onClick(e); });
  registerControl(learn, el, { trigger: (v) => onClick && onClick({ midi: true, value: v }), kind: 'button' });
  return el;
}

export function select(options, value, onChange, attrs = {}) {
  const el = h('select', { class: 'sel', ...attrs },
    options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: v === value }, l); }));
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

export function toggle(label, on, onChange, { learn, cls = '' } = {}) {
  const el = h('button', { class: `btn tog ${cls} ${on ? 'on' : ''}` }, label);
  el.set = (v) => { on = v; el.classList.toggle('on', on); };
  const flip = () => { el.set(!on); onChange(on); };
  el.addEventListener('click', () => { if (!document.body.classList.contains('learning')) flip(); });
  registerControl(learn, el, { trigger: flip, kind: 'button' });
  return el;
}

let toastTimer;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export function pickFile(accept, multiple = false) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, multiple });
    i.addEventListener('change', () => res([...i.files]));
    i.click();
  });
}
