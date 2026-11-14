// Every web-reachable way to talk to the RM-808 (or any controller) besides Web MIDI:
//  - Bluetooth LE via Web Bluetooth: standard BLE-MIDI is decoded as MIDI; anything else is handled by RawDecoder
//  - WebHID (desktop Chrome/Edge): raw HID input reports → RawDecoder
//  - Gamepad API: buttons / axes become learnable controls
export const BLE_MIDI_SERVICE = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const BLE_MIDI_CHAR = '7772e5db-3868-4112-a1a9-f2669d106bf3';
const s16 = (x) => `0000${x}-0000-1000-8000-00805f9b34fb`;
// Services commonly used by BLE modules (UART bridges, vendor services). Web Bluetooth only exposes listed services.
const CANDIDATES = [BLE_MIDI_SERVICE, '6e400001-b5a3-f393-e0a9-e50e24dcca9e', '49535343-fe7d-4ae5-8fa9-9fafd205e455', '0000fe59-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 'bc2f4cc6-aaef-4351-9034-d66268e328f0', '569a1101-b87f-490c-92cb-11ba5ea5167c', '0003cdd0-0000-1000-8000-00805f9b0131',
  '00005500-d102-11e1-9b23-00025b00a5a5', 'f000ffc0-0451-4000-b000-000000000000', '0000d0ff-3c17-d293-8e48-14fe2e4da212',
  ...['ffe0', 'ffe5', 'fff0', 'fff1', 'fff3', 'ff00', 'ff10', 'ff12', 'ffd0', 'ffd5', 'ffa0', 'ffb0', 'ffc0', 'ffcc', 'ae00', 'ae30', 'ae3a', 'af00', 'af30', 'fee7', 'fee0', 'fee1', 'fe00', 'fd00', 'fda0', 'fe95',
    'ee00', 'ee01', 'f000', 'a000', 'a002', 'abf0', 'ab00', 'e0ff', 'cc00', 'cdd0', '18f0', '1910', '1812', '1800', '1801', '180a', '180f'].map(s16)];

// USB HID keyboard usage → KeyboardEvent.code (same names as the browser's own keyboard events)
const HID_CODES = (() => {
  const m = {}; 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => (m[4 + i] = 'Key' + c));
  for (let i = 1; i <= 9; i++) m[0x1d + i] = 'Digit' + i; m[0x27] = 'Digit0';
  ['Enter', 'Escape', 'Backspace', 'Tab', 'Space', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash', 'IntlHash', 'Semicolon', 'Quote', 'Backquote', 'Comma', 'Period', 'Slash', 'CapsLock'].forEach((c, i) => (m[0x28 + i] = c));
  for (let i = 1; i <= 12; i++) m[0x39 + i] = 'F' + i;
  ['PrintScreen', 'ScrollLock', 'Pause', 'Insert', 'Home', 'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract', 'NumpadAdd', 'NumpadEnter'].forEach((c, i) => (m[0x46 + i] = c));
  for (let i = 1; i <= 9; i++) m[0x58 + i] = 'Numpad' + i; m[0x62] = 'Numpad0'; m[0x63] = 'NumpadDecimal'; m[0x64] = 'IntlBackslash'; m[0x65] = 'ContextMenu';
  for (let i = 13; i <= 24; i++) m[0x68 + i - 13] = 'F' + i;
  ['ControlLeft', 'ShiftLeft', 'AltLeft', 'MetaLeft', 'ControlRight', 'ShiftRight', 'AltRight', 'MetaRight'].forEach((c, i) => (m[0xe0 + i] = c));
  return m;
})();
export const hidCode = (u) => HID_CODES[u] || 'Usage' + u.toString(16);
const shortId = (uuid) => { const u = String(uuid).toLowerCase(); return u.length > 8 ? u.slice(4, 8) : u.replace(/^0x/, '').padStart(4, '0'); };
const sameUuid = (a, b) => { a = String(a).toLowerCase(); b = String(b).toLowerCase(); return a === b || (a.length <= 8 && b.slice(4, 8) === a.padStart(4, '0')); };

