import { type Draw, oval } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { type Pt } from '../../../src/art/pen';
import { EGG_PAINT as E } from '../../../src/art/chapters/savannaSnakePaint';
import { across, along, LINE, paintTube, sliceAt } from './bodyArt';
import { type BodyModel } from './model';
import { HINGE_S } from './story';

/**
 * The egg-eater's small head on its round body: the cap of the upper jaw
 * (crown, eye with a slit pupil and a catchlight, nostril, pale lip scales)
 * rides on whatever the jaws hold. With an egg in the mouth the cap lies
 * stretched on top of it, snout forward over the egg's top, and the lips are
 * a ring round the egg, seen as an ellipse that bows forward, with the bare
 * egg in front of it. With the mouth empty the upper jaw hinges open about
 * the mouth's corner: pink gums, a tongue, and almost no teeth.
 */

const PINK = { gum: '#e9a7a3', mouth: '#c4676f', throat: '#4a1a25', tongue: '#8f3f4d', tooth: '#fbf4e2', lip: '#c98a82' } as const;
/** Where the eye and the nostril are, from the snout tip. */
const EYE_S = 5.6;
/** Where the eye is on a head stretched over an egg. */
const EYE_HELD = 8.2;
const NOSE_S = 1.4;

const smooth01 = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/** How far round the body the cap reaches (radians): most of the side of a slim head; on an egg a strip over the top, as wide as the head itself, narrowing to the snout. */
/** The head's own thickness standing up off an egg: a little at the snout, most over the crown, none by the hinge. */
const skull = (m: BodyModel, s: number): number => m.open * (1.3 + 2.4 * smooth01(s / 5.5)) * (1 - smooth01((s - 8.5) / 6));

function capExt(m: BodyModel, s: number): number {
  const k = sliceAt(m, Math.max(0, s), skull(m, s));
  const o = m.open;
  const free = 10.8 * (0.42 + 0.58 * smooth01((s + 0.4) / 3.4));
  const f = Math.max(0.5, m.front);
  // On an egg: a thin snout widening slowly to the lips' ring, then the crown round the eyes, rounding off before the hinge.
  const snout = s < f ? 2.4 + 5.2 * smooth01(s / f) : 7.6 + 11 * smooth01((s - f) / 4.5);
  const held = snout * (1 - 0.85 * smooth01((s - 10.5) / (HINGE_S - 10)));
  const w = free * (1 - o) + held * o;
  return Math.min(2.05, w / Math.max(1, k.r));
}

/** Where the cap starts across the visible half (the snout droops a little forward over the egg). */
const capFrom = (m: BodyModel, s: number): number => 0.07 * m.open * (1 - smooth01(s / 3.2));
/** Where the cap ends across the visible half: its lower edge (the mouth line when the mouth is free). */
const capTo = (m: BodyModel, s: number): number => capFrom(m, s) + capExt(m, s) / Math.PI;

