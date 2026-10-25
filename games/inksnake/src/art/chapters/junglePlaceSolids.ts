import type { Rng } from '../../logic/rng';
import { blob, castShadow, outline, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import {
  BAMBOO, BAMBOO_DEEP, BAMBOO_LIT, BAMBOO_OLD, BARK, BARK_DEEP, BARK_LIT, HEARTWOOD, LATERITE, leaf, leafShape,
  rngAt, STONE, STONE_DEEP, STONE_LIT, UMBER,
} from './junglePlaceKit';
import { mossPatch } from './junglePlaceParts';

/**
 * The Jungle's solid things, painted where they stand: a clump of bamboo
 * ('bamboo', round), a fallen teak log ('log', a box), a ruined temple's
 * stones ('ruin', a box). Each casts its shadow down-right.
 */

/** A narrow bamboo leaf from `c` towards `ang`. */
function bambooLeaf(d: Draw, c: Pt, ang: number, len: number, rng: Rng, lit: number): void {
  const { pen } = d;
  const shape = leafShape(c, ang, len, 0.12, (rng() - 0.5) * len * 0.15);
  pen.fill(shape, PAPER_FILL, 0.7);
  pen.fill(shape, mix(BAMBOO_DEEP, BAMBOO_LIT, lit), 0.88);
  pen.hair([c, polar(c, ang, len * 0.9)], 0.3, BAMBOO_DEEP, 0.6);
  pen.hair(closed(shape), 0.35, d.ink, 0.55);
}

/**
 * A clump of bamboo from above: the culms crowded at its foot, leaning out
 * and up so each shows as a stem running outwards, banded at its nodes, lit
 * on its upper side; sprays of narrow leaves over their tips; the clump's
 * shadow thrown long; dry leaves and sheaths fallen round it.
 */
export function bamboo(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 1);
  const foot = blob(c, r, r * 0.9, rng, 0.15, 22, rng() * TAU);
  // The shadow of the whole tall clump.
  castShadow(d, blob(c, r * 1.5, r * 1.2, rng, 0.25, 22, 0), r * 1.3, 0.16);
  castShadow(d, foot, r * 0.5, 0.18);
  for (let k = 0; k < 14; k++) {
    const p = polar(c, rng() * TAU, r * (0.9 + rng() * 0.9));
    leaf(d, p, rng() * TAU, 9 + rng() * 8, rng, { age: 0.3 + rng() * 0.4, lift: 0.8, tone: rng() < 0.5 ? BAMBOO_OLD : '#c9a866' });
  }
  pen.fill(foot, UMBER, 0.45);
  const culms = Math.round(r * 0.9);
  const stems: { base: Pt; tip: Pt; w: number; a: number }[] = [];
  for (let k = 0; k < culms; k++) {
    const a = (k / culms) * TAU + (rng() - 0.5) * 0.5;
    const base = polar(c, a, rng() * r * 0.55);
    const tip = polar(base, a + (rng() - 0.5) * 0.3, r * (0.75 + rng() * 0.6));
    stems.push({ base, tip, w: 3.4 + rng() * 1.8, a });
  }
  // Back to front: the culms leaning away from the light (towards the lower right) first.
  stems.sort((p, q) => Math.cos(p.a) * SHADOW.x + Math.sin(p.a) * SHADOW.y - (Math.cos(q.a) * SHADOW.x + Math.sin(q.a) * SHADOW.y)).reverse();
  for (const s of stems) {
    const len = Math.hypot(s.tip.x - s.base.x, s.tip.y - s.base.y);
    const nx = -Math.sin(s.a);
    const ny = Math.cos(s.a);
    const shape = [pt(s.base.x + nx * s.w, s.base.y + ny * s.w), pt(s.tip.x + nx * s.w * 0.6, s.tip.y + ny * s.w * 0.6), pt(s.tip.x - nx * s.w * 0.6, s.tip.y - ny * s.w * 0.6), pt(s.base.x - nx * s.w, s.base.y - ny * s.w)];
    const old = rng() < 0.2;
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, old ? BAMBOO_OLD : BAMBOO, 0.9);
    const litSide = nx * -SHADOW.x + ny * -SHADOW.y > 0 ? 1 : -1;
    pen.hair([pt(s.base.x + nx * s.w * 0.5 * litSide, s.base.y + ny * s.w * 0.5 * litSide), pt(s.tip.x + nx * s.w * 0.3 * litSide, s.tip.y + ny * s.w * 0.3 * litSide)], s.w * 0.5, BAMBOO_LIT, 0.7);
    pen.hair([pt(s.base.x - nx * s.w * 0.6 * litSide, s.base.y - ny * s.w * 0.6 * litSide), pt(s.tip.x - nx * s.w * 0.4 * litSide, s.tip.y - ny * s.w * 0.4 * litSide)], s.w * 0.45, BAMBOO_DEEP, 0.55);
    for (let t = 0.25; t < 1; t += 0.22 + rng() * 0.08) {
      const m = pt(s.base.x + (s.tip.x - s.base.x) * t, s.base.y + (s.tip.y - s.base.y) * t);
      const hw = s.w * (1 - 0.4 * t);
      pen.hair([pt(m.x + nx * hw, m.y + ny * hw), pt(m.x - nx * hw, m.y - ny * hw)], 0.6, BAMBOO_DEEP, 0.8);
    }
    pen.hair(closed(shape), 0.55, d.ink, 0.8);
    if (len > r * 0.5) {
      for (let k = 0; k < 3; k++) bambooLeaf(d, polar(s.tip, s.a, 1), s.a + (rng() - 0.5) * 1.6, 9 + rng() * 8, rng, 0.25 + rng() * 0.6);
    }
  }
  // A few of the tallest sprays over the clump, lit.
  for (let k = 0; k < 4; k++) {
    const p = polar(c, rng() * TAU, r * (0.2 + rng() * 0.4));
    bambooLeaf(d, p, rng() * TAU, 9 + rng() * 6, rng, 0.6 + rng() * 0.4);
  }
}

