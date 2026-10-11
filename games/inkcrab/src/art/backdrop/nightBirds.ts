import { bezier, closed, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { moonlit, NIGHT } from './nightSky';

/**
 * What flies over a Queensland bay on a summer night, side-on and facing
 * right (the way they fly): grey-headed flying foxes rowing slowly across
 * the moon on their great leathery wings on the way to the figs and
 * blossom; nankeen night herons, stocky and cinnamon-backed, flapping out
 * to fish the shallows; and black noddies coming in late to their island.
 * Each takes a wingbeat `f` (-1..1) and is sunk a little into the night.
 */
const BAT = '#2c2530';
const MEMBRANE = '#3b3140';
const MANTLE = '#a8643a';
const BAT_GREY = '#6f6a72';
const RUFOUS = '#b8703e';
const BUFF = '#efe2cc';
const CAP = '#1f1f22';
const HERON_LEG = '#d9c25a';
const NODDY = '#2f2d38';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** One bird's wing side-on from the shoulder, swept back; `lift` (-1..1) raises it; `crook` bends it at the wrist. */
function wing(P: (dx: number, dy: number) => Pt, lift: number, span: number, broad: number, crook: number): Pt[] {
  const wy = -0.5 - 5 * lift;
  const ty = -0.5 - (5 + 2 * crook) * lift - crook * 0.8;
  const wrist = P(-span * 0.25 + crook * 1.5, wy);
  const lead = [...bezier(P(1, -0.4), P(1, wy * 0.6), wrist, 5), ...bezier(wrist, P(-span * 0.55, wy + (ty - wy) * 0.2 - crook), P(-span, ty), 7).slice(1)];
  const trail = cub(P(-span, ty), P(-span * 0.6, ty * 0.55 + broad), P(-span * 0.3, wy * 0.4 + broad), P(-3.5, 0.5), 8);
  return [...lead, ...trail.slice(1)];
}

/**
 * A bat's wing side-on: the arm reaching up and forward to the wrist and
 * its thumb, the long fingers fanning back from it, and the membrane
 * stretched between them in scallops back to the ankle. `lift` -1..1.
 */
function batWing(P: (dx: number, dy: number) => Pt, lift: number): { membrane: Pt[]; bones: Pt[][] } {
  const l = lift;
  const shoulder = P(1.5, -0.8);
  const wrist = P(4.5, -1.5 - 9 * l);
  const tips = [P(-5, -2.5 - 18 * l), P(-12.5, -2 - 14.5 * l), P(-16, -1.5 - 9 * l), P(-14.5, -0.5 - 3.5 * l)];
  const ankle = P(-8, 0.8);
  const membrane: Pt[] = [shoulder, ...bezier(shoulder, P(3.5, -1 - 6 * l), wrist, 4).slice(1), ...bezier(wrist, P(-0.5, -2 - 14 * l), tips[0]!, 5).slice(1)];
  for (let i = 1; i < tips.length; i++) {
    const a = tips[i - 1]!;
    const b = tips[i]!;
    // Each scallop sags in towards the wrist between two finger tips.
    membrane.push(...bezier(a, pt((a.x + b.x) / 2 + (wrist.x - (a.x + b.x) / 2) * 0.28, (a.y + b.y) / 2 + (wrist.y - (a.y + b.y) / 2) * 0.28), b, 5).slice(1));
  }
  membrane.push(...bezier(tips[tips.length - 1]!, pt((tips[3]!.x + ankle.x) / 2 + 1.5, (tips[3]!.y + ankle.y) / 2 - 1.2 * l), ankle, 5).slice(1));
  return { membrane, bones: [[shoulder, wrist], ...tips.map((tp) => [wrist, tp])] };
}

/**
 * A grey-headed flying fox in flight: a big fruit bat, dark leathery wings
 * with the finger bones showing through, a grizzled grey head with a
 * fox's snout and pointed ears, the rusty collar round its neck, its feet
 * trailing.
 */
export function flyingFox(t: Draw, x: number, y: number, s: number, f: number): void {
  moonlit(t, NIGHT, 0.2, (n) => {
    const { pen } = n;
    const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
    const far = batWing((dx, dy) => P(dx + 1.5, dy - 0.6), f * 0.8);
    pen.fill(far.membrane, BAT, 0.85);
    for (const b of far.bones.slice(1)) pen.hair(b, 0.35, MEMBRANE, 0.9);
    const body = [...cub(P(-8, 0.6), P(-6, -2.4), P(1, -2.8), P(3.8, -1.4), 10), ...cub(P(3.8, -1.4), P(4.4, 1.2), P(-1, 2.6), P(-8, 0.6), 8).slice(1)];
    washed(n, body, BAT, 0.88, 0.4, 0.8);
    pen.fill([P(1, -2.5), P(3.9, -1.5), P(3.9, 0.9), P(1.4, 1.6)], MANTLE, 0.85);
    // The head: a grizzled grey dome, the long snout, an upright ear, a dark bright eye.
    const head = [P(3.2, -1.8), P(5, -3), P(6.6, -2.3), P(9.2, -1), P(9, -0.1), P(6.2, 0.8), P(3.6, 0.8)];
    washed(n, head, BAT_GREY, 0.75, 0.4, 0.8);
    pen.fill([P(4.4, -2.6), P(4.9, -4.8), P(5.9, -2.7)], BAT, 0.9);
    pen.dot(x + 6.6 * s, y - 1.3 * s, 0.4 * s, PAPER_FILL, 0.8);
    // The feet trailing, claws hooked.
    pen.hair([P(-8, 0.6), P(-11, 1.6), P(-11.6, 1)], 0.6 * s, BAT, 0.9);
    const near = batWing(P, f);
    pen.fill(near.membrane, MEMBRANE, 0.88);
    for (const b of near.bones) pen.hair(b, 0.5, BAT, 0.95);
    pen.hair(closed(near.membrane), 0.35, n.ink, FAR * 0.7);
    // Moonlight along the arm's leading edge and through the thin membrane at its scallops.
    pen.hair(near.membrane.slice(0, 9), 0.7, '#c9cde6', 0.7);
    pen.hair(near.membrane.slice(9, -2).map((p) => pt(p.x, p.y + 0.5 * Math.sign(f || 1))), 0.5, '#9a86a6', 0.7);
  });
}

/**
 * A nankeen night heron flying: a stocky heron, its neck drawn back into
 * its shoulders, broad rounded cinnamon wings, buff-white beneath, a black
 * cap and a heavy black bill, yellow legs trailing just past its tail.
 */
export function nightHeron(t: Draw, x: number, y: number, s: number, f: number): void {
  moonlit(t, NIGHT, 0.3, (n) => {
    const { pen } = n;
    const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
    const far = wing((dx, dy) => P(dx + 1, dy - 0.4), f * 0.85, 11, 2.4, 0.3);
    pen.fill(far, RUFOUS, 0.8);
    pen.stroke([P(-5, 0.6), P(-11.5, 1.6)], 0.6 * s, HERON_LEG, 0.9, false);
    const body = [...cub(P(-6, 0), P(-4, -2.6), P(2, -2.8), P(4.4, -1.4), 10), ...cub(P(4.4, -1.4), P(5, 1), P(1, 2.6), P(-4, 1.6), 8).slice(1)];
    washed(n, body, BUFF, 0.5, 0.4, 0.8);
    pen.clipped(body, () => pen.fill([P(-7, -3), P(5, -3), P(5, -0.8), P(-7, -0.2)], RUFOUS, 0.8));
    const head = oval(x + 5.2 * s, y - 1 * s, 2 * s, 1.8 * s, 12);
    washed(n, head, BUFF, 0.4, 0.4, 0.8);
    pen.fill(oval(x + 5.2 * s, y - 2 * s, 2 * s, 1 * s, 10), CAP, 0.85);
    pen.hair(bezier(P(4.6, -2.4), P(2, -2.6), P(0.6, -1.4), 4), 0.4 * s, PAPER_FILL, 0.8);
    pen.fill([P(6.8, -1.4), P(10, -0.8), P(6.8, -0.3)], CAP, 0.9);
    pen.dot(x + 6 * s, y - 1.2 * s, 0.35 * s, '#e03a2a', 0.9);
    const near = wing(P, f, 12, 2.6, 0.3);
    washed(n, near, RUFOUS, 0.7, 0.45);
    pen.hair(near.slice(4, 12).map((p) => pt(p.x, p.y + 0.6)), 0.4, n.ink, FAR * 0.5);
  });
}

/**
 * A black noddy: a slender dark tern, sooty all over but for its white
 * cap, long narrow wings, a wedge of a tail with a notch in it, a fine
 * black bill.
 */
export function noddy(t: Draw, x: number, y: number, s: number, f: number): void {
  moonlit(t, NIGHT, 0.2, (n) => {
    const { pen } = n;
    const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
    const far = wing((dx, dy) => P(dx + 1.2, dy - 0.4), f * 0.85, 11, 0.8, 0.8);
    pen.fill(far, NODDY, 0.75);
    pen.fill([P(-3.6, -0.5), P(-8, -0.8), P(-7, 0.3), P(-8, 1.3), P(-3.6, 0.9)], NODDY, 0.9);
    const body = oval(x, y, 4 * s, 1.4 * s, 14);
    pen.fill(body, NODDY, 0.9);
    const head = oval(x + 4.2 * s, y - 0.7 * s, 1.5 * s, 1.3 * s, 10);
    pen.fill(head, NODDY, 0.9);
    pen.fill(oval(x + 4.4 * s, y - 1.5 * s, 1.2 * s, 0.6 * s, 8), PAPER_FILL, 0.9);
    pen.fill([P(5.6, -1), P(8.4, -0.6), P(5.6, -0.2)], CAP, 0.9);
    const near = wing(P, f, 12, 0.9, 0.8);
    pen.fill(near, NODDY, 0.9);
    pen.hair(closed(near), 0.3, n.ink, FAR * 0.6);
    pen.hair(near.slice(1, 9).map((p) => pt(p.x, p.y - 0.3)), 0.4, '#9aa2c2', 0.6);
  });
}