function rotateAbout(p: Pt, c: Pt, a: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** How far the upper jaw swings up (radians) for a gape of 0..1. */
const swing = (g: number): number => g * 0.5;

const pivotOf = (m: BodyModel): Pt => across(sliceAt(m, HINGE_S), capTo(m, HINGE_S));

/** How far back the chin sits behind the upper lip when the jaws are spread round an egg. */
const CHIN_BACK = 3.2;
/** The lips' ring round an egg: where it is along the body at each v across the visible half. */
function ringAt(m: BodyModel): (v: number) => number {
  const top = capTo(m, m.front);
  return (v) => m.front + CHIN_BACK * m.open * smooth01((v - top) / Math.max(0.05, 1 - top));
}

/** A point on the cap: s along, f across it (0 its top edge, 1 its lower edge). */
function onCap(m: BodyModel, s: number, f: number): Pt {
  const v0 = capFrom(m, s);
  return across(sliceAt(m, s, skull(m, s) * (1 - f)), v0 + (capTo(m, s) - v0) * f);
}

function eye(d: Draw, m: BodyModel, lid: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const es = EYE_S + (EYE_HELD - EYE_S) * m.open;
  const c = onCap(m, es, 0.52 + 0.04 * m.open);
  const k = sliceAt(m, es, skull(m, es));
  const r = 1.95 * k.g.p;
  const sq = 0.92 - 0.1 * m.open;
  // The socket's pale rim, and a soft shadow under the brow.
  pen.fill(oval(c.x + 0.1, c.y + 0.15, r + 0.85, (r + 0.75) * sq, 22), E.lip, 0.9);
  pen.fill(oval(c.x, c.y - 0.35, r + 0.7, (r + 0.2) * sq, 22), E.shadow, 0.25);
  const iris = ctx.createRadialGradient(c.x - 0.6, c.y - 0.7, 0.2, c.x, c.y, r);
  iris.addColorStop(0, '#dcb95e');
  iris.addColorStop(0.65, '#8d6a2a');
  iris.addColorStop(1, '#4a3616');
  ctx.save();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r, r * sq, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Fine radial flecks in the iris, the slit pupil, the rim and the catchlight.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pen.hair([{ x: c.x + Math.cos(a) * r * 0.35, y: c.y + Math.sin(a) * r * 0.35 * sq }, { x: c.x + Math.cos(a) * r * 0.9, y: c.y + Math.sin(a) * r * 0.9 * sq }], 0.12, '#5a3f18', 0.5);
  }
  pen.fill(oval(c.x, c.y, 0.48, r * 0.88 * sq, 14), '#0b0806', 1);
  pen.closed(oval(c.x, c.y, r, r * sq, 22), 0.42, LINE);
  pen.dot(c.x - 0.7, c.y - 0.75, 0.45, PAPER_FILL, 0.95);
  pen.dot(c.x + 0.6, c.y + 0.7, 0.18, PAPER_FILL, 0.6);
  // The lid, half down when smug.
  if (lid > 0.01) {
    const cut = c.y - r * sq + 2 * r * sq * lid;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r + 0.5, (r + 0.5) * sq, 0, 0, Math.PI * 2);
    ctx.clip();
    pen.fill([{ x: c.x - r - 1, y: c.y - r - 1.2 }, { x: c.x + r + 1, y: c.y - r - 1.2 }, { x: c.x + r + 1, y: cut - 0.1 }, { x: c.x, y: cut + 0.35 }, { x: c.x - r - 1, y: cut - 0.2 }], '#a8967a', 1);
    ctx.restore();
    pen.hair([{ x: c.x - r - 0.4, y: cut - 0.2 }, { x: c.x, y: cut + 0.35 }, { x: c.x + r + 0.4, y: cut - 0.1 }], 0.45, LINE, 0.95);
  }
  // The brow: a dark ridge over the eye.
  pen.hair([{ x: c.x - r - 0.5, y: c.y - r * sq + 0.1 + lid * 0.2 }, { x: c.x, y: c.y - r * sq - 0.55 }, { x: c.x + r + 0.9, y: c.y - r * sq + 0.05 }], 0.55, E.markDeep, 0.85);
}