/**
 * A fallen teak log along a box: a cylinder of grey-brown bark with long
 * fissures, lit along its upper side, shaded below; the sawn or broken end
 * showing pale sapwood round golden heartwood rings; moss along its top, a
 * bracket fungus, its shadow on the ground.
 */
export function teakLog(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = rngAt(x, y, 2);
  const along = w >= h;
  const L = along ? w : h;
  const R = (along ? h : w) / 2;
  // Work in the log's own frame: +u along it, +v across (down or right).
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (!along) ctx.rotate(Math.PI / 2);
  const body: Pt[] = [];
  for (let i = 0; i <= 24; i++) body.push(pt(-L / 2 + R * 0.4 + (L - R * 0.9) * (i / 24), -R + Math.sin(i * 1.7) * 0.4));
  for (let i = 0; i <= 10; i++) body.push(polar(pt(L / 2 - R * 0.5, 0), -Math.PI / 2 + (i / 10) * Math.PI, R));
  for (let i = 24; i >= 0; i--) body.push(pt(-L / 2 + R * 0.4 + (L - R * 0.9) * (i / 24), R + Math.sin(i * 2.3) * 0.4));
  castShadow(d, body, R * 0.9, 0.2);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, BARK, 0.82);
  pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -R, 0, R);
    g.addColorStop(0, 'rgba(240,226,200,0.35)');
    g.addColorStop(0.3, 'rgba(240,226,200,0.08)');
    g.addColorStop(0.6, 'rgba(40,28,20,0.1)');
    g.addColorStop(1, 'rgba(40,28,20,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-L / 2, -R, L, R * 2);
    // Teak's bark: long fibrous ridges and the fissures between, following the curve of the trunk.
    for (let k = 0; k < Math.round(L / 1.4); k++) {
      const t = rng() * 2 - 1;
      const v = Math.sin((t * Math.PI) / 2) * R * 0.95;
      const u0 = -L / 2 + rng() * L;
      const len = 10 + rng() * 26;
      const deep = rng() < 0.55;
      const colour = deep ? BARK_DEEP : BARK_LIT;
      const a = deep ? 0.75 : 0.45 * (1 - (v + R) / (2 * R)) + 0.1;
      pen.hair([pt(u0, v), pt(u0 + len * 0.5, v + (rng() - 0.5) * 1.2), pt(u0 + len, v + (rng() - 0.5) * 1.5)], deep ? 0.5 + rng() * 0.7 : 0.6 + rng() * 0.5, colour, a);
    }
    // A knot or two.
    for (let k = 0; k < 2; k++) {
      const kx = -L / 2 + R + rng() * (L - R * 2);
      const ky = (rng() - 0.5) * R;
      pen.fill(oval(kx, ky, 3.2, 1.8, 12), BARK_DEEP, 0.6);
      pen.hair(closed(oval(kx, ky, 4.6, 2.6, 14)), 0.4, BARK_DEEP, 0.6);
    }
    pen.crescent(body, pt(0, -R * 0.6), () => pen.hatch(body, 1.6, 0.9, 0.35, { color: d.ink, alpha: 0.35 }));
  });
  // Moss along the top, a bracket fungus on the shaded side.
  for (let k = 0; k < 4; k++) mossPatch(d, pt(-L / 2 + R + rng() * (L - R * 2.5), -R * 0.4 + (rng() - 0.5) * R * 0.4), 5 + rng() * 6, rng);
  const fu = -L / 4 + rng() * L / 2;
  const fungus = blob(pt(fu, R * 0.9), 4.5, 2.6, rng, 0.15, 14, 0);
  pen.fill(fungus.map((p) => pt(p.x + 1, p.y + 1.5)), UMBER, 0.3);
  pen.fill(fungus, '#e2cfa4', 0.95);
  pen.hair(closed(fungus), 0.45, d.ink, 0.7);
  pen.hair(closed(oval(fu, R * 0.9 - 0.6, 3, 1.4, 12)).slice(0, 8), 0.35, '#a88a5a', 0.7);
  pen.stroke(closed(body), 1.4, d.ink, 0.9);
  // The broken end at -u: pale sapwood round golden heartwood rings, a split.
  const end = oval(-L / 2 + R * 0.4, 0, R * 0.42, R * 0.98, 22);
  pen.fill(end, PAPER_FILL, 1);
  pen.fill(end, '#d9bf94', 0.9);
  pen.fill(oval(-L / 2 + R * 0.42, 0, R * 0.3, R * 0.72, 20), HEARTWOOD, 0.85);
  for (const k of [0.55, 0.38, 0.2]) pen.hair(closed(oval(-L / 2 + R * 0.42, 0, R * 0.3 * k * 1.4, R * 0.72 * k * 1.4, 18)), 0.35, '#8a5a30', 0.6);
  pen.hair([pt(-L / 2 + R * 0.42, -R * 0.1), pt(-L / 2 + R * 0.55, R * 0.6)], 0.5, BARK_DEEP, 0.8);
  pen.stroke(closed(end), 1, d.ink, 0.9);
  ctx.restore();
}

