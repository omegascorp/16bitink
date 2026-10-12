import { halo } from '../../../src/art/glowArt';
import { createRng } from '../../../src/logic/rng';
import { arc, chalk, pathThrough, type Pt, spline } from './ink';
import { ANATOMY, type FishPose } from './story';

/**
 * The barreleye, big and in pale ink on the dark: a dark, scaly, barrel-shaped
 * body with big paddle fins, a small pointed mouth, two dark nostrils above
 * it that look like eyes, and over the head a clear, fluid-filled shield with
 * the two green-lensed tubular eyes inside it, turning on their pivots.
 *
 * Drawn as paths in the fish's own px (facing right, body centre at 0, 0,
 * belly down), so it stays crisp however close the camera gets; the caller
 * transforms the context to put it on screen.
 */
const CHALK = '#e2dccf';
const LINE = 4.2;
const BACK = '#26201f';
const FLANK = '#3f3431';
const BELLY = '#56473f';
const FIN = '#7d6a60';
const LENS = '#62e07a';
const LENS_CORE = '#d9ffcf';
const GLOW = '#4fe06c';
const FLUID = 'rgba(178, 228, 236, 0.09)';
const NOSTRIL = '#0a0810';

// ---------------------------------------------------------------- shapes

/** The body, snout first, along the back (under the shield: the top of the opaque head), round the tail stalk and back along the belly. */
const BODY: Pt[] = spline([
  { x: 408, y: 22 }, { x: 400, y: 2 }, { x: 386, y: -18 }, { x: 370, y: -32 }, { x: 330, y: -52 }, { x: 270, y: -64 }, { x: 200, y: -74 },
  { x: 130, y: -88 }, { x: 70, y: -106 }, { x: 20, y: -122 }, { x: -60, y: -120 }, { x: -150, y: -104 }, { x: -235, y: -76 }, { x: -298, y: -48 },
  { x: -328, y: -36 }, { x: -338, y: 0 }, { x: -328, y: 36 }, { x: -292, y: 52 }, { x: -220, y: 81 }, { x: -130, y: 108 }, { x: -30, y: 124 },
  { x: 80, y: 126 }, { x: 180, y: 116 }, { x: 272, y: 96 }, { x: 338, y: 70 }, { x: 382, y: 48 }, { x: 402, y: 35 },
], true, 6);

/** The shield, front to back over the head; closed along the top of the head beneath it. */
const DOME_EDGE: Pt[] = spline([
  { x: 370, y: -32 }, { x: 388, y: -92 }, { x: 384, y: -170 }, { x: 348, y: -238 }, { x: 282, y: -278 }, { x: 202, y: -286 }, { x: 132, y: -264 },
  { x: 80, y: -220 }, { x: 44, y: -168 }, { x: 20, y: -122 },
], false, 8);
const SKULL: Pt[] = spline([
  { x: 20, y: -122 }, { x: 70, y: -106 }, { x: 130, y: -88 }, { x: 200, y: -74 }, { x: 270, y: -64 }, { x: 330, y: -52 }, { x: 370, y: -32 },
], false, 6);
const DOME: Pt[] = [...DOME_EDGE, ...SKULL.slice(1)];
/** The shield's inner face: it has some thickness. */
const DOME_INNER: Pt[] = (() => {
  const c = { x: 214, y: -120 };
  return DOME_EDGE.slice(4, -6).map((p) => {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    return { x: p.x + ((c.x - p.x) / d) * 11, y: p.y + ((c.y - p.y) / d) * 11 };
  });
})();

const GILL: Pt[] = spline([{ x: 64, y: -108 }, { x: 88, y: -40 }, { x: 100, y: 36 }, { x: 122, y: 108 }], false, 8);
const LATERAL: Pt[] = spline([{ x: 60, y: -56 }, { x: -60, y: -50 }, { x: -180, y: -34 }, { x: -300, y: -6 }], false, 8);
const MOUTH: Pt[] = [{ x: 408, y: 24 }, { x: 395, y: 27 }, { x: 380, y: 28 }];
/** The jaw, running back from the mouth. */
const JAW: Pt[] = spline([{ x: 384, y: 30 }, { x: 362, y: 40 }, { x: 330, y: 46 }], false, 6);

