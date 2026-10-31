import { createRng } from '../logic/rng';
import { ART_RES, BASALT, BASALT_DARK, BASALT_LIGHT, EMBER, EMBER_LIGHT, INK, PUMICE, PUMICE_DARK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Volcano Shrine's bodies: the crumbling basalt ledge (a slab once it
 * falls), the pumice raft and the fire ruby.
 */

/** Board px the slab picture reaches past its ends and below it: crumbs and a ragged underside. */
export const SLAB_PAD = 6;

/**
 * A crumbling basalt ledge, `w` across and `t2` thick (its top at the
 * picture's top, plus SLAB_PAD all round): a flat lit top, a ragged,
 * broken underside, cracks right through it with fire glowing in the
 * deepest one, and loose crumbs hanging off it.
 */
export function paintSlab(w: number, t2: number): HTMLCanvasElement {
  const P = SLAB_PAD;
  const { canvas, ctx } = makeCanvas(Math.ceil((w + P * 2) * ART_RES), Math.ceil((t2 + P * 2) * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(P, P);
  const pen = new Pen(ctx, 210 + Math.round(w), 0.4);
  const rng = createRng(Math.round(w) * 3 + 1);
  // The outline: straight along the top, ragged and chipped under.
  // Chipped at the top corners, ragged and broken underneath, tapering to the ends like a shelf of rock.
  const shape: Pt[] = [{ x: 0, y: 3 }, { x: 3, y: 0 }, { x: w * 0.4, y: 0 }, { x: w * 0.4 + 3, y: 0.8 }, { x: w * 0.4 + 7, y: 0 }, { x: w - 3, y: 0 }, { x: w, y: 2.5 }, { x: w, y: t2 * 0.7 }];
  for (let x = w - 3; x >= 3; x -= 6 + rng() * 6) shape.push({ x, y: t2 + (rng() - 0.3) * 3.4 - (x < 10 || x > w - 10 ? 3 : 0) });
  shape.push({ x: 0, y: t2 * 0.65 });
  // Its shadow on the wall behind, so it stands off the stone.
  ctx.save();
  ctx.translate(3, 4);
  ctx.fillStyle = 'rgba(14,10,18,0.4)';
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, t2 + 3);
  g.addColorStop(0, mix(BASALT_LIGHT, '#e8d8c8', 0.35));
  g.addColorStop(0.3, mix(BASALT, BASALT_LIGHT, 0.4));
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Its lit top face, dusted with ash.
  ctx.fillStyle = rgba('#d9cfc4', 0.35);
  ctx.fillRect(3, 0.5, w - 6, 3);
  pen.hair([{ x: 3, y: 1.4 }, { x: w - 3, y: 1.2 }], 1.6, '#f4ece0', 0.75);
  pen.clipped(shape, () => {
    pen.hatch(shape, 3.2, 0.9, 0.55, { color: INK, alpha: 0.25, onlyBelow: t2 * 0.45 });
    for (let k = 0; k < Math.max(3, w / 10); k++) pen.dot(3 + rng() * (w - 6), 3 + rng() * (t2 - 5), 0.5 + rng() * 0.7, '#17121c', 0.8);
  });
  // Cracks through it, one every 40 px or so; the middle one glows.
  const cracks = Math.max(1, Math.round(w / 40));
  for (let c = 0; c < cracks; c++) {
    const cx = (w * (c + 0.5)) / cracks + (rng() - 0.5) * 10;
    const pts: Pt[] = [{ x: cx, y: 0 }, { x: cx + (rng() - 0.5) * 5, y: t2 * 0.45 }, { x: cx + (rng() - 0.5) * 7, y: t2 }];
    if (c === Math.floor(cracks / 2)) {
      pen.hair(pts, 2.4, EMBER, 0.55);
      pen.hair(pts, 0.8, EMBER_LIGHT, 0.85);
    }
    pen.hair(pts, 0.9, '#120e16', 0.95);
    pen.hair([pts[1]!, { x: pts[1]!.x + 5 + rng() * 4, y: pts[1]!.y + 2 + rng() * 3 }], 0.6, '#120e16', 0.8);
  }
  pen.stroke([...shape, shape[0]!], 1.3, INK, 0.95, false);
  // Crumbs hanging off the underside, about to go.
  for (let k = 0; k < Math.max(2, w / 26); k++) {
    const x = 4 + rng() * (w - 8);
    const y = t2 + 1.5 + rng() * 2.5;
    const r = 1.1 + rng() * 1.3;
    pen.fill(ellipse(x, y, r, r * 0.8, 7), BASALT, 1);
    pen.stroke([...ellipse(x, y, r, r * 0.8, 7), ellipse(x, y, r, r * 0.8, 7)[0]!], 0.5, INK, 0.8, false);
  }
  return canvas;
}

/** A loose crumb of basalt, falling off a cracking ledge. Centred, 8 board px. */
export function paintCrumb(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(8 * ART_RES, 8 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 3, 0.2);
  const shape = [{ x: 1.5, y: 3 }, { x: 4, y: 1.2 }, { x: 6.6, y: 2.6 }, { x: 6.2, y: 6 }, { x: 2.6, y: 6.6 }];
  pen.fill(shape, BASALT, 1);
  pen.fill([shape[0]!, shape[1]!, shape[2]!, { x: 4, y: 3.4 }], BASALT_LIGHT, 0.8);
  pen.stroke([...shape, shape[0]!], 0.7, INK, 0.9, false);
  return canvas;
}

/**
 * A pumice raft, `hw` × `hh` half sizes, centred: a pale, porous slab of
 * stone so light it floats, flat on top for riding, rounded and bobbled
 * underneath, riddled with holes, and a damp line where it sits in the
 * liquid, so it reads at a glance as "this floats".
 */
export function paintRaft(hw: number, hh: number): HTMLCanvasElement {
  const pad = 4;
  const { canvas, ctx } = makeCanvas(Math.ceil((hw + pad) * 2 * ART_RES), Math.ceil((hh + pad) * 2 * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(hw + pad, hh + pad);
  const pen = new Pen(ctx, 77, 0.45);
  const rng = createRng(19);
  // Flat on top, bulging and lumpy below, like a loaf of stone.
  const shape: Pt[] = [{ x: -hw + 3, y: -hh }, { x: hw - 3, y: -hh }];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = hw - t * hw * 2;
    const edge = Math.sqrt(Math.max(0, 1 - (x / hw) ** 4));
    shape.push({ x: x * (0.98 + (rng() - 0.5) * 0.03), y: -hh + 4 + (hh * 2 - 4) * edge + (rng() - 0.5) * 1.6 });
  }
  const g = ctx.createLinearGradient(0, -hh, 0, hh);
  g.addColorStop(0, mix(PUMICE, '#ffffff', 0.35));
  g.addColorStop(0.5, PUMICE);
  g.addColorStop(1, PUMICE_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(shape, () => {
    // The damp line: everything under the middle a shade darker and warmer, where it rides in the liquid.
    ctx.fillStyle = rgba('#7a6648', 0.22);
    ctx.fillRect(-hw, hh * 0.15, hw * 2, hh);
    pen.hair([{ x: -hw, y: hh * 0.15 }, { x: -hw * 0.3, y: hh * 0.2 }, { x: hw * 0.4, y: hh * 0.12 }, { x: hw, y: hh * 0.17 }], 0.9, '#6a5a40', 0.55);
    // Holes, lots of them: each a dark pit lit on its lower lip.
    for (let k = 0; k < Math.round((hw * hh) / 9); k++) {
      const x = (rng() - 0.5) * hw * 1.9;
      const y = -hh + 3 + rng() * (hh * 2 - 5);
      const r = 0.7 + rng() * (rng() < 0.2 ? 2.4 : 1.3);
      pen.fill(ellipse(x, y, r, r * 0.8, 9), mix(PUMICE_DARK, '#4a3e2c', 0.45), 0.95);
      pen.hair([{ x: x - r, y: y + r * 0.5 }, { x, y: y + r * 0.95 }, { x: x + r, y: y + r * 0.5 }], 0.5, '#fffaf0', 0.8);
    }
  });
  // The flat top, lit, for Nib to stand on.
  pen.hair([{ x: -hw + 4, y: -hh + 1.4 }, { x: hw - 4, y: -hh + 1.2 }], 1.6, '#fffaf0', 0.85);
  pen.stroke([...shape, shape[0]!], 1.4, INK, 0.95, false);
  return canvas;
}

/** The ruby picture's size (board px): room for the gem and its glint. */
export const RUBY_SIZE = 28;
/** Glint frames: none, a small star, a big one. */
export const RUBY_GLINTS = 3;

/**
 * A fire ruby, `r` across its middle, centred: a cut gem seen from the
 * side, its crown faceted and lit, deep red in the pavilion, a hot glow
 * inside it, and a star of a glint on `glint` frames 1 and 2.
 */
export function paintRuby(r: number, glint: number): HTMLCanvasElement {
  const S = RUBY_SIZE;
  const { canvas, ctx } = makeCanvas(S * ART_RES, S * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(S / 2, S / 2);
  const pen = new Pen(ctx, 61 + glint, 0.15);
  const top = -r * 0.75;
  const girdle = -r * 0.1;
  const table = r * 0.48;
  const outline: Pt[] = [{ x: -table, y: top }, { x: table, y: top }, { x: r, y: girdle }, { x: 0, y: r * 1.05 }, { x: -r, y: girdle }];
  // A warm halo: it glows from within.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
  halo.addColorStop(0, rgba('#ff6a4a', 0.35));
  halo.addColorStop(1, rgba('#ff6a4a', 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-S / 2, -S / 2, S, S);
  const facet = (pts: readonly Pt[], color: string): void => pen.fill(pts, color, 1);
  // Crown facets: the table, and the bezels either side, lit from the top left.
  facet([{ x: -table, y: top }, { x: table, y: top }, { x: table * 0.7, y: girdle }, { x: -table * 0.7, y: girdle }], '#f0505a');
  facet([{ x: -r, y: girdle }, { x: -table, y: top }, { x: -table * 0.7, y: girdle }], '#ff8a8a');
  facet([{ x: r, y: girdle }, { x: table, y: top }, { x: table * 0.7, y: girdle }], '#b51e34');
  // Pavilion facets, darker, meeting at the point.
  facet([{ x: -r, y: girdle }, { x: -table * 0.7, y: girdle }, { x: 0, y: r * 1.05 }], '#c42638');
  facet([{ x: -table * 0.7, y: girdle }, { x: table * 0.7, y: girdle }, { x: 0, y: r * 1.05 }], '#9c1428');
  facet([{ x: table * 0.7, y: girdle }, { x: r, y: girdle }, { x: 0, y: r * 1.05 }], '#6e0c1e');
  // The fire inside: a hot spot below the table.
  const fire = ctx.createRadialGradient(-r * 0.1, r * 0.25, 0, -r * 0.1, r * 0.25, r * 0.6);
  fire.addColorStop(0, rgba(EMBER_LIGHT, 0.75));
  fire.addColorStop(1, rgba(EMBER, 0));
  pen.clipped(outline, () => {
    ctx.fillStyle = fire;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  });
  // Facet edges, and the outline.
  for (const [a, b] of [[outline[0]!, { x: -table * 0.7, y: girdle }], [outline[1]!, { x: table * 0.7, y: girdle }], [{ x: -table * 0.7, y: girdle }, outline[3]!], [{ x: table * 0.7, y: girdle }, outline[3]!]] as const) pen.hair([a, b], 0.5, '#5a0a18', 0.7);
  pen.hair([{ x: -r, y: girdle }, { x: r, y: girdle }], 0.6, '#5a0a18', 0.8);
  pen.hair([{ x: -table * 0.8, y: top + 1.2 }, { x: table * 0.2, y: top + 1.2 }], 1, '#ffd8d8', 0.9);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  if (glint > 0) {
    // A four-pointed star on the top left of the crown.
    const s = glint === 1 ? 3.5 : 6.5;
    const gx = -table * 0.5;
    const gy = top + 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(gx, gy - s);
    ctx.quadraticCurveTo(gx, gy, gx + s, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy + s);
    ctx.quadraticCurveTo(gx, gy, gx - s, gy);
    ctx.quadraticCurveTo(gx, gy, gx, gy - s);
    ctx.fill();
  }
  return canvas;
}
