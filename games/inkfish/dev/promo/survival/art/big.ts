import { backStipple, bezier, bill, bottomAt, C, gillSlits, PAPER_FILL, spots, stripes, topAt, type Anatomy, type Kit } from '../../../../src/art/fish/kit';
import { ellipse, type Pt } from '../../../../src/art/pen';
import { darkBack, engineEye, filament, keyedProfile, membrane, mottle, smoothFin, sparkle } from './parts';

/** The bigger contestants and the cameos, facing right. */

// ---------------------------------------------------------------- icefish

const ICE_INK = '#25303b';

/** Blackfin icefish: pale and ghostly, the spine showing through, a long flat crocodile snout, big black fins. */
export const ICEFISH: Anatomy = {
  hl: 96, hh: 20, peak: 0.42, blunt: 0, peduncle: 0.3, tail: 'round', tailSize: 1.05,
  dorsal: { from: 0.34, to: 0.45, height: 1.25, spiny: true }, dorsal2: { from: 0.49, to: 0.9, height: 0.85 },
  anal: { from: 0.52, to: 0.9, height: 0.72 }, pectoral: 1, pelvic: true, scales: false,
  eye: { t: 0.25, r: 6.2 }, mouth: 'none', wash: '#9fb9c6', finWash: '#22252c', finAlpha: 0.62, ink: ICE_INK,
  profile: keyedProfile([[0, -0.2, 0.24], [0.12, -0.34, 0.4], [0.24, -0.62, 0.62], [0.42, -1, 0.88], [0.7, -0.66, 0.6], [1, -0.3, 0.3]], 0.04),
  under: (k) => {
    // The big dark pelvic fins hang under the throat.
    const r = { x: k.x(0.3), y: bottomAt(k.a, 0.3) - 2 };
    const s = k.a.hh * 1.25;
    const fin = [r, ...bezier(r, { x: r.x - s * 0.2, y: r.y + s * 1.1 }, { x: r.x - s * 1.25, y: r.y + s * 0.9 }, 10), { x: r.x - s * 0.9, y: r.y }];
    membrane(k, fin, r, 7);
  },
  extras: (k) => {
    // Glassy: paper shows through the pale wash, with faint dark bands.
    // Glassy: a cold blue-grey wash, deeper on the back, faint dusky saddles.
    darkBack(k, '#6f8ea0', 0.4, -0.3);
    k.pen.clipped(k.body, () => {
      for (const t0 of [0.36, 0.52, 0.67, 0.81]) {
        const blob = ellipse(k.x(t0), C - k.h(t0) * 0.3, 6, k.h(t0) * 0.75, 10).map((p) => ({ x: p.x + k.pen.jitter(1.5), y: p.y + k.pen.jitter(1.5) }));
        k.pen.fill(blob, '#3c4a58', 0.22);
      }
      // The skeleton through clear skin: a ghost of the spine, its spines and ribs.
      for (let t = 0.3; t < 0.98; t += 0.022) {
        const x = k.x(t);
        const h = k.h(t);
        k.pen.hair([{ x: x + 1, y: C - 1.2 }, { x: x - 1, y: C - 1.2 }, { x: x - 1, y: C + 1.2 }, { x: x + 1, y: C + 1.2 }, { x: x + 1, y: C - 1.2 }], 0.4, ICE_INK, 0.3);
        k.pen.hair([{ x, y: C - 1.5 }, { x: x - h * 0.35, y: C - h * 0.75 }], 0.4, ICE_INK, 0.2);
        k.pen.hair([{ x, y: C + 1.5 }, { x: x - h * (t < 0.55 ? 0.15 : 0.35), y: C + h * 0.75 }], 0.4, ICE_INK, 0.2);
      }
      // Creamy-white gills behind the cover (no red blood).
      const g = k.x(0.31);
      for (let i = 0; i < 3; i++) k.pen.hair(bezier({ x: g + i * 2, y: C - k.h(0.31) * 0.5 }, { x: g - 3 + i * 2, y: C }, { x: g + i * 2, y: C + k.h(0.31) * 0.55 }, 6), 0.9, '#f3eee0', 0.6);
    });
    // The flat, wide head and snout seen from the side: a ridge along the top.
    k.pen.hair(Array.from({ length: 10 }, (_, i) => ({ x: k.x(0.02 + i * 0.025), y: topAt(k.a, 0.02 + i * 0.025) + 2.2 })), 0.5, ICE_INK, 0.5);
  },
  face: (k) => {
    // A long crocodile jaw from the tip of the snout back under the eye, the lower jaw a touch longer.
    const nx = k.x(0);
    const corner = { x: k.x(0.24), y: C + k.h(0.24) * 0.3 };
    k.pen.stroke(bezier({ x: nx - 0.5, y: C + 1.2 }, { x: k.x(0.12), y: C + 3.2 }, corner, 10), 1.1, k.ink, 1, false);
    k.pen.stroke([{ x: nx + 2, y: C + 1.6 }, { x: nx - 1, y: C + 4.2 }], 1, k.ink, 1, false);
    // The nostril and the big dark eye of a fish of the dark Antarctic winter.
    k.pen.dot(k.x(0.08), C - k.h(0.08) * 0.35, 0.9, k.ink, 0.8);
    const e = engineEye(k);
    k.pen.fill(ellipse(e.x, e.y, k.a.eye.r * 0.62, k.a.eye.r * 0.62, 12), '#14161a', 0.9);
    k.pen.dot(e.x + 1.4, e.y - 1.6, 1, PAPER_FILL, 0.95);
  },
};

