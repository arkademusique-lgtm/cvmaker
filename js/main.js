import { Engine, TRACKS, DRUM_TRACKS, wakeAudio } from './audio/engine.js';
import { VOICES } from './audio/drums.js';
import { DEFAULT_PATCH, mergePatch, LFO_DESTS } from './audio/synth.js';
import { FX_TYPES, FX_CATS } from './audio/fx.js';
import { PERF } from './audio/perf.js';
import { iconizeHtml } from './icons.js';
import { TABLES, tableOptions, framesAt, N as WT_N, setCustomFrames, importWavetable, exportUserTables, importUserTables } from './audio/wavetables.js';
import { Sequencer, emptyPattern } from './sequencer.js';
import { Midi } from './midi.js';
import { BleLink, HidLink, GamepadLink, RawDecoder, hidCode } from './ble.js';
import { BUILTIN_KITS, randomKit, cloneKit, makeTrack } from './kits.js';
import { PRESETS, PRESET_CATS, presetCat, FX_CHAINS } from './presets.js';
import * as db from './storage.js';
import { h, knob, button, select, toggle, toast, controls, registerControl, setLearnHandler, pickFile } from './ui.js';
import { clamp, deepClone, noteName, NOTE_NAMES, uid, encodeWav, download, abToB64, b64ToAb, pick, rand } from './util.js';

const engine = new Engine();
const midi = new Midi();
const decoder = new RawDecoder(midi); decoder.mode = db.ls.get('rawMode', 'auto');
const ble = new BleLink(midi, (line) => logLine('🔵 ' + line), decoder);
const hid = new HidLink((line) => logLine('🟣 ' + line), decoder);
const pads = new GamepadLink(midi, (line) => logLine(line));
// Keys coming from the RM-808 (it is a Bluetooth keyboard): same event whether they arrive through the system keyboard or through Bluetooth direct.
const keyState = {};
function keyEvent(code, down, input, rawHex) {
  // The same press reaches us twice on iOS (system keyboard + Bluetooth direct): keep the first, drop the echo.
  const t = performance.now(), src = input === 'Clavier' ? 'k' : 'b', st = (keyState[code] ||= { t: 0 });
  if (down) { if (st.src && st.src !== src && t - st.t < 500) return; st.src = src; st.t = t; if (st.down && !KNOB_KEYS[code]) midi.dispatch({ type: 'noteoff', ch: 0, num: 0, val: 0, key: `key:${code}`, input }); st.down = true; }
  else { if (!st.down) return; st.down = false; }
  if (rmProfile() && KNOB_KEYS[code] && !midi.learnTarget) { if (down) { knobStep(code); logKnob(code, input); } return; } // knob notch
  if (synthTab() && !midi.learnTarget) return synthKey(code, down, input); // Synthé / Basse tab: every RM-808 button plays the scale
  midi.dispatch({ type: down ? 'noteon' : 'noteoff', ch: 0, num: 0, val: down ? 127 : 0, key: `key:${code}`, input, rawHex, keyName: code });
}
decoder.onKey = keyEvent;
// In the Synthé / Basse tabs the RM-808 is a scale keyboard: no mapping needed. Buttons are ordered by the key they send
// (consecutive keys → consecutive notes), wrapped on 16 notes so the 16 step keys cover the whole range.
const synthTab = () => (S.tab === 'lead' || S.tab === 'bass') && (kbdCtrl() || decoder.kbdDetected);
let KEY_ORDER = null;
function keyRank(code) {
  if (!KEY_ORDER) { KEY_ORDER = []; for (let u = 4; u <= 0x65; u++) { const c = hidCode(u); if (!KNOB_KEYS[c]) KEY_ORDER.push(c); } }
  const i = KEY_ORDER.indexOf(code); if (i >= 0) return i;
  let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h;
}
const synthHeld = {};
function synthKey(code, down, input) {
  const part = S.tab === 'bass' ? 'bass' : 'lead';
  if (down) {
    if (synthHeld[code]) stopNotes(synthHeld[code].notes, synthHeld[code].part);
    const deg = keyRank(code) % 16, notes = startNotes(deg, 0.85, part); synthHeld[code] = { part, notes };
    notes.forEach((n) => document.querySelectorAll(`.view-${part} .key[data-note="${n}"]`).forEach((x) => x.classList.add('down')));
    logLine(`${input} · ${code} → ${notes.map(noteName).join(' ')}`);
  } else {
    const h0 = synthHeld[code]; if (!h0) return; delete synthHeld[code];
    h0.notes.forEach((n) => document.querySelectorAll(`.view-${h0.part} .key[data-note="${n}"]`).forEach((x) => x.classList.remove('down')));
    if (!PL.latch) stopNotes(h0.notes, h0.part);
  }
}
// Built-in RM-808 profile: each knob sends a pair of keys (one per direction) every time it moves one notch.
const RM_KNOBS = [['dev.tempo', 'F1', 'F2'], ['dev.pot.0', 'F3', 'F4'], ['dev.pot.1', 'F5', 'F6'], ['dev.pot.2', 'F7', 'F8'], ['dev.pot.3', 'F9', 'F10'], ['dev.pot.4', 'F11', 'F12'],
  ['dev.pot.5', 'PrintScreen', 'ScrollLock'], ['dev.pot.6', 'Pause', 'Insert'], ['dev.pot.7', 'Home', 'PageUp'], ['dev.pot.8', 'End', 'PageDown'], ['dev.pot.9', 'ArrowRight', 'ArrowLeft'],
  ['dev.pot.10', 'ArrowDown', 'ArrowUp'], ['dev.pot.11', 'Backslash', 'Slash']];
const KNOB_KEYS = {}; RM_KNOBS.forEach(([id, dec, inc]) => { KNOB_KEYS[dec] = [id, -1]; KNOB_KEYS[inc] = [id, 1]; });
const rmProfile = () => db.ls.get('rmProfile', true);
const knobLast = {};
function knobStep(code) {
  const [id, dir0] = KNOB_KEYS[code], c = controls.get(id); if (!c) return;
  const dir = dir0 * (db.ls.get('knobInvert', false) ? -1 : 1), t = performance.now(), fast = t - (knobLast[id] || 0) < 45 ? 2 : 1; knobLast[id] = t;
  const sens = db.ls.get('knobSens', 32);
  if (id === 'dev.tempo' && !sh()) { setBpm(S.bpm + dir * fast * (sens <= 16 ? 4 : sens <= 32 ? 2 : 1)); return; }
  c.setNorm(clamp(c.getNorm() + (dir * fast) / sens, 0, 1));
}
/** True when keys must be reserved for the RM-808 (no computer-keyboard shortcuts / notes). */
const kbdCtrl = () => db.ls.get('kbdCtrl', null) ?? (decoder.kbdDetected || matchMedia('(pointer: coarse)').matches || Object.keys(midi.map).filter((k) => k.startsWith('key:')).length >= 8);
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
  keyHeld: {}, tab: 'device', play: { part: 'lead', scale: 'minPent', root: 0, octs: { lead: 3, bass: 1 }, chord: 0, latch: false, arp: 'off', arpRate: 1, drums: false, layout: 'pads', ...db.ls.get('play', {}) }, clip: null, projectName: 'Mon projet',
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
  S.bpm = clamp(Math.round(v), 30, 300); seq.bpm = S.bpm; engine.rack.setTempo(S.bpm); engine.perf.setTempo(S.bpm);
  for (const id of ['hdr.tempo', 'dev.tempo']) if (id !== from) controls.get(id)?.el.setValue(S.bpm, true);
}
function togglePlay() {
  engine.init();
  if (seq.playing) { seq.stop(); engine.leadSynth.allOff(); engine.bassSynth.allOff(); }
  else { if (S.songMode) { S.songPos = 0; S.cur = S.song[0] ?? 0; refreshPattern(); } seq.start(); engine.rack.sync(seq.next); }
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
function setKeyMode(m) { Object.keys(S.keyHeld).forEach((k) => stepKeyRelease(+k)); S.keyMode = m; refreshDevice(); }
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
  await ensureSamples(S.kit); applyKitMix(); renderSeq(); renderKits(); refreshDevice(); if (S.tab === 'play') renderPlay(); toast(`Kit : ${S.kit.name}`);
}
function fxToggle(which) {
  const id = S[which]; const fx = engine.rack.list.find((f) => f.id === id);
  if (!fx) { toast(`Assigne un effet à ${which.toUpperCase()} dans l'onglet Effets`); return; }
  fx.setEnabled(!fx.enabled); renderFx(); refreshDevice(); toast(`${fx.def.name} ${fx.enabled ? 'ON' : 'OFF'}`);
}
function clearPress() {
  if (sh()) { useShift(); pushUndo(); S.patterns[S.cur] = emptyPattern(pat().name); refreshPattern(); return toast('Pattern effacé'); }
  S.clearHeld = true; S.clearUsed = false; S.clearT = performance.now();
}
function clearRelease() {
  if (!S.clearHeld) return; S.clearHeld = false;
  if (S.clearUsed) return;
  const p = pat();
  if (performance.now() - S.clearT > 900) { pushUndo(); S.patterns[S.cur] = emptyPattern(p.name); toast('Pattern effacé'); }
  else { clearTrack(S.sel); toast(`${TRACKS[S.sel]} effacé`); }
  refreshSteps(); renderRolls();
}
function clearTrack(i) { pushUndo(); const p = pat(); if (i < DRUM_TRACKS) p.drums[i].fill(0); else p.bass.forEach((b) => (b.on = false)); refreshSteps(); }

