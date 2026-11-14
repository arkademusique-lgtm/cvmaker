import { Engine, TRACKS, DRUM_TRACKS } from './audio/engine.js';
import { VOICES } from './audio/drums.js';
import { DEFAULT_PATCH, mergePatch, LFO_DESTS } from './audio/synth.js';
import { FX_TYPES } from './audio/fx.js';
import { TABLES, tableOptions, framesAt, N as WT_N, setCustomFrames, importWavetable, exportUserTables, importUserTables } from './audio/wavetables.js';
import { Sequencer, emptyPattern } from './sequencer.js';
import { Midi } from './midi.js';
import { BleLink } from './ble.js';
import { BUILTIN_KITS, randomKit, cloneKit, makeTrack } from './kits.js';
import { PRESETS } from './presets.js';
import * as db from './storage.js';
import { h, knob, button, select, toggle, toast, controls, registerControl, setLearnHandler, pickFile } from './ui.js';
import { clamp, deepClone, noteName, uid, encodeWav, download, abToB64, b64ToAb, pick, rand } from './util.js';

const engine = new Engine();
const midi = new Midi();
const ble = new BleLink(midi, (line) => logLine('🔵 ' + line));
let seq;

// ---------------------------------------------------------------- state
const S = {
  bpm: 120, swing: 0, master: 0.8,
  patterns: Array.from({ length: 16 }, (_, i) => emptyPattern(`P${i + 1}`)),
  cur: 0, queued: null, song: [0], songMode: false, songPos: 0,
  kit: deepClone(BUILTIN_KITS[0]), kits: [...BUILTIN_KITS], kitIdx: 0,
  lead: mergePatch(PRESETS.find((p) => p.name === 'Super Saw Lead')),
  bass: mergePatch(PRESETS.find((p) => p.name === 'Acid Bass 303')),
  mutes: Array(12).fill(false), solos: Array(12).fill(false),
  sel: 0, pots: 'level', keyMode: 'step', rec: false,
  octave: 4, bassOctave: 2, lastBassNote: 36,
  fx1: null, fx2: null, looper: 0, clearHeld: false, clearUsed: false,
  padBot: db.ls.get('padBot', 'select'), unmapped: db.ls.get('unmapped', 'lead'), followClock: db.ls.get('followClock', true),
  tab: 'device', clip: null, projectName: 'Mon projet',
};
const audible = (i) => (S.solos.some(Boolean) ? S.solos[i] : !S.mutes[i]);
const pat = () => S.patterns[S.cur];
const SCALE = [0, 3, 5, 7, 10];

// ---------------------------------------------------------------- audio glue
function applyKitMix() { for (let i = 0; i < DRUM_TRACKS; i++) { const t = S.kit.tracks[i]; engine.setTrackMix(i, t.level, t.pan, !audible(i)); } engine.bassSynth.out.gain.value = audible(11) ? 1 : 0; }

async function ensureSamples(kit) {
  for (const t of kit.tracks) {
    if (t.sampleId && !engine.samples.has(t.sampleId)) {
      const rec = await db.get('samples', t.sampleId);
      if (rec) { try { engine.samples.set(t.sampleId, await engine.ctx.decodeAudioData(rec.data.slice(0))); } catch (e) { console.warn(e); } }
    }
  }
}
async function storeSample(name, ab) {
  const id = 's_' + uid();
  await db.put('samples', { id, name, data: ab.slice(0) });
  engine.samples.set(id, await engine.ctx.decodeAudioData(ab.slice(0)));
  return id;
}
async function loadSampleToTrack(i, file) {
  try {
    const id = await storeSample(file.name, await file.arrayBuffer());
    Object.assign(S.kit.tracks[i], { sampleId: id, sampleName: file.name, decay: 1, tune: 0.5, tone: 1 });
    toast(`${file.name} → ${TRACKS[i]}`); renderSeq(); renderKits(); trigger(i, 1);
  } catch (e) { toast('Format audio non supporté'); }
}

function onStep(s, t, dur) {
  const p = pat();
  if (s >= p.length) return;
  for (let i = 0; i < DRUM_TRACKS; i++) { const v = p.drums[i][s]; if (v && audible(i)) engine.triggerDrum(i, S.kit.tracks[i], v === 2 ? 1 : 0.72, t); }
  const b = p.bass[s];
  if (b.on && audible(11)) {
    const prev = p.bass[(s - 1 + p.length) % p.length];
    engine.bassSynth.play(b.note, b.acc ? 1 : 0.7, t, dur * (b.slide ? 1.15 : 0.55), prev.on && prev.slide);
  }
  for (const n of p.synth[s]) engine.leadSynth.play(n, 0.8, t, dur * p.synthGate * 0.95);
}
function onBar() {
  if (S.songMode && S.song.length) { S.songPos = (S.songPos + 1) % S.song.length; S.cur = S.song[S.songPos]; }
  else if (S.queued != null) { S.cur = S.queued; S.queued = null; }
  else return;
  setTimeout(refreshPattern, 50);
}

function trigger(i, vel = 1) {
  if (i < DRUM_TRACKS) engine.triggerDrum(i, S.kit.tracks[i], vel);
  else engine.bassSynth.play(S.lastBassNote, vel, engine.now, 0.25);
  flashPad(i);
  if (S.rec && seq.playing) {
    const st = recStep();
    if (i < DRUM_TRACKS) pat().drums[i][st] = vel > 0.85 ? 2 : 1;
    else Object.assign(pat().bass[st], { on: true, note: S.lastBassNote });
    refreshSteps();
  }
}
function recStep() {
  const len = pat().length, ahead = Math.round((seq.next - engine.now) / seq.stepDur);
  return (((seq.step - ahead) % len) + len) % len;
}

// ---------------------------------------------------------------- transport & global setters
function setBpm(v, from) {
  S.bpm = clamp(Math.round(v), 30, 300); seq.bpm = S.bpm; engine.rack.setTempo(S.bpm);
  for (const id of ['hdr.tempo', 'dev.tempo']) if (id !== from) controls.get(id)?.el.setValue(S.bpm, true);
}
function togglePlay() {
  engine.init();
  if (seq.playing) { seq.stop(); engine.leadSynth.allOff(); engine.bassSynth.allOff(); }
  else { if (S.songMode) { S.songPos = 0; S.cur = S.song[0] ?? 0; refreshPattern(); } seq.start(); }
  document.querySelectorAll('.play-btn').forEach((b) => b.classList.toggle('on', seq.playing));
}
function setRec(v) { S.rec = v ?? !S.rec; document.querySelectorAll('.rec-btn').forEach((b) => b.classList.toggle('on', S.rec)); }
function selectPattern(i) {
  i = (i + 16) % 16;
  if (seq.playing && !S.songMode) { S.queued = i; toast(`Pattern ${i + 1} en attente…`); }
  else S.cur = i;
  refreshPattern();
}
function setLooper(n) {
  S.looper = S.looper === n ? 0 : n; seq.setLooper(S.looper);
  document.querySelectorAll('[data-looper]').forEach((b) => b.classList.toggle('on', +b.dataset.looper === S.looper));
}
function setKeyMode(m) { S.keyMode = m; refreshDevice(); }
function setPots(m) { S.pots = m; refreshDevice(); }
function selectTrack(i) { S.sel = i; refreshDevice(); renderSeq(); }
function toggleMute(i) { S.mutes[i] = !S.mutes[i]; applyKitMix(); refreshDevice(); renderSeq(); }
function toggleStep(tr, st, accent) {
  const p = pat();
  if (tr < DRUM_TRACKS) { const v = p.drums[tr][st]; p.drums[tr][st] = accent ? (v === 2 ? 0 : 2) : (v ? 0 : 1); }
  else { const b = p.bass[st]; if (accent) { b.on = true; b.acc = !b.acc; } else { b.on = !b.on; if (b.on && !b.noteSet) b.note = S.lastBassNote; } }
  refreshSteps();
}
async function changeKit(dir) {
  let i = S.kitIdx + dir;
  if (i >= S.kits.length) { S.kits.push(randomKit()); i = S.kits.length - 1; toast('Nouveau kit généré (infini ♾)'); }
  if (i < 0) i = S.kits.length - 1;
  await loadKit(i);
}
async function loadKit(i) {
  S.kitIdx = i; S.kit = deepClone(S.kits[i]);
  await ensureSamples(S.kit); applyKitMix(); renderSeq(); renderKits(); refreshDevice(); toast(`Kit : ${S.kit.name}`);
}
function fxToggle(which) {
  const id = S[which]; const fx = engine.rack.list.find((f) => f.id === id);
  if (!fx) { toast(`Assigne un effet à ${which.toUpperCase()} dans l'onglet Effets`); return; }
  fx.setEnabled(!fx.enabled); renderFx(); refreshDevice(); toast(`${fx.def.name} ${fx.enabled ? 'ON' : 'OFF'}`);
}
function clearPress() { S.clearHeld = true; S.clearUsed = false; S.clearT = performance.now(); }
function clearRelease() {
  if (!S.clearHeld) return; S.clearHeld = false;
  if (S.clearUsed) return;
  const p = pat();
  if (performance.now() - S.clearT > 900) { S.patterns[S.cur] = emptyPattern(p.name); toast('Pattern effacé'); }
  else { clearTrack(S.sel); toast(`${TRACKS[S.sel]} effacé`); }
  refreshSteps(); renderRolls();
}
function clearTrack(i) { const p = pat(); if (i < DRUM_TRACKS) p.drums[i].fill(0); else p.bass.forEach((b) => (b.on = false)); refreshSteps(); }

// pots: knob i in current pots mode
const POT_LABEL = { level: 'LEVEL', tune: 'TUNING', tone: 'TONE', decay: 'DECAY' };
function potGet(i) {
  if (i < DRUM_TRACKS) return S.kit.tracks[i][S.pots];
  const b = S.bass; return { level: b.volume, tune: (b.filter.res - 0.1) / 25, tone: b.filter.cutoff, decay: clamp(b.filtEnv.d / 1.5, 0, 1) }[S.pots];
}
function potSet(i, v) {
  if (i < DRUM_TRACKS) {
    S.kit.tracks[i][S.pots] = v;
    if (S.pots === 'level') applyKitMix();
    controls.get(`trk.${i}.${S.pots}`)?.el.setValue(v, true);
  } else {
    const map = { level: ['volume', v], tune: ['filter.res', 0.1 + v * 25], tone: ['filter.cutoff', v], decay: ['filtEnv.d', 0.02 + v * 1.5] }[S.pots];
    setPatchParam('bass', map[0], map[1]);
    controls.get(`bass.${map[0]}`)?.el.setValue(map[1], true);
  }
}
function setPatchParam(part, path, v) {
  const synth = part === 'lead' ? engine.leadSynth : engine.bassSynth;
  synth.set(path, v); S[part] = synth.patch;
}