// ---------------------------------------------------------------- salmon

/** A cross-shaped spot, as on a salmon's back. */
function crossSpot(k: Kit, x: number, y: number, s: number): void {
  const a = k.pen.rng() * 0.6;
  for (const ang of [a + 0.7, a - 0.7]) {
    const dx = Math.cos(ang) * s;
    const dy = Math.sin(ang) * s;
    k.pen.hair([{ x: x - dx, y: y - dy }, { x: x + dx, y: y + dy }], 0.95, k.ink, 0.9);
  }
}

/** Atlantic salmon: silver with a steel-blue back, black cross-shaped spots above the lateral line, a small adipose fin. */
export const SALMON: Anatomy = {
  hl: 88, hh: 23, peak: 0.42, blunt: 0.42, peduncle: 0.28, tail: 'fork', tailSize: 1.0,
  dorsal: { from: 0.38, to: 0.52, height: 0.95 }, anal: { from: 0.73, to: 0.84, height: 0.65 },
  pectoral: 0.45, pelvic: true, scales: true, eye: { t: 0.1, r: 5.4 }, mouth: 'none',
  wash: '#a9b7c0', finWash: '#7d8c96', finAlpha: 0.3,
  under: (k) => {
    // The small fleshy adipose fin on the back, near the tail.
    const t0 = 0.79;
    const t1 = 0.85;
    const a0 = { x: k.x(t0), y: topAt(k.a, t0) + 2 };
    const a1 = { x: k.x(t1), y: topAt(k.a, t1) + 2 };
    const fin = [a0, ...bezier(a0, { x: k.x(0.84), y: a0.y - 9 }, { x: a1.x - 3, y: a1.y - 4 }, 8), a1];
    k.pen.fill(fin, PAPER_FILL, 1);
    k.pen.fill(fin, '#5d6c78', 0.4);
    k.pen.stroke(fin, 1, k.ink, 1, false);
  },
  extras: (k) => {
    darkBack(k, '#3d5566', 0.42, -0.25);
    // Bright silver flank.
    stripes(k, [0.1, 0.38], { from: 0.16, to: 0.9, width: 2.4, color: PAPER_FILL, alpha: 0.4 });
    backStipple(1.1)(k);
    // Black crosses above the lateral line, a few on the gill cover; none on the tail.
    k.pen.clipped(k.body, () => {
      for (let i = 0; i < 30; i++) {
        const t = 0.24 + k.pen.rng() * 0.52;
        crossSpot(k, k.x(t), C - k.h(t) * (0.22 + k.pen.rng() * 0.6), 0.9 + k.pen.rng() * 0.5);
      }
      for (const v of [-0.25, 0.05]) crossSpot(k, k.x(0.19), C + k.h(0.19) * v, 1);
    });
  },
  face: (k) => {
    // The jaw reaches back past the eye; the upper jawbone shows as a long plate.
    const nx = k.x(0);
    const corner = { x: k.x(0.16), y: C + k.h(0.16) * 0.32 };
    k.pen.stroke(bezier({ x: nx - 0.5, y: C + 1 }, { x: k.x(0.07), y: C + 4 }, corner, 9), 1.1, k.ink, 1, false);
    k.pen.hair(bezier({ x: k.x(0.04), y: C - 0.5 }, { x: k.x(0.1), y: C + 1 }, { x: corner.x + 1, y: corner.y - 1.5 }, 6), 0.6, k.ink, 0.7);
    sparkle(k);
  },
};

