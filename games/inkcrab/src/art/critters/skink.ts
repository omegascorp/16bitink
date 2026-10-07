import { bezier, cub, type Draw, edge, glint, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A sandfish skink (Scincus), side-on and facing right: a sleek, glossy
 * cylinder of a body with no neck to speak of, a shovel-wedge snout over a
 * countersunk lower jaw, short legs with fringed toes, a short tapering
 * tail, sandy yellow crossed with broken dark bars.
 */
const SKIN = '#e0bd6c';
const FLUSH = '#d9944a';
const BAR = '#6e4a2c';
const BELLY = '#f5ead0';
const LEG = '#dcbc76';

/** Width along the body, tail tip (0) to snout (1). */
function girth(u: number): number {
  if (u < 0.45) return 1.2 + (u / 0.45) ** 0.8 * 15.8;
  if (u < 0.78) return 17 + Math.sin(((u - 0.45) / 0.33) * Math.PI) * 1.4;
  if (u < 0.86) return 17 - (u - 0.78) * 25;
  return Math.max(0.6, 15 * (1 - ((u - 0.86) / 0.14) ** 1.6));
}

/** Short legs, splayed and stepping in diagonal pairs; toes fringed for swimming in sand. */
function legs(d: Draw, spine: readonly Pt[], far: boolean): void {
  [0.42, 0.72].forEach((u, i) => {
    const at = spine[Math.round(u * (spine.length - 1))]!;
    const ph = -d.f * (TAU / 3) + i * Math.PI + (far ? Math.PI : 0);
    const step = Math.cos(ph) * 3.5;
    const lift = Math.max(0, Math.sin(ph)) * 2.2;
    const dir = i === 0 ? -1 : 1;
    const hip = pt(at.x + (far ? 2 : 0), at.y + 4 - (far ? 2 : 0));
    const elbow = pt(hip.x + dir * 5 + step * 0.5, hip.y + 3.5 - lift);
    const wrist = pt(hip.x + dir * 4 + step, d.g - 1.2 - lift - (far ? 1 : 0));
    limb(d, [hip, elbow, wrist], { widths: [3.4, 2.4, 1.6], wash: LEG, far, line: 0.8 });
    // Toes: long, splayed fan, each fringed with a comb of scales for swimming in sand.
    for (const k of [-1, 0, 1, 2]) {
      const tip = pt(wrist.x + dir * (4 + k * 0.6) + k * 1.6, d.g - lift * 0.4 - (far ? 1 : 0) + (k < 0 ? -0.5 : 0));
      d.pen.stroke([wrist, tip], far ? 0.5 : 0.7, d.ink, far ? 0.5 : 0.95, false);
      if (!far) for (const t of [0.45, 0.75]) {
        const q = pt(wrist.x + (tip.x - wrist.x) * t, wrist.y + (tip.y - wrist.y) * t);
        d.pen.hair([q, pt(q.x + 0.3, q.y + 1)], 0.35, d.ink, 0.6);
      }
    }
  });
}

export function skink(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-2, g - 1, 40, 3, 24), d.ink, 0.1);
  // The spine: tail low and trailing, a gentle hump, the wedge snout dipping to scoop sand.
  const spine = [
    ...cub(pt(-48, g - 5), pt(-30, g - 10), pt(-14, g - 15.5), pt(8, g - 15.5), 26),
    ...cub(pt(8, g - 15.5), pt(22, g - 15.5), pt(32, g - 15), pt(46, g - 11), 22).slice(1),
  ];
  const body = ribbon(spine, girth);
  legs(d, spine, true);
  skin(d, body.shape, SKIN, 0.75);
  pen.clipped(body.shape, () => {
    // An orange flush along the flank, a pale belly below the flank line.
    tint(d, body.top.map((p, i) => pt(p.x, (p.y + spine[i]!.y) / 2)).concat([...spine].reverse()), FLUSH, 0.22);
    const flank = body.bot.map((p, i) => pt(p.x, (p.y + spine[i]!.y * 2) / 3));
    pen.fill([...flank, ...[...body.bot].reverse()], BELLY, 0.85);
    pen.hair(flank.slice(10, 46), 0.5, d.ink, 0.4);
    // Broken dark cross bars down the back and onto the tail.
    for (let i = 0; i < 9; i++) {
      const k = 8 + i * 4;
      const a = body.top[k]!;
      const m = spine[k]!;
      const w = 1.4 + (k > 16 ? 0.6 : 0);
      pen.stroke([pt(a.x - 0.5, a.y - 1), pt((a.x + m.x) / 2 - 0.5, (a.y + m.y) / 2), pt(m.x - 1.2, m.y + 1.5)], w, BAR, 0.75, false);
      pen.dot(m.x - 1.4, m.y + 3, w * 0.4, BAR, 0.6);
    }
    // Smooth, overlapping scales: a few small arcs on the flank.
    for (let i = 0; i < 26; i++) {
      const k = 10 + Math.floor(pen.rng() * 34);
      const m = spine[k]!;
      const y = m.y - 3 + pen.rng() * 6;
      pen.hair(bezier(pt(m.x - 1, y - 0.8), pt(m.x + 0.6, y), pt(m.x - 1, y + 0.8), 3), 0.35, d.ink, 0.35);
    }
  });
  shade(d, body.shape, 0.35);
  // The gloss: a bright streak along the back.
  glint(d, body.top.slice(14, 44).map((p, i) => pt(p.x, p.y + 2.6 + Math.sin(i / 5) * 0.2)), 1.3, 0.8);
  edge(d, body.shape, 1.2);
  // The head: a lip line from the wedge's point back under the eye (the lower jaw is set in),
  // a small eye with a heavy lid, and an ear slit.
  const snout = spine[spine.length - 1]!;
  pen.hair(bezier(pt(snout.x - 1, snout.y + 0.8), pt(snout.x - 7, snout.y + 3.5), pt(snout.x - 13, snout.y + 2.5), 8), 0.75, d.ink, 0.9);
  pen.hair(bezier(pt(snout.x - 14.5, snout.y - 4.5), pt(snout.x - 13, snout.y - 0.5), pt(snout.x - 15, snout.y + 3.5), 5), 0.5, d.ink, 0.5);
  const eye = oval(snout.x - 9.5, snout.y - 3.4, 1.6, 1.3, 10);
  pen.fill(eye, d.ink, 0.92);
  pen.dot(snout.x - 9, snout.y - 3.9, 0.45, PAPER_FILL, 0.95);
  pen.hair(bezier(pt(snout.x - 12, snout.y - 4.4), pt(snout.x - 9.5, snout.y - 5.8), pt(snout.x - 7, snout.y - 4), 4), 0.55, d.ink, 0.8);
  pen.dot(snout.x - 1.5, snout.y - 1.6, 0.45, d.ink, 0.8);
  legs(d, spine, false);
}
