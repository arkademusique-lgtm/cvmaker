// Direct Bluetooth LE connection (Web Bluetooth) — no OS pairing / Web MIDI needed.
// 1) If the device exposes the standard BLE-MIDI service, packets are decoded as MIDI.
// 2) Otherwise every "notify" characteristic is subscribed and raw packets are logged and
//    turned into learnable pseudo-controls (experimental reverse-engineering mode).
export const BLE_MIDI_SERVICE = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const BLE_MIDI_CHAR = '7772e5db-3868-4112-a1a9-f2669d106bf3';
const s16 = (x) => `0000${x}-0000-1000-8000-00805f9b34fb`;
// Common services used by cheap BLE modules (UART bridges etc.). Web Bluetooth only exposes listed services.
const CANDIDATES = [BLE_MIDI_SERVICE, '6e400001-b5a3-f393-e0a9-e50e24dcca9e', '0000fe59-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  ...['ffe0', 'ffe5', 'fff0', 'fff1', 'ff00', 'ffd0', 'ae00', 'ae30', 'fee7', 'fee0', 'fe00', 'ffb0', 'ffc0', 'ee00', 'f000', '1800', '1801', '180a', '180f'].map(s16)];

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join(' ');

export class BleLink {
  constructor(midi, log) { this.midi = midi; this.log = log; this.device = null; this.mode = null; this.lastRaw = {}; }
  get supported() { return !!navigator.bluetooth; }
  async connect() {
    this.device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: CANDIDATES });
    this.device.addEventListener('gattserverdisconnected', () => { this.log(`⚠ ${this.device.name} déconnecté`); this.onChange && this.onChange(); });
    this.log(`Connexion à « ${this.device.name || 'appareil sans nom'} »…`);
    const server = await this.device.gatt.connect();
    const services = await server.getPrimaryServices();
    this.log(`${services.length} service(s) accessible(s) : ${services.map((s) => s.uuid).join(', ') || 'aucun'}`);
    let notifies = 0;
    for (const svc of services) {
      let chars = [];
      try { chars = await svc.getCharacteristics(); } catch (e) { continue; }
      for (const c of chars) {
        const pr = Object.entries({ read: c.properties.read, write: c.properties.write, writeNR: c.properties.writeWithoutResponse, notify: c.properties.notify, indicate: c.properties.indicate }).filter(([, v]) => v).map(([k]) => k).join('/');
        this.log(`  · ${svc.uuid.slice(0, 8)} / ${c.uuid} [${pr}]`);
        if (c.properties.notify || c.properties.indicate) {
          const isMidi = c.uuid === BLE_MIDI_CHAR;
          c.addEventListener('characteristicvaluechanged', (e) => this.onPacket(new Uint8Array(e.target.value.buffer), c.uuid, isMidi));
          try { await c.startNotifications(); notifies++; } catch (e) { this.log(`    (notifications refusées : ${e.message})`); }
        }
        if (c.properties.read && !c.properties.notify) { try { const v = new Uint8Array((await c.readValue()).buffer); this.log(`    lecture : ${hex(v)}  « ${new TextDecoder().decode(v).replace(/[^\x20-\x7e]/g, '.')} »`); } catch (e) { /* */ } }
      }
    }
    this.mode = services.some((s) => s.uuid === BLE_MIDI_SERVICE) ? 'midi' : 'raw';
    this.log(this.mode === 'midi'
      ? '✔ MIDI Bluetooth standard détecté : le RM-808 est utilisable directement (assistant / Learn).'
      : notifies ? `Protocole propriétaire : ${notifies} flux écouté(s). Touche les contrôles et regarde les paquets ci-dessous — le Learn fonctionne en mode « brut ».`
        : '✖ Aucun service connu exposé. Envoie-moi la liste ci-dessus pour que j\'ajoute les bons identifiants.');
    this.onChange && this.onChange();
    return this.mode;
  }
  disconnect() { try { this.device?.gatt.disconnect(); } catch (e) { /* */ } }
  get connected() { return !!this.device?.gatt?.connected; }

  onPacket(u8, uuid, isMidi) {
    const name = this.device?.name || 'BLE';
    if (isMidi) { for (const msg of decodeBleMidi(u8)) this.midi.handle(msg, { name: name + ' (BLE)' }); return; }
    // Raw packet → pseudo control. Key = characteristic + all bytes but the last; value = last byte.
    const id = uuid.slice(4, 8), body = hex(u8.slice(0, Math.max(1, u8.length - 1))), last = u8[u8.length - 1] ?? 0;
    const key = `raw:${id}:${body}`;
    const prev = this.lastRaw[key]; this.lastRaw[key] = last;
    const max = (this.maxRaw ||= {})[key] = Math.max(this.maxRaw[key] || 0, last); // auto-range 0-127 or 0-255
    this.midi.dispatch({ type: 'cc', ch: 0, num: 0, val: Math.round((last / (max > 127 ? 255 : 127)) * 127), key, rawLast: last, raw: [...u8], input: `${name} brut ${id}`, rawHex: hex(u8), prevVal: prev });
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