// ---------------------------------------------------------------- DOM shell
const app = document.getElementById('app');
const views = {};
const TABS = [['device', 'Contrôleur RM-808'], ['seq', 'Séquenceur'], ['lead', 'Synthé'], ['bass', 'Basse'], ['fx', 'Effets'], ['kits', 'Kits'], ['song', 'Chanson'], ['midi', 'MIDI'], ['project', 'Projet'], ['help', 'Aide']];
function showTab(t) {
  S.tab = t;
  for (const [k] of TABS) { views[k].hidden = k !== t; }
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  if (t === 'lead' || t === 'bass') drawWaves();
}

function buildShell() {
  const hdr = h('header', { class: 'hdr' },
    h('div', { class: 'logo' }, h('b', {}, 'RM-808'), h('span', {}, 'STUDIO')),
    button('▶/❚❚', togglePlay, { cls: 'play-btn big', learn: 'hdr.play', title: 'Lecture / pause (Espace)' }),
    button('● REC', () => setRec(), { cls: 'rec-btn big', learn: 'hdr.rec', title: 'Enregistrement live quantisé' }),
    knob({ label: 'Tempo', min: 30, max: 300, value: S.bpm, def: 120, step: 1, fmt: (v) => v.toFixed(0), onInput: (v) => setBpm(v, 'hdr.tempo'), learn: 'hdr.tempo', size: 'sm' }),
    knob({ label: 'Swing', min: 0, max: 0.75, value: S.swing, def: 0, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { S.swing = v; seq.swing = v; }, learn: 'hdr.swing', size: 'sm' }),
    knob({ label: 'Master', min: 0, max: 1.2, value: S.master, def: 0.8, onInput: (v) => { S.master = v; engine.master.gain.setTargetAtTime(v, engine.now, 0.02); }, learn: 'hdr.master', size: 'sm' }),
    h('div', { class: 'info', id: 'hdrInfo' }),
    h('canvas', { id: 'scope', width: 300, height: 60 }),
    h('div', { class: 'midi-pill', id: 'midiPill' }, 'MIDI…'),
  );
  const tabs = h('nav', { class: 'tabs' }, TABS.map(([k, l]) => h('button', { 'data-tab': k, onclick: () => showTab(k) }, l)));
  const main = h('main');
  for (const [k] of TABS) { views[k] = h('section', { class: `view view-${k}`, hidden: true }); main.append(views[k]); }
  app.append(hdr, tabs, main);
}
function refreshHeader() {
  const el = document.getElementById('hdrInfo'); if (!el) return;
  el.innerHTML = '';
  el.append(h('span', {}, `Pattern ${S.cur + 1}${S.queued != null ? ' → ' + (S.queued + 1) : ''}`), h('span', {}, S.songMode ? 'SONG' : 'PATTERN'), h('span', { class: 'kitname' }, S.kit.name));
}
function drawScope() {
  const c = document.getElementById('scope'); const g = c.getContext('2d'); const buf = new Float32Array(engine.analyser.fftSize);
  const loop = () => {
    engine.analyser.getFloatTimeDomainData(buf);
    g.clearRect(0, 0, c.width, c.height); g.strokeStyle = '#ff7a1a'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < c.width; i++) { const v = buf[Math.floor((i / c.width) * buf.length)]; const y = c.height / 2 - v * c.height * 0.45; i ? g.lineTo(i, y) : g.moveTo(i, y); }
    g.stroke(); requestAnimationFrame(loop);
  };
  loop();
}

// ---------------------------------------------------------------- virtual RM-808 (device view)
const STEP_COLORS = (i) => (i < 4 ? 'red' : i < 8 ? 'orange' : i < 12 ? 'yellow' : 'white');
let devEls = {};
function devBtn(label, id, onPress, onRelease, cls = '') {
  const el = h('button', { class: `dbtn ${cls}` }, label);
  let down = false;
  const press = (v = 1) => { down = true; el.classList.add('down'); onPress && onPress(v); };
  const rel = () => { if (!down) return; down = false; el.classList.remove('down'); onRelease && onRelease(); };
  el.addEventListener('pointerdown', (e) => { if (document.body.classList.contains('learning')) return; e.preventDefault(); el.setPointerCapture(e.pointerId); press(1); });
  el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  registerControl(id, el, { trigger: (v) => { press(v); if (!onRelease) setTimeout(() => el.classList.remove('down'), 120); }, release: rel, kind: 'button' });
  return el;
}

function stepKeyPress(k, v = 1) {
  const p = pat();
  if (S.keyMode === 'pattern') return selectPattern(k);
  if (S.keyMode === 'note') {
    const n = S.octave * 12 + 12 + k; engine.leadSynth.keyDown(n, v);
    if (S.rec && seq.playing) { const st = recStep(); if (!p.synth[st].includes(n)) p.synth[st].push(n); renderRolls(); }
    return;
  }
  if (S.keyMode === 'bass') {
    const n = S.bassOctave * 12 + 12 + k; S.lastBassNote = n; engine.bassSynth.keyDown(n, v);
    if (S.rec && seq.playing) { const st = recStep(); Object.assign(p.bass[st], { on: true, note: n, noteSet: true }); refreshSteps(); renderRolls(); }
    return;
  }
  if (S.clearHeld) { S.clearUsed = true; }
  toggleStep(S.sel, k, false);
  renderRolls();
}
function stepKeyRelease(k) {
  if (S.keyMode === 'note') engine.leadSynth.keyUp(S.octave * 12 + 12 + k);
  if (S.keyMode === 'bass') engine.bassSynth.keyUp(S.bassOctave * 12 + 12 + k);
}
function padTop(i, v) { if (S.clearHeld) { S.clearUsed = true; clearTrack(i); toast(`${TRACKS[i]} effacé`); return; } trigger(i, v); }
function padBot(i, v) {
  if (S.clearHeld) { S.clearUsed = true; clearTrack(i); return; }
  if (S.padBot === 'mute') toggleMute(i); else { selectTrack(i); trigger(i, v * 0.8); }
}