export const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const pop = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };

/**
 * Turns unknown binary packets into learnable controls.
 *  - "event" packets (short: id bytes + value): control = all bytes but the last, value = last byte
 *  - "state" packets (fixed-length snapshot of the whole surface): each byte that changes is a control;
 *    single-bit flips are buttons, bytes that move by several bits are knobs (auto-reclassified).
 * Values are auto-ranged from what has been observed.
 */
export class RawDecoder {
  constructor(midi) { this.midi = midi; this.mode = 'auto'; this.prev = {}; this.analog = new Set(); this.range = {}; this.kb = {}; this.kbdDetected = false; this.onKey = null; }
  /** Standard HID keyboard report: [modifiers, 0, key1..key6] → key down / up events. */
  feedKbd(input, id, u8) {
    const now = new Set(), prev = this.kb[id] || new Set();
    for (let b = 0; b < 8; b++) if ((u8[0] >> b) & 1) now.add(0xe0 + b);
    for (let i = 2; i < u8.length; i++) if (u8[i] > 3) now.add(u8[i]);
    this.kb[id] = now; if (!this.kbdDetected) { this.kbdDetected = true; this.onKbd && this.onKbd(); }
    for (const u of now) if (!prev.has(u)) this.onKey(hidCode(u), true, input, hex(u8));
    for (const u of prev) if (!now.has(u)) this.onKey(hidCode(u), false, input, hex(u8));
  }
  norm(key, v) {
    const r = (this.range[key] ||= { min: v, max: v }); r.min = Math.min(r.min, v); r.max = Math.max(r.max, v);
    const lo = r.max - r.min >= 100 ? r.min : 0, hi = r.max - r.min >= 100 ? r.max : (r.max > 127 ? 255 : 127);
    return Math.round(Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * 127);
  }
  feed(input, id, u8, force) {
    const looksKbd = u8.length === 8 && u8[1] === 0 && u8.slice(2).every((b) => b === 0 || (b >= 4 && b <= 0xe7));
    if (this.onKey && !force && (this.mode === 'kbd' || (this.mode === 'auto' && looksKbd && (id.includes('2a4d') || this.kbdDetected)))) return this.feedKbd(input, id, u8);
    const mode = force || (this.mode === 'auto' || this.mode === 'kbd' ? (u8.length >= 6 ? 'state' : 'event') : this.mode), rawHex = hex(u8);
    if (mode === 'event') {
      const last = u8[u8.length - 1] ?? 0, key = `raw:${id}:${hex(u8.slice(0, Math.max(1, u8.length - 1)))}`;
      return this.midi.dispatch({ type: 'cc', ch: 0, num: 0, val: this.norm(key, last), key, rawLast: last, input, rawHex });
    }
    const base = `raw:${id}:${u8.length}`, prev = this.prev[base]; this.prev[base] = u8.slice();
    if (!prev) return this.midi.dispatch({ type: 'other', input, rawHex });
    let any = false;
    for (let i = 0; i < u8.length; i++) {
      const x = u8[i] ^ prev[i]; if (!x) continue; any = true;
      const bkey = `${base}:b${i}`;
      if (pop(x) > 1 && !this.analog.has(bkey)) { // a knob: migrate anything learned as "bit buttons" on this byte
        this.analog.add(bkey); let moved = false;
        for (const k of Object.keys(this.midi.map)) if (k.startsWith(bkey + '.')) { if (!this.midi.map[bkey]) this.midi.map[bkey] = this.midi.map[k]; delete this.midi.map[k]; moved = true; }
        if (moved) this.midi.save();
      }
      if (this.analog.has(bkey)) this.midi.dispatch({ type: 'cc', ch: 0, num: i, val: this.norm(bkey, u8[i]), key: bkey, rawLast: u8[i], input, rawHex });
      else { const bit = Math.log2(x), on = !!(u8[i] & x); this.midi.dispatch({ type: on ? 'noteon' : 'noteoff', ch: 0, num: i * 8 + bit, val: on ? 127 : 0, key: `${bkey}.${bit}`, input, rawHex }); }
    }
    if (!any) this.midi.dispatch({ type: 'other', input, rawHex });
  }
}