/** The cap of the upper jaw: crown, eye, nostril, pale lip scales; in the frame the jaw is swung in. */
function upperJaw(d: Draw, m: BodyModel, lid: number, smug: boolean): void {
  const { pen } = d;
  const from = (s: number): number => capFrom(m, s);
  const to = (s: number): number => capTo(m, s);
  const grow = (s: number): number => skull(m, s);
  const ss = along(0, HINGE_S, 0.5);
  const outline = [...ss.map((s) => onCap(m, s, 0)), ...ss.map((s) => onCap(m, s, 1)).reverse(), ...along(1, 0, 0.1).map((f) => onCap(m, 0, f))];
  // Painted on the raised surface of the skull, a little past its edge, inside its outline (raised on top, flush with the skin below).
  paintTube(d, m, 0, HINGE_S, { from, to: (s) => to(s) + 0.09 * m.open, rigid: true, plain: true, grow, clip: outline });
  // The dark crown: a chevron behind the eyes, its point forward, and a dark streak from the eye back to the mouth's corner.
  pen.clipped(outline, () => {
    const chev: Pt[] = [
      onCap(m, 8.2, 0), onCap(m, 12.6, 0.0), onCap(m, HINGE_S + 0.5, 0.42), onCap(m, HINGE_S + 0.5, 0.62), onCap(m, 12, 0.36), onCap(m, 9.6, 0.1),
    ];
    pen.fill(chev, E.markDeep, 0.7);
    pen.fill([onCap(m, EYE_S + 2.2, 0.5), onCap(m, HINGE_S - 1, 0.66), onCap(m, HINGE_S + 0.5, 0.86), onCap(m, EYE_S + 2.4, 0.74)], E.mark, 0.6);
    // Pale lip scales along the edge of the jaw, with the seams between them.
    const lip = [...ss.map((s) => onCap(m, s, 0.84)), ...ss.map((s) => onCap(m, s, 1.02)).reverse()];
    pen.fill(lip, E.lip, 0.85 * (1 - m.open));
    for (let s = 2.2; s < HINGE_S - 1.5; s += 3.1) pen.hair([onCap(m, s, 0.84), onCap(m, s + 0.25, 0.98)], 0.12, E.shadow, 0.25 * (1 - m.open));
    // On an egg, only the upper lip in front of the ring shows, running from the snout tip into the lips round the egg.
    if (m.open > 0.02) {
      const fs = along(0.2, m.front + 0.6, 0.3);
      pen.fill([...fs.map((s) => onCap(m, s, 0.66)), ...fs.map((s) => onCap(m, s, 1.04)).reverse()], E.lip, 0.95 * m.open);
      pen.hair(fs.map((s) => onCap(m, s, 0.68)), 0.18, E.shadow, 0.5 * m.open);
    }
  });
  // The nostril near the snout.
  const nose = onCap(m, NOSE_S, 0.42);
  pen.fill(oval(nose.x, nose.y, 0.55, 0.36, 10), '#0b0806', 0.95);
  pen.hair([{ x: nose.x - 0.6, y: nose.y - 0.5 }, { x: nose.x + 0.6, y: nose.y - 0.55 }], 0.16, E.edging, 0.6);
  eye(d, m, lid);
  // The edges: the top, firm; the snout's rounded front; the jaw's edge (the mouth line, or the cap's edge on the stretched skin).
  pen.stroke(ss.map((s) => onCap(m, s, 0)), 0.65, LINE, 1, false);
  const snout = along(0, 1, 0.1).map((f) => onCap(m, 0, f));
  pen.stroke(snout, 0.6, LINE, 1, false);
  const edge = ss.map((s) => onCap(m, s, 1));
  if (m.open < 0.5) pen.stroke(edge, 0.62, LINE, 1 - m.open, false);
  if (m.open > 0.02) {
    pen.stroke(along(0, m.front + 0.4, 0.3).map((s) => onCap(m, s, 1)), 0.6, LINE, m.open, false);
    pen.hair(along(m.front, HINGE_S, 0.5).map((s) => onCap(m, s, 1)), 0.32, LINE, 0.55 * m.open);
  }
  if (smug) {
    const c = onCap(m, HINGE_S - 0.5, 1);
    pen.hair([c, { x: c.x + 1.8, y: c.y - 0.6 }, { x: c.x + 2.8, y: c.y - 2.1 }], 0.45, LINE, 0.95);
  }
}

/** The lower jaw (or, round an egg, the stretched skin of the jaws), below the cap. */
function lowerJaw(d: Draw, m: BodyModel): void {
  const to = (s: number): number => capTo(m, s);
  paintTube(d, m, m.front, HINGE_S + 0.6, { from: to, plain: true, start: ringAt(m) });
  const ss = along(m.front, HINGE_S + 0.6, 0.6);
  if (m.open > 0.02) {
    // The cap's soft shadow on the stretched skin just under it.
    const shade = [...ss.map((s) => across(sliceAt(m, s), to(s) - 0.01)), ...ss.map((s) => across(sliceAt(m, s), to(s) + 0.07)).reverse()];
    d.pen.fill(shade, E.shadow, 0.22 * m.open);
    d.pen.fill([...ss.map((s) => across(sliceAt(m, s), to(s) - 0.01)), ...ss.map((s) => across(sliceAt(m, s), to(s) + 0.03)).reverse()], E.shadow, 0.25 * m.open);
  }
  d.pen.stroke(ss.map((s) => across(sliceAt(m, s), 1)), 0.62, LINE, 1, false);
  if (m.open < 0.98) {
    // The chin's rounded front, while the mouth is shut or free.
    const k = sliceAt(m, m.front);
    d.pen.stroke(along(to(m.front), 1, 0.1).map((v) => across(k, v)), 0.55, LINE, 1 - m.open, false);
  }
}

