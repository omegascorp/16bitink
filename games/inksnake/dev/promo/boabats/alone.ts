import { RED } from '../../../src/art/palette';
import { zoomAbout } from '../heartbeat/boaRig';
import { VIDEO, lerp } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { type Cast, MARGIN } from './cast';
import { drawVignette } from './cave';
import { along, type Boa, drawBoa, frameOf, hangingKnots } from './rig';
import { ALONE_SNAP, aloneStrike, CUT, droopAt, missBat, missMark, tallyAt, wrap } from './story';

/**
 * The lone boa, closer: one boa hanging in the passage; a bat comes past,
 * it snaps (on the chuckle) and shuts on nothing as the bat flits on. Then
 * the solo tally, ✗ ✗ ✓ (2 of 3 solo hunts failed), and its head droops on
 * "hungry".
 */
const X = 330;
const HINGE: Pt = { x: 400, y: 1130 };
const LEN = 312;
const NECK = 156;
const LUNGE_PX = 150;
const TALLY_Y = 680;
const GREEN = '#9bd36a';

function aloneBoa(t: number): Boa {
  const u = wrap(t);
  const s = aloneStrike(t);
  const droop = droopAt(t);
  const heading = 0.35 - 0.15 * s.lunge + 0.5 * droop;
  const f = frameOf(heading);
  const sway = 8 * Math.sin(u * 1.4);
  const hinge = along({ x: HINGE.x + sway, y: HINGE.y + 30 * droop }, f, s.lunge * LUNGE_PX, 0);
  return {
    rim: along(hinge, f, LEN, 0),
    heading,
    len: LEN,
    neck: NECK,
    girth: 1.34,
    knots: hangingKnots(X, hinge, 1, 0, sway, heading),
    gape: 3 + s.gape * 62,
    eye: droop > 0.5 || (u > ALONE_SNAP && u < ALONE_SNAP + 0.3) ? 'squeeze' : 'open',
    offset: 64,
  };
}

/** The snout at full lunge: where the bat was. */
const snoutAtSnap = (): Pt => aloneBoa(ALONE_SNAP).rim;

function drawMissBat(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const p = missBat(t);
  if (p <= 0 || p >= 1) return;
  const s = snoutAtSnap();
  const pSnap = 0.42 / 0.9;
  const dir = { x: 1300, y: -820 };
  const x = s.x + 130 + (p - pSnap) * dir.x;
  const y = s.y - 120 + (p - pSnap) * dir.y + 90 * Math.sin(p * Math.PI * 2);
  const pose = Math.abs(p - pSnap) < 0.1 ? 'swoop' : Math.floor(wrap(t) * 12) % 2 === 0 ? 'fly1' : 'fly0';
  drawSprite(ctx, cast.bats.mid[pose], boil, { x, y, scale: lerp(10, 7.4, p), rotation: Math.atan2(dir.y, dir.x) + 0.3 * Math.cos(p * Math.PI * 2) });
}

/** Swish lines where the jaws shut on air. */
function drawMiss(ctx: CanvasRenderingContext2D, k: number): void {
  if (k <= 0) return;
  const s = snoutAtSnap();
  ctx.save();
  ctx.globalAlpha = k;
  ctx.lineCap = 'round';
  for (const [w, c] of [[14, '#0b1a2a'], [6, '#f4eddc']] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    for (const [a, r] of [[-0.9, 70], [-0.35, 92], [0.2, 74]] as const) {
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(a) * (r + 10), s.y + Math.sin(a) * (r + 10));
      ctx.lineTo(s.x + Math.cos(a) * (r + 60), s.y + Math.sin(a) * (r + 60));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function inked(ctx: CanvasRenderingContext2D, strokes: readonly (readonly Pt[])[], colour: string, alpha: number, scale: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[30 * scale, '#0b1a2a'], [15 * scale, colour]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    for (const s of strokes) {
      ctx.beginPath();
      s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** ✗ ✗ ✓: the three solo hunts. */
function drawTally(ctx: CanvasRenderingContext2D, t: number): void {
  [640, 800, 960].forEach((x, k) => {
    const a = tallyAt(t, k);
    if (a <= 0) return;
    const r = 44 * (1 + 0.3 * (1 - a));
    if (k < 2) inked(ctx, [[{ x: x - r, y: TALLY_Y - r }, { x: x + r, y: TALLY_Y + r }], [{ x: x + r, y: TALLY_Y - r }, { x: x - r, y: TALLY_Y + r }]], RED, a, 1);
    else inked(ctx, [[{ x: x - r, y: TALLY_Y }, { x: x - r * 0.25, y: TALLY_Y + r * 0.8 }, { x: x + r * 1.1, y: TALLY_Y - r }]], GREEN, a, 1);
  });
}

export function drawAlone(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  ctx.save();
  zoomAbout(ctx, { x: 600, y: 1100 }, 1 + 0.04 * ((u - CUT.alone) / 2.7), 0, 0);
  ctx.drawImage(cast.aloneBg, -MARGIN, -MARGIN);
  drawBoa(ctx, cast.boa, cast.bats, boil, aloneBoa(t));
  drawMissBat(ctx, cast, t, boil);
  drawMiss(ctx, missMark(t));
  ctx.drawImage(cast.aloneCeiling, -MARGIN, -MARGIN);
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.5);
  ctx.restore();
  drawTally(ctx, t);
}
