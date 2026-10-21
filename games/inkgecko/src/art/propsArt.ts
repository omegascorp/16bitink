import { createRng } from '../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from './kit';
import { MARBLE_R } from './marbleArt';
import { INK, LEAF, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { castShadow, ellipseAt, glaze, leafBlade, paintLeaf, petalBlade } from './propsKit';
import { mix, rgba } from './wash';

export { drawFruit, FRUIT_FRAME, FRUITS, type FruitKind } from './propsFruit';

/**
 * Props for chapters 3–5, centred at the origin: the bud that wraps a
 * marble and its bloom, the river stone that sits in the line, and the
 * Geode's crystal shot. Bud, stone and geode fit MARBLE_FRAME; the bloom
 * fits SPLASH_FRAME.
 */

/** Sepals of a bud: base and tip radii, half the angle each base spans, the twist of the tips, and their greens. */
const BUD = { sepals: 5, root: 18.8, tip: 9.6, half: 0.74, twist: 0.4, wash: '#7fa952', tipWash: '#c0da84', deep: '#33582a' } as const;

/** One sepal: a broad base round the rim, its sides sweeping in to a twisted point. */
function sepal(a: number): { shape: Pt[]; mid: (t: number) => Pt } {
  const polar = (ang: number, r: number): Pt => pt(Math.cos(ang) * r, Math.sin(ang) * r);
  const tipAng = a + BUD.twist;
  const tip = polar(tipAng, BUD.tip);
  const base = Array.from({ length: 9 }, (_, i) => polar(a - BUD.half + (i / 8) * BUD.half * 2, BUD.root));
  const lead = bezier(base[8]!, polar(a + BUD.half * 0.55, 15.2), tip, 10).slice(1);
  const trail = bezier(tip, polar(a - BUD.half * 0.1, 15), base[0]!, 10).slice(1, -1);
  const mid = (t: number): Pt => {
    const r = BUD.root - 1 + (BUD.tip - BUD.root + 1) * t;
    return polar(a + BUD.twist * t * t, r);
  };
  return { shape: [...base, ...lead, ...trail], mid };
}

/**
 * A flower bud closed over a marble of radius MARBLE_R: five green sepals
 * whose broad bases overlap in a collar just past its rim and whose twisted
 * points reach in, leaving the middle of the marble open so its colour and
 * pattern still read. Drawn over the marble, rotating with it.
 */
export function drawBud(d: Draw): void {
  const { pen } = d;
  const sepals = Array.from({ length: BUD.sepals }, (_, i) => sepal((i / BUD.sepals) * TAU - Math.PI / 2));
  // Each sepal's shadow on the marble, then the sepals overlapping round the bud.
  for (const s of sepals) castShadow(d, s.shape.map((p) => pt(p.x * 0.92, p.y * 0.92)), pt(0.5, 0.8), 0.22);
  for (const s of sepals) {
    const { shape, mid } = s;
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, BUD.wash, 0.82);
    pen.clipped(shape, () => {
      // Paler where the point curls up into the light, deeper where the base turns down round the marble.
      const tip = mid(0.85);
      glaze(d, tip.x, tip.y, 6, 6, 0, BUD.tipWash, 0.8);
      pen.stroke(closed(oval(0, 0, BUD.root, BUD.root, 48)), 4, BUD.deep, 0.35, false);
      pen.crescent(shape, pt(-1.4, -1.8), () => pen.fill(shape, BUD.deep, 0.35));
    });
    pen.hair(Array.from({ length: 8 }, (_, i) => mid(0.05 + (i / 7) * 0.88)), 0.5, d.ink, 0.6);
    for (const k of [-1, 1]) pen.hair(Array.from({ length: 6 }, (_, i) => {
      const t = 0.05 + (i / 5) * 0.6;
      const p = mid(t);
      const n = Math.hypot(p.x, p.y) || 1;
      return pt(p.x + (-p.y / n) * k * 3.2 * (1 - t), p.y + (p.x / n) * k * 3.2 * (1 - t));
    }), 0.35, d.ink, 0.35);
    pen.stroke(closed(shape), 1, d.ink, 0.95);
  }
}

/** The bloom's petals and centre. */
const BLOOM = { petals: 6, petal: '#f6c9d4', petalPale: '#fde9ee', heart: '#d9637f', pollen: '#f2c94c', pollenDeep: '#c58f1c', seed: 8303 } as const;

/**
 * A bud blossoming, for the moment one opens: green sepals peeled back,
 * six pale pink petals flung open, a golden heart and a puff of pollen.
 * Radius ~30, centred in SPLASH_FRAME.
 */