/** One dressed block of a ruin's masonry: laterite or sandstone, weathered, its arrises worn round, cracks and lichen. */
function block(d: Draw, x: number, y: number, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const chip = 1.2 + rng() * 2;
  const shape = outline([pt(x + chip, y), pt(x + w - rng() * 2, y), pt(x + w, y + chip), pt(x + w, y + h - rng() * 2), pt(x + w - chip, y + h), pt(x + rng() * 2, y + h), pt(x, y + h - chip), pt(x, y + rng() * 2)], 3)
    .slice(0, -1).map((p) => pt(p.x + (rng() - 0.5) * 1.1, p.y + (rng() - 0.5) * 1.1));
  const tone = mix(mix(STONE, STONE_DEEP, 0.12 + rng() * 0.25), LATERITE, rng() * 0.4);
  pen.fill(shape, tone, 0.9);
  pen.clipped(shape, () => {
    glaze(ctx, x + w * 0.35, y + h * 0.3, Math.max(1, w * 0.5), Math.max(1, h * 0.4), 0, STONE_LIT, 0.4);
    pen.stipple(shape, Math.round(w * h * 0.12), () => 0.7, 0.35, STONE_DEEP);
    // Its worn lower and right arrises in shade.
    pen.fill([pt(x, y + h - 2.2), pt(x + w, y + h - 2.2), pt(x + w, y + h), pt(x, y + h)], STONE_DEEP, 0.35);
    pen.fill([pt(x + w - 2, y), pt(x + w, y), pt(x + w, y + h), pt(x + w - 2, y + h)], STONE_DEEP, 0.3);
    // Lichen in pale grey-green rosettes.
    for (let k = 0; k < 3; k++) if (rng() < 0.5) pen.fill(blob(pt(x + rng() * w, y + rng() * h), 1.5 + rng() * 2, 1.2 + rng() * 1.6, rng, 0.3, 10, 0), '#c8ccae', 0.55);
    if (rng() < 0.6) {
      const p = pt(x + rng() * w, y + rng() * h);
      pen.hair([p, pt(p.x + (rng() - 0.5) * w * 0.4, p.y + (rng() - 0.5) * h * 0.5), pt(p.x + (rng() - 0.5) * w * 0.6, p.y + (rng() - 0.5) * h * 0.8)], 0.5, STONE_DEEP, 0.75);
    }
  });
  pen.hair(closed(shape), 0.6, d.ink, 0.75);
}

