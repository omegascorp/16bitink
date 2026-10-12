import { INK } from '../../../src/art/pen';
import { Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { cubic, type Pt, pt } from './shape';

/**
 * December 1938, off East London, South Africa: the side of a trawler in
 * pen and ink on paper. Its catch is heaped on deck behind the rail, the
 * wheelhouse and mast behind, and a curator (a generic figure in a hat and
 * coat, not a likeness) stands behind the catch pointing at the strange
 * blue fish. Deck coordinates: as on screen with the camera on the boat; the
 * waterline is at y 1150. The fish itself is drawn by fish.ts.
 */
const W = VIDEO.width;
export const WATER_AT = 1150;
export const RAIL_AT = 930;
/** The boat rolls about this point. */
export const PIVOT = pt(540, 1120);

const HULL = '#3a3633';
const WOOD = '#6b5a48';
const NET = '#8d8775';

/** The heap of netted fish on deck, rising above the rail. */
const HEAP: readonly Pt[] = [
  ...cubic(pt(110, RAIL_AT + 6), pt(160, 820), pt(300, 772), pt(440, 790), 10),
  ...cubic(pt(440, 790), pt(600, 806), pt(720, 850), pt(800, RAIL_AT + 6), 10).slice(1),
];

/** Other fish in the catch, grey: [x, y, length, angle]. */
const CATCH: readonly (readonly [number, number, number, number])[] = [
  [220, 868, 120, 0.3], [330, 836, 140, -0.2], [560, 850, 130, 0.5], [650, 892, 110, -0.4], [180, 900, 90, -0.6], [470, 880, 150, 0.1], [730, 905, 80, 0.8],
];

/** The curator, facing left, waist at the origin, leaning over the rail to point at the fish. */
const CURATOR: readonly Pt[] = [
  pt(70, 0), pt(76, -60), pt(78, -130), pt(72, -190), pt(60, -232), pt(40, -256), pt(22, -268), pt(30, -282), pt(36, -300), pt(34, -318), pt(30, -336),
  pt(18, -358), pt(-4, -370), pt(-28, -368), pt(-46, -356), pt(-56, -340), pt(-72, -333), pt(-62, -326), pt(-50, -324), pt(-48, -316), pt(-58, -303),
  pt(-50, -298), pt(-53, -290), pt(-44, -280), pt(-30, -272), pt(-44, -262), pt(-62, -246), pt(-80, -226), pt(-104, -196), pt(-128, -166), pt(-148, -150),
  pt(-164, -146), pt(-168, -140), pt(-150, -136), pt(-130, -146), pt(-104, -172), pt(-80, -196), pt(-66, -206), pt(-62, -170), pt(-60, -120), pt(-64, -60),
  pt(-68, 0),
];

function shape(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** A plain fish shape in grey ink, for the rest of the catch. */
function catchFish(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, len: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const body = [
    ...cubic(pt(len / 2, 0), pt(len * 0.3, -len * 0.2), pt(-len * 0.2, -len * 0.16), pt(-len * 0.4, 0), 8),
    pt(-len * 0.55, -len * 0.14), pt(-len * 0.5, 0), pt(-len * 0.55, len * 0.14),
    ...cubic(pt(-len * 0.4, 0), pt(-len * 0.2, len * 0.16), pt(len * 0.3, len * 0.2), pt(len / 2, 0), 8),
  ];
  pen.fill(body, '#9a9c9a', 1);
  pen.stroke([...body, body[0]!], 2.4, INK, 0.9, false);
  pen.dot(len * 0.32, -len * 0.04, Math.max(2, len * 0.03), INK, 1);
  ctx.restore();
}

/** Sky, coast and sea behind the boat: everything that doesn't roll with it. */
function drawBehind(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, pen: Pen): void {
  ctx.drawImage(paper, 0, 0, W, WATER_AT + 40, 0, 0, W, WATER_AT + 40);
  const sky = ctx.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, 'rgba(120,150,170,0.28)');
  sky.addColorStop(1, 'rgba(230,200,150,0.18)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 640);
  // The coast on the horizon, low hills.
  const coast = Array.from({ length: 24 }, (_, k) => pt(-20 + k * 48, 630 - 26 * Math.sin(k * 0.5) - 18 * Math.sin(k * 1.3 + 1) - (k < 12 ? 20 : 0)));
  pen.fill([...coast, pt(W + 20, 640), pt(-20, 640)], '#7e8a86', 0.35);
  pen.stroke(coast, 2, INK, 0.5, false);
  // The sea behind the boat.
  const sea = ctx.createLinearGradient(0, 640, 0, WATER_AT);
  sea.addColorStop(0, 'rgba(110,150,165,0.35)');
  sea.addColorStop(1, 'rgba(70,110,130,0.5)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 640, W, WATER_AT - 640);
  pen.stroke([pt(-20, 640), pt(W + 20, 640)], 2.4, INK, 0.7, false);
  const rng = createRng(12);
  for (let k = 0; k < 26; k++) {
    const x = rng() * W;
    const y = 660 + rng() * 260;
    const len = 30 + rng() * 50;
    pen.hair([pt(x, y), pt(x + len / 2, y - 4), pt(x + len, y)], 1.6, INK, 0.35);
  }
  // Gulls.
  for (const [x, y, s] of [[640, 260, 1], [720, 300, 0.7], [180, 360, 0.8]] as const) {
    pen.stroke([pt(x - 26 * s, y - 6 * s), pt(x - 10 * s, y - 12 * s), pt(x, y), pt(x + 10 * s, y - 12 * s), pt(x + 26 * s, y - 6 * s)], 2.6, INK, 0.8, false);
  }
}

/** The boat above the waterline and under it (rolls with the boat). */
function drawBoat(ctx: CanvasRenderingContext2D, pen: Pen): void {
  // Mast and rigging.
  pen.stroke([pt(338, RAIL_AT), pt(342, 220)], 7, INK, 1, false);
  pen.stroke([pt(300, 300), pt(390, 300)], 5, INK, 1, false);
  for (const to of [pt(20, RAIL_AT - 10), pt(1060, RAIL_AT - 10), pt(700, RAIL_AT - 10)]) pen.hair([pt(342, 230), to], 1.8, INK, 0.7);
  // Wheelhouse.
  const house = [pt(20, RAIL_AT), pt(24, 560), pt(270, 556), pt(276, RAIL_AT)];
  pen.fill(house, '#efe6d2', 1);
  pen.fill(house, '#8a8f8c', 0.2);
  pen.stroke([...house], 4, INK, 1, false);
  pen.stroke([pt(0, 552), pt(296, 544)], 6, INK, 1, false);
  for (const x of [50, 120, 190]) {
    const win = [pt(x, 600), pt(x + 52, 600), pt(x + 52, 660), pt(x, 660)];
    pen.fill(win, '#2c3338', 0.85);
    pen.stroke([...win, win[0]!], 2.4, INK, 1, false);
  }
  pen.stroke([pt(200, 470), pt(206, 548)], 16, '#3d3a37', 1, false);
  // Hull: dark planking, a pale strake along the top, the name on the bow.
  const hull = [pt(-60, RAIL_AT), pt(W + 60, RAIL_AT - 12), pt(W + 60, 1330), ...cubic(pt(W + 60, 1330), pt(800, 1400), pt(300, 1400), pt(-60, 1330), 12).slice(1)];
  pen.fill(hull, HULL, 1);
  ctx.save();
  shape(ctx, hull);
  ctx.clip();
  for (let y = RAIL_AT + 70; y < 1380; y += 34) pen.hair([pt(-60, y), pt(W / 2, y - 6), pt(W + 60, y - 12)], 1.8, '#15120f', 0.6);
  pen.fill([pt(-60, RAIL_AT), pt(W + 60, RAIL_AT - 12), pt(W + 60, RAIL_AT + 40), pt(-60, RAIL_AT + 52)], '#d8d0bd', 1);
  ctx.restore();
  pen.stroke([pt(-60, RAIL_AT), pt(W + 60, RAIL_AT - 12)], 6, INK, 1, false);
  pen.stroke([pt(-60, RAIL_AT + 52), pt(W + 60, RAIL_AT + 40)], 3, INK, 1, false);
  ctx.save();
  ctx.font = '700 46px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#e9e1cf';
  ctx.globalAlpha = 0.9;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '8px';
  ctx.fillText('NERINE', 830, 1062);
  ctx.restore();
  // Stanchions along the rail.
  for (let x = 40; x < W; x += 120) pen.stroke([pt(x, RAIL_AT - 40), pt(x, RAIL_AT)], 5, WOOD, 1, false);
  pen.stroke([pt(-60, RAIL_AT - 40), pt(W + 60, RAIL_AT - 52)], 6, WOOD, 1, false);
}

/** The catch, heaped behind the rail (drawn before the coelacanth lands on top). */
function drawHeap(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const heap = [...HEAP, pt(110, RAIL_AT + 6)];
  pen.fill(heap, NET, 1);
  ctx.save();
  shape(ctx, heap);
  ctx.clip();
  for (const [x, y, len, a] of CATCH) catchFish(ctx, pen, x, y, len, a);
  pen.hatch(heap, 16, 0.8, 1.4, { color: INK, alpha: 0.45 });
  pen.hatch(heap, 16, -0.8, 1.4, { color: INK, alpha: 0.45 });
  ctx.restore();
  pen.stroke(HEAP, 3.4, INK, 1, false);
}

/** Runs `draw` tilted with the boat's roll (radians). */
export function rolled(ctx: CanvasRenderingContext2D, roll: number, draw: () => void): void {
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(roll);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  draw();
  ctx.restore();
}

export interface Deck {
  /** Everything behind the fish (`roll` radians). */
  back(ctx: CanvasRenderingContext2D, roll: number, boil: number): void;
  /** The curator behind the catch, pointing at it: `curator` 0 .. 1 how far she has stepped up. */
  curator(ctx: CanvasRenderingContext2D, roll: number, boil: number, curator: number): void;
}

export function makeDeck(): Deck {
  const paper = makePaper();
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = 1420;
    const ctx = canvas.getContext('2d')!;
    const pen = new Pen(ctx, 3100 + f * 977, 1.6);
    drawBoat(ctx, pen);
    drawHeap(ctx, pen);
    return canvas;
  });
  const behind = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = WATER_AT + 40;
    drawBehind(canvas.getContext('2d')!, paper, new Pen(canvas.getContext('2d')!, 2100 + f * 977, 1.6));
    return canvas;
  });
  return {
    back(ctx, roll, boil): void {
      ctx.drawImage(behind[boil % BOIL_FRAMES]!, 0, 0);
      rolled(ctx, roll, () => ctx.drawImage(frames[boil % BOIL_FRAMES]!, 0, 0));
    },
    curator(ctx, roll, boil, curator): void {
      rolled(ctx, roll, () => {
        if (curator <= 0) return;
        const pen = new Pen(ctx, 4100 + boil * 977, 1.4);
        ctx.save();
        ctx.globalAlpha = curator;
        ctx.translate(900 + 30 * (1 - curator), RAIL_AT - 46);
        ctx.rotate(-0.1);
        pen.fill(CURATOR, INK, 1);
        pen.stroke([...CURATOR, CURATOR[0]!], 3, INK, 1, false);
        ctx.restore();
        // The rail cap in front of her waist.
        pen.stroke([pt(700, RAIL_AT - 44), pt(W + 60, RAIL_AT - 52)], 6, WOOD, curator, false);
      });
    },
  };
}

/** The waves where the hull meets the sea (fixed: the sea doesn't roll). */
export function drawWaterline(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 5100 + boil * 977, 1.6);
  const pts = Array.from({ length: 40 }, (_, k) => pt(-20 + k * 29, WATER_AT + 8 * Math.sin(k * 0.9 + t * 2.4)));
  ctx.save();
  const sea = ctx.createLinearGradient(0, WATER_AT, 0, WATER_AT + 300);
  sea.addColorStop(0, 'rgba(150,185,192,0.78)');
  sea.addColorStop(1, 'rgba(110,147,166,0.92)');
  ctx.fillStyle = sea;
  ctx.beginPath();
  pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(W + 20, WATER_AT + 300);
  ctx.lineTo(-20, WATER_AT + 300);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pen.stroke(pts, 3.4, INK, 0.9, false);
  for (let k = 0; k < 12; k++) {
    const x = (k * 97 + t * 40) % (W + 80) - 40;
    pen.hair([pt(x, WATER_AT + 30 + (k % 3) * 22), pt(x + 40, WATER_AT + 26 + (k % 3) * 22), pt(x + 80, WATER_AT + 30 + (k % 3) * 22)], 1.8, INK, 0.45);
  }
}
