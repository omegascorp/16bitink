import { ellipse, type Pt } from '../../pen';
import { bezier, C, PAPER_FILL, xAt, type Kit } from '../kit';

/**
 * The fine, character-giving detail on the chapter giants (see giants.ts):
 * the marks of a long life (scars, torn fins, an old hook or fly in the lip)
 * and the gear that makes each one itself (mirror scales, a sword, a remora).
 * Drawn at the giants' finer resolution, so thin lines hold up.
 */

/** Big mirror scales: each plate edged in ink with a bright crescent, a few catching blue or violet. Some are gone, torn off long ago. */
export function mirrorScales(k: Kit, size: number, from: number, to: number): void {
  const { a, pen, ink } = k;
  const sheen = ['#9fb4d8', '#b3a3d4', '#a9cfd6'];
  pen.clipped(k.body, () => {
    let row = 0;
    for (let v = -0.95; v <= 0.95; v += (size * 1.15) / a.hh, row++) {
      for (let t = from + (row % 2) * (size / (2 * a.hl)) * 0.85; t < to; t += (size * 1.6) / (2 * a.hl)) {
        const x = xAt(a, t);
        const y = C + k.h(t) * v;
        const arc: Pt[] = [];
        for (let i = 0; i <= 10; i++) {
          const ang = -Math.PI / 2 + (i / 10) * Math.PI;
          arc.push({ x: x - Math.cos(ang) * size * 0.8, y: y + Math.sin(ang) * size * 0.7 });
        }
        const lost = pen.rng() < 0.035 && t > 0.4 && t < 0.85;
        if (lost) {
          // A torn-off scale: bare skin under a ragged edge.
          pen.fill(ellipse(x - size * 0.35, y, size * 0.55, size * 0.5, 9), '#e9d8cc', 0.9);
          pen.hair(arc.map((p) => ({ x: p.x + pen.jitter(0.8), y: p.y + pen.jitter(0.8) })), 0.55, ink, 0.7);
          continue;
        }
        if (pen.rng() < 0.18) pen.fill(ellipse(x - size * 0.35, y, size * 0.5, size * 0.45, 9), sheen[Math.floor(pen.rng() * sheen.length)]!, 0.22);
        pen.hair(arc, 0.6, ink, 0.6);
        // The mirror: a bright crescent inside the leading edge.
        pen.hair(arc.slice(2, 8).map((p) => ({ x: p.x - size * 0.22, y: p.y })), 0.7, PAPER_FILL, 0.75);
      }
    }
  });
}

/** An old fishing fly stuck in the jaw: a hook under a tuft of red and yellow feathers, frayed by the sea. */
export function oldFly(k: Kit, at: Pt): void {
  const { pen, ink } = k;
  const feathers: readonly [string, number][] = [['#c4473a', -0.5], ['#e2b33c', -0.15], ['#c4473a', 0.2], ['#e2b33c', 0.55]];
  for (const [color, bend] of feathers) {
    const tip = { x: at.x - 13 - pen.rng() * 3, y: at.y + 6 + bend * 6 };
    const f = bezier(at, { x: at.x - 6, y: at.y + 2 + bend * 5 }, tip, 7);
    pen.stroke(f, 1.4, color, 0.85, false);
    pen.hair(f, 0.3, ink, 0.6);
  }
  // Thread wraps and the hook's bend showing through the lip.
  pen.fill(ellipse(at.x, at.y, 1.8, 1.4, 8), '#3a2f2a', 0.9);
  pen.hair(bezier({ x: at.x + 1, y: at.y }, { x: at.x + 4, y: at.y + 5 }, { x: at.x + 1, y: at.y + 7 }, 6), 0.8, '#7d7f84', 1);
}