function renderDevice() {
  const v = views.device; v.innerHTML = ''; devEls = { pots: [], potLbl: [], top: [], bot: [], steps: [] };
  const knobs = h('div', { class: 'dev-knobs' },
    knob({ label: 'TEMPO', min: 30, max: 300, value: S.bpm, def: 120, step: 1, fmt: (x) => x.toFixed(0), onInput: (x) => setBpm(x, 'dev.tempo'), learn: 'dev.tempo' }),
    TRACKS.map((_, i) => { const k = knob({ label: '', min: 0, max: 1, value: potGet(i), def: 0.5, onInput: (x) => potSet(i, x), learn: `dev.pot.${i}` }); devEls.pots.push(k); return k; }));
  const pads = h('div', { class: 'dev-pads' },
    h('div', { class: 'padrow' }, TRACKS.map((_, i) => { const b = devBtn('', `dev.padTop.${i}`, (vv) => padTop(i, vv), null, 'pad'); devEls.top.push(b); return b; })),
    h('div', { class: 'padrow' }, TRACKS.map((_, i) => { const b = devBtn('', `dev.padBot.${i}`, (vv) => padBot(i, vv), null, 'pad'); devEls.bot.push(b); return b; })),
    h('div', { class: 'padrow labels' }, TRACKS.map((t) => h('span', {}, t.toUpperCase()))));
  const left = h('div', { class: 'dev-left' },
    devBtn('▶/❚❚', 'dev.play', togglePlay, null, 'wide play-btn'),
    devBtn('● REC', 'dev.rec', () => setRec(), null, 'wide rec-btn'),
    h('div', { class: 'spacer' }),
    devBtn('HOLD TO CLEAR', 'dev.clear', clearPress, clearRelease, 'small'),
    h('div', { class: 'row2' }, devBtn('STEP', 'dev.modeStep', () => setKeyMode('step'), null, 'small mode-step'), devBtn('KEY BASS', 'dev.modeBass', () => setKeyMode('bass'), null, 'small mode-bass')));
  const ctrl = h('div', { class: 'dev-ctrl' },
    h('div', { class: 'grp' }, h('label', {}, 'DRUM KIT'), devBtn('<', 'dev.kitPrev', () => changeKit(-1)), devBtn('>', 'dev.kitNext', () => changeKit(1))),
    h('div', { class: 'grp' }, h('label', {}, 'PATTERN'), devBtn('<', 'dev.patPrev', () => selectPattern(S.cur - 1)), devBtn('>', 'dev.patNext', () => selectPattern(S.cur + 1))),
    h('div', { class: 'grp' }, devBtn('PATTERN / SONG', 'dev.patsong', () => { S.songMode = !S.songMode; refreshDevice(); renderSong(); }, null, 'small'), devBtn('MENU', 'dev.menu', () => { const i = TABS.findIndex(([k]) => k === S.tab); showTab(TABS[(i + 1) % TABS.length][0]); })),
    h('div', { class: 'grp pots' }, h('label', {}, 'POTS MODE'),
      ...[['level', 'STEP', 'dev.potsLevel'], ['tune', 'BASS', 'dev.potsTune'], ['tone', 'MIXER', 'dev.potsTone'], ['decay', 'FX', 'dev.potsDecay']].map(([m, l, id]) =>
        h('div', { class: 'potbtn' }, h('small', {}, POT_LABEL[m]), devBtn(l, id, () => setPots(m), null, `pots-${m}`)))));
  const steps = h('div', { class: 'dev-steps' }, Array.from({ length: 16 }, (_, k) => {
    const b = devBtn(String(k + 1), `dev.step.${k}`, (vv) => stepKeyPress(k, vv), () => stepKeyRelease(k), `step ${STEP_COLORS(k)}`);
    b.dataset.step = k; b.addEventListener('contextmenu', () => { if (S.keyMode === 'step') { toggleStep(S.sel, k, true); } });
    devEls.steps.push(b); return b;
  }));
  const right = h('div', { class: 'dev-right' },
    h('label', {}, 'EFFECTS'), h('div', { class: 'row2' }, devBtn('FX1', 'dev.fx1', () => fxToggle('fx1'), null, 'fx1'), devBtn('FX2', 'dev.fx2', () => fxToggle('fx2'), null, 'fx2')),
    h('div', { class: 'row2' }, devBtn('STEP', 'dev.modeStep2', () => setKeyMode(S.keyMode === 'pattern' ? 'step' : S.keyMode === 'step' ? 'pattern' : 'step'), null, 'mode-step2'), devBtn('NOTE', 'dev.modeNote', () => setKeyMode('note'), null, 'mode-note')),
    h('label', {}, 'LOOPER'),
    [1, 2, 4, 8].map((n) => { let t0; const b = devBtn(String(n), `dev.loop.${n}`, () => { t0 = performance.now(); setLooper(n); }, () => { if (performance.now() - t0 > 350 && S.looper === n) setLooper(n); }, 'loop'); b.dataset.looper = n; return b; }));
  const status = h('div', { class: 'dev-status', id: 'devStatus' });
  const opts = h('div', { class: 'dev-opts' },
    h('label', {}, 'Rangée basse des pads : ', select([['select', 'Sélectionner la piste'], ['mute', 'Mute / unmute']], S.padBot, (x) => { S.padBot = x; db.ls.set('padBot', x); })),
    h('label', {}, 'Octave NOTE : ', select([1, 2, 3, 4, 5, 6].map((o) => [String(o), 'C' + o]), String(S.octave), (x) => (S.octave = +x))),
    h('label', {}, 'Octave KEY BASS : ', select([0, 1, 2, 3, 4].map((o) => [String(o), 'C' + o]), String(S.bassOctave), (x) => (S.bassOctave = +x))),
    button('🔵 Connecter le RM-808 (Bluetooth)', connectBle, { cls: 'accent' }),
    button('🧭 Assistant de mapping RM-808', () => startWizard(), { cls: 'accent' }),
    h('span', { class: 'hint' }, 'Astuce : clic droit (ou appui long) sur une touche de pas = accent. Tout bouton ou potard de l\'appli peut être assigné à ton RM-808 via l\'onglet MIDI.'));
  v.append(h('div', { class: 'device' },
    h('div', { class: 'dev-title' }, h('b', {}, 'RM-808'), h('span', {}, 'RHYTHM MAKER — contrôleur virtuel')),
    knobs, h('div', { class: 'dev-mid' }, left, h('div', { class: 'dev-center' }, pads, ctrl, steps), right), status), opts);
  refreshDevice();
}
function refreshDevice() {
  if (!devEls.pots) return;
  devEls.pots.forEach((k, i) => { k.setValue(potGet(i), true); k.querySelector('.knob-label')?.remove(); k.dataset.label = POT_LABEL[S.pots]; k.classList.toggle('muted', !audible(i)); });
  devEls.bot.forEach((b, i) => { b.classList.toggle('sel', i === S.sel); b.classList.toggle('muted', !audible(i)); });
  document.querySelectorAll('.dbtn[class*="pots-"]').forEach((b) => b.classList.toggle('on', b.classList.contains('pots-' + S.pots)));
  for (const [m, c] of [['step', 'mode-step'], ['bass', 'mode-bass'], ['note', 'mode-note'], ['pattern', 'mode-step2']]) document.querySelectorAll('.' + c).forEach((b) => b.classList.toggle('on', S.keyMode === m));
  document.querySelectorAll('.mode-step2').forEach((b) => { b.classList.toggle('on', S.keyMode === 'pattern' || S.keyMode === 'step'); b.textContent = S.keyMode === 'pattern' ? 'PATTERN' : 'STEP'; });
  const f1 = engine.rack.list.find((f) => f.id === S.fx1), f2 = engine.rack.list.find((f) => f.id === S.fx2);
  document.querySelectorAll('.dbtn.fx1').forEach((b) => b.classList.toggle('on', !!f1?.enabled));
  document.querySelectorAll('.dbtn.fx2').forEach((b) => b.classList.toggle('on', !!f2?.enabled));
  const st = document.getElementById('devStatus');
  if (st) st.textContent = `Piste : ${TRACKS[S.sel]} · Mode touches : ${{ step: 'STEP (programmation)', pattern: 'PATTERN (choix 1-16)', note: 'NOTE (synthé)', bass: 'KEY BASS' }[S.keyMode]} · Potards : ${POT_LABEL[S.pots]} · Kit : ${S.kit.name} · Pattern ${S.cur + 1}${S.songMode ? ' · SONG' : ''}`;
  refreshSteps(); refreshHeader();
}
function refreshSteps() {
  const p = pat();
  devEls.steps?.forEach((b, k) => {
    let on = false, acc = false;
    if (S.keyMode === 'pattern') on = k === S.cur || k === S.queued;
    else if (S.keyMode === 'step') { if (S.sel < DRUM_TRACKS) { on = !!p.drums[S.sel][k]; acc = p.drums[S.sel][k] === 2; } else { on = p.bass[k].on; acc = p.bass[k].acc; } }
    b.classList.toggle('lit', on); b.classList.toggle('acc', acc); b.classList.toggle('dim', k >= p.length);
  });
  document.querySelectorAll('.grid .cell').forEach((c) => {
    const tr = +c.dataset.tr, st = +c.dataset.step;
    const val = tr < DRUM_TRACKS ? p.drums[tr][st] : (p.bass[st].on ? (p.bass[st].acc ? 2 : 1) : 0);
    c.classList.toggle('on', !!val); c.classList.toggle('acc', val === 2); c.classList.toggle('dim', st >= p.length);
  });
}
function flashPad(i) { const b = devEls.top?.[i]; if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 90); } const r = document.querySelector(`.trk-row[data-tr="${i}"] .trk-name`); if (r) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 90); } }
let lastPh = [];
function onUiStep(s) {
  lastPh.forEach((e) => e.classList.remove('ph'));
  lastPh = s < 0 ? [] : [...document.querySelectorAll(`[data-step="${s}"]`)];
  lastPh.forEach((e) => e.classList.add('ph'));
}
function refreshPattern() { refreshDevice(); renderSeq(); renderRolls(); }

// ---------------------------------------------------------------- sequencer view
function renderSeq() {
  const v = views.seq; if (!v) return; v.innerHTML = '';
  const p = pat();
  const top = h('div', { class: 'bar' },
    h('div', { class: 'patsel' }, Array.from({ length: 16 }, (_, i) => h('button', { class: `btn mini ${i === S.cur ? 'on' : ''} ${i === S.queued ? 'queued' : ''}`, onclick: () => selectPattern(i) }, i + 1))),
    h('label', {}, 'Longueur ', select(Array.from({ length: 16 }, (_, i) => [String(i + 1), String(i + 1)]), String(p.length), (x) => { p.length = +x; refreshSteps(); })),
    button('Copier', () => { S.clip = deepClone(p); toast('Pattern copié'); }),
    button('Coller', () => { if (S.clip) { S.patterns[S.cur] = deepClone(S.clip); refreshPattern(); } }),
    button('Effacer', () => { S.patterns[S.cur] = emptyPattern(p.name); refreshPattern(); }),
    button('🎲 Générer un groove', () => { randomGroove(); refreshPattern(); }, { cls: 'accent' }),
    button('🎲 Kit', () => changeKit(S.kits.length - S.kitIdx)),
  );
  const grid = h('div', { class: 'grid' });
  TRACKS.forEach((name, i) => {
    const isBass = i === DRUM_TRACKS, tr = S.kit.tracks[i];
    const row = h('div', { class: `trk-row ${i === S.sel ? 'sel' : ''}`, 'data-tr': i });
    const nameEl = h('div', { class: 'trk-name', onclick: () => { selectTrack(i); trigger(i); } }, h('b', {}, name), h('small', {}, isBass ? noteName(S.lastBassNote) : (tr.sampleName ? '📁 ' + tr.sampleName : VOICES[tr.voice]?.[0])));
    const ms = h('div', { class: 'ms' },
      h('button', { class: `btn mini ${S.mutes[i] ? 'on warn' : ''}`, onclick: () => toggleMute(i) }, 'M'),
      h('button', { class: `btn mini ${S.solos[i] ? 'on' : ''}`, onclick: () => { S.solos[i] = !S.solos[i]; applyKitMix(); renderSeq(); refreshDevice(); } }, 'S'));
    const cells = h('div', { class: 'cells' }, Array.from({ length: 16 }, (_, s) => {
      const c = h('div', { class: `cell c${STEP_COLORS(s)}`, 'data-tr': i, 'data-step': s });
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleStep(i, s, e.shiftKey || e.button === 2); renderRolls(); });
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      return c;
    }));
    row.append(nameEl, ms, cells);
    if (!isBass) {
      row.append(h('div', { class: 'trk-ctl' },
        select(Object.entries(VOICES).map(([k, [l]]) => [k, l]), tr.voice, (x) => { tr.voice = x; tr.sampleId = null; tr.sampleName = null; trigger(i); renderSeq(); }),
        ...['level', 'tune', 'tone', 'decay'].map((k) => knob({ label: { level: 'Niv', tune: 'Accord', tone: 'Timbre', decay: 'Décl' }[k], value: tr[k], def: 0.5, onInput: (x) => { tr[k] = x; if (k === 'level') applyKitMix(); if (S.pots === k) devEls.pots?.[i]?.setValue(x, true); }, learn: `trk.${i}.${k}`, size: 'xs' })),
        knob({ label: 'Pan', min: -1, max: 1, value: tr.pan, def: 0, onInput: (x) => { tr.pan = x; applyKitMix(); }, learn: `trk.${i}.pan`, size: 'xs' }),
        knob({ label: 'Drive', value: tr.drive, def: 0, onInput: (x) => (tr.drive = x), learn: `trk.${i}.drive`, size: 'xs' }),
        button('📁', async () => { const [f] = await pickFile('audio/*'); if (f) loadSampleToTrack(i, f); }, { title: 'Charger un sample' }),
      ));
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop'));
      row.addEventListener('drop', (e) => { e.preventDefault(); row.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) loadSampleToTrack(i, f); });
    } else {
      row.append(h('div', { class: 'trk-ctl' }, h('span', { class: 'hint' }, 'Notes, accents et slides : onglet Basse')));
    }
    grid.append(row);
  });
  v.append(top, grid, h('p', { class: 'hint' }, 'Clic = pas · Maj+clic / clic droit = accent · Glisse un fichier audio sur une piste pour y charger ton sample (WAV, MP3, OGG…).'));
  refreshSteps();
}

function randomGroove() {
  const p = pat(); const r = Math.random;
  p.drums.forEach((d) => d.fill(0));
  [0, 4, 8, 12].forEach((s) => (p.drums[0][s] = 1)); if (r() < 0.5) p.drums[0][14] = 1; if (r() < 0.4) p.drums[0][7] = 1;
  [4, 12].forEach((s) => (p.drums[r() < 0.5 ? 1 : 6][s] = 2));
  for (let s = 0; s < 16; s++) { if (s % 2 === 0 || r() < 0.3) p.drums[10][s] = r() < 0.25 ? 2 : 1; if (s % 4 === 2 && r() < 0.6) { p.drums[9][s] = 1; p.drums[10][s] = 0; } if (r() < 0.08) p.drums[2 + Math.floor(r() * 3)][s] = 1; if (r() < 0.08) p.drums[5][s] = 1; if (r() < 0.05) p.drums[7][s] = 1; }
  const root = 24 + Math.floor(r() * 12);
  p.bass.forEach((b, s) => { const on = s % 4 === 2 || r() < 0.35; Object.assign(b, { on, note: root + pick(SCALE) + (r() < 0.2 ? 12 : 0), acc: r() < 0.25, slide: r() < 0.15, noteSet: true }); });
  const lroot = root + 36;
  p.synth = p.synth.map((_, s) => (s % 2 === 0 && r() < 0.5 ? [lroot + pick(SCALE) + (r() < 0.3 ? 12 : 0)] : []));
  if (r() < 0.3) p.synth[0] = [lroot, lroot + 3, lroot + 7];
}