/**
 * A fin: its root along the body from `a` to `b`, its free edge through
 * `edge` (from the ray at `a` to the ray at `b`), with `rays` rays from root
 * to edge. It turns about the middle of its root.
 */
interface Fin {
  readonly a: Pt;
  readonly b: Pt;
  readonly edge: readonly Pt[];
  readonly rays: number;
}

const turnAbout = (p: Pt, o: Pt, angle: number): Pt => {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return { x: o.x + (p.x - o.x) * c - (p.y - o.y) * s, y: o.y + (p.x - o.x) * s + (p.y - o.y) * c };
};

function finShape(f: Fin, turn: number): { readonly outline: Pt[]; readonly rays: Pt[][] } {
  const pivot = { x: (f.a.x + f.b.x) / 2, y: (f.a.y + f.b.y) / 2 };
  const edge = spline(f.edge, false, 8).map((p) => turnAbout(p, pivot, turn));
  const rays = Array.from({ length: f.rays }, (_, i) => {
    const u = i / (f.rays - 1);
    const root = { x: f.a.x + (f.b.x - f.a.x) * (0.1 + 0.8 * u), y: f.a.y + (f.b.y - f.a.y) * (0.1 + 0.8 * u) };
    const tip = edge[Math.round(u * (edge.length - 1))]!;
    return [root, tip];
  });
  return { outline: [f.a, ...edge, f.b], rays };
}

const PECTORAL: Fin = {
  a: { x: 112, y: 36 }, b: { x: 104, y: 72 }, rays: 10,
  edge: [{ x: 60, y: 22 }, { x: -20, y: 30 }, { x: -78, y: 62 }, { x: -96, y: 104 }, { x: -70, y: 136 }, { x: -10, y: 138 }, { x: 60, y: 104 }],
};
const FAR_PECTORAL: Fin = {
  a: { x: 124, y: 26 }, b: { x: 118, y: 56 }, rays: 9,
  edge: [{ x: 80, y: 6 }, { x: 10, y: 4 }, { x: -50, y: 26 }, { x: -70, y: 62 }, { x: -46, y: 92 }, { x: 20, y: 96 }, { x: 80, y: 74 }],
};
const PELVIC: Fin = {
  a: { x: 10, y: 122 }, b: { x: -40, y: 122 }, rays: 7,
  edge: [{ x: 4, y: 150 }, { x: -30, y: 196 }, { x: -78, y: 214 }, { x: -110, y: 196 }, { x: -96, y: 152 }],
};
const FAR_PELVIC: Fin = {
  a: { x: 24, y: 118 }, b: { x: -24, y: 120 }, rays: 6,
  edge: [{ x: 22, y: 142 }, { x: -6, y: 180 }, { x: -50, y: 196 }, { x: -80, y: 180 }, { x: -72, y: 146 }],
};
const DORSAL: Fin = {
  a: { x: -50, y: -119 }, b: { x: -158, y: -100 }, rays: 8,
  edge: [{ x: -60, y: -150 }, { x: -96, y: -186 }, { x: -146, y: -190 }, { x: -182, y: -160 }, { x: -186, y: -112 }],
};
const ANAL: Fin = {
  a: { x: -196, y: 90 }, b: { x: -276, y: 60 }, rays: 7,
  edge: [{ x: -200, y: 120 }, { x: -236, y: 150 }, { x: -284, y: 142 }, { x: -306, y: 108 }, { x: -298, y: 70 }],
};
const TAIL: Fin = {
  a: { x: -322, y: -38 }, b: { x: -322, y: 38 }, rays: 13,
  edge: [
    { x: -352, y: -62 }, { x: -412, y: -108 }, { x: -462, y: -118 }, { x: -440, y: -56 }, { x: -418, y: 0 }, { x: -440, y: 56 }, { x: -462, y: 118 },
    { x: -412, y: 108 }, { x: -352, y: 62 },
  ],
};

// ---------------------------------------------------------------- texture

/** Big scales in staggered rows, their free edges towards the tail. */
const SCALES: Pt[][] = (() => {
  const out: Pt[][] = [];
  for (let row = 0; row < 9; row++) {
    const y = -112 + row * 30;
    for (let col = 0; col < 13; col++) {
      const x = 62 - col * 34 - (row % 2) * 17;
      if (x < -340) continue;
      out.push(arc(x, y, 21, 19, Math.PI * 0.55, Math.PI * 0.9, 8));
    }
  }
  return out;
})();