/** The swordfish's sword: flat and rough, grooved along its length, with a chip out of the tip from some old fight. */
export function sword(k: Kit, length: number, thickness: number): void {
  const { pen, ink } = k;
  const nose = { x: k.x(0), y: C - 1 };
  const tip = nose.x + length;
  const shape: Pt[] = [
    { x: nose.x - 6, y: nose.y - thickness }, { x: tip - 6, y: nose.y - 1.1 }, { x: tip - 4, y: nose.y - 0.2 },
    { x: tip - 7, y: nose.y + 0.2 }, { x: tip, y: nose.y + 0.6 }, { x: nose.x - 6, y: nose.y + thickness },
  ];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, '#5d6b80', 0.4);
  pen.clipped(shape, () => {
    // Grooves along the blade and a sandpaper roughness.
    for (const dy of [-1.6, 0, 1.6]) pen.hair([{ x: nose.x - 4, y: nose.y + dy }, { x: tip - 4, y: nose.y + dy * 0.2 }], 0.35, ink, 0.55);
    for (let i = 0; i < 40; i++) pen.dot(nose.x + pen.rng() * length, nose.y + (pen.rng() - 0.5) * thickness * 1.6, 0.3, ink, 0.45);
  });
  pen.stroke([...shape, shape[0]!], 0.9, ink, 1, false);
}

/** A remora clinging to the belly by the sucker on its head, riding along. */
export function remora(k: Kit, x: number, y: number): void {
  const { pen, ink } = k;
  const body = [
    ...bezier({ x: x + 14, y: y + 1 }, { x: x + 4, y: y - 1 }, { x: x - 14, y: y + 3 }, 10),
    ...bezier({ x: x - 14, y: y + 3 }, { x: x - 2, y: y + 8 }, { x: x + 14, y: y + 1 }, 10),
  ];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, '#4a525a', 0.45);
  // The striped sucking disc on top of its head, pressed to the shark.
  for (let i = 0; i < 5; i++) pen.hair([{ x: x + 4 + i * 2, y: y - 0.2 }, { x: x + 4 + i * 2, y: y + 2 }], 0.4, ink, 0.8);
  pen.hair([{ x: x - 2, y: y + 4.5 }, { x: x - 13, y: y + 4.5 }], 0.4, PAPER_FILL, 0.8);
  pen.stroke([...body, body[0]!], 0.8, ink, 1, false);
  pen.dot(x + 11, y + 2.4, 0.8, ink, 1);
  // Its little forked tail.
  pen.stroke([{ x: x - 13, y: y + 3 }, { x: x - 18, y: y }, { x: x - 16, y: y + 3.5 }, { x: x - 18, y: y + 7 }, { x: x - 13, y: y + 4 }], 0.7, ink, 1, false);
}

/** Old bite scars: pale crescents of tooth marks, healed over. */
export function biteScars(k: Kit, at: number, v: number): void {
  const { pen, ink } = k;
  pen.clipped(k.body, () => {
    for (const [dt, dv, r] of [[0, 0, 9], [0.16, 0.35, 6]] as const) {
      const cx = k.x(at + dt);
      const cy = C + k.h(at) * (v + dv);
      const arc: Pt[] = [];
      for (let i = 0; i <= 9; i++) {
        const a = Math.PI * (0.15 + 0.7 * (i / 9));
        arc.push({ x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r * 0.7 });
      }
      // Two rows of puncture marks, upper and lower jaw, healed pale with a dark pit in each.
      for (const p of arc) {
        for (const dy of [0, r * 0.9]) {
          pen.fill(ellipse(p.x, p.y + dy, 0.9, 1.2, 6), PAPER_FILL, 0.9);
          pen.dot(p.x, p.y + dy + 0.3, 0.35, ink, 0.6);
        }
      }
    }
  });
}

/** Stripes made of short dark dabs along the scale rows, the way a striped bass's lines really are. */
export function brokenStripes(k: Kit, levels: readonly number[], from: number, to: number): void {
  const { pen, a, heavy } = k;
  pen.clipped(k.body, () => {
    for (const v of levels) {
      for (let t = from + pen.rng() * 0.02; t < to; t += 0.022 + pen.rng() * 0.012) {
        if (pen.rng() < 0.12) continue;
        const x = xAt(a, t);
        const y = C + k.h(t) * v;
        pen.fill(ellipse(x, y, 2.6 + pen.rng() * 1.2, 1 + (heavy ? 0.35 : 0), 6), '#2f3438', heavy ? 0.85 : 0.7);
      }
    }
  });
}