// ---------------------------------------------------------------- sailfish

/** The sail: a long, very tall dorsal of stiff spines, cobalt with black spots, scalloped between the spines. */
function sail(k: Kit, from: number, to: number, height: number): void {
  const n = 26;
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = from + (to - from) * f;
    const prof = f < 0.12 ? 0.45 + 0.55 * Math.sin((f / 0.12) * Math.PI / 2) : 1 - 0.78 * Math.pow((f - 0.12) / 0.88, 1.5);
    const h = k.a.hh * height * prof;
    base.push({ x: k.x(t), y: topAt(k.a, t) + 3 });
    tips.push({ x: k.x(t) - h * 0.2, y: topAt(k.a, t) - h });
  }
  const edge = tips.flatMap((p, i) => {
    const next = tips[i + 1];
    if (!next) return [p];
    const dip = Math.max(2, (base[i]!.y - p.y) * 0.06);
    return [p, { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 + dip }];
  });
  const shape = [...base, ...[...edge].reverse()];
  const { pen, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, '#24418a', k.heavy ? 0.72 : 0.62);
  pen.clipped(shape, () => {
    // Darker towards the top, and the sail's black spots.
    pen.fill([...edge, { x: base[n]!.x, y: base[n]!.y - 18 }, { x: base[0]!.x, y: base[0]!.y - 22 }], '#142650', 0.35);
    for (let i = 0; i < 46; i++) {
      const j = Math.floor(pen.rng() * n);
      const f = 0.2 + pen.rng() * 0.75;
      const b = base[j]!;
      const tp = tips[j]!;
      pen.fill(ellipse(b.x + (tp.x - b.x) * f + 2, b.y + (tp.y - b.y) * f, 1.6, 1.3, 8), '#0d1324', 0.75);
    }
  });
  base.forEach((b, i) => pen.hair([b, tips[i]!], 0.7, ink, 0.85));
  pen.stroke(edge, 0.9, ink, 1, false);
}