// ---------------------------------------------------------------- piano rolls
function renderRolls() { ['lead', 'bass'].forEach((part) => { const host = document.getElementById('roll-' + part); if (host) drawRoll(host, part); }); }
const rollBase = { lead: 60, bass: 24 };
function drawRoll(host, part) {
  host.innerHTML = '';
  const p = pat(), base = rollBase[part], rows = 25;
  const tools = h('div', { class: 'bar' },
    h('b', {}, part === 'lead' ? 'Séquence du synthé (polyphonique)' : 'Ligne de basse (mono, accents & slides)'),
    button('Oct −', () => { rollBase[part] = Math.max(0, base - 12); drawRoll(host, part); }), button('Oct +', () => { rollBase[part] = Math.min(108, base + 12); drawRoll(host, part); }),
    part === 'lead' ? h('label', {}, 'Durée notes ', select([['0.25', '¼ pas'], ['0.5', '½ pas'], ['1', '1 pas'], ['2', '2 pas'], ['4', '4 pas'], ['8', '8 pas'], ['16', '16 pas']], String(p.synthGate), (x) => (p.synthGate = +x))) : null,
    button('Effacer', () => { if (part === 'lead') p.synth = p.synth.map(() => []); else p.bass.forEach((b) => (b.on = false)); renderRolls(); refreshSteps(); }));
  const g = h('div', { class: 'roll' });
  for (let r = rows - 1; r >= 0; r--) {
    const n = base + r, black = [1, 3, 6, 8, 10].includes(n % 12);
    const row = h('div', { class: `rrow ${black ? 'black' : ''}` }, h('div', { class: 'rkey', onpointerdown: () => (part === 'lead' ? engine.leadSynth : engine.bassSynth).play(n, 0.8, engine.now, 0.25) }, noteName(n)));
    for (let s = 0; s < 16; s++) {
      const on = part === 'lead' ? p.synth[s].includes(n) : p.bass[s].on && p.bass[s].note === n;
      const c = h('div', { class: `rcell ${on ? 'on' : ''} ${s % 4 === 0 ? 'beat' : ''}`, 'data-step': s });
      c.addEventListener('pointerdown', () => {
        if (part === 'lead') { const a = p.synth[s]; const i = a.indexOf(n); if (i >= 0) a.splice(i, 1); else { a.push(n); engine.leadSynth.play(n, 0.8, engine.now, 0.2); } }
        else { const b = p.bass[s]; if (b.on && b.note === n) b.on = false; else { Object.assign(b, { on: true, note: n, noteSet: true }); S.lastBassNote = n; engine.bassSynth.play(n, 0.8, engine.now, 0.2); } refreshSteps(); }
        drawRoll(host, part);
      });
      row.append(c);
    }
    g.append(row);
  }
  if (part === 'bass') for (const [k, l] of [['acc', 'Accent'], ['slide', 'Slide']]) {
    const row = h('div', { class: 'rrow flag' }, h('div', { class: 'rkey' }, l));
    for (let s = 0; s < 16; s++) row.append(h('div', { class: `rcell ${p.bass[s][k] ? 'on' : ''}`, 'data-step': s, onpointerdown: () => { p.bass[s][k] = !p.bass[s][k]; drawRoll(host, part); refreshSteps(); } }));
    g.append(row);
  }
  host.append(tools, g);
}

// ---------------------------------------------------------------- synth editor (lead & bass)
const getPath = (o, path) => path.split('.').reduce((a, k) => a[k], o);
const K = (label, min, max, extra = {}) => ({ label, min, max, ...extra });
const SPEC = {
  pos: K('Position WT', 0, 1), oct: K('Octave', -3, 3, { step: 1, fmt: (v) => v.toFixed(0) }), semi: K('Demi-ton', -12, 12, { step: 1, fmt: (v) => v.toFixed(0) }),
  fine: K('Fin (ct)', -100, 100, { step: 1, fmt: (v) => v.toFixed(0) }), level: K('Niveau', 0, 1), unison: K('Unisson', 1, 9, { step: 1, fmt: (v) => v.toFixed(0) }),
  detune: K('Désaccord', 0, 1), spread: K('Stéréo', 0, 1),
  'sub.level': K('Sub', 0, 1), 'sub.oct': K('Oct sub', -2, -1, { step: 1, fmt: (v) => v.toFixed(0) }), 'noise.level': K('Bruit', 0, 1), fm: K('FM B→A', 0, 2),
  'filter.cutoff': K('Cutoff', 0, 1), 'filter.res': K('Réso', 0.1, 25), 'filter.drive': K('Drive', 0, 1), 'filter.envAmt': K('Env → filtre', -1, 1), 'filter.keytrack': K('Keytrack', 0, 1),
  a: K('Attack', 0.001, 5, { curve: 'exp', fmt: (v) => (v < 1 ? (v * 1000).toFixed(0) + 'ms' : v.toFixed(2) + 's') }), d: K('Decay', 0.01, 5, { curve: 'exp', fmt: (v) => (v < 1 ? (v * 1000).toFixed(0) + 'ms' : v.toFixed(2) + 's') }),
  s: K('Sustain', 0, 1), r: K('Release', 0.01, 8, { curve: 'exp', fmt: (v) => (v < 1 ? (v * 1000).toFixed(0) + 'ms' : v.toFixed(2) + 's') }),
  rate: K('Vitesse', 0.02, 20, { curve: 'exp', fmt: (v) => v.toFixed(2) + 'Hz' }), depth: K('Profondeur', 0, 1),
  glide: K('Glide', 0, 1), volume: K('Volume', 0, 1.2), pan: K('Pan', -1, 1), velSens: K('Vélocité', 0, 1),
};
const userPresets = () => db.ls.get('userPresets', []);
const synthOf = (part) => (part === 'lead' ? engine.leadSynth : engine.bassSynth);
let waveCanvases = [];