/** Three old claw marks across the flank, healed pale with a few scales never grown back. */
export function healedScar(k: Kit, at: number, v: number): void {
  const { pen, ink } = k;
  pen.clipped(k.body, () => {
    for (let i = 0; i < 3; i++) {
      const x = k.x(at + i * 0.035);
      const y = C + k.h(at) * v;
      const mark = bezier({ x: x + 7, y: y - 11 + i }, { x: x + 1, y: y }, { x: x - 6, y: y + 12 - i }, 8);
      pen.stroke(mark, 2.2, PAPER_FILL, 0.95, false);
      pen.stroke(mark, 1.3, '#c98b7c', 0.55, false);
      pen.hair(mark.map((p) => ({ x: p.x + 1.4, y: p.y + 0.6 })), 0.4, ink, 0.55);
    }
  });
}

/** Cuts a ragged notch out of a fin's edge around `at` (on transparent canvas, so it shows as a real gap). */
export function tear(k: Kit, at: Pt, r: number): void {
  const { pen, ink } = k;
  const { ctx } = pen;
  const notch = [
    { x: at.x - r, y: at.y - r * 0.4 }, { x: at.x - r * 0.3, y: at.y + r * 0.9 }, { x: at.x + r * 0.15, y: at.y + r * 0.3 },
    { x: at.x + r * 0.5, y: at.y + r * 1.1 }, { x: at.x + r, y: at.y - r * 0.3 }, { x: at.x, y: at.y - r * 1.2 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pen.fill(notch, '#000', 1);
  ctx.restore();
  // Ink only the bitten edge, the part that's inside the fin.
  pen.hair(notch.slice(1, 4), 0.7, ink, 0.85);
}

/** A rusty J-hook through the lip with a snapped length of line trailing back: the one that got away. */
export function oldHook(k: Kit, at: Pt): void {
  const { pen, ink } = k;
  const rust = '#8a5536';
  // Shank down from the lip, the bend, then the barbed point back up through the jaw.
  const shank = [{ x: at.x + 1, y: at.y - 3 }, { x: at.x + 2, y: at.y + 6 }];
  const bend = bezier({ x: at.x + 2, y: at.y + 6 }, { x: at.x + 1, y: at.y + 11.5 }, { x: at.x - 4, y: at.y + 8 }, 8);
  pen.stroke([...shank, ...bend], 1.7, rust, 1, false);
  pen.hair([...shank, ...bend], 0.5, ink, 0.8);
  pen.hair([{ x: at.x - 4, y: at.y + 8 }, { x: at.x - 3, y: at.y + 5.5 }, { x: at.x - 1.6, y: at.y + 7.4 }], 0.6, ink, 0.9);
  // The eye of the hook, and rust flaking along the shank.
  pen.stroke(ellipse(at.x + 1, at.y - 4.2, 1.5, 1.5, 8), 0.7, ink, 0.9, false);
  for (let i = 0; i < 4; i++) pen.fill(ellipse(at.x + 1.6 + pen.jitter(0.6), at.y + i * 2.2, 0.6, 0.6, 5), '#5a3a26', 0.8);
  // A short, kinked bit of old line, snapped off.
  const line = [{ x: at.x + 1, y: at.y - 5.5 }, { x: at.x - 4, y: at.y - 2 }, { x: at.x - 9, y: at.y + 3 }, { x: at.x - 13, y: at.y + 2 }, { x: at.x - 17, y: at.y + 7 }];
  pen.hair(line, 0.45, '#5d6a70', 0.9);
  pen.hair([{ x: at.x - 17, y: at.y + 7 }, { x: at.x - 18, y: at.y + 9 }], 0.45, '#5d6a70', 0.6);
}