/** Sailfish: a long spear bill, the huge spotted sail, a blue-black back over a silver belly ruled with rows of pale blue dots. */
export const SAILFISH: Anatomy = {
  hl: 76, hh: 20, peak: 0.36, blunt: 0.3, peduncle: 0.13, tail: 'lunate', tailSize: 1.85,
  dorsal2: { from: 0.86, to: 0.9, height: 0.35, tri: true }, anal: { from: 0.64, to: 0.71, height: 0.75, tri: true },
  pectoral: 0, pelvic: false, scales: false, eye: { t: 0.1, r: 5.4 }, mouth: 'none',
  wash: '#56688a', finWash: '#2e3f66', finAlpha: 0.5, lateral: false, openNose: true,
  profile: keyedProfile([[0, -0.14, 0.12], [0.12, -0.55, 0.5], [0.36, -1, 0.82], [0.7, -0.6, 0.52], [1, -0.13, 0.13]]),
  under: (k) => {
    sail(k, 0.16, 0.76, 2.9);
    // The pelvic fins: two long thin streamers under the chest.
    const r = { x: k.x(0.3), y: bottomAt(k.a, 0.3) - 2 };
    filament(k, r, { x: r.x - 8, y: r.y + 16 }, { x: r.x - 30, y: r.y + 24 }, 1.6);
    filament(k, { x: r.x - 2, y: r.y }, { x: r.x - 12, y: r.y + 13 }, { x: r.x - 33, y: r.y + 19 }, 1.3);
  },
  extras: (k) => {
    darkBack(k, '#16203c', 0.62, 0.02);
    darkBack(k, '#2a3c66', 0.25, 0.3);
    backStipple(1.2)(k);
    // Vertical rows of pale blue spots down the flank.
    k.pen.clipped(k.body, () => {
      for (let t = 0.24; t < 0.86; t += 0.045) {
        for (let v = -0.7; v < 0.45; v += 0.2) k.pen.dot(k.x(t) - (v + 0.7) * 2, C + k.h(t) * v, 0.95, '#a8d4ff', 0.85);
      }
    });
    // Keels on the tail stalk and a small sickle pectoral.
    k.pen.stroke([{ x: k.x(0.88), y: C }, { x: k.x(1) - 1, y: C }], 1.3, k.ink, 1, false);
    const p = { x: k.x(0.27), y: C + k.h(0.27) * 0.35 };
    const tip = { x: p.x - 22, y: p.y + 12 };
    const pec = [p, ...bezier(p, { x: p.x - 10, y: p.y + 2 }, tip, 8), ...bezier(tip, { x: p.x - 10, y: p.y + 9 }, { x: p.x - 2, y: p.y + 5 }, 6)];
    smoothFin(k, pec, '#2e3f66', 0.5);
  },
  face: (k) => {
    // The bill is its upper jaw: long, round and slender; the lower jaw is short.
    bill(k, 44, 2.8);
    const nx = k.x(0);
    const jaw = [{ x: nx - 10, y: C + 1.2 }, { x: nx + 6, y: C + 1.4 }, { x: nx - 10, y: C + 3.8 }];
    k.pen.fill(jaw, PAPER_FILL, 1);
    k.pen.fill(jaw, k.a.wash, 0.3);
    k.pen.stroke([...jaw, jaw[0]!], 0.8, k.ink, 1, false);
    k.pen.hair([{ x: nx - 9, y: C + 1.3 }, { x: k.x(0.08), y: C + 2.5 }], 0.7, k.ink, 0.9);
    // The big dark eye of an open-ocean hunter.
    const e = engineEye(k);
    k.pen.fill(ellipse(e.x, e.y, k.a.eye.r * 0.9, k.a.eye.r * 0.9, 14), '#2f5f9a', 0.7);
    k.pen.fill(ellipse(e.x, e.y, k.a.eye.r * 0.48, k.a.eye.r * 0.48, 12), '#111216', 1);
    k.pen.dot(e.x + 1.4, e.y - 1.4, 1, PAPER_FILL, 0.95);
  },
};

// ---------------------------------------------------------------- nurse shark

const NURSE_FIN = '#8a6844';

