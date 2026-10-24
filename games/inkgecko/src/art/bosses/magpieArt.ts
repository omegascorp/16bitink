import { createRng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { pathOf, type Pt, withScratch } from '../pen';
import { ellipseAt, glaze, leafBlade } from '../propsKit';
import { blackFeather, feather, looseFeather, MAG, plumage, rimLight, scalloped, whites } from './magpieParts';
import { paintWings, scallops, type WingPose, wingSilhouette } from './magpieWings';
import type { BossArt } from './types';

/**
 * The Magpie (chapter 4, the Orchard), seen from above facing +x: a glossy
 * black head and back, white scapulars and (perched) white flanks, wings and
 * a long graduated tail glossed blue, green and purple. 'perch' stands with
 * wings folded; 'fly0' spreads them wide (span about 130) and 'fly1' sweeps
 * them down and back, so the two alternate as a wingbeat; 'hurt' is perched
 * and ruffled, eyes squeezed shut, loose feathers drifting.
 */

/** The body: an egg, fuller at the shoulders, narrowing to the tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.3 * Math.max(0, -c) ** 1.5));
  });
}

const HEAD = { x: 31, rx: 11, ry: 9.8 } as const;

/** The stout black bill, its culmen a little curved. */
function billShape(): Pt[] {
  return [...cub(pt(38.5, -3.4), pt(44, -3), pt(49, -1.4), pt(52.5, 0.2), 8), ...cub(pt(52.5, 0.2), pt(48.5, 1.4), pt(44, 3.1), pt(38.5, 3.6), 8).slice(1)];
}

/** The tail: three pairs of long feathers, graduated so the central pair is longest; `fan` spreads them. */
function tailFeathers(fan: number): { f: ReturnType<typeof feather>; w: number }[] {
  const out: { f: ReturnType<typeof feather>; w: number }[] = [];
  for (let k = 2; k >= 0; k--) {
    for (const s of [-1, 1]) out.push({ f: feather(pt(-14, s * (0.6 + k * 1.7)), Math.PI + s * (0.015 + k * 0.03) * fan, 55 - k * 8, 10), w: 10 });
  }
  return out;
}

/** One soft shadow for a set of shapes, laid in solid on a spare layer first so overlaps don't darken. */
function shadowOf(d: Draw, shapes: readonly Pt[][], off: Pt, alpha: number): void {
  const { ctx } = d.pen;
  withScratch(ctx.canvas.width, ctx.canvas.height, (layer, canvas) => {
    layer.setTransform(ctx.getTransform());
    layer.fillStyle = d.ink;
    for (const s of shapes) {
      pathOf(layer, s.map((p) => pt(p.x + off.x, p.y + off.y)));
      layer.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}

function tail(d: Draw, fan: number): void {
  for (const { f, w } of tailFeathers(fan)) blackFeather(d, f, w, [MAG.blue, MAG.green, MAG.green, MAG.bronze, MAG.purple], 0.8);
}

/** Feet perched: just the toes peeping out under the white flanks. */
function feet(d: Draw): void {
  for (const s of [-1, 1]) {
    for (const [dx, dy] of [[6.5, 1.6], [7.2, 0], [6, -1.6], [-4.5, 0]] as const) {
      d.pen.hair([pt(5, s * 12.4), pt(5 + dx, s * (12.4 + 1.6) + dy)], 1.2, MAG.foot, 1);
    }
  }
}

/** The head: glossy black with a green-purple sheen, fine feathering, the bill and eyes; `shut` squeezes them. */
function head(d: Draw, shut: boolean): void {
  const { pen } = d;
  const h = ellipseAt(HEAD.x, 0, HEAD.rx, HEAD.ry, 0, 30);
  plumage(d, h, [[HEAD.x - 2, -4, 6, MAG.purple], [HEAD.x + 3, 3, 5, MAG.green], [HEAD.x - 5, 4, 4, MAG.blue]]);
  pen.clipped(h, () => {
    for (let i = 0; i < 12; i++) pen.hair(bezier(pt(HEAD.x - 8 + (i % 4) * 4, -6 + Math.floor(i / 4) * 5), pt(HEAD.x - 10 + (i % 4) * 4, -4.6 + Math.floor(i / 4) * 5), pt(HEAD.x - 8 + (i % 4) * 4, -3.2 + Math.floor(i / 4) * 5), 3), 0.3, MAG.line, 0.4);
    glaze(d, HEAD.x - 3, -4, 4, 2.4, -0.5, '#c9d4f0', 0.3);
  });
  const bill = billShape();
  pen.fill(bill, MAG.bill, 1);
  pen.hair([pt(40, -1.3), pt(46, -0.9), pt(50.5, -0.1)], 0.7, '#8592b8', 0.7);
  pen.hair([pt(39.5, 0.4), pt(52, 0.2)], 0.4, '#000000', 0.8);
  pen.stroke(closed(bill), 0.8, d.ink, 1);
  for (const s of [-1, 1]) {
    const e = pt(HEAD.x + 3, s * 7.4);
    if (shut) {
      const lid = bezier(pt(e.x - 2.4, e.y), pt(e.x, e.y - s * 1.6), pt(e.x + 2.4, e.y), 5);
      pen.hair(lid, 1.6, '#c9d4f0', 0.4);
      pen.hair(lid, 0.7, PAPER_FILL, 0.95);
      for (const k of [-1.6, 0, 1.6]) pen.hair([pt(e.x + k, e.y - s * 1.6), pt(e.x + k * 1.4, e.y - s * 3)], 0.45, PAPER_FILL, 0.85);
    } else {
      pen.dot(e.x, e.y, 2.3, '#4a5068', 1);
      pen.dot(e.x, e.y, 1.7, MAG.eye, 1);
      pen.dot(e.x - 0.5, e.y - 0.6, 0.55, PAPER_FILL, 0.95);
    }
  }
}

/** Ruffled: tufts of feather tips standing up from its edges, white on the flanks, black elsewhere. */
function ruffles(d: Draw): void {
  const rng = createRng(7213);
  for (let i = 0; i < 16; i++) {
    const a = 0.6 + rng() * (TAU - 1.2);
    const onHead = i < 4;
    const c = onHead ? pt(HEAD.x + Math.cos(a) * HEAD.rx * 0.85, Math.sin(a) * HEAD.ry * 0.85) : pt(4 + Math.cos(a) * 23, Math.sin(a) * 13.5);
    if (onHead && Math.cos(a) > 0.3) continue;
    const out = a + (rng() - 0.5) * 0.8;
    const f = leafBlade(c, out, 6 + rng() * 3.5, 3.6, (rng() - 0.5) * 0.3);
    const white = !onHead && Math.abs(Math.sin(a)) > 0.75 && c.x > -8 && c.x < 20;
    if (white) whites(d, f.shape, 0.6);
    else blackFeather(d, f, 3, [MAG.blue], 0.6);
  }
}

/** Little impact ticks round it when hurt, haloed in paper for dark grounds. */
function sparks(d: Draw): void {
  for (const [x, y, a] of [[44, -16, -0.7], [48, 13, 0.6], [22, -22, -1.3], [20, 21, 1.2]] as const) {
    const seg = [pt(x, y), pt(x + Math.cos(a) * 5, y + Math.sin(a) * 5)];
    d.pen.hair(seg, 2.3, PAPER_FILL, 0.7);
    d.pen.hair(seg, 0.9, d.ink, 1);
  }
}

type MagpiePose = 'perch' | 'fly0' | 'fly1' | 'hurt';

function draw(d: Draw, pose: string): void {
  const p: MagpiePose = pose === 'fly0' || pose === 'fly1' || pose === 'hurt' ? pose : 'perch';
  const flying = p === 'fly0' || p === 'fly1';
  const wings: WingPose = p === 'fly0' ? 'spread' : p === 'fly1' ? 'beat' : 'folded';
  const fan = flying ? 2.2 : 1;
  const body = flying ? egg(4, 25, 12.5) : egg(1, 23, 15.2);
  const mantle = egg(3, 23.5, flying ? 11 : 9);
  // Its shadow: higher up in flight, so further off and fainter.
  const sil = [body, ellipseAt(HEAD.x, 0, HEAD.rx, HEAD.ry, 0, 24), billShape(), ...tailFeathers(fan).map((t) => t.f.shape), ...[false, true].flatMap((m) => wingSilhouette(wings, m))];
  shadowOf(d, sil, flying ? pt(5, 7) : pt(2.5, 3.5), flying ? 0.1 : 0.15);
  if (p === 'hurt') {
    looseFeather(d, pt(-34, -42), 0.7, 17, true);
    looseFeather(d, pt(-50, 33), 2.5, 15, false);
  }
  if (flying) paintWings(d, wings, 'feathers');
  else feet(d);
  tail(d, fan);
  if (flying) plumage(d, body, [[0, -5, 12, MAG.blue], [-6, 5, 10, MAG.purple]]);
  else {
    whites(d, scalloped(body, 3.2, 0.55), 0.8, true);
    plumage(d, egg(17, 14, 12.5), [[18, -4, 8, MAG.blue], [14, 5, 7, MAG.purple]]);
  }
  plumage(d, mantle, [[10, -3, 10, MAG.blue], [-2, 4, 9, MAG.purple], [-12, 0, 6, MAG.green]], flying ? 0.6 : 1);
  scallops(d, mantle, true);
  // The rump, pale grey, between the wings.
  d.pen.clipped(mantle, () => glaze(d, -14, 0, 6, 3.6, 0, '#c4c9d6', flying ? 0.7 : 0.45));
  paintWings(d, wings, flying ? 'scapulars' : 'all');
  if (p === 'hurt') ruffles(d);
  head(d, p === 'hurt');
  rimLight(d, ellipseAt(HEAD.x, 0, HEAD.rx, HEAD.ry, 0, 30), 0.8, 0.3);
  if (p === 'hurt') {
    sparks(d);
    looseFeather(d, pt(40, 38), -2.3, 15, false);
    looseFeather(d, pt(8, -44), -0.4, 14, true);
  }
}

export const MAGPIE_ART: BossArt = { frame: 150, res: 3, poses: ['perch', 'fly0', 'fly1', 'hurt'], draw };
