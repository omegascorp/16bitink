import { cub, edge, oval, pt, ribbon, shade, tube, type Draw } from '../../../src/art/kit';
import { paint } from '../../../src/art/paint';
import { INK, PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { sphere } from '../../../src/art/skyArt';
import { CAPTION_FONT } from '../captions';
import { bakeSprite, drawSprite, type Frame, type Sprite } from '../sprites';
import { beam, drawRay, springPath } from './rays';
import { onCard } from './page';
import { boingLabel, bounceAt, EARTH_HIT, EARTH_SUN, earthRays, earthRaysAlpha, EXIT, globeAt, GREEN, greenLeafAt, RAY_COLOURS, shockedAt } from './story';

/**
 * "Our plants? They bounce green light straight back. Honestly, Earth's
 * plants are doing it WRONG.": a smug green Earth leaf on the page,
 * painted as the game paints (paint.ts), with a face. The rainbow lands
 * on it; every colour goes in but green, which boings straight back out.
 * The Earth pops up beside it; on "WRONG" (the stamp is page.ts's) the leaf
 * wilts, shocked.
 */
const LEAF_ART: Frame = { w: 150, h: 80, ox: 30, oy: 40 };
const LEAF_UNITS = 116;
const LEAF_SCALE = GREEN.length / LEAF_UNITS;
const GREEN_WASH = '#5f9e46';
const LID = '#4f8a3a';

function blade(): Pt[] {
  const spine = Array.from({ length: 30 }, (_, i) => pt(10 + (i / 29) * 104, -Math.sin((i / 29) * Math.PI) * 3));
  return ribbon(spine, (u) => 56 * Math.sin(Math.PI * Math.min(1, u ** 0.7)) ** 0.75 + 0.5).shape;
}

function drawGreenLeaf(d: Draw): void {
  paint(d, tube(cub(pt(-26, 10), pt(-14, 8), pt(-2, 3), pt(12, 0), 10), 4, 3), '#5a8a3c', { shadow: 0.4, line: 0.9 });
  const shape = blade();
  paint(d, shape, GREEN_WASH, { shadow: 0.55, hatch: 0.25, line: 1.1 });
  shade(d, shape, 0.18);
  // The midrib and the side veins, light on the green.
  d.pen.stroke(Array.from({ length: 12 }, (_, i) => pt(10 + i * 9.4, -Math.sin((i / 11) * Math.PI) * 3)), 1.1, '#e9f2c8', 0.7, false);
  for (let i = 1; i < 9; i++) {
    const x = 14 + i * 11;
    const w = 26 * Math.sin(Math.PI * Math.min(1, ((x - 10) / 104) ** 0.7)) ** 0.75;
    for (const s of [-1, 1]) d.pen.hair([pt(x, -s * 0.5), pt(x + w * 0.45, s * w * 0.55), pt(x + w * 0.75, s * w * 0.8)], 0.6, '#e9f2c8', 0.55);
  }
  edge(d, shape, 1.2, 0.9);
}

function drawGlobe(d: Draw): void {
  const r = 30;
  const c = pt(0, 0);
  const disc = oval(0, 0, r, r, 48);
  sphere(d, c, r, disc, '#6aa6e8', '#24467a');
  d.pen.clipped(disc, () => {
    for (const [x, y, rx, ry, a] of [[-10, -8, 13, 9, 0.4], [6, 10, 9, 13, -0.3], [16, -14, 8, 5, 0.2], [-18, 14, 6, 4, 0]] as const) {
      const land = oval(x, y, rx, ry, 18).map((p) => pt(x + (p.x - x) * Math.cos(a) - (p.y - y) * Math.sin(a), y + (p.x - x) * Math.sin(a) + (p.y - y) * Math.cos(a)));
      paint(d, land, '#6fae4c', { shadow: 0.3, hatch: 0, line: 0.6 });
    }
    d.pen.stroke([pt(-26, -2), pt(-6, -6), pt(14, -2)], 2, PAPER_FILL, 0.7, false);
  });
  sphere(d, c, r, disc, 'rgba(0,0,0,0)', 'rgba(20,20,60,0.35)');
  edge(d, disc, 1.4);
}

/** The face, drawn upright at `c`, `s` px a unit: smug half-lidded eyes and a smirk, or shocked. */
function face(ctx: CanvasRenderingContext2D, c: Pt, s: number, shocked: boolean, look: Pt): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  for (const side of [-1, 1]) {
    const ex = side * 15;
    const ry = shocked ? 12 : 10;
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.ellipse(ex, 0, shocked ? 10 : 9, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + (shocked ? 0 : look.x * 3.5), shocked ? 0 : 2 + look.y * 2, shocked ? 2.8 : 4.4, 0, Math.PI * 2);
    ctx.fill();
    if (!shocked) {
      // Half-lidded: the lid down over the top of the eye, a smug line along its edge.
      ctx.fillStyle = LID;
      ctx.beginPath();
      ctx.ellipse(ex, 0, 9.6, ry + 0.6, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(ex + 9.6, side * 1.2);
      ctx.lineTo(ex - 9.6, -side * 1.2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - 9.6, -side * 1.2);
      ctx.lineTo(ex + 9.6, side * 1.2);
      ctx.stroke();
    }
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(ex, 0, shocked ? 10 : 9, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Brows: one cocked when smug, both flung up when shocked.
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const by = shocked ? -20 : side === 1 ? -17 : -13;
    ctx.moveTo(ex - 8, by + (shocked ? 2 : side === 1 ? 2 : 0));
    ctx.quadraticCurveTo(ex, by - 4, ex + 8, by + (shocked ? 2 : side === 1 ? -1 : 2));
    ctx.stroke();
  }
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (shocked) {
    ctx.fillStyle = '#3a1c24';
    ctx.ellipse(0, 22, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // A bead of sweat.
    ctx.fillStyle = '#bfe3ff';
    ctx.beginPath();
    ctx.moveTo(30, -22);
    ctx.quadraticCurveTo(36, -12, 30, -9);
    ctx.quadraticCurveTo(24, -12, 30, -22);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else {
    ctx.moveTo(-10, 19);
    ctx.quadraticCurveTo(2, 25, 13, 15);
    ctx.lineTo(16, 12);
    ctx.stroke();
  }
  ctx.restore();
}

export interface EarthLeaf {
  draw(ctx: CanvasRenderingContext2D, t: number, boil: number): void;
}

export function makeEarthLeaf(): EarthLeaf {
  const leaf: Sprite = bakeSprite(LEAF_ART, LEAF_SCALE, 4400, drawGreenLeaf, { line: 0.5, rim: 0.4 });
  const globe: Sprite = bakeSprite({ w: 80, h: 80, ox: 40, oy: 40 }, 2.6, 4500, drawGlobe, { line: 0.6, rim: 0.5 });
  const scene = (ctx: CanvasRenderingContext2D, t: number, boil: number): void => {
    const g = greenLeafAt(t);
    const raysA = earthRaysAlpha(t);
    drawSun(ctx, g.alpha * raysA, boil);
    for (const r of earthRays(t)) drawRay(ctx, r, g.alpha * raysA, 0.75, 'paint');
    drawLeaf(ctx, leaf, t, boil);
    const b = bounceAt(t);
    if (b.to > 0) beam(ctx, springPath(EARTH_HIT, EXIT, b.to, b.wobble, t * 30), RAY_COLOURS[3], g.alpha * raysA, 1, 'paint');
    drawBoing(ctx, t);
    const gl = globeAt(t);
    if (gl > 0) drawSprite(ctx, globe, boil, { x: 850, y: 445, scale: 2.6 * gl });
  };
  return {
    draw(ctx, t, boil): void {
      if (greenLeafAt(t).alpha <= 0) return;
      onCard(ctx, t, () => scene(ctx, t, boil));
    },
  };
}

/** The leaf on its stem (popped, tilted, squashed by the boing, wilted by the stamp), and its face kept upright on the blade. */
function drawLeaf(ctx: CanvasRenderingContext2D, leaf: Sprite, t: number, boil: number): void {
  const g = greenLeafAt(t);
  const angle = GREEN.angle + g.tilt + g.wilt * 0.55;
  ctx.save();
  ctx.globalAlpha *= g.alpha;
  ctx.translate(GREEN.x, GREEN.y);
  ctx.rotate(angle);
  ctx.scale(g.pop * (1 + g.squash), g.pop * (1 - g.squash - 0.12 * g.wilt));
  drawSprite(ctx, leaf, boil, { x: 0, y: 0, scale: LEAF_SCALE });
  ctx.restore();
  const m = { x: 60 * LEAF_SCALE * g.pop, y: 2 * LEAF_SCALE * g.pop };
  const c = { x: GREEN.x + m.x * Math.cos(angle) - m.y * Math.sin(angle), y: GREEN.y + m.x * Math.sin(angle) + m.y * Math.cos(angle) };
  // Smug, it watches the green light it threw back.
  const watching = bounceAt(t).to > 0;
  ctx.save();
  ctx.globalAlpha *= g.alpha;
  face(ctx, c, 3 * g.pop, shockedAt(t), { x: watching ? 1 : 0.4, y: watching ? -1 : 0 });
  ctx.restore();
}

/** Earth's own sun in the page's corner: a small yellow disc with pen rays. */
function drawSun(ctx: CanvasRenderingContext2D, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { x, y } = EARTH_SUN;
  const g = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, 40);
  g.addColorStop(0, '#fff2a6');
  g.addColorStop(0.7, '#f6c443');
  g.addColorStop(1, '#e09a2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + boil * 0.04;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50);
    ctx.lineTo(x + Math.cos(a) * (i % 2 ? 62 : 70), y + Math.sin(a) * (i % 2 ? 62 : 70));
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoing(ctx: CanvasRenderingContext2D, t: number): void {
  const a = boingLabel(t);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(850, 430);
  ctx.rotate(0.18);
  ctx.font = `700 92px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER_FILL;
  ctx.strokeText('boing!', 0, 0);
  ctx.fillStyle = '#2f8a2c';
  ctx.fillText('boing!', 0, 0);
  ctx.restore();
}
