import { INK, Pen, type Pt } from '../../../src/art/pen';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { spline } from '../kraken/whale';
import { lerp, ramp } from '../short';
import { drawBubbles, inBody, pathOf, tinted } from './paint';
import { type BodyPose, onBody, ORCA_BLOWHOLE } from './pose';
import { drawRays, drawSnow, drawVignette, drawWater, type Rgb, wash } from './sea';
import { BECAUSE_AT, cycles, EATERS_AT, PICKY_AT, sniffAt, until, wrap } from './story';

/**
 * "Picky eaters." (comic): bright, sunny water. The orca, a tiny napkin
 * tucked under its chin, sticks its nose up in the air and puffs a little
 * "hmph" of bubbles from its blowhole, turning away from the rest of the
 * shark: a faint, whole silhouette sinking behind it, left alone.
 */

const COMIC_TOP: Rgb = [70, 150, 176];
const COMIC_MID: Rgb = [30, 96, 132];
const COMIC_BOTTOM: Rgb = [8, 40, 66];

/** The napkin, in the orca's local frame: tucked in along the throat behind the jaw, hanging to a point. */
const NAPKIN: readonly Pt[] = spline([
  { x: -140, y: 96 }, { x: -190, y: 104 }, { x: -240, y: 110 }, { x: -284, y: 114 }, { x: -268, y: 170 }, { x: -236, y: 236 },
  { x: -216, y: 250 }, { x: -196, y: 226 }, { x: -168, y: 166 }, { x: -140, y: 96 },
], 4);
const FOLD: readonly Pt[] = [{ x: -214, y: 112 }, { x: -218, y: 170 }, { x: -216, y: 236 }];
const KNOT: Pt = { x: -138, y: 98 };
const EYE: Pt = { x: -122, y: 14 };
const CHECK = 22;

/** The orca: facing right, nose going up on "Picky". */
export function pickyOrcaAt(t: number): BodyPose {
  const s = sniffAt(t);
  return { x: 500, y: 780 + 10 * Math.sin(cycles(4, t)), length: 1160, angle: -0.34 * s + 0.02 * Math.sin(cycles(3, t)), flip: false };
}

/** A red gingham napkin with a little knot, swaying `sway`. */
function drawNapkin(ctx: CanvasRenderingContext2D, boil: number, sway: number): void {
  const pen = new Pen(ctx, 6203 + boil * 977, 0.9);
  const swing = (p: Pt): Pt => ({ x: p.x + sway * Math.max(0, p.y - 100), y: p.y });
  const napkin = NAPKIN.map(swing);
  pen.fill(napkin, '#fbf6ea', 1);
  // The gingham: red bands both ways, darker where they cross.
  ctx.save();
  pathOf(ctx, napkin);
  ctx.clip();
  ctx.fillStyle = 'rgba(214,60,52,0.42)';
  for (let x = -300; x < -120; x += CHECK * 2) ctx.fillRect(x, 80, CHECK, 190);
  for (let y = 92; y < 270; y += CHECK * 2) ctx.fillRect(-300, y, 190, CHECK);
  ctx.restore();
  pen.hair(FOLD.map(swing), 1.8, '#7a2a26', 0.5);
  pen.stroke([...napkin, napkin[0]!], 2.6, INK);
  // The knot's two little ears.
  for (const ear of [[{ x: 20, y: -18 }, { x: 26, y: 4 }], [{ x: 6, y: 26 }, { x: 26, y: 18 }]] as const) {
    const pts = [KNOT, ...ear.map((e) => ({ x: KNOT.x + e.x, y: KNOT.y + e.y }))];
    pen.fill(pts, '#f2b8b0', 1);
    pen.stroke([...pts, KNOT], 2.2, INK, 1, false);
  }
  pen.dot(KNOT.x + 2, KNOT.y + 2, 6, '#e05a50', 1);
}

/** A smug, half-shut eye: the lid down over its top half. */
function drawSmugEye(ctx: CanvasRenderingContext2D, shut: number): void {
  if (shut <= 0.01) return;
  const r = 9;
  const lid = EYE.y - r + 2 * r * 0.55 * shut;
  ctx.save();
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, r + 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#15161d';
  ctx.fillRect(EYE.x - r - 2, EYE.y - r - 2, 2 * r + 4, lid - (EYE.y - r - 2));
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(EYE.x - r * 1.3, lid + 1);
  ctx.lineTo(EYE.x + r * 1.3, lid - 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPicky(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, COMIC_TOP, COMIC_MID, COMIC_BOTTOM);
  drawRays(ctx, t, 1.4, -100, '230,250,255');
  drawSnow(ctx, t, '#f0fbff', 0.6);
  // The rest of the shark, whole, on its back, sinking away behind it.
  const sink = ramp(u, PICKY_AT - 0.4, EATERS_AT + 1) * until(u, BECAUSE_AT + 0.05);
  tinted(ctx, (c) => drawGreatWhite(c, lerp(260, 230, sink), lerp(1010, 1060, sink), 400, 0.12, t, { tail: 0.9 }, true), '#1c4e70', 0.6, 0.8);
  const orca = pickyOrcaAt(t);
  drawOrca(ctx, orca.x, orca.y, orca.length, orca.angle, t, { tail: cycles(9, t) });
  inBody(ctx, orca, () => {
    drawNapkin(ctx, boil, 0.06 * Math.sin(cycles(12, t)));
    drawSmugEye(ctx, sniffAt(t));
  });
  // "Hmph": a puff of bubbles from the blowhole.
  const hole = onBody(orca, ORCA_BLOWHOLE);
  const puff = ramp(u, EATERS_AT - 0.05, EATERS_AT + 0.9) * until(u, BECAUSE_AT + 0.05);
  drawBubbles(ctx, hole.x, hole.y - 10, 7, 70, 20 + 260 * puff, Math.sin(Math.PI * puff), 3);
  wash(ctx, 'soft-light', '#ffe6a0', 0.25);
  drawVignette(ctx, 0.4, '4,20,34');
}