function renderSynth(part) {
  const v = views[part]; v.innerHTML = '';
  const synth = synthOf(part); const P = synth.patch;
  const kn = (path, specKey) => {
    const sp = SPEC[specKey || path] || SPEC[path.split('.').pop()];
    return knob({ ...sp, value: getPath(P, path), def: getPath(DEFAULT_PATCH, path), onInput: (x) => { setPatchParam(part, path, x); if (path.endsWith('.pos') || path.endsWith('.table')) drawWaves(); }, learn: `${part}.${path}`, size: 'sm' });
  };
  const sel = (path, opts, after) => select(opts, getPath(P, path), (x) => { setPatchParam(part, path, x); after && after(); });
  const tog = (path, label) => toggle(label, !!getPath(P, path), (x) => setPatchParam(part, path, x), { learn: `${part}.${path}` });
  const all = [...PRESETS.map((p, i) => ['b' + i, p.name]), ...userPresets().map((p, i) => ['u' + i, '★ ' + p.name])];
  const presetBar = h('div', { class: 'bar' },
    h('b', {}, part === 'lead' ? 'SYNTHÉ' : 'SYNTHÉ BASSE'), h('span', { class: 'patchname' }, P.name),
    select([['', '— Presets instruments —'], ...all], '', (x) => {
      if (!x) return; const src = x[0] === 'b' ? PRESETS[+x.slice(1)] : userPresets()[+x.slice(1)];
      synth.setPatch(src); S[part] = synth.patch; renderSynth(part); toast(`Preset : ${src.name}`);
    }),
    button('◀', () => stepPreset(part, -1), { learn: `${part}.presetPrev` }), button('▶', () => stepPreset(part, 1), { learn: `${part}.presetNext` }),
    button('🎲 Aléatoire', () => { synth.setPatch(randomPatch(part)); S[part] = synth.patch; renderSynth(part); }, { cls: 'accent' }),
    button('💾 Sauver preset', () => { const name = prompt('Nom du preset ?', P.name); if (!name) return; const list = userPresets(); list.push({ ...deepClone(P), name }); db.ls.set('userPresets', list); renderSynth('lead'); renderSynth('bass'); toast('Preset sauvegardé'); }),
    button('Init', () => { synth.setPatch(DEFAULT_PATCH); S[part] = synth.patch; renderSynth(part); }));
  const osc = (w, title) => {
    const cv = h('canvas', { class: 'wave', width: 260, height: 110, 'data-part': part, 'data-osc': w });
    return h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, title, tog(`${w}.on`, 'ON')),
      sel(`${w}.table`, tableOptions(), drawWaves), cv,
      h('div', { class: 'knobs' }, kn(`${w}.pos`), kn(`${w}.level`), kn(`${w}.oct`), kn(`${w}.semi`), kn(`${w}.fine`), kn(`${w}.unison`), kn(`${w}.detune`), kn(`${w}.spread`)));
  };
  const env = (e, title) => h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, title), h('div', { class: 'knobs' }, ['a', 'd', 's', 'r'].map((k) => kn(`${e}.${k}`, k))));
  const lfo = (l, title) => h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, title),
    h('div', { class: 'row' }, sel(`${l}.wave`, [['sine', 'Sinus'], ['triangle', 'Triangle'], ['square', 'Carré'], ['sawtooth', 'Dent de scie']]), sel(`${l}.dest`, LFO_DESTS)),
    h('div', { class: 'knobs' }, kn(`${l}.rate`, 'rate'), kn(`${l}.depth`, 'depth')));
  v.append(presetBar,
    h('div', { class: 'synth' },
      osc('oscA', 'OSC A'), osc('oscB', 'OSC B'),
      h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'SUB · BRUIT · FM'), h('div', { class: 'row' }, sel('sub.wave', [['sine', 'Sub sinus'], ['square', 'Sub carré'], ['triangle', 'Sub triangle']])), h('div', { class: 'knobs' }, kn('sub.level'), kn('sub.oct'), kn('noise.level'), kn('fm'))),
      h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'FILTRE'), sel('filter.type', [['lowpass', 'Passe-bas'], ['highpass', 'Passe-haut'], ['bandpass', 'Passe-bande'], ['notch', 'Coupe-bande'], ['peaking', 'Peak']]),
        h('div', { class: 'knobs' }, kn('filter.cutoff'), kn('filter.res'), kn('filter.drive'), kn('filter.envAmt'), kn('filter.keytrack'))),
      env('ampEnv', 'ENVELOPPE AMPLI'), env('filtEnv', 'ENVELOPPE FILTRE'),
      lfo('lfo1', 'LFO 1'), lfo('lfo2', 'LFO 2'),
      h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'LFO WAVETABLE (morphing)'), h('div', { class: 'knobs' }, kn('wtLfo.rate', 'rate'), kn('wtLfo.depth', 'depth'))),
      h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'VOIX', tog('mono', 'MONO / LEGATO')), h('div', { class: 'knobs' }, kn('glide'), kn('volume'), kn('pan'), kn('velSens'))),
      part === 'lead' ? drawPanel() : null),
    keyboard(part),
    h('div', { id: 'roll-' + part, class: 'rollhost' }));
  drawRoll(document.getElementById('roll-' + part) || v.querySelector('#roll-' + part), part);
  drawWaves();
}
function stepPreset(part, dir) {
  const synth = synthOf(part); const i = PRESETS.findIndex((p) => p.name === synth.patch.name);
  const n = PRESETS[(i + dir + PRESETS.length) % PRESETS.length]; synth.setPatch(n); S[part] = synth.patch; renderSynth(part); toast(`Preset : ${n.name}`);
}
function randomPatch(part) {
  const tables = Object.keys(TABLES); const bass = part === 'bass';
  return {
    name: 'Aléatoire ' + Math.floor(rand(100, 999)),
    oscA: { on: true, table: pick(tables), pos: Math.random(), oct: bass ? -1 : 0, unison: pick([1, 1, 3, 5, 7]), detune: rand(0, 0.5), level: 0.7 },
    oscB: { on: Math.random() < 0.6, table: pick(tables), pos: Math.random(), oct: pick([-1, 0, 1]), semi: pick([0, 0, 7, 12, 5]), unison: pick([1, 2, 3]), level: rand(0.2, 0.6) },
    fm: Math.random() < 0.3 ? rand(0, 0.8) : 0, sub: { level: bass ? rand(0, 0.6) : 0, oct: -1 },
    filter: { type: pick(['lowpass', 'lowpass', 'bandpass', 'highpass']), cutoff: rand(0.2, 0.9), res: rand(0.5, 12), drive: rand(0, 0.5), envAmt: rand(-0.2, 0.7), keytrack: 0.3 },
    ampEnv: { a: pick([0.002, 0.01, 0.1, 0.6]), d: rand(0.1, 1.5), s: rand(0, 1), r: rand(0.05, 1.5) },
    filtEnv: { a: pick([0.002, 0.05, 0.4]), d: rand(0.05, 1), s: rand(0, 0.6), r: rand(0.05, 1) },
    lfo1: { rate: rand(0.1, 8), depth: Math.random() < 0.4 ? rand(0, 0.5) : 0, dest: pick(['cutoff', 'pitch', 'amp', 'pan', 'fm']), wave: pick(['sine', 'triangle', 'square', 'sawtooth']) },
    wtLfo: { rate: rand(0.05, 3), depth: Math.random() < 0.5 ? rand(0, 1) : 0 }, mono: bass, glide: rand(0, 0.15),
  };
}
function drawWaves() {
  document.querySelectorAll('canvas.wave').forEach((cv) => {
    const P = synthOf(cv.dataset.part).patch[cv.dataset.osc]; const g = cv.getContext('2d'); const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const t = TABLES[P.table] || TABLES.basic; const nf = Math.min(t.frames.length, 24);
    for (let f = nf - 1; f >= 0; f--) {
      const fr = framesAt(P.table, nf === 1 ? 0 : f / (nf - 1)); const ox = f * 3, oy = -f * 2.2 + 20;
      g.strokeStyle = `rgba(255,122,26,${0.12 + 0.2 * (1 - f / nf)})`; g.beginPath();
      for (let i = 0; i < WT_N; i += 2) { const x = ox + (i / WT_N) * (W - 80), y = H / 2 + oy - fr[i] * 26; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    const cur = framesAt(P.table, P.pos); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath();
    const f = P.pos * (nf - 1);
    for (let i = 0; i < WT_N; i++) { const x = f * 3 + (i / WT_N) * (W - 80), y = H / 2 - f * 2.2 + 20 - cur[i] * 26; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.lineWidth = 1;
  });
}
function drawPanel() {
  const cv = h('canvas', { class: 'draw', width: 512, height: 160 });
  let frame = Float32Array.from(TABLES.custom.frames[0]); let frames = TABLES.custom.frames.map((f) => Float32Array.from(f));
  const paint = () => { const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = '#333'; g.beginPath(); g.moveTo(0, 80); g.lineTo(512, 80); g.stroke(); g.strokeStyle = '#3fd0ff'; g.lineWidth = 2; g.beginPath(); frame.forEach((v, i) => { const x = (i / WT_N) * cv.width, y = 80 - v * 70; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  let last = null;
  const drawAt = (e) => {
    const r = cv.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * WT_N), y = clamp(-((e.clientY - r.top) / r.height - 0.5) * 2 * (160 / 140), -1, 1);
    const from = last ?? x; for (let i = Math.min(from, x); i <= Math.max(from, x); i++) if (i >= 0 && i < WT_N) frame[i] = y; last = x; paint();
  };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); last = null; drawAt(e); });
  cv.addEventListener('pointermove', (e) => { if (e.buttons) drawAt(e); });
  cv.addEventListener('pointerup', () => (last = null));
  const apply = () => { setCustomFrames(frames); synthOf('lead').set('oscA.table', synthOf('lead').patch.oscA.table); drawWaves(); };
  const shapes = { Sinus: (p) => Math.sin(p * 2 * Math.PI), Saw: (p) => 2 * p - 1, Carré: (p) => (p < 0.5 ? 1 : -1), Triangle: (p) => 1 - 4 * Math.abs(p - 0.5), Bruit: () => Math.random() * 2 - 1 };
  setTimeout(paint);
  return h('div', { class: 'panel wide' }, h('div', { class: 'ptitle' }, '✏️ ÉDITEUR DE WAVETABLE (table « Dessin perso »)'), cv,
    h('div', { class: 'row' },
      ...Object.entries(shapes).map(([n, fn]) => button(n, () => { frame = Float32Array.from({ length: WT_N }, (_, i) => fn(i / WT_N)); paint(); })),
      button('Lisser', () => { const f = frame.slice(); for (let i = 0; i < WT_N; i++) frame[i] = (f[(i + WT_N - 1) % WT_N] + f[i] * 2 + f[(i + 1) % WT_N]) / 4; paint(); }),
      button('Remplacer la table', () => { frames = [frame.slice()]; apply(); toast('Wavetable appliquée'); }, { cls: 'accent' }),
      button('+ Ajouter frame (morph)', () => { frames.push(frame.slice()); apply(); toast(`${frames.length} frames — tourne « Position WT »`); }),
      button('⇪ Importer WAV wavetable', async () => {
        const [f] = await pickFile('audio/*'); if (!f) return;
        try { const buf = await engine.ctx.decodeAudioData(await f.arrayBuffer()); const id = importWavetable(f.name.replace(/\.\w+$/, ''), buf); setPatchParam('lead', 'oscA.table', id); renderSynth('lead'); renderSynth('bass'); toast('Wavetable importée (frames de 2048 échantillons, format Serum)'); } catch (e) { toast('Import impossible'); }
      })),
    h('p', { class: 'hint' }, 'Dessine à la souris / au doigt, puis applique. Choisis « Dessin perso » comme table dans OSC A ou B. Les WAV de wavetables Serum/Vital (2048 échantillons par frame) sont acceptés.'));
}

// on-screen keyboard + computer keyboard
const KEYMAP = 'awsedftgyhujkolp;';
function keyboard(part) {
  const wrap = h('div', { class: 'kbd' });
  const oct = () => (part === 'lead' ? S.octave : S.bassOctave);
  const draw = () => {
    wrap.innerHTML = '';
    wrap.append(h('div', { class: 'bar' }, h('b', {}, 'Clavier'), button('Oct −', () => { if (part === 'lead') S.octave = Math.max(0, S.octave - 1); else S.bassOctave = Math.max(0, S.bassOctave - 1); draw(); }), h('span', {}, 'C' + oct()), button('Oct +', () => { if (part === 'lead') S.octave = Math.min(7, S.octave + 1); else S.bassOctave = Math.min(7, S.bassOctave + 1); draw(); }), h('span', { class: 'hint' }, 'Clavier ordi : A W S E D F T G Y H U J K · Z/X = octave')));
    const keys = h('div', { class: 'keys' });
    for (let i = 0; i < 25; i++) {
      const n = (oct() + 1) * 12 + i, black = [1, 3, 6, 8, 10].includes(i % 12);
      const k = h('div', { class: `key ${black ? 'black' : 'white'}`, 'data-note': n }, i % 12 === 0 ? noteName(n) : '');
      k.addEventListener('pointerdown', (e) => { k.setPointerCapture(e.pointerId); k.classList.add('down'); synthOf(part).keyDown(n, 0.85); if (part === 'bass') S.lastBassNote = n; });
      const up = () => { k.classList.remove('down'); synthOf(part).keyUp(n); };
      k.addEventListener('pointerup', up); k.addEventListener('pointercancel', up);
      keys.append(k);
    }
    wrap.append(keys);
  };
  draw();
  return wrap;
}
const heldKeys = new Map();
function onKey(e, down) {
  if (e.target.matches('input, textarea, select')) return;
  // Keyboard-type controllers (Bluetooth HID): every key is learnable / mappable like a MIDI control.
  if (!e.repeat && e.code && e.code !== 'Escape') {
    const key = `key:${e.code}`;
    if (S.tab === 'midi' || midi.learnTarget || midi.map[key]) {
      const m = { type: down ? 'noteon' : 'noteoff', ch: 0, num: e.keyCode, val: down ? 127 : 0, key, input: 'Clavier / HID « ' + e.key + ' »' };
      if (midi.learnTarget && !down) return;
      if (midi.learnTarget || midi.map[key]) { e.preventDefault(); midi.dispatch(m); return; }
      if (down) logLine(`${m.input} · ${e.code}`);
    }
  }
  if (down && e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
  if (e.repeat) return;
  const part = S.tab === 'bass' ? 'bass' : 'lead';
  const k = e.key.toLowerCase();
  if (down && (k === 'z' || k === 'x')) { if (part === 'lead') S.octave = clamp(S.octave + (k === 'x' ? 1 : -1), 0, 7); else S.bassOctave = clamp(S.bassOctave + (k === 'x' ? 1 : -1), 0, 7); toast('Octave ' + (part === 'lead' ? S.octave : S.bassOctave)); return; }
  const i = KEYMAP.indexOf(k); if (i < 0) return;
  if (down) { const n = ((part === 'lead' ? S.octave : S.bassOctave) + 1) * 12 + i; heldKeys.set(k, [part, n]); synthOf(part).keyDown(n, 0.85); if (part === 'bass') S.lastBassNote = n; document.querySelectorAll(`.key[data-note="${n}"]`).forEach((x) => x.classList.add('down')); }
  else { const hk = heldKeys.get(k); if (!hk) return; heldKeys.delete(k); synthOf(hk[0]).keyUp(hk[1]); document.querySelectorAll(`.key[data-note="${hk[1]}"]`).forEach((x) => x.classList.remove('down')); }
}

// ---------------------------------------------------------------- FX rack view
function renderFx() {
  const v = views.fx; if (!v) return; v.innerHTML = '';
  let addType = 'reverb';
  v.append(h('div', { class: 'bar' }, h('b', {}, 'RACK D\'EFFETS (master) — chaîne illimitée'),
    select(Object.entries(FX_TYPES).map(([k, d]) => [k, d.name]), addType, (x) => (addType = x)),
    button('+ Ajouter', () => { engine.rack.add(addType); renderFx(); }, { cls: 'accent' }),
    h('span', { class: 'hint' }, 'FX1 / FX2 du RM-808 activent/désactivent l\'effet que tu leur assignes.')));
  const list = h('div', { class: 'fxlist' });
  engine.rack.list.forEach((fx, idx) => {
    const card = h('div', { class: `panel fx ${fx.enabled ? '' : 'off'}` },
      h('div', { class: 'ptitle' }, `${idx + 1}. ${fx.def.name}`,
        h('div', { class: 'row' },
          toggle('ON', fx.enabled, (x) => { fx.setEnabled(x); card.classList.toggle('off', !x); refreshDevice(); }, { learn: `fx.${fx.id}.on` }),
          h('button', { class: `btn mini ${S.fx1 === fx.id ? 'on' : ''}`, onclick: () => { S.fx1 = S.fx1 === fx.id ? null : fx.id; renderFx(); refreshDevice(); } }, 'FX1'),
          h('button', { class: `btn mini ${S.fx2 === fx.id ? 'on' : ''}`, onclick: () => { S.fx2 = S.fx2 === fx.id ? null : fx.id; renderFx(); refreshDevice(); } }, 'FX2'),
          button('↑', () => { engine.rack.move(fx, -1); renderFx(); }), button('↓', () => { engine.rack.move(fx, 1); renderFx(); }),
          button('✕', () => { engine.rack.remove(fx); renderFx(); }))),
      h('div', { class: 'knobs' },
        knob({ label: 'Mix', value: fx.mix, def: fx.def.mix, onInput: (x) => fx.setMix(x), learn: `fx.${fx.id}.mix`, size: 'sm' }),
        Object.entries(fx.def.params).map(([k, p]) => p.options
          ? h('label', { class: 'fxsel' }, p.label, select(p.options, fx.params[k], (x) => fx.set(k, x)))
          : knob({ label: p.label, min: p.min, max: p.max, value: fx.params[k], def: p.def, step: p.step, curve: p.curve, onInput: (x) => fx.set(k, x), learn: `fx.${fx.id}.${k}`, size: 'sm' }))));
    list.append(card);
  });
  v.append(list);
}

// ---------------------------------------------------------------- kits view
async function renderKits() {
  const v = views.kits; if (!v) return; v.innerHTML = '';
  const bar = h('div', { class: 'bar' }, h('b', {}, 'BIBLIOTHÈQUE DE KITS'), h('span', { class: 'patchname' }, S.kit.name),
    button('🎲 Nouveau kit aléatoire', () => changeKit(S.kits.length - S.kitIdx), { cls: 'accent' }),
    button('💾 Enregistrer', saveKit), button('Dupliquer', () => { const c = cloneKit(S.kit); S.kits.push(c); loadKit(S.kits.length - 1); }),
    button('Renommer', () => { const n = prompt('Nom du kit', S.kit.name); if (n) { S.kit.name = n; renderKits(); refreshDevice(); } }),
    button('📂 Kit depuis un dossier de samples', async () => {
      const files = (await pickFile('audio/*', true)).slice(0, 11); if (!files.length) return;
      const k = cloneKit(S.kit, 'Kit samples ' + new Date().toLocaleDateString());
      for (let i = 0; i < files.length; i++) { const id = await storeSample(files[i].name, await files[i].arrayBuffer()); Object.assign(k.tracks[i], { sampleId: id, sampleName: files[i].name, decay: 1, tone: 1, tune: 0.5 }); }
      S.kits.push(k); await db.put('kits', k); await loadKit(S.kits.length - 1);
    }),
    button('⇩ Exporter', exportKit), button('⇧ Importer', importKit),
    button('🗑 Supprimer', async () => { if (S.kit.builtin) return toast('Kit intégré : non supprimable'); const id = S.kits[S.kitIdx].id; await db.del('kits', id); S.kits.splice(S.kitIdx, 1); loadKit(0); }));
  const list = h('div', { class: 'kitlist' }, S.kits.map((k, i) => h('button', { class: `kit ${i === S.kitIdx ? 'on' : ''}`, onclick: () => loadKit(i) }, h('b', {}, k.name), h('small', {}, k.builtin ? 'intégré' : 'perso'))));
  const detail = h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'Contenu du kit courant (clic = écouter)'),
    h('div', { class: 'kittracks' }, S.kit.tracks.map((t, i) => h('div', { class: 'kt', onclick: () => trigger(i) }, h('b', {}, TRACKS[i]), h('span', {}, t.sampleName ? '📁 ' + t.sampleName : VOICES[t.voice]?.[0])))));
  v.append(bar, list, detail, h('p', { class: 'hint' }, 'Kits infinis : « > » sur DRUM KIT après le dernier kit génère un nouveau kit. Chaque piste peut être une voix synthétisée ou n\'importe quel sample (glisser-déposer dans le Séquenceur). Les kits perso sont stockés dans le navigateur ; exporte-les pour les partager.'));
}
async function saveKit() {
  if (S.kit.builtin) { S.kit = cloneKit(S.kit, prompt('Nom du nouveau kit', S.kit.name + ' perso') || S.kit.name + ' perso'); S.kits.push(S.kit); S.kitIdx = S.kits.length - 1; }
  S.kit.builtin = false; S.kits[S.kitIdx] = deepClone(S.kit); await db.put('kits', S.kits[S.kitIdx]); toast('Kit enregistré'); renderKits(); refreshDevice();
}
async function exportKit() {
  const k = deepClone(S.kit); k.samples = {};
  for (const t of k.tracks) if (t.sampleId) { const r = await db.get('samples', t.sampleId); if (r) k.samples[t.sampleId] = { name: r.name, b64: abToB64(r.data) }; }
  download(new Blob([JSON.stringify(k)], { type: 'application/json' }), `${k.name}.rm808kit.json`);
}
async function importKit() {
  const [f] = await pickFile('.json'); if (!f) return;
  try {
    const k = JSON.parse(await f.text());
    for (const [id, s] of Object.entries(k.samples || {})) await db.put('samples', { id, name: s.name, data: b64ToAb(s.b64) });
    delete k.samples; k.id = 'k_' + uid(); k.builtin = false; k.tracks = k.tracks.map((t, i) => ({ ...makeTrack('kick'), ...t }));
    S.kits.push(k); await db.put('kits', k); await loadKit(S.kits.length - 1);
  } catch (e) { toast('Fichier de kit invalide'); }
}

// ---------------------------------------------------------------- song view
function renderSong() {
  const v = views.song; if (!v) return; v.innerHTML = '';
  v.append(h('div', { class: 'bar' }, h('b', {}, 'MODE CHANSON'),
    toggle('SONG ON', S.songMode, (x) => { S.songMode = x; refreshDevice(); }, { learn: 'song.mode' }),
    button(`+ Ajouter pattern ${S.cur + 1}`, () => { S.song.push(S.cur); renderSong(); }),
    button('Vider', () => { S.song = []; renderSong(); })),
    h('div', { class: 'songlist' }, S.song.map((pIdx, i) => h('div', { class: `songitem ${S.songMode && i === S.songPos ? 'on' : ''}` },
      h('span', {}, `${i + 1}.`), select(Array.from({ length: 16 }, (_, k) => [String(k), 'Pattern ' + (k + 1)]), String(pIdx), (x) => (S.song[i] = +x)),
      button('↑', () => { if (i) { [S.song[i - 1], S.song[i]] = [S.song[i], S.song[i - 1]]; renderSong(); } }),
      button('✕', () => { S.song.splice(i, 1); renderSong(); })))),
    h('p', { class: 'hint' }, 'En mode SONG, les patterns s\'enchaînent dans cet ordre (bouton PATTERN/SONG du RM-808).'));
}

// ---------------------------------------------------------------- MIDI
const monitorLog = [];
function logLine(line) {
  monitorLog.unshift(line); monitorLog.length = Math.min(monitorLog.length, 120);
  const mon = document.getElementById('midiMon'); if (mon) mon.textContent = monitorLog.join('\n');
}
async function connectBle() {
  if (!ble.supported) return toast('Bluetooth web indisponible : utilise Chrome/Edge (ordi, Android) ou Bluefy (iPad).');
  showTab('midi');
  try { const mode = await ble.connect(); midiStatus(); toast(mode === 'midi' ? 'RM-808 connecté en MIDI Bluetooth ✔' : 'Connecté — protocole propriétaire, voir le moniteur'); }
  catch (e) { logLine('🔵 ✖ ' + e.message); toast('Connexion Bluetooth annulée ou impossible'); }
}
let learnMode = false;
function setLearn(on) {
  learnMode = on;
  setLearnHandler(on ? (id, el) => {
    document.querySelectorAll('.learn-target').forEach((x) => x.classList.remove('learn-target'));
    el.classList.add('learn-target'); toast(`« ${id} » : bouge/appuie un contrôle du RM-808…`);
    midi.learn(id, (m) => { el.classList.remove('learn-target'); el.classList.add('learned'); setTimeout(() => el.classList.remove('learned'), 600); toast(`${m.key} → ${id}`); renderMidi(); });
  } : null);
  if (!on) midi.cancelLearn();
  document.querySelectorAll('.learn-btn').forEach((b) => b.classList.toggle('on', on));
}
function routeMidi(m) {
  logLine(m.rawHex ? `${m.input} · [${m.rawHex}]${m.learned ? '  ✔ appris → ' + m.learned : ''}` : `${m.input || ''} · ${m.type}${m.ch ? ' ch' + m.ch : ''}${m.num != null ? ' #' + m.num : ''}${m.val != null ? ' = ' + m.val : ''}${m.learned ? '  ✔ appris → ' + m.learned : ''}`);
  if (m.learned) return;
  if (m.type === 'start' && S.followClock) { if (!seq.playing) togglePlay(); return; }
  if (m.type === 'stop' && S.followClock) { if (seq.playing) togglePlay(); return; }
  if (!m.key) return;
  const entry = midi.map[m.key];
  if (entry) {
    const c = controls.get(entry.id); if (!c) return;
    if (c.kind === 'knob') {
      if (m.type === 'cc' || m.type === 'pb') c.setNorm(midi.normalized(m, entry, c.getNorm()));
      else if (m.type === 'noteon') c.setNorm(m.val / 127);
    } else if (m.type === 'noteon' || m.type === 'pc') c.trigger(m.val / 127 || 1);
    else if (m.type === 'noteoff') c.release && c.release();
    else if (m.type === 'cc') { const isOn = (x) => (m.rawLast != null ? x > 0 : x >= 64); const prev = isOn(midi.lastVal[m.key] ?? 0), on = isOn(m.rawLast ?? m.val); midi.lastVal[m.key] = m.rawLast ?? m.val; if (on && !prev) c.trigger(m.val / 127); else if (!on && prev) c.release && c.release(); }
    return;
  }
  // Unmapped notes → instrument
  if (m.type === 'noteon' || m.type === 'noteoff') {
    const route = S.unmapped; const on = m.type === 'noteon';
    if (route === 'lead') on ? engine.leadSynth.keyDown(m.num, m.val / 127) : engine.leadSynth.keyUp(m.num);
    else if (route === 'bass') { if (on) S.lastBassNote = m.num; on ? engine.bassSynth.keyDown(m.num, m.val / 127) : engine.bassSynth.keyUp(m.num); }
    else if (route === 'drums' && on) { const gm = { 36: 0, 35: 0, 38: 1, 40: 1, 50: 2, 48: 2, 47: 3, 45: 3, 43: 4, 41: 4, 37: 5, 39: 6, 56: 7, 49: 8, 57: 8, 46: 9, 42: 10, 44: 10 }; const i = gm[m.num] ?? ((m.num - 36) % 11 + 11) % 11; trigger(i, m.val / 127); }
  }
  if (m.type === 'pb' && S.unmapped !== 'drums') { const c = (m.val / 128 - 0.5) * 2 * 200; (S.unmapped === 'bass' ? engine.bassSynth : engine.leadSynth).voices.forEach((vv) => vv.oscs.forEach((o) => o.osc.detune.setTargetAtTime(c, engine.now, 0.01))); }
}
function midiStatus() {
  const pill = document.getElementById('midiPill'); if (!pill) return;
  if (ble.connected) { pill.textContent = `🔵 ${ble.device.name || 'BLE'} (${ble.mode === 'midi' ? 'MIDI BLE' : 'brut'})`; pill.className = 'midi-pill ok'; return; }
  if (!midi.supported) { pill.textContent = ble.supported ? '🔵 Toucher pour connecter le RM-808' : 'Bluetooth web absent — ouvre dans Bluefy'; pill.className = 'midi-pill ' + (ble.supported ? '' : 'bad'); pill.onclick = ble.supported ? connectBle : null; return; }
  pill.textContent = midi.inputs.length ? `MIDI : ${midi.inputs.map((i) => i.name).join(', ')}` : 'MIDI : aucun appareil';
  pill.className = 'midi-pill ' + (midi.inputs.length ? 'ok' : '');
}
function renderMidi() {
  const v = views.midi; if (!v) return; v.innerHTML = '';
  v.append(h('div', { class: 'panel blebox' }, h('div', { class: 'ptitle' }, '🔵 CONNEXION BLUETOOTH DIRECTE AU RM-808',
      ble.connected ? button('Déconnecter', () => { ble.disconnect(); setTimeout(() => { midiStatus(); renderMidi(); }, 300); }) : button('🔵 Connecter le RM-808', connectBle, { cls: 'accent' })),
    h('p', {}, 'Allume le RM-808 et ', h('b', {}, 'ferme l\'appli X808'), ' (un appareil Bluetooth ne se connecte qu\'à une appli à la fois). Clique « Connecter », choisis le RM-808 dans la liste. Le moniteur indique s\'il parle MIDI Bluetooth standard ou un protocole propriétaire (dans ce cas le Learn fonctionne quand même en mode « brut »).'),
    h('p', { class: 'hint' }, `Bluetooth web : ${ble.supported ? 'disponible ✔' : 'indisponible ici'} · Web MIDI : ${midi.supported ? 'disponible ✔' : 'indisponible ici'}. Sur iPad : navigateur « Bluefy » (Bluetooth web). Sur ordi/Android : Chrome ou Edge.`)));
  const inputs = [['all', 'Toutes les entrées'], ...midi.inputs.map((i) => [i.id, i.name])];
  v.append(h('div', { class: 'bar' }, h('b', {}, 'MIDI'),
    h('label', {}, 'Entrée ', select(inputs, midi.inputFilter, (x) => midi.setInput(x))),
    button('🎯 Mode Learn', () => setLearn(!learnMode), { cls: `learn-btn ${learnMode ? 'on' : ''}` }),
    button('🧭 Assistant RM-808', () => startWizard(), { cls: 'accent' }),
    h('label', {}, 'Notes non assignées → ', select([['lead', 'Synthé'], ['bass', 'Basse'], ['drums', 'Batterie (GM)'], ['none', 'Ignorer']], S.unmapped, (x) => { S.unmapped = x; db.ls.set('unmapped', x); })),
    h('label', {}, toggle('Suivre Start/Stop MIDI', S.followClock, (x) => { S.followClock = x; db.ls.set('followClock', x); }))),
    h('p', { class: 'hint' }, 'Mode Learn : clique sur n\'importe quel potard/bouton de l\'appli (il clignote), puis tourne/appuie sur le contrôle du RM-808. Échap pour sortir. Tout est assignable : effets, synthé, pistes, transport…'));
  const rows = Object.entries(midi.map).sort((a, b) => a[1].id.localeCompare(b[1].id));
  v.append(h('div', { class: 'cols' },
    h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, `Assignations (${rows.length})`,
      h('div', { class: 'row' }, button('⇩ Export', () => download(new Blob([JSON.stringify(midi.map, null, 1)], { type: 'application/json' }), 'rm808-mapping.json')),
        button('⇧ Import', async () => { const [f] = await pickFile('.json'); if (!f) return; try { midi.map = JSON.parse(await f.text()); midi.save(); renderMidi(); } catch (e) { toast('Fichier invalide'); } }),
        button('Tout effacer', () => { if (confirm('Effacer toutes les assignations ?')) { midi.clearMap(); renderMidi(); } }))),
      h('table', { class: 'maptable' }, h('tr', {}, h('th', {}, 'Message'), h('th', {}, 'Contrôle'), h('th', {}, 'Mode'), h('th', {})),
        rows.map(([k, e]) => h('tr', {}, h('td', {}, k), h('td', {}, e.id),
          h('td', {}, select([['abs', 'Absolu'], ['rel2c', 'Relatif (2-compl.)'], ['relbin', 'Relatif (offset 64)']], e.mode, (x) => { e.mode = x; midi.save(); })),
          h('td', {}, button('✕', () => { midi.unmap(k); renderMidi(); })))))),
    h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'Moniteur MIDI (ce que ton RM-808 envoie)'), h('pre', { id: 'midiMon', class: 'monitor' }, monitorLog.join('\n') || 'Bouge un contrôle…'))));
}