// ---------------------------------------------------------------- SHIFT layer (hold MENU) & shortcuts
const sh = () => S.shift || S.shiftLock;
const useShift = () => { S.shiftUsed = true; };
const synthMode = () => S.keyMode === 'note' || S.keyMode === 'bass';
const partForMode = () => (S.keyMode === 'bass' ? 'bass' : 'lead');
const undoStack = [];
function pushUndo() { undoStack.push([S.cur, JSON.stringify(pat())]); if (undoStack.length > 40) undoStack.shift(); }
function undo() { const u = undoStack.pop(); if (!u) return toast('Rien à annuler'); S.patterns[u[0]] = JSON.parse(u[1]); S.cur = u[0]; refreshPattern(); toast('Annulé ↩'); }
let taps = [];
function tapTempo() {
  const n = performance.now(); taps = taps.filter((t) => n - t < 2500); taps.push(n);
  if (taps.length < 2) return toast('Tap… encore');
  setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1))); toast(`Tempo ${S.bpm}`);
}
function setSwing(v) { S.swing = clamp(v, 0, 0.75); seq.swing = S.swing; controls.get('hdr.swing')?.el.setValue(S.swing, true); toast(`Swing ${Math.round(S.swing * 100)}%`); }
function shiftOct(d) {
  const part = S.keyMode === 'bass' ? 'bass' : S.keyMode === 'note' ? 'lead' : (S.tab === 'play' ? PL.part : 'lead');
  if (part === 'drums') return;
  PL.octs[part] = clamp(PL.octs[part] + d, 0, 6); savePlay(); toast(`Octave ${part === 'bass' ? 'basse' : 'synthé'} : C${PL.octs[part]}`);
  renderDevice(); if (S.tab === 'play') renderPlay();
}
function copyPattern() { S.clip = deepClone(pat()); toast(`Pattern ${S.cur + 1} copié`); }
function pastePattern() { if (!S.clip) return toast('Rien à coller'); pushUndo(); S.patterns[S.cur] = deepClone(S.clip); refreshPattern(); toast('Collé'); }
function duplicatePattern() { const n = (S.cur + 1) % 16; S.patterns[n] = deepClone(pat()); S.patterns[n].name = 'P' + (n + 1); S.cur = n; S.queued = null; refreshPattern(); toast(`Dupliqué → pattern ${n + 1}`); }
function fillTrack(n) {
  pushUndo(); const p = pat();
  for (let st = 0; st < 16; st++) { const on = st % n === 0; if (S.sel < DRUM_TRACKS) p.drums[S.sel][st] = on ? 1 : 0; else Object.assign(p.bass[st], { on, note: p.bass[st].noteSet ? p.bass[st].note : S.lastBassNote }); }
  refreshSteps(); renderRolls(); toast(`${TRACKS[S.sel]} : 1 pas sur ${n}`);
}
function cycleFx(which) { const l = engine.rack.list; if (!l.length) return; const fx = l[(l.findIndex((f) => f.id === S[which]) + 1) % l.length]; S[which] = fx.id; renderFx(); refreshDevice(); toast(`${which.toUpperCase()} → ${fx.def.name}`); }
async function quickSave() { await db.put('projects', { id: S.projectName, ...serialize(), date: Date.now() }); renderProject(); toast(`Projet « ${S.projectName} » enregistré`); }
function restart() { if (seq.playing) togglePlay(); togglePlay(); }
function randomSound() { const part = partForMode(), sy = synthOf(part); sy.setPatch(randomPatch(part)); S[part] = sy.patch; renderSynth(part); refreshDevice(); toast('Son aléatoire : ' + (part === 'bass' ? 'basse' : 'synthé')); }
function nextTab() { const i = TABS.findIndex(([k]) => k === S.tab); showTab(TABS[(i + 1) % TABS.length][0]); }
function cycleMode() { setKeyMode({ step: 'pattern', pattern: 'note', note: 'bass', bass: 'step' }[S.keyMode]); toast('Mode : ' + S.keyMode.toUpperCase()); }
// MENU held + step key 1..16
const SHORTCUTS = [
  ['🎲 Groove', () => { pushUndo(); randomGroove(); refreshPattern(); }], ['🎲 Kit', () => changeKit(S.kits.length - S.kitIdx)], ['Copier', copyPattern], ['Coller', pastePattern],
  ['Annuler', undo], ['Tap tempo', tapTempo], ['Swing −', () => setSwing(S.swing - 0.05)], ['Swing +', () => setSwing(S.swing + 0.05)],
  ['Preset ◀', () => { stepPreset(partForMode(), -1); refreshDevice(); }], ['Preset ▶', () => { stepPreset(partForMode(), 1); refreshDevice(); }], ['🎲 Son', randomSound], ['Octave −', () => shiftOct(-1)],
  ['Octave +', () => shiftOct(1)], ['Dupliquer', duplicatePattern], ['⏺ Audio', () => toggleRecord()], ['💾 Sauver', quickSave],
];
function menuPress() {
  if (S.shiftLock) { S.shiftLock = false; S.menuSkip = true; toast('SHIFT déverrouillé'); return refreshDevice(); }
  if (S.shift) { S.shift = false; return refreshDevice(); } // controller that never sends a release
  S.shift = true; S.shiftUsed = false; S.shiftT = performance.now(); refreshDevice();
}
function menuRelease() {
  if (S.menuSkip) { S.menuSkip = false; return; }
  if (!S.shift) return; S.shift = false;
  if (!S.shiftUsed) { if (performance.now() - S.shiftT > 600) { S.shiftLock = true; toast('SHIFT verrouillé — appuie sur MENU pour quitter'); } else nextTab(); }
  refreshDevice();
}
function kitNav(d) { const alt = sh(); if (alt) useShift(); if (alt !== synthMode()) { stepPreset(partForMode(), d); refreshDevice(); } else changeKit(d); }
function patNav(d) {
  const alt = sh(); if (alt) useShift();
  if (synthMode() && !alt) shiftOct(d); else if (!synthMode() && alt) (d < 0 ? undo() : duplicatePattern()); else selectPattern(S.cur + d);
}

// pots: what the 12 knobs control depends on the layer (SHIFT = pan, NOTE = synth macros, KEY BASS = bass macros)
const POT_LABEL = { level: 'LEVEL', tune: 'TUNING', tone: 'TONE', decay: 'DECAY' };
const MACROS = [['Cutoff', 'filter.cutoff', 0, 1], ['Réso', 'filter.res', 0.1, 20], ['Env filt', 'filter.envAmt', -1, 1], ['Drive', 'filter.drive', 0, 1], ['Attack', 'ampEnv.a', 0.001, 2], ['Decay', 'ampEnv.d', 0.01, 3],
  ['Sustain', 'ampEnv.s', 0, 1], ['Release', 'ampEnv.r', 0.01, 4], ['Wave A', 'oscA.pos', 0, 1], ['Détune', 'oscA.detune', 0, 1], ['LFO', 'lfo1.depth', 0, 1], ['Volume', 'volume', 0, 1.2]];