/** Short hatching strokes along the belly. */
const HATCH: Pt[][] = (() => {
  const rng = createRng(57);
  const out: Pt[][] = [];
  for (let x = -280; x <= 360; x += 9 + rng() * 6) {
    const k = (x + 280) / 640;
    const bottom = BODY.filter((p) => p.y > 0).reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)).y;
    const len = (10 + 26 * Math.sin(Math.PI * k)) * (0.6 + 0.5 * rng());
    const lean = 6 + rng() * 6;
    out.push([{ x: x - lean, y: bottom - len }, { x: x + 3, y: bottom + 4 }]);
  }
  return out;
})();

/** Just inside the back, behind the shield: where the light from above falls. */
const RIM: Pt[] = BODY.filter((p) => p.y < -30 && p.x < 10 && p.x > -300).map((p) => ({ x: p.x, y: p.y + 7 }));

/** Ink stipple on the dark back. */
const SPECKS: { x: number; y: number; r: number }[] = (() => {
  const rng = createRng(31);
  return Array.from({ length: 220 }, () => ({ x: -330 + rng() * 720, y: -120 + rng() * 150, r: 0.8 + rng() * 2 }));
})();

// ---------------------------------------------------------------- drawing

function drawFin(ctx: CanvasRenderingContext2D, f: Fin, turn: number, boil: number, seed: number, alpha = 1): void {
  const { outline, rays } = finShape(f, turn);
  ctx.save();
  ctx.globalAlpha *= alpha * 0.4;
  ctx.fillStyle = FIN;
  pathThrough(ctx, outline, true);
  ctx.fill();
  ctx.restore();
  rays.forEach((r, i) => chalk(ctx, r, seed + i, boil, { width: 1.7, color: CHALK, alpha: 0.5 * alpha, wander: 0.8, retrace: false }));
  chalk(ctx, outline.slice(1, -1), seed + 50, boil, { width: LINE * 0.7, color: CHALK, alpha: 0.9 * alpha });
}

function bodyFill(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, -120, 0, 126);
  g.addColorStop(0, BACK);
  g.addColorStop(0.55, FLANK);
  g.addColorStop(1, BELLY);
  ctx.fillStyle = g;
  pathThrough(ctx, BODY, true);
  ctx.fill();
}

