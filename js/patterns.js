// Ready-made patterns for every genre: 2 hand-written grooves per groove family (A / B),
// from which 8 song sections are derived (intro, verse A/B, build, drop, drop 2, break, fill).
// Notation, 16 characters = 16 steps:  '.' off · 'x' hit · 'X' accent.
// Bass / lead lines: '.' rest · '0'-'7' scale degree · 'a'-'h' = degree 0-7 one octave up · '_' holds (slides) the previous note.
import { GENRES } from './genres.js';

const T = { k: 0, s: 1, ht: 2, mt: 3, lt: 4, r: 5, c: 6, cb: 7, cy: 8, oh: 9, h: 10 };
const G = (drums, bass, lead) => ({ drums, bass, lead });
export const GROOVES = {
  boombap: [G({ k: 'x......x..x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' }, '0......0..3.....', '..4...3...2...0.'),
    G({ k: 'x......x..x..x..', s: '....X.......X..x', h: 'x.x.x.x.x.x.x...', oh: '..............x.' }, '0......0..3..5..', '4.4.3...2.0.....')],
  lofi: [G({ k: 'x.....x...x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', r: '.......x......x.' }, '0.....0...4.....', '..2.4...3...2...'),
    G({ k: 'x.....x.x.....x.', s: '....X.......X...', h: 'x.xxx.x.x.xxx.x.', r: '...........x....' }, '0.....0.2.....4.', '7...6...4...2...')],
  trap: [G({ k: 'x.........x.....', c: '........X.......', h: 'x.x.x.x.x.x.x.x.' }, '0.........0...3.', '..a...7...4.....'),
    G({ k: 'x..x......x...x.', c: '........X.......', h: 'xxx.x.xxx.x.xxxx', oh: '.......x........' }, '0..0......0_._5.', 'a.7.a...4...2...')],
  drill: [G({ k: 'x..x.......x....', c: '......X.......X.', s: '......x.......x.', h: 'x.xx..x.x.xx..x.' }, '0..0.......5....', '..4..3..2.......'),
    G({ k: 'x.....x....x..x.', c: '......X.......X.', h: 'x.x.x.xx..x.x.xx' }, '0.....3....5_...', '4..4..3..2..1...')],
  phonk: [G({ k: 'x.........x.....', c: '........X.......', h: 'x.x.x.x.x.x.x.x.', cb: 'x..x..x.x..x..x.' }, '0.........0.....', 'a..7..a.7..4..2.'),
    G({ k: 'x.....x...x.....', c: '........X.......', h: 'x.x.x.x.x.x.x.x.', cb: 'x..x..x..x..x.x.' }, '0.....0...3.....', 'a..a..7.4..4..2.')],
  halftime: [G({ k: 'x.........x.....', s: '........X.......', c: '........x.......', h: 'x...x...x...x...' }, '0_______0.....3.', '........4...3...'),
    G({ k: 'x..x......x.....', s: '........X.......', h: 'x.x.x.x.x.x.x.x.', oh: '..............x.' }, '0..0......0_5...', 'a.......7...4...')],
  dnb: [G({ k: 'x.........x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' }, '0_____....0___3.', '4.......3.......'),
    G({ k: 'x.........xx....', s: '....X.......X..x', h: 'x.xxx.x.x.xxx.x.', r: '.......x......x.' }, '0__.0.....5_3_..', 'a...7...4...3...')],
  dnb2step: [G({ k: 'x.........x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x...', oh: '..............x.' }, '0..0......0..3..', '..4.....3.......'),
    G({ k: 'x..x......x..x..', s: '....X.......X...', h: 'x.xxx.x.x.xxx.x.' }, '0..0..5...0..3..', 'a.a.7...4.4.3...')],
  rollers: [G({ k: 'x.........x.....', s: '....X.......X...', h: 'x.xxx.xxx.xxx.xx', r: '...x.......x....' }, '0_..0_..0_..3_..', '................'),
    G({ k: 'x......x..x.....', s: '....X..x....X...', h: 'xxXxxxXxxxXxxxXx' }, '0_.00_..0_..5_3.', '4.......3...2...')],
  jungle: [G({ k: 'x.........x.....', s: '....X..x.x..X..x', h: 'x.x.x.x.x.x.x.x.', mt: '..x.......x.....' }, '0_______0_______', '..4.....3.......'),
    G({ k: 'x..x......x.....', s: '....X.x..x..X.xx', h: 'x.x.x.x.x.x.x.x.', ht: '.............x..' }, '0_______5___3___', '4...4...3...2...')],
  pop: [G({ k: 'x.......x.x.....', c: '....X.......X...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, '0.0.0.0.5.5.5.5.', '4.4.4...5.4.2...'),
    G({ k: 'x.....x.x.......', c: '....X.......X...', h: 'xxx.xxx.xxx.xxx.' }, '3.3.3.3.4.4.4.4.', 'a.7.6.4.4...2...')],
  house: [G({ k: 'x...x...x...x...', c: '....X.......X...', oh: '..x...x...x...x.', h: 'x..xx..xx..xx..x' }, '..0...0...0...0.', '0...0...2...0...'),
    G({ k: 'x...x...x...x...', c: '....X.......X...', oh: '..x...x...x...x.', h: 'xx.xxx.xxx.xxx.x', r: '...x.......x....' }, '..0..00...0..30.', '4.4.4...2.2.0...')],
  techhouse: [G({ k: 'x...x...x...x...', c: '....X.......X...', oh: '..x...x...x...x.', h: 'x..xx..xx..xx..x', r: '.x.....x.x....x.' }, '..00..0...00..0.', '................'),
    G({ k: 'x...x...x...x...', c: '....X.......X...', oh: '..x...x...x...x.', h: 'x.xxx.xxx.xxx.xx', mt: '.......x......x.' }, '..00..0_..00..30', '0.....0.....3...')],
  techno: [G({ k: 'x...x...x...x...', oh: '..x...x...x...x.', h: 'xx.xxx.xxx.xxx.x', r: '.......x.......x' }, '0.0.0.0.0.0.0.0.', '................'),
    G({ k: 'x...x...x...x...', oh: '..x...x...x...x.', h: 'xxXxxxXxxxXxxxXx', c: '....x.......x...' }, '0.00.00.0.00.03.', '0.......1.......')],
  ukg: [G({ k: 'x.........x.....', s: '....X.......X...', h: '..x...x...x...x.', r: '...x.......x....' }, '0..0.......0..3.', '..4...3.....2...'),
    G({ k: 'x......x..x.....', s: '....X.......X...', h: '..x.x.x...x.x.x.' }, '0..0...5..0..3..', '4.4...3.2...0...')],
  synthwave: [G({ k: 'x.......x.......', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' }, '00000000555555555'.slice(0, 16), '4...3...2...0...'),
    G({ k: 'x.....x.x.......', s: '....X.......X...', h: 'xXxxxXxxxXxxxXxx' }, '3333333344444444', 'a...7...6...4...')],
  dembow: [G({ k: 'x...x...x...x...', s: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.' }, '0...0...3...4...', '..4.4.3...2.....'),
    G({ k: 'x...x...x...x...', s: '...x..x....x..xx', r: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.' }, '0..00...3..34...', '4.4.4.3.2.2.0...')],
  afro: [G({ k: 'x......x..x.....', r: '...x..x....x....', h: 'xxXxxxXxxxXxxxXx' }, '0......0..2.....', '..4.4...2...0...'),
    G({ k: 'x.....x...x..x..', r: '...x..x....x..x.', h: 'xxXxxxXxxxXxxxXx', ht: '.............x..' }, '0.....4...2..0..', '4.2.4...5.4.2...')],
  hard: [G({ k: 'X...X...X...X...', c: '....x.......x...', oh: '..x...x...x...x.' }, '..0...0...0...0.', '4...4...3...2...'),
    G({ k: 'X...X...X...X.x.', c: '....x.......x...', oh: '..x...x...x...x.', h: 'x.x.x.x.x.x.x.x.' }, '..0...0...0...3.', 'a...7...4...3...')],
};

const parseDrums = (map) => { const d = Array.from({ length: 11 }, () => Array(16).fill(0)); for (const [k, str] of Object.entries(map)) [...str].forEach((ch, i) => { if (i < 16 && ch !== '.') d[T[k]][i] = ch === 'X' ? 2 : 1; }); return d; };
/** '0_..3' → [{ step, deg, up, len, slide }] */
function parseLine(str) {
  const out = []; [...(str || '')].slice(0, 16).forEach((ch, i) => {
    if (ch === '_' && out.length) { out[out.length - 1].len++; out[out.length - 1].slide = true; return; }
    if (/[0-7]/.test(ch)) out.push({ step: i, deg: +ch, up: 0, len: 1 }); else if (/[a-h]/.test(ch)) out.push({ step: i, deg: ch.charCodeAt(0) - 97, up: 1, len: 1 });
  });
  return out;
}
const empty = () => Array.from({ length: 11 }, () => Array(16).fill(0));
const copy = (d) => d.map((r) => [...r]);

export const SECTIONS = ['Intro', 'Couplet A', 'Couplet B', 'Montée', 'Drop', 'Drop 2', 'Break', 'Fill'];
export const SONG_ORDER = [0, 1, 2, 1, 3, 4, 5, 6, 3, 4, 5, 7]; // intro, A, B, A, build, drop, drop 2, break, build, drop, drop 2, fill

/** The 8 sections of a genre: { name, drums (11×16), bass:[{step,deg,up,len,slide,acc}], lead:[{step, degs:[…], up}], chordGate } */
export function genreSections(g) {
  const fam = GROOVES[GENRES[g].groove] ? GENRES[g].groove : 'dnb', [A, B] = GROOVES[fam];
  const dA = parseDrums(A.drums), dB = parseDrums(B.drums), bA = parseLine(A.bass), bB = parseLine(B.bass), lA = parseLine(A.lead), lB = parseLine(B.lead);
  const lead = (line) => line.map((n) => ({ step: n.step, degs: [n.deg], up: n.up }));
  const acc = (line) => line.map((n, i) => ({ ...n, acc: i === 0 }));
  // intro: hats, rim, perc only + a held root
  const intro = empty(); [T.h, T.oh, T.r, T.cb].forEach((t) => (intro[t] = [...dA[t]])); intro[T.cy][0] = 1;
  // build: groove A with four-on-the-floor kick, snare roll filling the second half
  const build = copy(dA); build[T.k] = build[T.k].map((v, i) => (i % 4 === 0 ? 1 : 0)); for (let i = 8; i < 16; i++) build[T.s][i] = i >= 12 ? 2 : 1; for (let i = 0; i < 8; i += 2) build[T.s][i] = 1;
  // drop 2: groove B with a crash on the one
  const drop2 = copy(dB); drop2[T.cy][0] = 2;
  const drop = copy(dA); drop[T.cy][0] = 2;
  // break: crash, sparse hats, long chords
  const brk = empty(); brk[T.cy][0] = 1; for (let i = 0; i < 16; i += 4) brk[T.h][i] = 1;
  // fill: groove A first half, toms rolling down in the second half
  const fill = copy(dA); for (let i = 8; i < 16; i++) { fill[T.h][i] = 0; fill[T.k][i] = 0; fill[T.s][i] = 0; } [[8, T.ht], [9, T.ht], [10, T.mt], [11, T.mt], [12, T.lt], [13, T.lt], [14, T.s], [15, T.s]].forEach(([i, t]) => (fill[t][i] = i >= 14 ? 2 : 1));
  const chords = [{ step: 0, degs: [0, 2, 4], up: 0 }, { step: 8, degs: [5, 7, 9], up: -1 }];
  return [
    { name: 'Intro', drums: intro, bass: [{ step: 0, deg: 0, up: 0, len: 16, slide: false }], lead: [], chordGate: 8, padChords: chords },
    { name: 'Couplet A', drums: dA, bass: acc(bA), lead: [] },
    { name: 'Couplet B', drums: dB, bass: acc(bB), lead: lead(lA) },
    { name: 'Montée', drums: build, bass: bA.filter((n) => n.step < 8), lead: lead(lA) },
    { name: 'Drop', drums: drop, bass: acc(bA), lead: lead(lA) },
    { name: 'Drop 2', drums: drop2, bass: acc(bB), lead: lead(lB) },
    { name: 'Break', drums: brk, bass: [{ step: 0, deg: 0, up: 0, len: 8, slide: false }, { step: 8, deg: 5, up: -1, len: 8, slide: false }], lead: chords, chordGate: 8 },
    { name: 'Fill', drums: fill, bass: bA.filter((n) => n.step < 8), lead: lead(lB) },
  ];
}