// Guided mapping of every RM-808 hardware control
const WIZ = [
  ['dev.tempo', 'Tourne le potard TEMPO'], ...TRACKS.map((t, i) => [`dev.pot.${i}`, `Tourne le potard au-dessus de ${t.toUpperCase()}`]),
  ['dev.play', 'Appuie sur ▶/❚❚'], ['dev.rec', 'Appuie sur ● REC'],
  ...TRACKS.map((t, i) => [`dev.padTop.${i}`, `Frappe le pad du HAUT de ${t.toUpperCase()}`]), ...TRACKS.map((t, i) => [`dev.padBot.${i}`, `Frappe le pad du BAS de ${t.toUpperCase()}`]),
  ['dev.kitPrev', 'DRUM KIT <'], ['dev.kitNext', 'DRUM KIT >'], ['dev.patPrev', 'PATTERN <'], ['dev.patNext', 'PATTERN >'], ['dev.patsong', 'PATTERN/SONG'], ['dev.menu', 'MENU'],
  ['dev.potsLevel', 'STEP (LEVEL)'], ['dev.potsTune', 'BASS (TUNING)'], ['dev.potsTone', 'MIXER (TONE)'], ['dev.potsDecay', 'FX (DECAY)'],
  ['dev.clear', 'HOLD TO CLEAR'], ['dev.modeStep', 'STEP (en bas à gauche)'], ['dev.modeBass', 'KEY BASS'],
  ...Array.from({ length: 16 }, (_, k) => [`dev.step.${k}`, `Touche de pas ${k + 1}`]),
  ['dev.fx1', 'FX1'], ['dev.fx2', 'FX2'], ['dev.modeStep2', 'STEP (à droite)'], ['dev.modeNote', 'NOTE'],
  ['dev.loop.1', 'LOOPER 1'], ['dev.loop.2', 'LOOPER 2'], ['dev.loop.4', 'LOOPER 4'], ['dev.loop.8', 'LOOPER 8'],
];
function startWizard() {
  if (!ble.connected && (!midi.supported || !midi.inputs.length)) toast('Aucune entrée MIDI détectée — connecte le RM-808 (Bluetooth MIDI ou USB) d\'abord.');
  showTab('device'); let i = 0;
  const box = h('div', { class: 'wizard' }); document.body.append(box);
  const end = () => { midi.cancelLearn(); box.remove(); document.querySelectorAll('.learn-target').forEach((x) => x.classList.remove('learn-target')); renderMidi(); };
  const stepTo = () => {
    document.querySelectorAll('.learn-target').forEach((x) => x.classList.remove('learn-target'));
    if (i >= WIZ.length) { toast('Mapping terminé ✔'); return end(); }
    const [id, label] = WIZ[i]; controls.get(id)?.el.classList.add('learn-target');
    box.innerHTML = '';
    box.append(h('div', {}, h('small', {}, `Assistant ${i + 1}/${WIZ.length}`), h('h3', {}, label), h('p', { class: 'hint' }, 'Si ce contrôle n\'envoie rien, passe-le.')),
      h('div', { class: 'row' }, button('⏭ Passer', () => { i++; stepTo(); }), button('⏮ Retour', () => { i = Math.max(0, i - 1); stepTo(); }), button('Terminer', end)));
    midi.learn(id, () => { i++; setTimeout(stepTo, 450); });
  };
  stepTo();
}