function bodyTexture(ctx: CanvasRenderingContext2D, boil: number): void {
  ctx.save();
  pathThrough(ctx, BODY, true);
  ctx.clip();
  // Scales: behind the gill cover only.
  SCALES.forEach((s, i) => chalk(ctx, s, 400 + i, boil, { width: 1.8, color: CHALK, alpha: 0.2, wander: 0.6, retrace: false }));
  ctx.fillStyle = '#0d0a0a';
  for (const s of SPECKS) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A soft sheen along the flank.
  const sheen = ctx.createLinearGradient(0, -40, 0, 60);
  sheen.addColorStop(0, 'rgba(226, 220, 207, 0)');
  sheen.addColorStop(0.5, 'rgba(226, 220, 207, 0.06)');
  sheen.addColorStop(1, 'rgba(226, 220, 207, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-340, -40, 740, 100);
  // Pen shading: hatching under the belly, where no light reaches.
  HATCH.forEach((h, i) => chalk(ctx, h, 600 + i, boil, { width: 1.5, color: '#0c0909', alpha: 0.35, wander: 0.5, retrace: false }));
  ctx.restore();
  // The last of the daylight, from above, catching the back.
  chalk(ctx, RIM, 620, boil, { width: 3, color: '#9fc6e8', alpha: 0.3, wander: 0.8, retrace: false });
}

/** One nostril: a dark round pit with a pale rim. Just like an eye, at a glance. */
function nostril(ctx: CanvasRenderingContext2D, at: Pt, r: number, boil: number, seed: number): void {
  ctx.fillStyle = NOSTRIL;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  chalk(ctx, arc(at.x, at.y, r + 2, r * 0.92 + 2, 0, Math.PI * 2, 24), seed, boil, { width: 2.6, color: CHALK, alpha: 0.85, wander: 0.5 });
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(at.x + r * 0.35, at.y - r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * One tubular eye turned to `angle` about its pivot: a tube with the dark
 * retina at its foot and the green lens at its tip.
 */
function eye(ctx: CanvasRenderingContext2D, pivot: Pt, angle: number, glow: number, boil: number, seed: number, alpha: number): void {
  const reach = ANATOMY.lensReach;
  const r = ANATOMY.lensR;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(angle);
  // Along +x from the foot (-60) to the lens (reach).
  const tube: Pt[] = [{ x: -62, y: -31 }, { x: reach - 8, y: -25 }, { x: reach - 8, y: 25 }, { x: -62, y: 31 }];
  const g = ctx.createLinearGradient(-62, 0, reach, 0);
  g.addColorStop(0, 'rgba(20, 40, 30, 0.85)');
  g.addColorStop(0.35, 'rgba(120, 190, 150, 0.22)');
  g.addColorStop(1, 'rgba(150, 230, 170, 0.32)');
  ctx.fillStyle = g;
  pathThrough(ctx, tube, true);
  ctx.fill();
  // The retina: a dark cup at the foot.
  const cup = arc(-50, 0, 18, 31, Math.PI / 2, Math.PI, 12);
  ctx.fillStyle = '#0c1410';
  pathThrough(ctx, [...cup, { x: -44, y: -31 }, { x: -44, y: 31 }], true);
  ctx.fill();
  chalk(ctx, [tube[0]!, tube[1]!], seed, boil, { width: 2.4, color: CHALK, alpha: 0.85, wander: 0.6 });
  chalk(ctx, [tube[3]!, tube[2]!], seed + 1, boil, { width: 2.4, color: CHALK, alpha: 0.85, wander: 0.6 });
  chalk(ctx, cup, seed + 2, boil, { width: 2.4, color: CHALK, alpha: 0.85, wander: 0.6 });
  // The lens: a green ball, lit from inside.
  const lens = ctx.createRadialGradient(reach + r * 0.25, -r * 0.25, 2, reach, 0, r);
  lens.addColorStop(0, LENS_CORE);
  lens.addColorStop(0.45, LENS);
  lens.addColorStop(1, '#1f7a3a');
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(reach, 0, r, 0, Math.PI * 2);
  ctx.fill();
  chalk(ctx, arc(reach, 0, r, r, 0, Math.PI * 2, 28), seed + 3, boil, { width: 2.6, color: CHALK, alpha: 0.9, wander: 0.5 });
  ctx.restore();
  // Its light, as the game draws glows: added on top.
  const lensAt = { x: pivot.x + Math.cos(angle) * reach, y: pivot.y + Math.sin(angle) * reach };
  halo(ctx, lensAt.x, lensAt.y, 150 * glow, GLOW, 0.32 * alpha * Math.min(glow, 1.6));
  halo(ctx, lensAt.x, lensAt.y, 46 * glow, GLOW, 0.5 * alpha * Math.min(glow, 1.6));
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha *= 0.85 * alpha;
  ctx.beginPath();
  ctx.arc(lensAt.x + 9, lensAt.y - 10, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface ShieldLook {
  /** The shield's outline brightened, 0 .. 1. */
  readonly lit: number;
  /** A gleam running round its edge, 0 .. 1 over its run, or outside that. */
  readonly gleam: number;
}

function shield(ctx: CanvasRenderingContext2D, f: FishPose, boil: number, look: ShieldLook): void {
  // The fluid inside: you see the water through it.
  ctx.save();
  pathThrough(ctx, DOME, true);
  ctx.clip();
  const g = ctx.createRadialGradient(240, -200, 20, 220, -150, 210);
  g.addColorStop(0, 'rgba(190, 236, 242, 0.13)');
  g.addColorStop(1, FLUID);
  ctx.fillStyle = g;
  ctx.fillRect(40, -300, 360, 280);
  // Its inner face: the shield has some thickness, catching a little light.
  const shine = ctx.createLinearGradient(0, -290, 0, -120);
  shine.addColorStop(0, 'rgba(210, 245, 250, 0.16)');
  shine.addColorStop(1, 'rgba(210, 245, 250, 0)');
  ctx.strokeStyle = shine;
  ctx.lineWidth = 26;
  pathThrough(ctx, DOME_EDGE);
  ctx.stroke();
  ctx.restore();
  // The eyes: the far one first, fainter.
  const [near, far] = ANATOMY.pivots;
  eye(ctx, far, f.eyes, f.glow, boil, 700, 0.55);
  eye(ctx, near, f.eyes, f.glow, boil, 720, 1);
  // The top of the head, seen through the shield.
  chalk(ctx, SKULL, 940, boil, { width: 2.4, color: CHALK, alpha: 0.45, wander: 0.8 });
  // The shield itself: its outer and inner faces, and a highlight.
  chalk(ctx, DOME_INNER, 960, boil, { width: 1.6, color: '#bfeaf0', alpha: 0.22 + 0.3 * look.lit, wander: 0.7, retrace: false });
  chalk(ctx, DOME_EDGE, 980, boil, { width: LINE * (1 + 0.35 * look.lit), color: look.lit > 0 ? '#e9fbff' : CHALK, alpha: 0.85 + 0.15 * look.lit });
  if (look.lit > 0) {
    ctx.save();
    ctx.shadowColor = 'rgba(190, 240, 250, 0.9)';
    ctx.shadowBlur = 18;
    chalk(ctx, DOME_EDGE, 981, boil, { width: 2.5, color: '#e9fbff', alpha: 0.5 * look.lit, retrace: false });
    ctx.restore();
  }
  chalk(ctx, spline([{ x: 352, y: -176 }, { x: 330, y: -220 }, { x: 290, y: -250 }], false, 8), 990, boil, {
    width: 5, color: '#ffffff', alpha: 0.5, wander: 0.4, retrace: false,
  });
  if (look.gleam > 0 && look.gleam < 1) {
    // A bright spot running along the edge, back to front.
    const at = DOME_EDGE.length - 1 - Math.floor(look.gleam * (DOME_EDGE.length - 1));
    const p = DOME_EDGE[at]!;
    halo(ctx, p.x, p.y, 70, '#d8fbff', Math.sin(Math.PI * look.gleam));
  }
}

/** Draws the fish; the context is already in the fish's own px. */
export function drawBarreleye(ctx: CanvasRenderingContext2D, f: FishPose, boil: number, look: ShieldLook): void {
  const scull = Math.sin(f.fin) * (0.16 + 0.22 * f.effort);
  const scull2 = Math.sin(f.fin - 0.9) * (0.14 + 0.2 * f.effort);
  const flutter = Math.sin(f.fin * 2 + 1) * 0.06;
  const sway = Math.sin(f.fin + 1.4) * (0.05 + 0.16 * f.effort);
  // Behind the body: the far fins, the tail, the back fins.
  drawFin(ctx, FAR_PECTORAL, scull2, boil, 100, 0.5);
  drawFin(ctx, FAR_PELVIC, -scull * 0.5, boil, 120, 0.5);
  drawFin(ctx, TAIL, sway, boil, 140);
  drawFin(ctx, DORSAL, flutter, boil, 160);
  drawFin(ctx, ANAL, -flutter, boil, 180);
  bodyFill(ctx);
  bodyTexture(ctx, boil);
  chalk(ctx, LATERAL, 200, boil, { width: 1.8, color: CHALK, alpha: 0.35, retrace: false });
  chalk(ctx, GILL, 210, boil, { width: LINE * 0.8, color: CHALK, alpha: 0.85 });
  // The outline, all but the top of the head (the shield draws that).
  const open = BODY.slice(BODY.findIndex((p) => p.x <= 21 && p.y < -110));
  const front = BODY.slice(0, BODY.findIndex((p) => p.x < 370 && p.y < -32) + 1);
  chalk(ctx, [...open, ...front], 220, boil, { width: LINE, color: CHALK });
  chalk(ctx, MOUTH, 230, boil, { width: 3.2, color: CHALK, wander: 0.5 });
  chalk(ctx, JAW, 235, boil, { width: 2, color: CHALK, alpha: 0.4, wander: 0.5, retrace: false });
  const [n1, n2] = ANATOMY.nares;
  nostril(ctx, n2, 14, boil, 240);
  nostril(ctx, n1, 16, boil, 250);
  // On top: the near fins, sculling.
  drawFin(ctx, PELVIC, -scull * 0.6, boil, 260);
  drawFin(ctx, PECTORAL, scull, boil, 280);
  shield(ctx, f, boil, look);
}