/**
 * A ruined temple's stones on a box: courses of dressed blocks, the top
 * course carved with a lotus-petal moulding, worn and cracked, moss and a
 * strangler fig's roots creeping over them, a fallen block and rubble at
 * their foot, a deep shadow thrown (they stand a man's height).
 */
export function ruin(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 3);
  const box = outline([pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)], 6).slice(0, -1);
  castShadow(d, box, 16, 0.24);
  castShadow(d, box, 8, 0.12);
  pen.fill(box, PAPER_FILL, 1);
  pen.fill(box, STONE_DEEP, 0.6);
  const rows = Math.max(2, Math.round(h / 18));
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let bx = x;
    const shift = r % 2 ? rng() * 10 + 6 : 0;
    const first = shift > 0 ? shift : 14 + rng() * 14;
    let bw = first;
    while (bx < x + w - 0.5) {
      // The last block in a course takes up what's left rather than leaving a sliver.
      const left = x + w - bx;
      const ww = left - bw < 8 ? left : bw;
      const broken = r === 0 && bx + ww >= x + w - 0.5 && rng() < 0.6;
      if (!broken) block(d, bx + 0.6, y + r * rh + 0.6, ww - 1.2, rh - 1.2, rng);
      else pen.fill(outline([pt(bx + 1, y + 1), pt(bx + ww - 1, y + 1), pt(bx + ww - 1, y + rh - 1), pt(bx + 1, y + rh - 1)], 4).slice(0, -1), UMBER, 0.35);
      bx += ww;
      bw = 14 + rng() * 22;
    }
  }
  // The carved moulding along the top course: a row of lotus petals, worn.
  for (let px = x + 5; px < x + w - 4; px += 7) {
    const petal = leafShape(pt(px, y + rh * 0.78), -Math.PI / 2, rh * 0.5, 0.32, 0);
    pen.hair(closed(petal), 0.5, STONE_DEEP, 0.7);
    pen.hair(petal.slice(0, 7).map((p) => pt(p.x + 0.5, p.y + 0.5)), 0.4, STONE_LIT, 0.6);
  }
  // Moss in the joints and on the shaded edge, a fig's roots creeping over.
  for (let k = 0; k < 7; k++) mossPatch(d, pt(x + rng() * w, y + h * (0.3 + rng() * 0.7)), 3 + rng() * 6, rng);
  const fig: Pt[] = [];
  let p = pt(x + rng() * w, y - 4);
  let a = Math.PI / 2 + (rng() - 0.5) * 0.6;
  for (let k = 0; k < 10 && p.y < y + h * 0.8; k++) {
    fig.push(p);
    a += (rng() - 0.5) * 0.5;
    p = polar(p, a, 5);
  }
  if (fig.length > 3) {
    pen.stroke(fig.map((q) => pt(q.x + 1.2, q.y + 1.8)), 3.2, UMBER, 0.3, false);
    pen.stroke(fig, 3, mix(BARK, '#8a8070', 0.5), 0.9, false);
    pen.hair(fig.map((q) => pt(q.x - 0.6, q.y - 0.6)), 0.6, BARK_LIT, 0.6);
  }
  pen.hair(closed(box), 0.9, d.ink, 0.6);
  // A fallen block and rubble at the foot.
  const fx = x + w + 4 + rng() * 6;
  const fy = y + h * (0.3 + rng() * 0.4);
  const fallen = outline([pt(fx, fy), pt(fx + 12, fy - 2), pt(fx + 14, fy + 9), pt(fx + 1, fy + 11)], 3).slice(0, -1);
  castShadow(d, fallen, 4, 0.22);
  pen.fill(fallen, PAPER_FILL, 1);
  pen.fill(fallen, mix(STONE, LATERITE, 0.4), 0.85);
  pen.crescent(fallen, pt(-2, -2.5), () => pen.fill(fallen, STONE_DEEP, 0.4));
  pen.hair(closed(fallen), 0.6, d.ink, 0.8);
  for (let k = 0; k < 9; k++) {
    const q = pt(x + rng() * (w + 16) - 4, y + h + 2 + rng() * 9);
    const s = oval(q.x, q.y, 1 + rng() * 2.4, 0.8 + rng() * 1.6, 9);
    castShadow(d, s, 1.2, 0.2);
    pen.fill(s, mix(STONE, STONE_DEEP, rng() * 0.6), 0.85);
    pen.hair(closed(s), 0.35, d.ink, 0.6);
  }
}