const potLayer = () => (sh() ? 'pan' : S.tab === 'lead' ? 'lead' : S.tab === 'bass' ? 'bass' : S.keyMode === 'note' ? 'lead' : S.keyMode === 'bass' ? 'bass' : 'trk');
const potLabel = (i) => { const L = potLayer(); return L === 'pan' ? 'PAN' : L === 'trk' ? POT_LABEL[S.pots] : MACROS[i][0].toUpperCase(); };
function potGet(i) {
  const L = potLayer();
  if (L === 'pan') return ((i < DRUM_TRACKS ? S.kit.tracks[i].pan : S.bass.pan) + 1) / 2;
  if (L !== 'trk') { const [, path, min, max] = MACROS[i]; return clamp((getPath(S[L], path) - min) / (max - min), 0, 1); }
  if (i < DRUM_TRACKS) return S.kit.tracks[i][S.pots];
  const b = S.bass; return { level: b.volume, tune: (b.filter.res - 0.1) / 25, tone: b.filter.cutoff, decay: clamp(b.filtEnv.d / 1.5, 0, 1) }[S.pots];
}
function potSet(i, v) {
  const L = potLayer();
  if (L === 'pan') {
    useShift(); const pan = v * 2 - 1;
    if (i < DRUM_TRACKS) { S.kit.tracks[i].pan = pan; applyKitMix(); controls.get(`trk.${i}.pan`)?.el.setValue(pan, true); } else { setPatchParam('bass', 'pan', pan); controls.get('bass.pan')?.el.setValue(pan, true); }
    return;
  }
  if (L !== 'trk') {
    const [, path, min, max] = MACROS[i], val = min + v * (max - min);
    setPatchParam(L, path, val); controls.get(`${L}.${path}`)?.el.setValue(val, true); if (path.endsWith('.pos')) drawWaves();
    return;
  }
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
const TABS = [['play', 'Jouer', '🎹'], ['device', 'RM-808', '🎛️'], ['seq', 'Séquenceur', '▦'], ['lead', 'Synthé', '〰️'], ['bass', 'Basse', '🎸'], ['fx', 'Effets', '✨'], ['kits', 'Kits', '🥁'], ['song', 'Chanson', '🎼'], ['midi', 'MIDI', '🔌'], ['project', 'Projet', '💾'], ['help', 'Aide', '❓']];
function showTab(t) {
  if ((S.tab === 'play' || S.tab === 'lead' || S.tab === 'bass') && t !== S.tab) { playPanic(); Object.keys(synthHeld).forEach((k) => delete synthHeld[k]); }
  S.tab = t; db.ls.set('tab', t); refreshDevice();
  for (const [k] of TABS) { views[k].hidden = k !== t; }
  document.querySelector(`.tabs button[data-tab="${t}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  window.scrollTo(0, 0);
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
    h('button', { class: 'midi-pill bad', id: 'audioPill', hidden: true, onclick: () => wakeAudio(engine.ctx) }, 'Son en pause — touche ici'),
    h('div', { class: 'midi-pill', id: 'midiPill' }, 'MIDI…'),
    button('⛶', () => { const d = document; (d.fullscreenElement ? d.exitFullscreen?.() : d.documentElement.requestFullscreen?.())?.catch?.(() => {}); }, { cls: 'fs-btn', title: 'Plein écran' }),
  );
  const tabs = h('nav', { class: 'tabs' }, TABS.map(([k, l, ic], i) => h('button', { 'data-tab': k, title: `${l} (touche ${(i + 1) % 10 || 0}${i === 10 ? ' / ?' : ''})`, onclick: () => showTab(k) }, h('i', {}, ic), h('span', {}, l))));
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


const CHEATS = iconizeHtml(`<div class="cheatgrid">
<div><h4>MENU = touche SHIFT ⇧</h4><ul>
<li><b>MENU bref</b> : onglet suivant</li><li><b>MENU maintenu + …</b> : raccourci</li><li><b>MENU long seul</b> : verrouille SHIFT (re-MENU pour quitter)</li><li>Au clavier d'ordi : touche <b>Maj</b></li></ul>
<h4>⇧ + touches de pas 1 → 16</h4><ol>
<li>🎲 Groove aléatoire</li><li>🎲 Nouveau kit</li><li>Copier le pattern</li><li>Coller</li><li>Annuler ↩</li><li>Tap tempo</li><li>Swing −</li><li>Swing +</li>
<li>Preset ◀</li><li>Preset ▶</li><li>🎲 Son aléatoire</li><li>Octave −</li><li>Octave +</li><li>Dupliquer le pattern → suivant</li><li>⏺ Enregistrer l'audio (WAV)</li><li>💾 Sauver le projet</li></ol></div>
<div><h4>⇧ + autres contrôles</h4><ul>
<li><b>Pad du haut</b> : mute / unmute la piste</li><li><b>Pad du bas</b> : solo</li><li><b>12 potards</b> : panoramique de chaque piste</li><li><b>TEMPO</b> : swing</li>
<li><b>▶/❚❚</b> : repartir du début</li><li><b>● REC</b> : enregistrer l'audio</li><li><b>HOLD TO CLEAR</b> : effacer tout le pattern</li>
<li><b>LOOPER 1/2/4/8</b> : remplir la piste (1 pas sur 1, 2, 4, 8)</li><li><b>FX1 / FX2</b> : changer l'effet assigné</li>
<li><b>PATTERN &lt;</b> : annuler · <b>PATTERN &gt;</b> : dupliquer</li><li><b>DRUM KIT &lt; &gt;</b> : preset de synthé</li>
<li><b>STEP / BASS / MIXER / FX</b> : ouvrir Séquenceur / Basse / Synthé / Effets</li></ul>
<h4>Sans SHIFT</h4><ul><li><b>Double-appui sur un pas</b> : accent</li><li><b>HOLD TO CLEAR + pad</b> : efface cette piste</li><li><b>LOOPER maintenu</b> : répétition momentanée</li></ul></div>
<div><h4>Mode NOTE (synthé) et KEY BASS</h4><ul>
<li><b>16 touches</b> : les 16 notes de la gamme choisie (tonique en surbrillance) — ● REC + lecture = enregistre</li><li><b>Re-appui sur NOTE / KEY BASS</b> : notes seules → accords 3 notes → accords 4 notes</li><li><b>PATTERN &lt; &gt;</b> : octave − / +</li><li><b>DRUM KIT &lt; &gt;</b> : preset précédent / suivant</li>
<li><b>12 potards</b> = macros du son : Cutoff · Réso · Env filtre · Drive · Attack · Decay · Sustain · Release · Wave · Détune · LFO · Volume</li>
<li><b>Pads</b> : la batterie reste jouable</li><li>⇧ + PATTERN / DRUM KIT : retrouvent leur rôle normal</li></ul>
<h4>Clavier d'ordinateur</h4><ul><li><b>Espace</b> lecture · <b>Maj+Espace</b> début</li><li><b>← →</b> pattern · <b>↑ ↓</b> kit</li><li><b>R</b> rec · <b>M</b> mute · <b>I</b> mode des touches</li>
<li><b>N</b> groove · <b>B</b> kit · <b>C / V</b> copier / coller · <b>Q</b> annuler</li><li><b>A W S E D F T G Y H U J K</b> notes · <b>Z / X</b> octave</li><li><b>1 2 3 … 9 0</b> : changer d'onglet (1 = Jouer)</li></ul></div></div>`);


// ---------------------------------------------------------------- PLAY view (touch performance: tablet / phone / mouse)
const SCALES = {
  chroma: ['Chromatique', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]], major: ['Majeure', [0, 2, 4, 5, 7, 9, 11]], minor: ['Mineure', [0, 2, 3, 5, 7, 8, 10]],
  minPent: ['Penta mineure', [0, 3, 5, 7, 10]], majPent: ['Penta majeure', [0, 2, 4, 7, 9]], blues: ['Blues', [0, 3, 5, 6, 7, 10]], dorian: ['Dorien', [0, 2, 3, 5, 7, 9, 10]],
  phryg: ['Phrygien', [0, 1, 3, 5, 7, 8, 10]], harm: ['Mineure harmonique', [0, 2, 3, 5, 7, 8, 11]], orient: ['Orientale', [0, 1, 4, 5, 7, 8, 11]],
};
const PL = S.play;
const savePlay = () => db.ls.set('play', PL);
const playActive = new Map(), playLatched = new Map();
let arpSet = [], arpTimer = null, arpIdx = 0;
function degNote(d, part = PL.part) { const sc = SCALES[PL.scale][1], len = sc.length; return PL.root + (PL.octs[part] + 1) * 12 + sc[((d % len) + len) % len] + 12 * Math.floor(d / len); }
function chordDegs(d, n = PL.chord) { if (!n) return [d]; const st = PL.scale === 'chroma' ? [0, 4, 7, 11] : [0, 2, 4, 6]; return st.slice(0, n).map((x) => d + x); }
function liveNoteOn(part, n, vel) {
  synthOf(part).keyDown(n, vel); if (part === 'bass') S.lastBassNote = n;
  if (S.rec && seq.playing) { const p = pat(), st = recStep(); if (part === 'lead') { if (!p.synth[st].includes(n)) p.synth[st].push(n); } else Object.assign(p.bass[st], { on: true, note: n, noteSet: true }); renderRolls(); refreshSteps(); }
}
function arpTick() {
  if (!arpSet.length || PL.arp === 'off') { arpTimer = null; return; }
  let order = [...new Set(arpSet)].sort((a, b) => a - b);
  if (PL.arp === 'down') order.reverse(); if (PL.arp === 'updown' && order.length > 2) order = [...order, ...order.slice(1, -1).reverse()];
  const n = PL.arp === 'rand' ? pick(order) : order[arpIdx++ % order.length], dur = seq.stepDur * PL.arpRate;
  synthOf(arpPart).play(n, 0.85, engine.now, dur * 0.8); if (arpPart === 'bass') S.lastBassNote = n;
  arpTimer = setTimeout(arpTick, dur * 1000);
}
let arpPart = 'lead';
const chordOf = (part) => (part === 'bass' ? PL.chordBass || 0 : PL.chord);
function startNotes(d, vel, part = PL.part) {
  const notes = chordDegs(d, chordOf(part)).map((x) => degNote(x, part)).filter((n) => n >= 0 && n <= 127);
  if (PL.arp !== 'off') { arpPart = part; arpSet.push(...notes); if (!arpTimer) { arpIdx = 0; arpTick(); } } else notes.forEach((n) => liveNoteOn(part, n, vel));
  return notes;
}
function stopNotes(notes, part = PL.part) { if (PL.arp !== 'off') notes.forEach((n) => { const i = arpSet.indexOf(n); if (i >= 0) arpSet.splice(i, 1); }); else notes.forEach((n) => synthOf(part).keyUp(n)); }
function playPanic() {
  engine.perf?.stopAll(); document.querySelectorAll('.perfpad.down').forEach((e) => e.classList.remove('down'));
  playActive.clear(); playLatched.clear(); arpSet = []; clearTimeout(arpTimer); arpTimer = null;
  engine.leadSynth?.allOff(); engine.bassSynth?.allOff(); document.querySelectorAll('.npad.down').forEach((e) => e.classList.remove('down'));
}
function notePads() {
  const sc = SCALES[PL.scale][1], len = sc.length, cols = len <= 7 ? len + 1 : 8, off = len <= 7 ? len : 5, rows = 4;
  const grid = h('div', { class: 'npads', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } });
  for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
    const d = r * off + c, n = degNote(d), root = ((n - PL.root) % 12 + 12) % 12 === 0;
    grid.append(h('div', { class: `npad ${root ? 'root' : ''} r${r}`, 'data-d': d }, h('b', {}, noteName(n))));
  }
  const padAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.npad');
  const velOf = (e, el) => { const b = el.getBoundingClientRect(); return clamp(1.05 - ((e.clientY - b.top) / b.height) * 0.5, 0.5, 1); };
  const down = (e, el) => {
    const d = +el.dataset.d;
    if (PL.latch) { if (playLatched.has(d)) { stopNotes(playLatched.get(d)); playLatched.delete(d); el.classList.remove('down'); } else { playLatched.set(d, startNotes(d, velOf(e, el))); el.classList.add('down'); } playActive.set(e.pointerId, { el, notes: [] }); return; }
    playActive.set(e.pointerId, { el, notes: startNotes(d, velOf(e, el)) }); el.classList.add('down');
  };
  const up = (e) => { const a = playActive.get(e.pointerId); if (!a) return; playActive.delete(e.pointerId); if (!PL.latch) { stopNotes(a.notes); a.el.classList.remove('down'); } };
  grid.addEventListener('pointerdown', (e) => { const el = e.target.closest?.('.npad') || padAt(e); if (!el) return; e.preventDefault(); try { e.target.releasePointerCapture(e.pointerId); } catch (x) { /* */ } down(e, el); });
  grid.addEventListener('pointermove', (e) => { const a = playActive.get(e.pointerId); if (!a || PL.latch) return; const el = padAt(e); if (el && el !== a.el && grid.contains(el)) { up(e); down(e, el); } });
  for (const ev of ['pointerup', 'pointercancel']) grid.addEventListener(ev, up);
  grid.addEventListener('contextmenu', (e) => e.preventDefault());
  return grid;
}
function drumPads(compact) {
  const grid = h('div', { class: `dpads ${compact ? 'compact' : ''}` });
  TRACKS.forEach((name, i) => {
    const el = h('div', { class: `dpad ${STEP_COLORS(Math.floor(i * 16 / 12))} ${audible(i) ? '' : 'muted'}`, 'data-tr': i }, h('b', {}, name), compact ? null : h('small', {}, i < DRUM_TRACKS ? (S.kit.tracks[i].sampleName || VOICES[S.kit.tracks[i].voice]?.[0]) : noteName(S.lastBassNote)));
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); const b = el.getBoundingClientRect(); trigger(i, clamp(1.1 - ((e.clientY - b.top) / b.height) * 0.6, 0.5, 1)); el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 100); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    grid.append(el);
  });
  return grid;
}
function xyPad() {
  const dot = h('div', { class: 'xydot' }), pad = h('div', { class: 'xy' }, dot, h('span', {}, 'X : cutoff · Y : résonance'));
  const place = () => { const P = synthOf(PL.part).patch.filter; dot.style.left = P.cutoff * 100 + '%'; dot.style.top = (1 - clamp((P.res - 0.1) / 18, 0, 1)) * 100 + '%'; };
  const move = (e) => {
    const b = pad.getBoundingClientRect(), x = clamp((e.clientX - b.left) / b.width, 0, 1), y = clamp(1 - (e.clientY - b.top) / b.height, 0, 1);
    setPatchParam(PL.part, 'filter.cutoff', x); setPatchParam(PL.part, 'filter.res', 0.1 + y * 18);
    controls.get(`${PL.part}.filter.cutoff`)?.el.setValue(x, true); controls.get(`${PL.part}.filter.res`)?.el.setValue(0.1 + y * 18, true); place();
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); pad.setPointerCapture(e.pointerId); move(e); });
  pad.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') move(e); });
  place();
  return pad;
}
function renderPlay() {
  const v = views.play; if (!v) return; playPanic(); v.innerHTML = '';
  const set = (k, val) => { PL[k] = val; savePlay(); renderPlay(); renderDevice(); };
  const seg = (opts, cur, fn, cls = '') => h('div', { class: `seg ${cls}` }, opts.map(([val, label]) => h('button', { class: `btn ${val === cur ? 'on' : ''}`, onclick: () => fn(val) }, label)));
  const isSynth = PL.part !== 'drums';
  const top = h('div', { class: 'playbar' },
    seg([['lead', '🎹 Synthé'], ['bass', '🎸 Basse'], ['drums', '🥁 Batterie']], PL.part, (x) => set('part', x), 'big'),
    h('div', { class: 'seg quick' }, button('● REC', () => setRec(), { cls: `rec-btn ${S.rec ? 'on' : ''}` }), button('🎲 Groove', () => SHORTCUTS[0][1]()), button('↩', undo, { title: 'Annuler' }),
      ...[1, 2, 4, 8].map((n) => { const b = button('⟳' + n, () => setLooper(n), { title: 'Looper ' + n }); b.dataset.looper = n; if (S.looper === n) b.classList.add('on'); return b; }),
      button('FX1', () => fxToggle('fx1')), button('FX2', () => fxToggle('fx2'))));
  v.append(top);
  if (isSynth) {
    const synth = synthOf(PL.part), cat = PL.cat || 'all', all = [...PRESETS, ...userPresets()].filter((p) => cat === 'all' || presetCat(p.name) === cat);
    v.append(h('div', { class: 'chips cats' }, PRESET_CATS.map(([k, l]) => h('button', { class: `chip small ${k === cat ? 'on' : ''}`, onclick: () => set('cat', k) }, l))));
    v.append(h('div', { class: 'chips' }, button('🎲', () => { randomSound(); renderPlay(); }, { cls: 'accent' }),
      all.map((p) => h('button', { class: `chip ${p.name === synth.patch.name ? 'on' : ''}`, onclick: () => { synth.setPatch(p); S[PL.part] = synth.patch; renderSynth(PL.part); renderPlay(); } }, p.name))));
    const optsBox = h('details', { class: 'playopts', open: db.ls.get('playOpts', innerWidth > 700) }, h('summary', {}, `⚙️ ${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][PL.root]} ${SCALES[PL.scale][0]} · C${PL.octs[PL.part]}${PL.chord ? ' · accords' : ''}${PL.arp !== 'off' ? ' · arpège' : ''}${PL.latch ? ' · maintien' : ''} — réglages`));
    optsBox.addEventListener('toggle', () => db.ls.set('playOpts', optsBox.open));
    v.append(optsBox); optsBox.append(h('div', { class: 'playbar opts' },
      h('label', {}, 'Tonique ', select(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n, i) => [String(i), n]), String(PL.root), (x) => set('root', +x))),
      h('label', {}, 'Gamme ', select(Object.entries(SCALES).map(([k, [l]]) => [k, l]), PL.scale, (x) => set('scale', x))),
      h('div', { class: 'seg' }, button('Oct −', () => { PL.octs[PL.part] = Math.max(0, PL.octs[PL.part] - 1); savePlay(); renderPlay(); }), h('span', { class: 'octv' }, 'C' + PL.octs[PL.part]), button('Oct +', () => { PL.octs[PL.part] = Math.min(6, PL.octs[PL.part] + 1); savePlay(); renderPlay(); })),
      h('label', {}, 'Accords ', seg([[0, 'Off'], [3, '3 notes'], [4, '4 notes']], PL.chord, (x) => set('chord', x))),
      h('label', {}, 'Arpège ', select([['off', 'Off'], ['up', 'Montant'], ['down', 'Descendant'], ['updown', 'Aller-retour'], ['rand', 'Aléatoire']], PL.arp, (x) => set('arp', x)),
        select([['0.5', '1/32'], ['1', '1/16'], ['2', '1/8'], ['4', '1/4']], String(PL.arpRate), (x) => set('arpRate', +x))),
      toggle('Maintien', PL.latch, (x) => set('latch', x)),
      toggle('+ Batterie', PL.drums, (x) => set('drums', x)),
      seg([['pads', 'Pads'], ['piano', 'Piano']], PL.layout, (x) => set('layout', x)),
      button('■ Stop notes', playPanic, { cls: 'warn' })));
    v.append(perfStrip());
    if (PL.drums) v.append(drumPads(true));
    v.append(h('div', { class: 'playsurf' }, PL.layout === 'piano' ? keyboard(PL.part) : notePads(), xyPad()));
  } else {
    v.append(h('div', { class: 'playbar opts' }, button('Kit ◀', () => changeKit(-1)), h('span', { class: 'patchname' }, S.kit.name), button('Kit ▶', () => changeKit(1)), button('🎲 Kit', () => changeKit(S.kits.length - S.kitIdx), { cls: 'accent' }),
      h('span', { class: 'hint' }, 'Haut du pad = fort, bas = doux. ● REC + lecture = enregistre dans le pattern.')));
    v.append(perfStrip());
    v.append(drumPads(false));
  }
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
  if (sh()) { useShift(); return SHORTCUTS[k][1](); }
  if (S.keyMode === 'pattern') return selectPattern(k);
  if (synthMode()) { // the 16 keys = 16 notes of the chosen scale (or chords), recorded when REC + play
    const part = partForMode(); if (S.keyHeld[k]) stopNotes(S.keyHeld[k].notes, S.keyHeld[k].part);
    S.keyHeld[k] = { part, notes: startNotes(k, v, part) }; void p;
    return;
  }
  if (S.clearHeld) { S.clearUsed = true; }
  const now = performance.now(), lt = S.lastTap; // double-tap a step = accent
  if (lt && lt.k === k && lt.tr === S.sel && now - lt.t < 350) { S.lastTap = null; toggleStep(S.sel, k, true); }
  else { S.lastTap = { k, tr: S.sel, t: now }; toggleStep(S.sel, k, false); }
  renderRolls();
}
function stepKeyRelease(k) {
  const held = S.keyHeld[k]; if (!held) return; S.keyHeld[k] = null;
  if (!PL.latch) stopNotes(held.notes, held.part);
}
/** NOTE / KEY BASS: first press enters the mode, next presses cycle single notes → 3-note chords → 4-note chords. */
function notesButton(mode) {
  if (sh()) { useShift(); return setKeyMode(mode); }
  if (S.keyMode !== mode) { setKeyMode(mode); return toast(`${mode === 'bass' ? 'BASSE' : 'SYNTHÉ'} : ${SCALES[PL.scale][0]} de ${NOTE_NAMES[PL.root]} · ${['notes seules', '', '', 'accords 3 notes', 'accords 4 notes'][chordOf(partForMode())]}`); }
  const key = mode === 'bass' ? 'chordBass' : 'chord', next = { 0: 3, 3: 4, 4: 0 }[PL[key] || 0];
  PL[key] = next; savePlay(); renderDevice(); if (S.tab === 'play') renderPlay();
  toast(next ? `Accords ${next} notes` : 'Notes seules');
}
function padTop(i, v) {
  if (sh()) { useShift(); toggleMute(i); return toast(`${TRACKS[i]} ${S.mutes[i] ? 'muté' : 'actif'}`); }
  if (S.clearHeld) { S.clearUsed = true; clearTrack(i); toast(`${TRACKS[i]} effacé`); return; } trigger(i, v); }