/** The lips' ring round an egg: the pale lip scales, a sliver of pink, the ink, and the shadow on the egg in front. */
function ring(d: Draw, m: BodyModel): void {
  const o = m.open;
  if (o < 0.03) return;
  const { pen } = d;
  const where = ringAt(m);
  const v0 = capTo(m, m.front) - 0.02;
  const vs = along(v0, 1, 0.03);
  const lipLine = vs.map((v) => across(sliceAt(m, where(v)), v));
  const behind = (ds: number) => (v: number): Pt => across(sliceAt(m, where(v) + ds), v);
  // The contact shadow cast on the egg, just in front of the lips.
  pen.stroke(lipLine.map((p) => ({ x: p.x - 0.7, y: p.y })), 1.6, '#3a2616', 0.28 * o, false);
  // The lip scales: a pale band just behind the edge, with seams.
  const back = behind(2.0);
  const band = [...lipLine, ...vs.map(back).reverse()];
  pen.fill(band, E.lip, 0.92 * o);
  // The lip rolls over the egg: light along its edge, shading off behind.
  const mid = behind(0.8);
  pen.fill([...lipLine, ...vs.map(mid).reverse()], '#f1e6cf', 0.6 * o);
  pen.hair(vs.map(back), 0.22, E.shadow, 0.45 * o);
  for (let i = 2; i < vs.length - 1; i += 4) pen.hair([mid(vs[i]!), back(vs[i]!)], 0.12, E.shadow, 0.3 * o);
  pen.stroke(lipLine.map((p) => ({ x: p.x - 0.25, y: p.y })), 0.45, PINK.lip, 0.9 * o, false);
  pen.stroke(lipLine, 0.62, LINE, o, false);
}

/** The pink inside of the open mouth, its tongue and almost no teeth. */
function inside(d: Draw, m: BodyModel, g: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const pivot = pivotOf(m);
  const a = swing(g);
  const ss = along(Math.max(0.6, m.front), HINGE_S, 0.6);
  const lowerTop = ss.map((s) => onCap(m, s, 1));
  const upperBottom = ss.map((s) => rotateAbout(onCap(m, s, 1), pivot, a)).reverse();
  const poly = [...lowerTop, ...upperBottom];
  const grad = ctx.createLinearGradient(lowerTop[0]!.x, pivot.y - 6, pivot.x, pivot.y);
  grad.addColorStop(0, PINK.mouth);
  grad.addColorStop(0.55, '#a8505e');
  grad.addColorStop(1, PINK.throat);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The tongue lying along the lower jaw.
  const tongue = ss.filter((s) => s > 3).map((s, i, all) => {
    const p = onCap(m, s, 1);
    return { x: p.x, y: p.y - 0.5 - 0.9 * Math.sin((i / Math.max(1, all.length - 1)) * Math.PI) };
  });
  pen.stroke(tongue, 1.4, PINK.tongue, 0.95, false);
  pen.stroke(lowerTop, 0.65, PINK.gum, 0.95, false);
  pen.stroke(upperBottom.slice().reverse(), 0.65, PINK.gum, 0.95, false);
  // Almost no teeth: a tiny few, far back.
  for (const s of [HINGE_S - 6, HINGE_S - 3.5]) {
    const root = rotateAbout(onCap(m, s, 1), pivot, a);
    const tip = rotateAbout({ x: onCap(m, s, 1).x - 0.3, y: onCap(m, s, 1).y + 1.05 }, pivot, a);
    pen.fill([{ x: root.x - 0.28, y: root.y }, { x: root.x + 0.28, y: root.y }, tip], PINK.tooth, 1);
  }
  const low = onCap(m, HINGE_S - 5, 1);
  pen.fill([{ x: low.x - 0.28, y: low.y }, { x: low.x + 0.28, y: low.y }, { x: low.x - 0.15, y: low.y - 0.95 }], PINK.tooth, 1);
}

/** The tongue out of a closed mouth, forked, flicking. */
function flick(d: Draw, m: BodyModel, out: number): void {
  if (out <= 0.02) return;
  const base = onCap(m, 0.3, 1);
  const root = { x: base.x - 0.2, y: base.y + 0.3 };
  const len = 11 * out;
  const tip = { x: root.x - len, y: root.y + 0.5 };
  const col = '#3b2a30';
  d.pen.stroke([root, { x: (root.x + tip.x) / 2, y: root.y + 0.35 }, tip], 0.55, col, 1, false);
  d.pen.stroke([tip, { x: tip.x - 2.8 * out, y: tip.y - 1.4 * out }], 0.4, col, 1, false);
  d.pen.stroke([tip, { x: tip.x - 2.8 * out, y: tip.y + 1.4 * out }], 0.4, col, 1, false);
}

/** Draws the head over the body: both jaws, swung open by the model's gape, the face, and the lips round an egg. */
export function drawHead(d: Draw, m: BodyModel, lid: number, tongueOut: number): void {
  const g = m.gape;
  const ctx = d.pen.ctx;
  lowerJaw(d, m);
  ring(d, m);
  if (g > 0.02) inside(d, m, g);
  const pivot = pivotOf(m);
  ctx.save();
  if (g > 0.001) {
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(swing(g));
    ctx.translate(-pivot.x, -pivot.y);
  }
  upperJaw(d, m, lid, lid > 0.2);
  ctx.restore();
  if (g <= 0.02) flick(d, m, tongueOut);
}