export class BleLink {
  constructor(midi, log, decoder) { this.midi = midi; this.log = log; this.decoder = decoder; this.device = null; this.mode = null; this.manual = false; this.summary = []; }
  get supported() { return !!navigator.bluetooth; }
  get connected() { return !!this.device?.gatt?.connected; }
  async connect(all = false) {
    const opts = all ? { acceptAllDevices: true, optionalServices: CANDIDATES }
      : { filters: [{ namePrefix: 'iDance' }, { namePrefix: 'RM' }, { namePrefix: 'X808' }, { namePrefix: 'X-808' }, { services: [BLE_MIDI_SERVICE] }], optionalServices: CANDIDATES };
    this.device = await navigator.bluetooth.requestDevice(opts);
    this.manual = false; this.retries = 0;
    this.device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
    return this.attach();
  }
  async attach() {
    this.log(`Connexion à « ${this.device.name || 'appareil sans nom'} »…`);
    const server = await this.device.gatt.connect();
    const services = await server.getPrimaryServices();
    this.summary = [`Appareil : ${this.device.name || '?'}`, `Services : ${services.map((s) => s.uuid).join(', ') || 'aucun'}`];
    this.log(`${services.length} service(s) accessible(s) : ${services.map((s) => s.uuid).join(', ') || 'aucun'}`);
    let notifies = 0;
    for (const svc of services) {
      let chars = [];
      try { chars = await svc.getCharacteristics(); } catch (e) { continue; }
      for (const c of chars) {
        const pr = Object.entries({ read: c.properties.read, write: c.properties.write, writeNR: c.properties.writeWithoutResponse, notify: c.properties.notify, indicate: c.properties.indicate }).filter(([, v]) => v).map(([k]) => k).join('/');
        const line = `  · ${String(svc.uuid).slice(0, 8)} / ${c.uuid} [${pr}]`; this.log(line); this.summary.push(line);
        if (c.properties.notify || c.properties.indicate) {
          const isMidi = sameUuid(c.uuid, BLE_MIDI_CHAR);
          c.addEventListener('characteristicvaluechanged', (e) => this.onPacket(new Uint8Array(e.target.value.buffer, e.target.value.byteOffset, e.target.value.byteLength), c.uuid, isMidi));
          try { await c.startNotifications(); notifies++; } catch (e) { this.log(`    (notifications refusées : ${e.message})`); }
        }
        if (c.properties.read && !c.properties.notify) { try { const v = new Uint8Array((await c.readValue()).buffer); const l = `    lecture : ${hex(v)}  « ${new TextDecoder().decode(v).replace(/[^\x20-\x7e]/g, '.')} »`; this.log(l); this.summary.push(l); } catch (e) { /* */ } }
      }
    }
    this.mode = services.some((s) => sameUuid(s.uuid, BLE_MIDI_SERVICE)) ? 'midi' : 'raw'; this.retries = 0;
    this.log(this.mode === 'midi'
      ? '✔ MIDI Bluetooth standard détecté : le RM-808 est utilisable directement (assistant / Learn).'
      : notifies ? `Protocole propriétaire : ${notifies} flux écouté(s). Touche les contrôles — ils s'affichent ci-dessous et se règlent avec l'assistant / le Learn.`
        : '✖ Aucun flux exploitable trouvé. Utilise « 📋 Copier le rapport » et envoie-le pour ajouter les bons identifiants.');
    this.onChange && this.onChange();
    return this.mode;
  }
  onDisconnect() {
    this.onChange && this.onChange();
    if (this.manual) return this.log('Déconnecté.');
    if (++this.retries > 6) return this.log('⚠ Connexion perdue — reconnecte le RM-808.');
    this.log(`⚠ Connexion perdue — nouvelle tentative (${this.retries}/6)…`);
    setTimeout(() => this.attach().catch(() => this.onDisconnect()), 800 * this.retries);
  }
  disconnect() { this.manual = true; try { this.device?.gatt.disconnect(); } catch (e) { /* */ } }
  onPacket(u8, uuid, isMidi) {
    const name = this.device?.name || 'BLE';
    if (isMidi) { for (const msg of decodeBleMidi(u8)) this.midi.handle(msg, { name: name + ' (BLE)' }); return; }
    this.decoder.feed(`${name} ${shortId(uuid)}`, shortId(uuid), u8);
  }
}