// ---------------------------------------------------------------- project
function serialize() {
  return { v: 1, name: S.projectName, bpm: S.bpm, swing: S.swing, master: S.master, patterns: S.patterns, song: S.song, songMode: S.songMode, kit: S.kit,
    lead: engine.leadSynth.patch, bass: engine.bassSynth.patch, fx: engine.rack.serialize(), fx1: S.fx1, fx2: S.fx2, mutes: S.mutes, wavetables: exportUserTables() };
}
async function loadProject(p) {
  if (seq.playing) togglePlay();
  importUserTables(p.wavetables);
  Object.assign(S, { projectName: p.name || 'Projet', swing: p.swing || 0, master: p.master ?? 0.8, patterns: p.patterns, song: p.song || [0], songMode: !!p.songMode, kit: p.kit, mutes: p.mutes || Array(12).fill(false), cur: 0 });
  S.patterns.forEach((pt) => { pt.synth ||= Array.from({ length: 16 }, () => []); pt.synthGate ||= 1; });
  engine.leadSynth.setPatch(p.lead); engine.bassSynth.setPatch(p.bass); S.lead = engine.leadSynth.patch; S.bass = engine.bassSynth.patch;
  engine.rack.load(p.fx); S.fx1 = p.fx1; S.fx2 = p.fx2;
  setBpm(p.bpm || 120); seq.swing = S.swing; controls.get('hdr.swing')?.el.setValue(S.swing, true);
  await ensureSamples(S.kit); applyKitMix(); renderAll(); toast(`Projet « ${S.projectName} » chargé`);
}
let recorder = null;
async function renderProject() {
  const v = views.project; if (!v) return; v.innerHTML = '';
  const saved = await db.all('projects');
  v.append(h('div', { class: 'cols' },
    h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'PROJET'),
      h('label', {}, 'Nom ', h('input', { value: S.projectName, oninput: (e) => (S.projectName = e.target.value) })),
      h('div', { class: 'row' },
        button('💾 Enregistrer dans le navigateur', async () => { await db.put('projects', { id: S.projectName, ...serialize(), date: Date.now() }); toast('Projet enregistré'); renderProject(); }, { cls: 'accent' }),
        button('⇩ Exporter fichier', async () => {
          const p = serialize(); p.samples = {};
          for (const t of p.kit.tracks) if (t.sampleId) { const r = await db.get('samples', t.sampleId); if (r) p.samples[t.sampleId] = { name: r.name, b64: abToB64(r.data) }; }
          download(new Blob([JSON.stringify(p)], { type: 'application/json' }), `${S.projectName}.rm808.json`);
        }),
        button('⇧ Importer fichier', async () => {
          const [f] = await pickFile('.json'); if (!f) return;
          try { const p = JSON.parse(await f.text()); for (const [id, s] of Object.entries(p.samples || {})) await db.put('samples', { id, name: s.name, data: b64ToAb(s.b64) }); await loadProject(p); } catch (e) { console.error(e); toast('Fichier projet invalide'); }
        }),
        button('Nouveau', () => { if (confirm('Repartir de zéro ?')) location.reload(); })),
      h('div', { class: 'ptitle' }, 'Projets enregistrés'),
      saved.length ? saved.sort((a, b) => b.date - a.date).map((p) => h('div', { class: 'row projrow' }, h('b', {}, p.id), h('small', {}, new Date(p.date).toLocaleString()), button('Ouvrir', () => loadProject(p)), button('✕', async () => { await db.del('projects', p.id); renderProject(); }))) : h('p', { class: 'hint' }, 'Aucun projet.')),
    h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, 'EXPORT AUDIO'),
      h('p', {}, 'Enregistre la sortie master (avec effets) puis télécharge un WAV.'),
      button(recorder ? '■ Arrêter et télécharger' : '⏺ Démarrer l\'enregistrement', toggleRecord, { cls: recorder ? 'warn on' : 'accent', learn: 'proj.record' }))));
}
function toggleRecord() {
  if (recorder) { recorder.stop(); return; }
  if (!window.MediaRecorder) return toast('Enregistrement non supporté par ce navigateur');
  const chunks = []; recorder = new MediaRecorder(engine.recDest.stream);
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: recorder.mimeType }); recorder = null; renderProject();
    try { const buf = await engine.ctx.decodeAudioData(await blob.arrayBuffer()); download(encodeWav(buf), `${S.projectName}.wav`); }
    catch (e) { download(blob, `${S.projectName}.${(blob.type.split('/')[1] || 'webm').split(';')[0]}`); }
  };
  recorder.start(); toast('Enregistrement…'); renderProject();
}