/** A rounded shark fin on the back or belly: a convex front edge, a round top, a free rear tip. */
function roundFin(k: Kit, from: number, to: number, height: number, side: 'top' | 'bottom'): void {
  const dir = side === 'top' ? -1 : 1;
  const edge = (t: number): number => (side === 'top' ? topAt(k.a, t) : bottomAt(k.a, t)) - dir * 2;
  const front = { x: k.x(from), y: edge(from) };
  const back = { x: k.x(to), y: edge(to) };
  const h = k.a.hh * height;
  const w = front.x - back.x;
  const apex = { x: front.x - w * 0.45, y: front.y + dir * h };
  const rear = { x: back.x - w * 0.22, y: back.y + dir * h * 0.12 };
  const shape = [
    front, ...bezier(front, { x: front.x - w * 0.02, y: front.y + dir * h * 0.85 }, apex, 10),
    ...bezier(apex, { x: back.x + w * 0.05, y: apex.y + dir * -h * 0.05 }, rear, 10), back,
  ];
  smoothFin(k, shape, NURSE_FIN, 0.45);
}

/** Nurse shark: a tan bottom-rester. A broad round snout, two barbels by a small mouth, rounded fins, a long low tail. */
export const NURSE_SHARK: Anatomy = {
  hl: 80, hh: 24, peak: 0.36, blunt: 0.9, peduncle: 0.2, tail: 'point', tailSize: 0,
  pectoral: 0, pelvic: false, scales: false,
  eye: { t: 0.13, r: 3.2, buried: true }, mouth: 'none', wash: '#a8845a', finWash: NURSE_FIN, finAlpha: 0.42,
  smoothFins: true, gills: 'slits', lateral: false,
  profile: keyedProfile([[0, -0.5, 0.5], [0.14, -0.78, 0.8], [0.36, -1, 0.9], [0.6, -0.88, 0.78], [0.85, -0.45, 0.38], [1, -0.24, 0.2]], 0.07),
  under: (k) => {
    // The long, low tail: nearly all upper lobe, with a notch near the tip.
    const x0 = k.x(1) + 4;
    const top = { x: x0, y: topAt(k.a, 1) + 1 };
    const bot = { x: x0, y: bottomAt(k.a, 1) - 1 };
    const tip = { x: x0 - 44, y: C - 9 };
    const tail = [
      top, ...bezier(top, { x: x0 - 22, y: C - 9 }, tip, 10),
      ...bezier(tip, { x: x0 - 44, y: C - 3 }, { x: x0 - 38, y: C - 1 }, 4),
      ...bezier({ x: x0 - 38, y: C - 1 }, { x: x0 - 22, y: C + 1 }, { x: x0 - 14, y: C + 8 }, 8),
      ...bezier({ x: x0 - 14, y: C + 8 }, { x: x0 - 6, y: C + 7 }, bot, 6),
    ];
    smoothFin(k, tail, NURSE_FIN, 0.45);
    // Two rounded dorsals of nearly the same size, far back, and a small rounded anal fin.
    roundFin(k, 0.48, 0.63, 0.78, 'top');
    roundFin(k, 0.69, 0.8, 0.6, 'top');
    roundFin(k, 0.73, 0.82, 0.45, 'bottom');
    // Rounded pelvic fin under the belly.
    const p = { x: k.x(0.56), y: bottomAt(k.a, 0.56) - 3 };
    smoothFin(k, [p, ...bezier(p, { x: p.x - 2, y: p.y + 10 }, { x: p.x - 12, y: p.y + 9 }, 8), { x: p.x - 16, y: p.y }], NURSE_FIN, 0.45);
  },
  extras: (k) => {
    k.pen.fill(k.body, '#9a7650', 0.22);
    darkBack(k, '#6e5234', 0.25, -0.2);
    k.pen.clipped(k.body, () => {
      for (let t = 0.08; t < 0.9; t += 0.05) k.pen.fill(ellipse(k.x(t), bottomAt(k.a, t) - k.h(t) * 0.2, 8, k.h(t) * 0.28, 8), PAPER_FILL, 0.2);
      // Sandpaper skin: fine denticle stipple.
      for (let i = 0; i < 300; i++) {
        const t = 0.04 + k.pen.rng() * 0.94;
        k.pen.dot(k.x(t), C + k.h(t) * (k.pen.rng() * 1.6 - 0.9), 0.35, k.ink, 0.3);
      }
    });
    backStipple(1)(k);
    gillSlits(k, 0.22);
    // The broad, rounded pectoral it rests on.
    const r = { x: k.x(0.27), y: C + k.h(0.27) * 0.45 };
    const pec = [r, ...bezier(r, { x: r.x - 4, y: r.y + 20 }, { x: r.x - 22, y: r.y + 18 }, 10), ...bezier({ x: r.x - 22, y: r.y + 18 }, { x: r.x - 26, y: r.y + 8 }, { x: r.x - 16, y: r.y + 2 }, 6)];
    smoothFin(k, pec, NURSE_FIN, 0.45);
  },
  face: (k) => {
    // Small mouth well forward under the snout, two nasal barbels hanging in front of it.
    const mx = k.x(0.07);
    const my = bottomAt(k.a, 0.07) - 2.5;
    k.pen.stroke(bezier({ x: mx + 5, y: my - 1.5 }, { x: mx, y: my + 1 }, { x: mx - 6, y: my - 0.5 }, 6), 1.1, k.ink, 1, false);
    for (const dx of [0, 3]) {
      const root = { x: k.x(0.02) - dx, y: C + k.h(0.02) * 0.5 };
      filament(k, root, { x: root.x + 3, y: root.y + 7 }, { x: root.x - 1, y: root.y + 14 }, 2);
    }
    // A small, dark, sleepy eye under a heavy lid, and the spiracle behind it.
    const e = engineEye(k);
    k.pen.fill(ellipse(e.x, e.y, 3.4, 2.6, 12), PAPER_FILL, 1);
    k.pen.fill(ellipse(e.x, e.y, 2.4, 2.2, 10), '#1a1612', 0.95);
    k.pen.dot(e.x + 0.8, e.y - 0.8, 0.6, PAPER_FILL, 0.9);
    k.pen.stroke(bezier({ x: e.x - 4.2, y: e.y - 1.2 }, { x: e.x, y: e.y - 4 }, { x: e.x + 4.2, y: e.y - 1 }, 6), 1, k.ink, 1, false);
    k.pen.dot(e.x - 8, e.y + 0.5, 0.9, k.ink, 0.8);
  },
};