export function drawBloom(d: Draw): void {
  const { pen } = d;
  const rng = createRng(BLOOM.seed);
  // Pollen puffed out behind the flower.
  for (let i = 0; i < 22; i++) {
    const a = rng() * TAU;
    const r = 20 + rng() * 13;
    const s = 0.6 + rng() * 1.1;
    pen.fill(oval(Math.cos(a) * r, Math.sin(a) * r, s, s, 10), BLOOM.pollen, 0.85);
  }
  // Sepals folded back between the petals.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.35;
    paintLeaf(d, leafBlade(pt(Math.cos(a) * 5, Math.sin(a) * 5), a, 20, 8, 0.08), LEAF, 0.8);
  }
  for (let i = 0; i < BLOOM.petals; i++) {
    const a = (i / BLOOM.petals) * TAU - 0.2 + (rng() - 0.5) * 0.15;
    const p = petalBlade(pt(Math.cos(a) * 2, Math.sin(a) * 2), a, 23 + rng() * 3, 15.5, (rng() - 0.5) * 0.12);
    castShadow(d, p.shape, pt(0.8, 1.2), 0.1);
    pen.fill(p.shape, PAPER_FILL, 1);
    pen.fill(p.shape, i % 2 ? BLOOM.petal : BLOOM.petalPale, 0.85);
    pen.clipped(p.shape, () => {
      pen.fill(oval(p.at(0.12, 0).x, p.at(0.12, 0).y, 6, 6, 14), BLOOM.heart, 0.35);
      pen.crescent(p.shape, pt(-1.4, -2), () => pen.fill(p.shape, mix(BLOOM.petal, BLOOM.heart, 0.5), 0.3));
    });
    for (const w of [-2.6, 0, 2.6]) pen.hair([p.at(0.15, w * 0.3), p.at(0.5, w * 0.8), p.at(0.82, w)], 0.35, BLOOM.heart, 0.45);
    pen.stroke(closed(p.shape), 0.8, d.ink, 0.85);
  }
  // The golden heart, stamens and a dusting of pollen.
  const heart = oval(0, 0, 5.2, 5.2, 20);
  pen.fill(heart, BLOOM.pollen, 0.95);
  pen.crescent(heart, pt(-1.4, -1.8), () => pen.fill(heart, BLOOM.pollenDeep, 0.5));
  pen.stipple(heart, 40, () => 0.8, 0.45, BLOOM.pollenDeep);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.15;
    const tip = pt(Math.cos(a) * 8.2, Math.sin(a) * 8.2);
    pen.hair([pt(Math.cos(a) * 4, Math.sin(a) * 4), tip], 0.4, d.ink, 0.6);
    pen.dot(tip.x, tip.y, 0.9, BLOOM.pollen, 1);
  }
  pen.stroke(closed(heart), 0.8, d.ink, 0.85);
}

/** The river stone's cool greys. */
const STONE = { wash: '#a9b1b5', cool: '#8d9aa3', warm: '#b9b4a8', deep: '#4c5660', vein: '#f1f2ec', crackSeed: 9207 } as const;

/** A pebble's outline: round, a touch lopsided, no bigger than a marble. */
function pebble(): Pt[] {
  return Array.from({ length: 56 }, (_, i) => {
    const a = (i / 56) * TAU;
    const r = MARBLE_R - 0.4 + 0.5 * Math.sin(2 * a + 0.7) + 0.3 * Math.sin(3 * a + 2.1);
    return pt(Math.cos(a) * r, Math.sin(a) * r);
  });
}

/** A fine crack across the stone, fixed so only the line boils: a main fissure and one branch. */
function crack(): Pt[][] {
  const rng = createRng(STONE.crackSeed);
  const walk = (from: Pt, ang: number, steps: number, len: number): Pt[] => {
    const out = [from];
    let p = from;
    for (let i = 0; i < steps; i++) {
      const a = ang + (rng() - 0.5) * 1.1;
      p = pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
      out.push(p);
    }
    return out;
  };
  const main = walk(pt(-15.5, -4), 0.22, 9, 3.4);
  const branch = walk(main[4]!, -0.75, 3, 2.6);
  return [main, branch];
}

/**
 * A grey river pebble the size of a marble, which sits in the line and
 * never matches: cool grey wash, speckles, a pale quartz band round it, matte
 * rather than glossy. `cracked` adds a fine crack line (one hit left).
 */