function renderHelp() {
  views.help.innerHTML = `<div class="panel help">
  <h2>RM-808 Studio — guide rapide</h2>
  <h3>1. Connecter ton RM-808</h3>
  <ul><li>Allume le RM-808 et associe-le en <b>Bluetooth MIDI</b> (ou USB) à ton appareil.
  <br>· <b>Mac</b> : Configuration audio et MIDI → Fenêtre → Studio MIDI → icône Bluetooth → Connecter.
  <br>· <b>Windows</b> : Chrome/Edge ne voient le MIDI Bluetooth que via un pont (ex. MIDIberry + loopMIDI) ; en USB ça marche directement.
  <br>· <b>Android</b> : associe-le via une appli MIDI BLE, puis ouvre Chrome.
  <br>· <b>iPad</b> : Safari ne supporte pas Web MIDI. Utilise un navigateur iOS avec Web MIDI (ex. « Web MIDI Browser ») et associe le RM-808 depuis ce navigateur ou une appli BLE MIDI.</li>
  <li>Onglet <b>MIDI</b> → regarde le <b>moniteur</b> : tu vois ce que chaque potard / pad envoie.</li>
  <li><b>Le plus simple : 🔵 Connexion Bluetooth directe</b> (onglet MIDI) — ferme d'abord l'appli X808, puis « Connecter le RM-808 ». Marche dans Chrome/Edge (ordi, Android) et dans le navigateur <b>Bluefy</b> sur iPad, sans aucun réglage système.</li>
  <li><b>Si le RM-808 se connecte comme un clavier Bluetooth</b> (il apparaît connecté dans les réglages Bluetooth de l'iPad/iPhone et ses boutons tapent des touches) : laisse-le connecté au système, ouvre l'onglet MIDI, appuie sur ses boutons — les touches s'affichent dans le moniteur et se règlent avec le Learn / l'assistant comme du MIDI.</li>
  <li>Lance <b>🧭 Assistant RM-808</b> : il te demande de toucher chaque contrôle un par un et les assigne au contrôleur virtuel. Les contrôles qui n'envoient rien peuvent être passés.</li>
  <li><b>Mode Learn</b> : n'importe quel bouton/potard de l'appli (synthé, effets, pistes…) peut être assigné à un contrôle du RM-808. Les potards sans fin (encodeurs) : passe le mode en « Relatif ».</li></ul>
  <h3>2. Le contrôleur (comme sur la machine)</h3>
  <ul><li><b>12 potards</b> : réglent LEVEL / TUNING / TONE / DECAY de chaque piste selon le <b>POTS MODE</b> (boutons STEP/BASS/MIXER/FX). Le 12<sup>e</sup> pilote la basse (volume / résonance / cutoff / decay du filtre).</li>
  <li><b>Pads du haut</b> : jouent les sons (et s'enregistrent si REC + lecture). <b>Pads du bas</b> : sélectionnent la piste (ou mute, réglable).</li>
  <li><b>16 touches</b> : STEP = programmer la piste sélectionnée · STEP (droite) bascule en PATTERN = choisir un pattern 1-16 · NOTE = jouer le synthé · KEY BASS = jouer la basse.</li>
  <li><b>HOLD TO CLEAR</b> : appui court = efface la piste, long = efface le pattern, maintenu + pad = efface cette piste.</li>
  <li><b>LOOPER 1/2/4/8</b> : répète les N derniers pas (appui = on/off, maintien = momentané). <b>FX1/FX2</b> : active l'effet assigné dans l'onglet Effets.</li>
  <li><b>DRUM KIT &lt; &gt;</b> : change de kit — après le dernier, un nouveau kit est <b>généré à l'infini</b>.</li></ul>
  <h3>3. Sons</h3>
  <ul><li><b>Kits</b> : 18 voix synthétisées (808/909, FM, zap, percs…), réglables, ou tes propres samples (glisser-déposer). Kits illimités, sauvegardables, exportables.</li>
  <li><b>Synthé</b> : 2 oscillateurs wavetable (15 tables + dessin libre + import de wavetables WAV façon Serum/Vital), unisson 9 voix, FM, sub, bruit, filtre multimode avec drive, 2 enveloppes, 2 LFO, LFO de wavetable, mono/glide, 25 presets d'instruments (cordes, piano FM, cloches, orgue, flûte, basses, leads, pads…) + aléatoire + presets perso.</li>
  <li><b>Effets</b> : rack illimité — distorsion, bitcrusher, filtre à LFO, EQ, chorus, flanger, phaser, delay ping-pong synchro, réverbe, compresseur, trémolo/auto-pan, trance gate, ring mod, tape wobble, élargisseur stéréo.</li></ul>
  <h3>Raccourcis</h3><p>Espace = lecture · A W S E D F T G Y H U J K = notes · Z/X = octave · Échap = sortir du mode Learn</p></div>`;
}

// ---------------------------------------------------------------- boot
function renderAll() { renderDevice(); renderSeq(); renderSynth('lead'); renderSynth('bass'); renderFx(); renderKits(); renderSong(); renderMidi(); renderProject(); renderHelp(); refreshHeader(); }

async function boot() {
  await engine.init();
  seq = new Sequencer(engine, onStep, onUiStep); seq.onBar = onBar; seq.getLength = () => pat().length;
  engine.leadSynth.setPatch(S.lead); engine.bassSynth.setPatch(S.bass); S.lead = engine.leadSynth.patch; S.bass = engine.bassSynth.patch;
  engine.rack.setTempo(S.bpm);
  const eq = engine.rack.add('eq3');
  const flt = engine.rack.add('filter', { enabled: false, params: { type: 'lowpass', freq: 600, q: 8, lfoRate: 0.25, lfoDepth: 0.6 } });
  const crush = engine.rack.add('crusher', { enabled: false });
  engine.rack.add('delay', { mix: 0.18 });
  engine.rack.add('reverb', { mix: 0.18 });
  engine.rack.add('compressor', { params: { threshold: -14, ratio: 3, makeup: 1.2 } });
  void eq; S.fx1 = flt.id; S.fx2 = crush.id;
  const userKits = await db.all('kits'); S.kits.push(...userKits);
  applyKitMix();
  // demo groove in pattern 1
  randomGroove();
  buildShell(); renderAll(); showTab('device'); drawScope();
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setLearn(false); onKey(e, true); });
  window.addEventListener('keyup', (e) => onKey(e, false));
  midi.listeners.add(routeMidi); midi.statusListeners.add(() => { midiStatus(); if (S.tab === 'midi') renderMidi(); });
  await midi.init(); midiStatus();
}

document.getElementById('start').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true;
  try { await boot(); document.getElementById('splash').remove(); }
  catch (err) { console.error(err); document.getElementById('splashMsg').textContent = 'Erreur : ' + err.message; }
});
window.__rm808 = { S, engine, midi, ble, get seq() { return seq; } };