// ---------------------------------------------------------------- lungfish

/** African lungfish: long and eel-like, mottled grey-brown, thread-like paired fins. Often shown asleep in a mud cocoon (cocoon.ts). */
export const LUNGFISH: Anatomy = {
  hl: 110, hh: 14, peak: 0.3, blunt: 0.55, peduncle: 0.1, tail: 'point', tailSize: 0,
  dorsal: { from: 0.5, to: 1, height: 0.55 }, anal: { from: 0.64, to: 1, height: 0.5 },
  pectoral: 0, pelvic: false, scales: false, eye: { t: 0.05, r: 2.8 }, mouth: 'small',
  wash: '#6e5e44', finWash: '#8a7656', finAlpha: 0.3, lateral: true, wave: 6,
  under: (k) => {
    // The thread-like pectoral and pelvic fins.
    const p = { x: k.x(0.13), y: C + k.h(0.13) * 0.5 };
    filament(k, p, { x: p.x - 8, y: p.y + 18 }, { x: p.x - 26, y: p.y + 24 }, 1.6);
    const q = { x: k.x(0.52), y: bottomAt(k.a, 0.52) - 1 };
    filament(k, q, { x: q.x - 6, y: q.y + 14 }, { x: q.x - 22, y: q.y + 18 }, 1.4);
  },
  extras: (k) => {
    k.pen.fill(k.body, '#5e5038', 0.3);
    darkBack(k, '#3a3022', 0.3, -0.1);
    mottle(k, 34, [2, 5], '#2e261a', 0.45, 0.06, 0.99);
    spots(k, 40, [0.5, 1], '#2c241a', { from: 0.05, to: 0.99, outline: false, alpha: 0.6 });
    backStipple(1.4)(k);
  },
};