export function drawStone(d: Draw, cracked: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const R = MARBLE_R;
  const body = pebble();
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    ctx.translate(0.6, 0.4);
    pen.fill(body, STONE.wash, 0.9);
    ctx.translate(-0.6, -0.4);
    pen.fill(ellipseAt(4, 3, 11, 8, 0.6, 24), STONE.cool, 0.35);
    pen.fill(ellipseAt(-6, -5, 7, 5, -0.4, 20), STONE.warm, 0.3);
    const rim = ctx.createRadialGradient(-4, -5, R * 0.3, 0, 0, R * 1.05);
    rim.addColorStop(0, rgba(PAPER_FILL, 0.25));
    rim.addColorStop(0.6, rgba(STONE.wash, 0));
    rim.addColorStop(1, rgba(STONE.deep, 0.5));
    ctx.fillStyle = rim;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    // The quartz band: the near half of a ring round the stone, its ends meeting the outline.
    const band = Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * Math.PI;
      const x = Math.cos(t) * (R + 1);
      const y = Math.sin(t) * 6.5 - 2;
      return pt(x * Math.cos(0.55) - y * Math.sin(0.55), x * Math.sin(0.55) + y * Math.cos(0.55));
    });
    pen.stroke(band, 2.6, STONE.vein, 0.85, false);
    pen.hair(band.map((p) => pt(p.x + 0.6, p.y + 1.3)), 0.35, STONE.deep, 0.35);
    pen.stipple(body, 110, () => 0.8, 0.42, STONE.deep);
    pen.stipple(body, 50, () => 0.8, 0.38, PAPER_FILL);
    pen.stipple(body, 30, () => 0.6, 0.55, mix(STONE.warm, INK, 0.3));
  });
  // A broad soft sheen, no glint: stone is matte.
  pen.fill(ellipseAt(-5.5, -6.5, 5.5, 3.2, -0.6), PAPER_FILL, 0.22);
  if (cracked) {
    for (const c of crack()) {
      pen.hair(c.map((p) => pt(p.x + 0.45, p.y + 0.45)), 0.6, PAPER_FILL, 0.6);
      pen.hair(c, 0.75, d.ink, 0.9);
    }
  }
  pen.stroke(closed(body), 1.35, d.ink, 0.95);
}

/** Pale prismatic tints for the Geode's facets and rim. */
const PRISM = ['#f4b6c6', '#f7e1a0', '#bfe8c6', '#b6d6f4', '#d3c2f0', '#f6c9a6'] as const;

/** The Geode's facets: a table, a ring of six about it, twelve at the rim. */
function facets(R: number): Pt[][] {
  const c = pt(-1.6, -1.8);
  const inner = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU + 0.3;
    return pt(c.x + Math.cos(a) * 6.6, c.y + Math.sin(a) * 6);
  });
  const rim = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU + 0.3 - TAU / 24;
    return pt(Math.cos(a) * (R + 2), Math.sin(a) * (R + 2));
  });
  const out: Pt[][] = [inner];
  for (let i = 0; i < 6; i++) {
    const n = (i + 1) % 6;
    out.push([inner[i]!, rim[(2 * i) % 12]!, rim[(2 * i + 1) % 12]!]);
    out.push([inner[i]!, rim[(2 * i + 1) % 12]!, rim[(2 * i + 2) % 12]!, inner[n]!]);
  }
  return out;
}

/**
 * The Geode's shot: a clear faceted crystal ball, mostly pale, with
 * prismatic tints in its facets and a rainbow fringe at its rim, so it
 * reads as taking any colour. Radius MARBLE_R.
 */
export function drawGeode(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const R = MARBLE_R;
  const disc = oval(0, 0, R, R, 44);
  pen.fill(disc, PAPER_FILL, 1);
  pen.clipped(disc, () => {
    pen.fill(disc, '#e3edf2', 0.6);
    facets(R).forEach((f, i) => {
      pen.fill(f, PRISM[i % PRISM.length]!, i === 0 ? 0.14 : 0.34);
      // Facets turned from the light a shade darker.
      const mid = f.reduce((m, p) => pt(m.x + p.x / f.length, m.y + p.y / f.length), pt(0, 0));
      const away = (mid.x * 0.55 + mid.y * 0.84) / R;
      if (away > 0) pen.fill(f, '#5d7286', 0.16 * away);
    });
    // The rainbow fringe where light splits at the rim.
    const fringe = ctx.createConicGradient(0.4, 0, 0);
    PRISM.forEach((h, i) => fringe.addColorStop(i / PRISM.length, h));
    fringe.addColorStop(1, PRISM[0]);
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = fringe;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, 0, R - 1.6, 0, TAU);
    ctx.stroke();
    ctx.restore();
    for (const f of facets(R)) pen.hair(closed(f), 0.45, d.ink, 0.5);
    // Light caught along the facet edges nearest the light.
    const table = facets(R)[0]!;
    pen.hair([table[3]!, table[4]!, table[5]!], 0.7, PAPER_FILL, 0.9);
  });
  // A bright star glint and a smaller one opposite.
  const star = (x: number, y: number, s: number): void => {
    pen.hair([pt(x - s, y), pt(x + s, y)], s * 0.28, PAPER_FILL, 0.95);
    pen.hair([pt(x, y - s), pt(x, y + s)], s * 0.28, PAPER_FILL, 0.95);
    pen.dot(x, y, s * 0.22, PAPER_FILL, 1);
  };
  star(-6.5, -7.5, 3.6);
  star(7, 6.5, 1.8);
  pen.stroke(closed(oval(0, 0, R, R, 36)), 1.25, d.ink, 0.95);
}