/** Decode a BLE-MIDI packet (header + timestamps + running status) into plain MIDI messages. */
export function decodeBleMidi(p) {
  const out = []; let i = 1, status = 0;
  const len = (st) => (st >= 0xf0 ? ({ 0xf1: 2, 0xf2: 3, 0xf3: 2 }[st] || 1) : ((st & 0xf0) === 0xc0 || (st & 0xf0) === 0xd0 ? 2 : 3));
  while (i < p.length) {
    if (p[i] & 0x80) { i++; if (i >= p.length) break; if (p[i] & 0x80) { status = p[i]; i++; } } // timestamp, then optional status
    if (status === 0xf0) { while (i < p.length && p[i] !== 0xf7) i++; i++; status = 0; continue; } // skip sysex
    if (!status) { i++; continue; }
    const n = len(status) - 1; if (i + n > p.length) break;
    out.push([status, ...p.slice(i, i + n)]); i += n;
    while (i < p.length && !(p[i] & 0x80)) { if (i + n > p.length) break; out.push([status, ...p.slice(i, i + n)]); i += n; } // running status
  }
  return out;
}

/** WebHID: raw input reports from a HID device (desktop Chrome / Edge). */
export class HidLink {
  constructor(log, decoder) { this.log = log; this.decoder = decoder; this.device = null; }
  get supported() { return !!navigator.hid; }
  get connected() { return !!this.device?.opened; }
  async connect() {
    const [d] = await navigator.hid.requestDevice({ filters: [] }); if (!d) throw new Error('aucun appareil choisi');
    this.device = d; if (!d.opened) await d.open();
    this.log(`HID « ${d.productName} » ouvert (${d.collections.length} collection(s)). Touche les contrôles.`);
    d.addEventListener('inputreport', (e) => this.decoder.feed(`${d.productName} HID`, 'hid' + e.reportId, new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength), 'state'));
    this.onChange && this.onChange();
  }
}

/** Gamepad API: some Bluetooth controllers expose themselves as a game controller. */
export class GamepadLink {
  constructor(midi, log) { this.midi = midi; this.log = log; this.state = {}; this.count = 0; }
  get supported() { return !!navigator.getGamepads; }
  start() {
    if (!this.supported) return;
    addEventListener('gamepadconnected', (e) => { this.log(`🎮 Manette détectée : ${e.gamepad.id} (${e.gamepad.buttons.length} boutons, ${e.gamepad.axes.length} axes)`); this.count++; this.onChange && this.onChange(); if (!this.raf) this.poll(); });
    addEventListener('gamepaddisconnected', () => { this.count = Math.max(0, this.count - 1); this.onChange && this.onChange(); });
  }
  poll() {
    let any = false;
    for (const g of navigator.getGamepads()) {
      if (!g) continue; any = true; const st = (this.state[g.index] ||= { b: [], a: [] }), input = `🎮 ${g.id.slice(0, 24)}`;
      g.buttons.forEach((b, i) => { if (b.pressed !== !!st.b[i]) { st.b[i] = b.pressed; this.midi.dispatch({ type: b.pressed ? 'noteon' : 'noteoff', ch: 0, num: i, val: b.pressed ? Math.round((b.value || 1) * 127) : 0, key: `gp:${g.index}:b${i}`, input }); } });
      g.axes.forEach((a, i) => { if (Math.abs(a - (st.a[i] ?? 0)) > 0.02) { st.a[i] = a; this.midi.dispatch({ type: 'cc', ch: 0, num: i, val: Math.round(((a + 1) / 2) * 127), key: `gp:${g.index}:a${i}`, input }); } });
    }
    this.raf = any ? requestAnimationFrame(() => this.poll()) : null;
  }
}