function padBot(i, v) {
  if (sh()) { useShift(); S.solos[i] = !S.solos[i]; applyKitMix(); refreshDevice(); renderSeq(); return toast(`Solo ${TRACKS[i]} ${S.solos[i] ? 'ON' : 'OFF'}`); }
  if (S.clearHeld) { S.clearUsed = true; clearTrack(i); return; }
  if (S.padBot === 'mute') toggleMute(i); else { selectTrack(i); trigger(i, v * 0.8); }
}

function renderDevice() {
  const v = views.device; v.innerHTML = ''; devEls = { pots: [], potLbl: [], top: [], bot: [], steps: [] };
  const knobs = h('div', { class: 'dev-knobs' },
    knob({ label: 'TEMPO', min: 30, max: 300, value: S.bpm, def: 120, step: 1, fmt: (x) => x.toFixed(0), onInput: (x) => { if (sh()) { useShift(); setSwing(((x - 30) / 270) * 0.75); controls.get('dev.tempo').el.setValue(S.bpm, true); } else setBpm(x, 'dev.tempo'); }, learn: 'dev.tempo' }),
    TRACKS.map((_, i) => { const k = knob({ label: '', min: 0, max: 1, value: potGet(i), def: 0.5, onInput: (x) => potSet(i, x), learn: `dev.pot.${i}` }); devEls.pots.push(k); return k; }));
  const pads = h('div', { class: 'dev-pads' },
    h('div', { class: 'padrow' }, TRACKS.map((_, i) => { const b = devBtn('', `dev.padTop.${i}`, (vv) => padTop(i, vv), null, 'pad'); devEls.top.push(b); return b; })),
    h('div', { class: 'padrow' }, TRACKS.map((_, i) => { const b = devBtn('', `dev.padBot.${i}`, (vv) => padBot(i, vv), null, 'pad'); devEls.bot.push(b); return b; })),
    h('div', { class: 'padrow labels' }, TRACKS.map((t) => h('span', {}, t.toUpperCase()))));
  const left = h('div', { class: 'dev-left' },
    devBtn('▶/❚❚', 'dev.play', () => (sh() ? (useShift(), restart()) : togglePlay()), null, 'wide play-btn'),
    devBtn('● REC', 'dev.rec', () => (sh() ? (useShift(), toggleRecord()) : setRec()), null, 'wide rec-btn'),
    h('div', { class: 'spacer' }),
    devBtn('HOLD TO CLEAR', 'dev.clear', clearPress, clearRelease, 'small'),
    h('div', { class: 'row2' }, devBtn('STEP', 'dev.modeStep', () => setKeyMode('step'), null, 'small mode-step'), devBtn('KEY BASS', 'dev.modeBass', () => notesButton('bass'), null, 'small mode-bass')));
  const ctrl = h('div', { class: 'dev-ctrl' },
    h('div', { class: 'grp' }, h('label', {}, 'DRUM KIT'), devBtn('<', 'dev.kitPrev', () => kitNav(-1)), devBtn('>', 'dev.kitNext', () => kitNav(1))),
    h('div', { class: 'grp' }, h('label', {}, 'PATTERN'), devBtn('<', 'dev.patPrev', () => patNav(-1)), devBtn('>', 'dev.patNext', () => patNav(1))),
    h('div', { class: 'grp' }, devBtn('PATTERN / SONG', 'dev.patsong', () => { S.songMode = !S.songMode; refreshDevice(); renderSong(); }, null, 'small'), devBtn('MENU ⇧', 'dev.menu', menuPress, menuRelease, 'menu-btn')),
    h('div', { class: 'grp pots' }, h('label', {}, 'POTS MODE'),
      ...[['level', 'STEP', 'dev.potsLevel'], ['tune', 'BASS', 'dev.potsTune'], ['tone', 'MIXER', 'dev.potsTone'], ['decay', 'FX', 'dev.potsDecay']].map(([m, l, id]) =>
        h('div', { class: 'potbtn' }, h('small', {}, POT_LABEL[m]), devBtn(l, id, () => (sh() ? (useShift(), showTab({ level: 'seq', tune: 'bass', tone: 'lead', decay: 'fx' }[m])) : setPots(m)), null, `pots-${m}`)))));
  const steps = h('div', { class: 'dev-steps' }, Array.from({ length: 16 }, (_, k) => {
    const b = devBtn(String(k + 1), `dev.step.${k}`, (vv) => stepKeyPress(k, vv), () => stepKeyRelease(k), `step ${STEP_COLORS(k)}`);
    b.dataset.step = k; b.addEventListener('contextmenu', () => { if (S.keyMode === 'step') { toggleStep(S.sel, k, true); } });
    devEls.steps.push(b); return b;
  }));
  const right = h('div', { class: 'dev-right' },
    h('label', {}, 'EFFECTS'), h('div', { class: 'row2' }, devBtn('FX1', 'dev.fx1', () => (sh() ? (useShift(), cycleFx('fx1')) : fxToggle('fx1')), null, 'fx1'), devBtn('FX2', 'dev.fx2', () => (sh() ? (useShift(), cycleFx('fx2')) : fxToggle('fx2')), null, 'fx2')),
    h('div', { class: 'row2' }, devBtn('STEP', 'dev.modeStep2', () => setKeyMode(S.keyMode === 'pattern' ? 'step' : S.keyMode === 'step' ? 'pattern' : 'step'), null, 'mode-step2'), devBtn('NOTE', 'dev.modeNote', () => notesButton('note'), null, 'mode-note')),
    h('label', {}, 'LOOPER'),
    [1, 2, 4, 8].map((n) => { let t0; const b = devBtn(String(n), `dev.loop.${n}`, () => { if (sh()) { useShift(); t0 = Infinity; return fillTrack(n); } t0 = performance.now(); setLooper(n); }, () => { if (performance.now() - t0 > 350 && S.looper === n) setLooper(n); }, 'loop'); b.dataset.looper = n; return b; }));
  const status = h('div', { class: 'dev-status', id: 'devStatus' });
  const opts = h('div', { class: 'dev-opts' },
    h('label', {}, 'Rangée basse des pads : ', select([['select', 'Sélectionner la piste'], ['mute', 'Mute / unmute']], S.padBot, (x) => { S.padBot = x; db.ls.set('padBot', x); })),
    h('div', { class: 'scalebox' }, h('b', {}, '🎹 Touches 1-16 en NOTE / KEY BASS :'),
      h('label', {}, 'Tonique ', select(NOTE_NAMES.map((n, i) => [String(i), n]), String(PL.root), (x) => { PL.root = +x; savePlay(); refreshDevice(); })),
      h('label', {}, 'Gamme ', select(Object.entries(SCALES).map(([k, [l]]) => [k, l]), PL.scale, (x) => { PL.scale = x; savePlay(); refreshDevice(); })),
      h('label', {}, 'Synthé ', select([['0', 'Notes seules'], ['3', 'Accords 3 notes'], ['4', 'Accords 4 notes']], String(PL.chord), (x) => { PL.chord = +x; savePlay(); })),
      h('label', {}, 'Basse ', select([['0', 'Notes seules'], ['3', 'Accords 3 notes'], ['4', 'Accords 4 notes']], String(PL.chordBass || 0), (x) => { PL.chordBass = +x; savePlay(); })),
      h('label', {}, 'Oct. synthé ', select([0, 1, 2, 3, 4, 5, 6].map((o) => [String(o), 'C' + o]), String(PL.octs.lead), (x) => { PL.octs.lead = +x; savePlay(); refreshDevice(); })),
      h('label', {}, 'Oct. basse ', select([0, 1, 2, 3, 4].map((o) => [String(o), 'C' + o]), String(PL.octs.bass), (x) => { PL.octs.bass = +x; savePlay(); refreshDevice(); })),
      button('🎹 Assigner les touches du RM-808 (1 min)', () => startWizard('notes'), { cls: 'accent' })),
    button('🔵 Connecter le RM-808 (Bluetooth)', connectBle, { cls: 'accent' }),
    button('🧭 Assistant de mapping RM-808', () => startWizard(), { cls: 'accent' }),
    h('span', { class: 'hint' }, 'Astuce : double-appui (ou clic droit) sur une touche de pas = accent. Maintiens MENU (ou Maj) pour les raccourcis. Tout bouton ou potard de l\'appli peut être assigné à ton RM-808 via l\'onglet MIDI.'));
  v.append(h('div', { class: 'device' },
    h('div', { class: 'dev-title' }, h('b', {}, 'RM-808'), h('span', {}, 'RHYTHM MAKER — contrôleur virtuel')),
    knobs, h('div', { class: 'dev-mid' }, left, h('div', { class: 'dev-center' }, pads, ctrl, steps), right), status), opts,
    h('details', { class: 'panel cheats', open: true, html: iconizeHtml('<summary>⌨️ Raccourcis du RM-808</summary>') + CHEATS }));
  refreshDevice();
}
function refreshDevice() {
  if (!devEls.pots) return;
  devEls.pots.forEach((k, i) => { k.setValue(potGet(i), true); k.querySelector('.knob-label')?.remove(); k.dataset.label = potLabel(i); k.classList.toggle('muted', !audible(i)); });
  document.body.classList.toggle('shift-on', sh());
  devEls.steps.forEach((b, k) => { const part = partForMode(); b.textContent = sh() ? SHORTCUTS[k][0] : synthMode() ? chordDegs(k, chordOf(part)).map((d) => noteName(degNote(d, part)).replace(/-?\d+$/, '')).join(' ') + (chordOf(part) ? '' : '') : String(k + 1); b.classList.toggle('notekey', synthMode() && !sh()); b.classList.toggle('rootkey', synthMode() && !sh() && ((degNote(k, part) - PL.root) % 12 + 12) % 12 === 0); });
  document.querySelectorAll('.menu-btn').forEach((b) => b.classList.toggle('on', sh()));
  devEls.bot.forEach((b, i) => { b.classList.toggle('sel', i === S.sel); b.classList.toggle('muted', !audible(i)); });
  document.querySelectorAll('.dbtn[class*="pots-"]').forEach((b) => b.classList.toggle('on', b.classList.contains('pots-' + S.pots)));
  for (const [m, c] of [['step', 'mode-step'], ['bass', 'mode-bass'], ['note', 'mode-note'], ['pattern', 'mode-step2']]) document.querySelectorAll('.' + c).forEach((b) => b.classList.toggle('on', S.keyMode === m));
  document.querySelectorAll('.mode-step2').forEach((b) => { b.classList.toggle('on', S.keyMode === 'pattern' || S.keyMode === 'step'); b.textContent = S.keyMode === 'pattern' ? 'PATTERN' : 'STEP'; });
  const f1 = engine.rack.list.find((f) => f.id === S.fx1), f2 = engine.rack.list.find((f) => f.id === S.fx2);
  document.querySelectorAll('.dbtn.fx1').forEach((b) => b.classList.toggle('on', !!f1?.enabled));
  document.querySelectorAll('.dbtn.fx2').forEach((b) => b.classList.toggle('on', !!f2?.enabled));
  const st = document.getElementById('devStatus');
  const layer = { pan: 'PAN (SHIFT)', lead: 'SYNTHÉ (macros)', bass: 'BASSE (macros)', trk: POT_LABEL[S.pots] }[potLayer()];
  if (st) st.textContent = `${sh() ? '⇧ SHIFT · ' : ''}Piste : ${TRACKS[S.sel]} · Mode touches : ${{ step: 'STEP (programmation)', pattern: 'PATTERN (choix 1-16)', note: 'NOTE (synthé)', bass: 'KEY BASS' }[S.keyMode]} · Potards : ${layer} · Kit : ${S.kit.name} · Pattern ${S.cur + 1}${S.songMode ? ' · SONG' : ''}`;
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

function rmBanner(part) {
  const ck = part === 'bass' ? 'chordBass' : 'chord', upd = () => { savePlay(); renderSynth(part); renderDevice(); };
  return h('div', { class: 'rmbanner' }, h('b', {}, `🎛️ Le RM-808 joue ${part === 'bass' ? 'la basse' : 'le synthé'} sur cet onglet`),
    h('span', { class: 'hint' }, 'Tous ses boutons jouent la gamme · les 12 potards règlent le son'),
    h('label', {}, 'Tonique ', select(NOTE_NAMES.map((n, i) => [String(i), n]), String(PL.root), (x) => { PL.root = +x; upd(); })),
    h('label', {}, 'Gamme ', select(Object.entries(SCALES).map(([k, [l]]) => [k, l]), PL.scale, (x) => { PL.scale = x; upd(); })),
    h('div', { class: 'seg' }, ...[[0, 'Notes'], [3, 'Accords 3'], [4, 'Accords 4']].map(([n, l]) => h('button', { class: `btn ${(PL[ck] || 0) === n ? 'on' : ''}`, onclick: () => { PL[ck] = n; upd(); } }, l))),
    h('div', { class: 'seg' }, button('Oct −', () => { PL.octs[part] = Math.max(0, PL.octs[part] - 1); upd(); }), h('span', { class: 'octv' }, 'C' + PL.octs[part]), button('Oct +', () => { PL.octs[part] = Math.min(6, PL.octs[part] + 1); upd(); })),
    toggle('Maintien', PL.latch, (x) => { PL.latch = x; savePlay(); if (!x) playPanic(); }));
}
function renderSynth(part) {
  const v = views[part]; v.innerHTML = '';
  const synth = synthOf(part); const P = synth.patch;
  v.append(rmBanner(part));
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
  if (e.target.matches?.('input, textarea')) return;
  // The RM-808 is a Bluetooth keyboard: its keys are learnable / mappable like MIDI controls.
  const code = e.code && e.code !== 'Unidentified' ? e.code : 'k_' + e.key, mapped = midi.map[`key:${code}`], reserved = kbdCtrl() || mapped || midi.learnTarget || (rmProfile() && KNOB_KEYS[code]);
  if ((code !== 'Escape' || kbdCtrl()) && (reserved || S.tab === 'midi')) {
    if (reserved) e.preventDefault();
    if (!e.repeat) keyEvent(code, down, 'Clavier');
    if (reserved) return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Shift') { S.shift = down; S.shiftUsed = true; refreshDevice(); return; }
  if (down && e.code === 'Space') { e.preventDefault(); e.shiftKey ? restart() : togglePlay(); return; }
  if (e.repeat) return;
  if (down) {
    const act = { ArrowLeft: () => selectPattern(S.cur - 1), ArrowRight: () => selectPattern(S.cur + 1), ArrowUp: () => changeKit(-1), ArrowDown: () => changeKit(1),
      r: () => setRec(), m: () => toggleMute(S.sel), n: SHORTCUTS[0][1], b: SHORTCUTS[1][1], c: copyPattern, v: pastePattern, q: undo, i: cycleMode, '?': () => showTab('help') }[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (act) { e.preventDefault(); act(); return; }
    if (/^[0-9]$/.test(e.key) && !e.shiftKey) { const t = TABS[e.key === '0' ? 9 : +e.key - 1]; if (t) { showTab(t[0]); return; } }
  }
  const part = S.tab === 'bass' ? 'bass' : S.tab === 'play' && S.play.part === 'bass' ? 'bass' : 'lead';
  const k = e.key.toLowerCase();
  if (down && (k === 'z' || k === 'x')) { if (part === 'lead') S.octave = clamp(S.octave + (k === 'x' ? 1 : -1), 0, 7); else S.bassOctave = clamp(S.bassOctave + (k === 'x' ? 1 : -1), 0, 7); toast('Octave ' + (part === 'lead' ? S.octave : S.bassOctave)); return; }
  const i = KEYMAP.indexOf(k); if (i < 0) return;
  if (down) { const n = ((part === 'lead' ? S.octave : S.bassOctave) + 1) * 12 + i; heldKeys.set(k, [part, n]); synthOf(part).keyDown(n, 0.85); if (part === 'bass') S.lastBassNote = n; document.querySelectorAll(`.key[data-note="${n}"]`).forEach((x) => x.classList.add('down')); }
  else { const hk = heldKeys.get(k); if (!hk) return; heldKeys.delete(k); synthOf(hk[0]).keyUp(hk[1]); document.querySelectorAll(`.key[data-note="${hk[1]}"]`).forEach((x) => x.classList.remove('down')); }
}

// ---------------------------------------------------------------- FX rack view
function applyChain(c) {
  engine.rack.load(c.chain.map(([type, params, mix]) => ({ type, params: params || {}, mix })));
  engine.rack.setTempo(S.bpm); engine.rack.sync(seq?.playing ? seq.next : engine.now);
  const find = (...types) => engine.rack.list.find((f) => types.includes(f.type))?.id || null;
  S.fx1 = find('djfilter', 'filter', 'autowah'); S.fx2 = find('crusher', 'decimator', 'gate', 'fuzz', 'pitch', 'tapeecho');
  S.chain = c.name; renderFx(); refreshDevice(); toast(`Chaîne « ${c.name} »`);
}
function randomizeFx(fx) {
  for (const [k, p] of Object.entries(fx.def.params)) {
    const v = p.options ? pick(p.options) : p.curve === 'exp' ? p.min * Math.pow(p.max / p.min, Math.random()) : p.min + Math.random() * (p.max - p.min);
    fx.set(k, p.step ? Math.round(v / p.step) * p.step : v);
  }
}
/** Hold-to-apply performance pads (DJ effects). Learnable: map any RM-808 button to them. */
function perfPads(cls = '') {
  const grid = h('div', { class: `perfpads ${cls}` });
  PERF.forEach(([id, label]) => {
    const el = h('div', { class: 'perfpad', 'data-perf': id }, label);
    const on = () => { el.classList.add('down'); engine.perf.start(id); };
    const off = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); engine.perf.stop(id); };
    el.addEventListener('pointerdown', (e) => { if (document.body.classList.contains('learning')) return; e.preventDefault(); el.setPointerCapture?.(e.pointerId); if (S.perfLatch && el.classList.contains('down')) off(); else on(); });
    el.addEventListener('pointerup', () => { if (!S.perfLatch) off(); }); el.addEventListener('pointercancel', () => { if (!S.perfLatch) off(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    registerControl(`perf.${id}`, el, { trigger: on, release: off, kind: 'button' });
    grid.append(el);
  });
  return grid;
}
function perfStrip() {
  const box = h('details', { class: 'perfbox', open: db.ls.get('perfOpen', innerWidth > 700) }, h('summary', {}, '⚡ Effets live — maintiens un pad'), perfPads('compact'));
  box.addEventListener('toggle', () => db.ls.set('perfOpen', box.open));
  return box;
}
function renderFx() {
  const v = views.fx; if (!v) return; v.innerHTML = '';
  const collapsed = db.ls.get('fxCollapsed', {});
  v.append(h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, '⚡ EFFETS LIVE (maintenir = appliquer)', toggle('Verrouiller', !!S.perfLatch, (x) => { S.perfLatch = x; if (!x) { engine.perf.stopAll(); document.querySelectorAll('.perfpad.down').forEach((e) => e.classList.remove('down')); } })), perfPads()));
  v.append(h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, '🎚️ CHAÎNES PRÊTES — un geste remplace tout le rack'),
    h('div', { class: 'chips wrap' }, FX_CHAINS.map((c) => h('button', { class: `chip ${S.chain === c.name ? 'on' : ''}`, onclick: () => applyChain(c) }, c.name)))));
  v.append(h('div', { class: 'panel' }, h('div', { class: 'ptitle' }, `➕ AJOUTER UN PLUGIN (${Object.keys(FX_TYPES).length} disponibles) — un geste`,
      h('div', { class: 'row' }, button('Tout ON/OFF', () => { const on = !engine.rack.list.every((f) => f.enabled); engine.rack.list.forEach((f) => f.setEnabled(on)); renderFx(); refreshDevice(); }),
        button('Replier tout', () => { const c = {}; engine.rack.list.forEach((f) => (c[f.id] = true)); db.ls.set('fxCollapsed', c); renderFx(); }),
        button('Vider', () => { engine.rack.clear(); S.chain = null; renderFx(); }, { cls: 'warn' }))),
    h('div', { class: 'fxcats' }, FX_CATS.map(([cat, label]) => h('div', { class: 'fxcat' }, h('small', {}, label),
      h('div', { class: 'chips wrap' }, Object.entries(FX_TYPES).filter(([, d]) => d.cat === cat).map(([k, d]) => h('button', { class: 'chip small', onclick: () => { const fx = engine.rack.add(k); fx.sync(seq?.playing ? seq.next : engine.now); S.chain = null; renderFx(); toast(`+ ${d.name}`); } }, d.name))))))));
  const list = h('div', { class: 'fxlist' });
  engine.rack.list.forEach((fx, idx) => {
    const isCol = collapsed[fx.id];
    const card = h('div', { class: `panel fx ${fx.enabled ? '' : 'off'} ${isCol ? 'col' : ''}` },
      h('div', { class: 'ptitle' }, h('span', { class: 'fxname', onclick: () => { collapsed[fx.id] = !isCol; db.ls.set('fxCollapsed', collapsed); renderFx(); } }, `${isCol ? '▸' : '▾'} ${idx + 1}. ${fx.def.name}`),
        h('div', { class: 'row' },
          toggle('ON', fx.enabled, (x) => { fx.setEnabled(x); card.classList.toggle('off', !x); refreshDevice(); }, { learn: `fx.${fx.id}.on` }),
          h('button', { class: `btn mini ${S.fx1 === fx.id ? 'on' : ''}`, onclick: () => { S.fx1 = S.fx1 === fx.id ? null : fx.id; renderFx(); refreshDevice(); } }, 'FX1'),
          h('button', { class: `btn mini ${S.fx2 === fx.id ? 'on' : ''}`, onclick: () => { S.fx2 = S.fx2 === fx.id ? null : fx.id; renderFx(); refreshDevice(); } }, 'FX2'),
          button('🎲', () => { randomizeFx(fx); renderFx(); }, { title: 'Réglages aléatoires' }),
          button('↑', () => { engine.rack.move(fx, -1); renderFx(); }), button('↓', () => { engine.rack.move(fx, 1); renderFx(); }),
          button('✕', () => { engine.rack.remove(fx); renderFx(); }))),
      isCol ? null : h('div', { class: 'knobs' },
        knob({ label: 'Mix', value: fx.mix, def: fx.def.mix, onInput: (x) => fx.setMix(x), learn: `fx.${fx.id}.mix`, size: 'sm' }),
        Object.entries(fx.def.params).map(([k, p]) => p.options
          ? h('label', { class: 'fxsel' }, p.label, select(p.options, fx.params[k], (x) => fx.set(k, x)))
          : knob({ label: p.label, min: p.min, max: p.max, value: fx.params[k], def: p.def, step: p.step, curve: p.curve, onInput: (x) => fx.set(k, x), learn: `fx.${fx.id}.${k}`, size: 'sm' }))));
    list.append(card);
  });
  v.append(h('div', { class: 'ptitle rackt' }, `RACK (${engine.rack.list.length} effets, dans l'ordre du signal) — FX1 / FX2 du RM-808 activent l'effet assigné`), list);
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
function logKnob(code, input) { msgCount++; document.querySelectorAll('.rxdot').forEach((d) => { d.classList.add('on'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('on'), 150); }); const [id, dir] = KNOB_KEYS[code]; logLine(`${input} · potard ${id.replace('dev.', '').toUpperCase()} ${dir > 0 ? '+' : '−'}  (${code})`); }
function logLine(line) {
  monitorLog.unshift(line); monitorLog.length = Math.min(monitorLog.length, 500);
  const mon = document.getElementById('midiMon'); if (mon) mon.textContent = monitorLog.join('\n');
}
async function connectBle(all = false) {
  if (!ble.supported) return toast('Bluetooth web indisponible : utilise Chrome/Edge (ordi, Android) ou Bluefy (iPad).');
  showTab('midi');
  try { const mode = await ble.connect(all === true); midiStatus(); renderMidi(); toast(mode === 'midi' ? 'RM-808 connecté en MIDI Bluetooth ✔' : 'Connecté — protocole propriétaire, voir le moniteur'); }
  catch (e) { logLine('🔵 ✖ ' + e.message + (all === true ? '' : ' — si le RM-808 n\'apparaît pas, essaie « Tous les appareils ».')); toast('Connexion Bluetooth annulée ou impossible'); }
}
async function connectHid() {
  try { await hid.connect(); renderMidi(); midiStatus(); toast('Appareil HID connecté'); } catch (e) { logLine('🟣 ✖ ' + e.message); toast('Connexion HID annulée ou impossible'); }
}
let lastMsgAt = 0, msgCount = 0;
function diagnosticReport() {
  return ['=== Rapport RM-808 Studio ===', new Date().toISOString(), 'Navigateur : ' + navigator.userAgent,
    `Web MIDI : ${midi.supported ? 'oui' : 'non'} (${midi.inputs.map((i) => i.name).join(', ') || 'aucune entrée'})`,
    `Bluetooth web : ${ble.supported ? 'oui' : 'non'} · connecté : ${ble.connected ? ble.mode : 'non'}`, `WebHID : ${hid.supported ? 'oui' : 'non'} · Manettes : ${pads.count}`,
    `Clavier RM-808 : ${decoder.kbdDetected ? 'détecté' : 'non détecté'} · touches réservées : ${kbdCtrl() ? 'oui' : 'non'}`, `Profil potards : ${rmProfile() ? 'oui' : 'non'} · inversé : ${db.ls.get('knobInvert', false) ? 'oui' : 'non'} · course : ${db.ls.get('knobSens', 32)}`, `Décodage brut : ${decoder.mode} · Messages reçus : ${msgCount} · Assignations : ${Object.keys(midi.map).length}`, ...ble.summary, '--- Assignations ---',
    ...Object.entries(midi.map).map(([k, e]) => `${k} → ${e.id}`), '--- Moniteur (plus récent en premier) ---', ...monitorLog.slice(0, 300)].join('\n');
}
async function copyReport() {
  const txt = diagnosticReport();
  try { await navigator.clipboard.writeText(txt); toast('Rapport copié — colle-le dans la conversation'); }
  catch (e) { const box = h('div', { class: 'wizard report' }, h('p', {}, 'Sélectionne tout, copie, puis colle dans la conversation :'), h('textarea', { rows: 10 }, txt), button('Fermer', () => box.remove())); document.body.append(box); box.querySelector('textarea').select(); }
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
  lastMsgAt = performance.now(); msgCount++; document.querySelectorAll('.rxdot').forEach((d) => { d.classList.add('on'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('on'), 150); });
  logLine(m.keyName ? `${m.input} · touche ${m.keyName} ${m.type === 'noteon' ? '▼' : '▲'}${m.rawHex ? '  [' + m.rawHex + ']' : ''}${midi.map[m.key] ? '  → ' + midi.map[m.key].id : ''}${m.learned ? '  ✔ appris → ' + m.learned : ''}` : m.rawHex ? `${m.input} · [${m.rawHex}]${m.learned ? '  ✔ appris → ' + m.learned : ''}` : `${m.input || ''} · ${m.type}${m.ch ? ' ch' + m.ch : ''}${m.num != null ? ' #' + m.num : ''}${m.val != null ? ' = ' + m.val : ''}${m.learned ? '  ✔ appris → ' + m.learned : ''}`);
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
  if (!m.ch) return; // only real MIDI notes are played as an instrument
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
  if (hid.connected) { pill.textContent = `🟣 ${hid.device.productName} (HID)`; pill.className = 'midi-pill ok'; return; }
  if (ble.connected) { pill.textContent = `🔵 ${ble.device.name || 'BLE'} (${ble.mode === 'midi' ? 'MIDI BLE' : 'brut'})`; pill.className = 'midi-pill ok'; return; }
  if (!midi.supported) { pill.textContent = ble.supported ? '🔵 Toucher pour connecter le RM-808' : 'Bluetooth web absent — ouvre dans Bluefy'; pill.className = 'midi-pill ' + (ble.supported ? '' : 'bad'); pill.onclick = ble.supported ? connectBle : null; return; }
  pill.textContent = midi.inputs.length ? `MIDI : ${midi.inputs.map((i) => i.name).join(', ')}` : 'MIDI : aucun appareil';
  pill.className = 'midi-pill ' + (midi.inputs.length ? 'ok' : '');
}
function renderMidi() {
  const v = views.midi; if (!v) return; v.innerHTML = '';
  const way = (ok, active, name, desc, ...btns) => h('div', { class: `way ${active ? 'active' : ok ? 'ok' : 'no'}` }, h('b', {}, (active ? '🟢 ' : ok ? '⚪ ' : '✖ ') + name), h('small', {}, desc), h('div', { class: 'row' }, btns));
  v.append(h('div', { class: 'panel blebox' }, h('div', { class: 'ptitle' }, 'COMPATIBILITÉ — TOUTES LES FAÇONS DE BRANCHER LE RM-808', h('div', { class: 'row' }, h('span', { class: 'rxdot', title: 'Clignote à chaque message reçu' }), h('small', {}, `${msgCount} message(s) reçu(s)`), button('📋 Copier le rapport', copyReport, { cls: 'accent' }))),
    h('div', { class: 'ways' },
      way(ble.supported, ble.connected, 'Bluetooth direct', ble.connected ? `Connecté à « ${ble.device.name || '?'} » — ${ble.mode === 'midi' ? 'MIDI Bluetooth standard' : 'protocole propriétaire (décodé automatiquement)'}. Reconnexion automatique.` : ble.supported ? 'Ferme l\'appli X808, puis connecte. Marche avec le MIDI Bluetooth et avec un protocole maison.' : 'Indisponible ici : ouvre le site dans Bluefy (iPad/iPhone) ou Chrome/Edge (ordi, Android).',
        ble.connected ? button('Déconnecter', () => { ble.disconnect(); setTimeout(() => { midiStatus(); renderMidi(); }, 300); }) : null,
        ble.supported && !ble.connected ? button('🔵 Connecter le RM-808', () => connectBle(false), { cls: 'accent' }) : null, ble.supported && !ble.connected ? button('Tous les appareils…', () => connectBle(true)) : null),
      way(midi.supported, midi.inputs.length > 0, 'MIDI (USB ou Bluetooth appairé au système)', midi.inputs.length ? 'Entrées : ' + midi.inputs.map((i) => i.name).join(', ') : midi.supported ? 'Aucune entrée vue. Branche le RM-808 en USB, ou appaire-le en MIDI Bluetooth dans le système (Mac : Configuration audio et MIDI).' : 'Indisponible dans ce navigateur (normal sur iPhone/iPad).'),
      way(true, decoder.kbdDetected || Object.keys(midi.map).some((k) => k.startsWith('key:')), 'Clavier Bluetooth ← le RM-808 fonctionne comme ça', 'Chaque bouton du RM-808 envoie une touche de clavier. Il suffit qu\'il soit connecté dans les réglages Bluetooth de l\'appareil (ça marche aussi dans Safari). Bluetooth direct en plus = toutes les touches sont reçues.',
        toggle('Touches réservées au RM-808', kbdCtrl(), (x) => { db.ls.set('kbdCtrl', x); toast(x ? 'Les raccourcis du clavier d\'ordinateur sont désactivés' : 'Raccourcis du clavier d\'ordinateur réactivés'); })),
      way(hid.supported, hid.connected, 'HID direct (ordinateur)', hid.connected ? `Connecté à « ${hid.device.productName} ».` : hid.supported ? 'Pour un RM-808 appairé à l\'ordinateur ou branché en USB qui n\'apparaît pas en MIDI.' : 'Indisponible ici (Chrome/Edge sur ordinateur uniquement).', hid.supported && !hid.connected ? button('🟣 Connecter en HID', connectHid) : null),
      way(pads.supported, pads.count > 0, 'Manette de jeu', pads.count ? 'Manette détectée : ses boutons et axes sont assignables.' : 'Détection automatique : appuie sur un bouton du RM-808 si le système le voit comme une manette.')),
    h('div', { class: 'row knobset' }, toggle('Profil RM-808 : potards intégrés', rmProfile(), (x) => { db.ls.set('rmProfile', x); renderMidi(); }),
      toggle('Inverser le sens des potards', db.ls.get('knobInvert', false), (x) => db.ls.set('knobInvert', x)),
      h('label', {}, 'Course des potards : ', select([['16', 'Rapide (16 crans)'], ['32', 'Normale (32 crans)'], ['64', 'Fine (64 crans)'], ['127', 'Très fine (127 crans)']], String(db.ls.get('knobSens', 32)), (x) => db.ls.set('knobSens', +x))),
      h('span', { class: 'hint' }, 'Les 13 potards du RM-808 sont reconnus d\'office (TEMPO = F1/F2, potards 1 à 12 = F3/F4 … \\ et /). Si un potard agit à l\'envers, active « Inverser ».')),
    h('div', { class: 'row' }, h('label', {}, 'Décodage du protocole propriétaire : ', select([['auto', 'Automatique'], ['kbd', 'Clavier HID'], ['event', 'Événements (identifiant + valeur)'], ['state', 'État complet (compare les paquets)']], decoder.mode, (x) => { decoder.mode = x; db.ls.set('rawMode', x); })),
      h('span', { class: 'hint' }, 'Si un potard ou un pad est mal reconnu en Bluetooth direct, change ce réglage puis refais l\'assistant.'))));
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
const WIZ_ALL = [
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
function startWizard(only) {
  const WIZ = only === 'notes' ? WIZ_ALL.filter(([id]) => id.startsWith('dev.step.') || ['dev.modeNote', 'dev.modeBass', 'dev.modeStep', 'dev.modeStep2', 'dev.menu', 'dev.play'].includes(id)) : rmProfile() ? WIZ_ALL.filter(([id]) => id !== 'dev.tempo' && !id.startsWith('dev.pot.')) : WIZ_ALL;
  if (!ble.connected && (!midi.supported || !midi.inputs.length)) toast('Aucune entrée MIDI détectée — connecte le RM-808 (Bluetooth MIDI ou USB) d\'abord.');
  showTab('device'); let i = 0;
  const box = h('div', { class: 'wizard' }); document.body.append(box);
  const end = () => { midi.cancelLearn(); box.remove(); document.querySelectorAll('.learn-target').forEach((x) => x.classList.remove('learn-target')); renderMidi(); };
  const stepTo = () => {
    document.querySelectorAll('.learn-target').forEach((x) => x.classList.remove('learn-target'));
    if (i >= WIZ.length) { toast('Mapping terminé ✔'); return end(); }
    const [id, label] = WIZ[i]; controls.get(id)?.el.classList.add('learn-target');
    box.innerHTML = '';
    box.append(h('div', {}, h('small', {}, `Assistant ${i + 1}/${WIZ.length}`), h('h3', {}, label), h('p', { class: 'hint' }, h('span', { class: 'rxdot' }), ' clignote quand le RM-808 envoie quelque chose. Si ce contrôle n\'envoie rien, passe-le.')),
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
  views.help.innerHTML = iconizeHtml(`<div class="panel help">
  <h2>RM-808 Studio — guide rapide</h2>
  <h3>Pas de son ?</h3><ul><li>Monte le volume de l'iPhone/iPad avec les boutons latéraux et vérifie que le Bluetooth n'envoie pas le son vers un casque ou une enceinte.</li><li>Touche une fois l'écran après avoir ouvert l'app : iOS n'autorise le son qu'après un toucher. Si la pastille rouge « Son en pause » apparaît en haut, touche-la.</li><li>L'app force la lecture même avec le bouton silencieux activé ; si ça ne suffit pas sur une ancienne version d'iOS, désactive le mode silencieux.</li></ul>
  <h3>1. Connecter ton RM-808</h3>
  <ul><li>Allume le RM-808 et associe-le en <b>Bluetooth MIDI</b> (ou USB) à ton appareil.
  <br>· <b>Mac</b> : Configuration audio et MIDI → Fenêtre → Studio MIDI → icône Bluetooth → Connecter.
  <br>· <b>Windows</b> : Chrome/Edge ne voient le MIDI Bluetooth que via un pont (ex. MIDIberry + loopMIDI) ; en USB ça marche directement.
  <br>· <b>Android</b> : associe-le via une appli MIDI BLE, puis ouvre Chrome.
  <br>· <b>iPad</b> : Safari ne supporte pas Web MIDI. Utilise un navigateur iOS avec Web MIDI (ex. « Web MIDI Browser ») et associe le RM-808 depuis ce navigateur ou une appli BLE MIDI.</li>
  <li>L'onglet <b>MIDI</b> liste <b>toutes les façons de brancher</b> le RM-808 (Bluetooth direct, MIDI, clavier Bluetooth, HID, manette) avec leur état, se reconnecte tout seul, et propose <b>📋 Copier le rapport</b> pour m'envoyer ce que l'appareil émet.</li>
  <li>Onglet <b>MIDI</b> → regarde le <b>moniteur</b> : tu vois ce que chaque potard / pad envoie.</li>
  <li><b>Le plus simple : 🔵 Connexion Bluetooth directe</b> (onglet MIDI) — ferme d'abord l'appli X808, puis « Connecter le RM-808 ». Marche dans Chrome/Edge (ordi, Android) et dans le navigateur <b>Bluefy</b> sur iPad, sans aucun réglage système.</li>
  <li><b>Le RM-808 est un clavier Bluetooth</b> : chacun de ses boutons envoie une touche. Connecte-le dans les réglages Bluetooth de l'appareil, ouvre l'onglet MIDI et lance l'assistant : chaque bouton s'assigne en un appui. L'option « Touches réservées au RM-808 » empêche ses boutons de déclencher les raccourcis du clavier d'ordinateur.</li>
  <li>Lance <b>🧭 Assistant RM-808</b> : il te demande de toucher chaque contrôle un par un et les assigne au contrôleur virtuel. Les contrôles qui n'envoient rien peuvent être passés.</li>
  <li><b>Mode Learn</b> : n'importe quel bouton/potard de l'appli (synthé, effets, pistes…) peut être assigné à un contrôle du RM-808. Les potards sans fin (encodeurs) : passe le mode en « Relatif ».</li></ul>
  <h3>Jouer sans le RM-808 (tablette, téléphone, souris)</h3>
  <ul><li>Onglet <b>🎹 Jouer</b> : choisis Synthé, Basse ou Batterie. Les pads de notes sont calés sur la gamme choisie (aucune fausse note), multi-doigts, on peut glisser d'un pad à l'autre. Haut du pad = plus fort.</li>
  <li><b>Accords</b> (un doigt = un accord), <b>Arpège</b> synchronisé au tempo, <b>Maintien</b> (les notes restent), pavé <b>XY</b> pour le filtre, bandeau de <b>presets</b> à toucher, option <b>+ Batterie</b> pour avoir les pads de batterie au-dessus des notes.</li>
  <li>● REC + lecture : ce que tu joues s'enregistre dans le pattern. ⛶ en haut à droite = plein écran.</li></ul>
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
  <h3>Plugins & rapidité</h3><ul><li><b>31 plugins d'effets</b> en 7 familles, ajoutés en un geste ; <b>12 chaînes prêtes</b> (Club, Lo-fi, Dub, Techno, Ambient, Vaporwave…) qui remplacent tout le rack d'un coup ; 🎲 sur chaque effet pour des réglages aléatoires ; cartes repliables.</li><li><b>⚡ Effets live</b> (onglets Jouer et Effets) : maintiens un pad pour appliquer — répétition 1/4 à 1/32, filtres qui montent/descendent, tape stop, reverse, réverbe / écho « throw », hachoir, crush. Chaque pad s'assigne à un bouton du RM-808 avec le mode Learn.</li><li><b>45 instruments</b> classés (Basses, Leads, Pads, Claviers, Plucks, FX) en un geste dans l'onglet Jouer.</li></ul>
  <h3>Raccourcis</h3>${CHEATS}<p>Échap = sortir du mode Learn</p></div>`);
}

// ---------------------------------------------------------------- boot
function renderAll() { renderPlay(); renderDevice(); renderSeq(); renderSynth('lead'); renderSynth('bass'); renderFx(); renderKits(); renderSong(); renderMidi(); renderProject(); renderHelp(); refreshHeader(); }

async function boot() {
  await engine.init();
  seq = new Sequencer(engine, onStep, onUiStep); seq.onBar = onBar; seq.getLength = () => pat().length;
  engine.leadSynth.setPatch(S.lead); engine.bassSynth.setPatch(S.bass); S.lead = engine.leadSynth.patch; S.bass = engine.bassSynth.patch;
  engine.rack.setTempo(S.bpm);
  engine.perf.setTempo(S.bpm);
  engine.rack.add('djfilter');
  const flt = engine.rack.add('filter', { enabled: false, params: { type: 'lowpass', freq: 600, q: 8, lfoRate: 0.25, lfoDepth: 0.6 } });
  const crush = engine.rack.add('decimator', { enabled: false, params: { rate: 6, bits: 8 } });
  engine.rack.add('eq3');
  engine.rack.add('delay', { mix: 0.18 });
  engine.rack.add('space', { mix: 0.18 });
  engine.rack.add('compressor', { params: { threshold: -14, ratio: 3, makeup: 1.2 } });
  S.fx1 = flt.id; S.fx2 = crush.id;
  const userKits = await db.all('kits'); S.kits.push(...userKits);
  applyKitMix();
  // demo groove in pattern 1
  randomGroove();
  buildShell(); renderAll(); showTab(db.ls.get('tab', matchMedia('(pointer: coarse)').matches ? 'play' : 'device')); drawScope();
  try { navigator.wakeLock?.request('screen').catch(() => {}); } catch (e) { /* optional */ }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !kbdCtrl()) setLearn(false); onKey(e, true); });
  window.addEventListener('keyup', (e) => onKey(e, false));
  decoder.onKbd = pads.onChange = hid.onChange = ble.onChange = () => { midiStatus(); if (S.tab === 'midi') renderMidi(); }; pads.start();
  // iOS suspends / interrupts audio (calls, lock screen, other apps): resume on the next touch or key.
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => wakeAudio(engine.ctx), { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeAudio(engine.ctx); });
  const audioPill = () => { const p = document.getElementById('audioPill'); if (p) p.hidden = engine.ctx.state === 'running'; };
  engine.ctx.addEventListener('statechange', audioPill); setInterval(audioPill, 1000);
  midi.listeners.add(routeMidi); midi.statusListeners.add(() => { midiStatus(); if (S.tab === 'midi') renderMidi(); });
  for (const k of Object.keys(midi.map)) if (k.startsWith('raw::') || (rmProfile() && k.startsWith('key:') && KNOB_KEYS[k.slice(4)])) delete midi.map[k];
  midi.save();
  await midi.init(); midiStatus();
}

document.getElementById('start').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true;
  try { await boot(); document.getElementById('splash').remove(); }
  catch (err) { console.error(err); document.getElementById('splashMsg').textContent = 'Erreur : ' + err.message; }
});
window.__rm808 = { S, engine, midi, ble, decoder, keyEvent, KNOB_KEYS, kbdCtrl, diagnosticReport, get seq() { return seq; } };
