// One icon family (24px grid, 2px round stroke) instead of emoji glyphs.
const P = {
  play: '<path d="M7 4.5v15l12.5-7.5z"/>', pause: '<path d="M8 5v14M16 5v14"/>', record: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', folder: '<path d="M3 7.5V18a1 1 0 001 1h16a1 1 0 001-1V9a1 1 0 00-1-1h-8l-2-2.5H4a1 1 0 00-1 1z"/>',
  bluetooth: '<path d="M7 7l10 10-5 4.5v-19l5 4.5L7 17"/>', wand: '<path d="M4 20L14.5 9.5M15 3v3M13.5 4.5h3M19.5 8.5v3M18 10h3M17.5 15v2M16.5 16h2"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-11h-6z"/>', sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', pencil: '<path d="M4 20l4.5-1L19 8.5 15.5 5 5 15.5z"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 5v8M12 5v8M16 5v8M8 13v6M12 13v6M16 13v6"/>',
  knobs: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10" r="2.5"/><circle cx="15.5" cy="10" r="2.5"/><path d="M7 16h10"/>',
  grid: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M3 15h18M8 4v16M13 4v16"/>',
  wave: '<path d="M2 12c1.7-5 3.3-5 5 0s3.3 5 5 0 3.3-5 5 0 3.3 5 5 0"/>', bass: '<path d="M2 14h3l2.5-7 3.5 12 3-9 2 5h6"/>',
  sparkles: '<path d="M11 3l1.7 5.3L18 10l-5.3 1.7L11 17l-1.7-5.3L4 10l5.3-1.7z"/><path d="M18.5 15l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  drum: '<ellipse cx="12" cy="8.5" rx="8" ry="3"/><path d="M4 8.5V16c0 1.7 3.6 3 8 3s8-1.3 8-3V8.5M7 3l3.5 4.5M17 3l-3.5 4.5"/>',
  song: '<path d="M4 6h11M4 11h11M4 16h7"/><path d="M19 7v9.5"/><circle cx="17" cy="17" r="2"/>', plug: '<circle cx="12" cy="12" r="8.5"/><path d="M8 11h.01M16 11h.01M12 8h.01M9.5 15h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .3c0 1.8-2.5 2.2-2.5 4M12 17.2h.01"/>', max: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  usb: '<path d="M12 3v14"/><circle cx="12" cy="19" r="2"/><path d="M12 13l-4-2.5V8M12 11l4-2V7"/><path d="M10.5 5h3"/>', gamepad: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7 10v4M5 12h4M15.5 11h.01M18 13h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>', loop: '<path d="M4 12a8 8 0 0113.7-5.6M20 12a8 8 0 01-13.7 5.6M18 3v4h-4M6 21v-4h4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"/>', dot: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>', ring: '<circle cx="12" cy="12" r="5"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
  shift: '<path d="M12 4l8 8h-4.5v7h-7v-7H4z"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
};
export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;
// Leading glyphs in labels → icon names
export const GLYPHS = [
  ['▶/❚❚', ['play', 'pause']], ['🎲', 'dice'], ['💾', 'save'], ['📁', 'folder'], ['📂', 'folder'], ['🔵', 'bluetooth'], ['🧭', 'wand'], ['📋', 'clipboard'], ['⚡', 'bolt'],
  ['🎚️', 'sliders'], ['➕', 'plus'], ['✏️', 'pencil'], ['🎹', 'keys'], ['🎛️', 'knobs'], ['▦', 'grid'], ['〰️', 'wave'], ['🎸', 'bass'], ['✨', 'sparkles'], ['🥁', 'drum'], ['🎼', 'song'],
  ['🔌', 'plug'], ['❓', 'help'], ['⛶', 'max'], ['⇩', 'download'], ['⇧', 'upload'], ['🗑', 'trash'], ['⏺', 'record'], ['●', 'record'], ['■', 'stop'], ['↩', 'undo'], ['✕', 'x'],
  ['🟣', 'usb'], ['🎮', 'gamepad'], ['⚙️', 'settings'], ['🎯', 'target'], ['⟳', 'loop'], ['⌨️', 'keyboard'], ['🟢', 'dot'], ['⚪', 'ring'], ['✖', 'x'], ['✔', 'check'], ['▶', 'chevR'], ['◀', 'chevL'],
];
export function splitGlyph(str) {
  for (const [g, name] of GLYPHS) if (str.startsWith(g)) return [Array.isArray(name) ? name : [name], str.slice(g.length).replace(/^️/, '').trimStart()];
  return null;
}
export function iconizeHtml(html) {
  let out = html;
  for (const [g, name] of GLYPHS) if (g.length > 1 || /\p{Extended_Pictographic}/u.test(g)) out = out.split(g + '️').join(g).split(g).join(Array.isArray(name) ? name.map((n) => icon(n)).join('') : icon(name));
  return out;
}
