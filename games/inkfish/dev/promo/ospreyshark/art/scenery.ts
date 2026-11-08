import { type Pt } from '../../../../src/art/pen';
import { fillShape, inkLine, seeded } from '../../pelican/art/ink';
import { dab, smoothLoop, softLine } from '../../seal/art/paint';
import { VIDEO } from '../../short';

/**
 * The world round the animals: the sky, the clouds, and (for the wide shot)
 * Madeira Beach far below: the Gulf, the sand, a long fishing pier, palms and
 * a photographer with a long lens. The beach is drawn in "wide px", the frame
 * as the wide shot shows it, and scaled with the camera as it zooms in.
 * Also the camera's viewfinder, the red rings, the print and its stamp.
 */

const W = VIDEO.width;
const H = VIDEO.height;

/** The sky behind everything, deeper overhead. */
export function drawSky(ctx: CanvasRenderingContext2D, close: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, close > 0.5 ? '#3f86cf' : '#4a90d4');
  g.addColorStop(0.55, close > 0.5 ? '#78b4e6' : '#8cc3ea');
  g.addColorStop(1, close > 0.5 ? '#b5d8f2' : '#d6ecf6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  dab(ctx, W * 0.78, H * 0.12, 520, '255,250,226', 0.35);
}

/** Soft painted clouds in the close shots, drifting with the camera's aim. */
export function drawCloseClouds(ctx: CanvasRenderingContext2D, drift: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const rng = seeded(808);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const span = W + 900;
    const x = ((((rng() * span - drift * (0.4 + 0.3 * rng())) % span) + span) % span) - 450;
    const y = 120 + rng() * (H - 300);
    const r = 160 + rng() * 220;
    for (let j = 0; j < 5; j++) dab(ctx, x + (j - 2) * r * 0.45, y + Math.sin(j * 1.7) * r * 0.12, r * (0.55 + 0.1 * (j % 2)), '255,255,255', 0.5);
    dab(ctx, x, y + r * 0.25, r * 0.9, '170,190,215', 0.18);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the beach (wide px)

const HORIZON = 1060;
const SHORE = (x: number): number => 1430 + 26 * Math.sin(x * 0.006) + 12 * Math.sin(x * 0.017 + 1);

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  for (let j = 0; j < 6; j++) dab(ctx, x + (j - 2.5) * r * 0.42, y - Math.sin((j / 5) * Math.PI) * r * 0.25, r * (0.5 + 0.12 * Math.sin(j * 2.1)), '255,255,255', 0.75);
  dab(ctx, x, y + r * 0.2, r * 1.1, '160,180,210', 0.2);
}

function pier(ctx: CanvasRenderingContext2D, boil: number): void {
  // A long wooden fishing pier from the sand out into the Gulf, narrowing away.
  const nearL: Pt = { x: -60, y: 1700 };
  const nearR: Pt = { x: 150, y: 1660 };
  const farL: Pt = { x: 455, y: 1196 };
  const farR: Pt = { x: 482, y: 1192 };
  const deck = [nearL, farL, farR, nearR];
  // Pilings first, into the water.
  for (let i = 0; i <= 14; i++) {
    const u = (i / 14) ** 1.25;
    const top = { x: nearR.x + (farR.x - nearR.x) * u, y: nearR.y + (farR.y - nearR.y) * u };
    const len = 80 * (1 - u) + 10;
    ctx.fillStyle = '#5e4632';
    ctx.fillRect(top.x - 7 * (1 - u) - 1.5, top.y, 14 * (1 - u) + 3, len);
  }
  const g = ctx.createLinearGradient(nearL.x, nearL.y, farL.x, farL.y);
  g.addColorStop(0, '#b89a74');
  g.addColorStop(1, '#8a7258');
  fillShape(ctx, deck, g);
  for (let i = 1; i < 18; i++) {
    const u = (i / 18) ** 1.2;
    const l = { x: nearL.x + (farL.x - nearL.x) * u, y: nearL.y + (farL.y - nearL.y) * u };
    const r = { x: nearR.x + (farR.x - nearR.x) * u, y: nearR.y + (farR.y - nearR.y) * u };
    inkLine(ctx, [l, r], 0.8, 0.35, boil);
  }
  // The railing.
  inkLine(ctx, [{ x: nearR.x, y: nearR.y - 24 }, { x: farR.x, y: farR.y - 4 }], 1.4, 0.7, boil);
  for (let i = 0; i <= 16; i++) {
    const u = (i / 16) ** 1.25;
    const p = { x: nearR.x + (farR.x - nearR.x) * u, y: nearR.y + (farR.y - nearR.y) * u };
    inkLine(ctx, [p, { x: p.x, y: p.y - 24 * (1 - u) - 4 }], 0.9, 0.55, boil);
  }
  inkLine(ctx, deck, 1.3, 0.7, boil, true);
  // The T at the end.
  fillShape(ctx, [{ x: 430, y: 1192 }, { x: 510, y: 1186 }, { x: 512, y: 1194 }, { x: 428, y: 1200 }], '#7e6850');
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, sway: number, boil: number): void {
  const top = { x: x + lean * h, y: y - h };
  const trunk = [{ x, y }, { x: x + lean * h * 0.3, y: y - h * 0.5 }, top];
  softLine(ctx, trunk, h * 0.07, '#7a5a3c', 1, 2);
  inkLine(ctx, trunk.map((p) => ({ x: p.x + h * 0.03, y: p.y })), 1, 0.6, boil);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55 + sway * 0.08;
    const len = h * (0.5 + 0.1 * (i % 2));
    const tip = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.6 + len * 0.35 };
    const mid = { x: (top.x + tip.x) / 2, y: Math.min(top.y, tip.y) - len * 0.15 };
    const frond = smoothLoop([top, { x: mid.x, y: mid.y - h * 0.03 }, tip, { x: mid.x, y: mid.y + h * 0.04 }], 4);
    fillShape(ctx, frond, i % 2 ? '#3f7a3a' : '#2f6430');
    inkLine(ctx, [top, mid, tip], 0.9, 0.5, boil);
  }
}

function photographer(ctx: CanvasRenderingContext2D, x: number, y: number, boil: number): void {
  // A small figure on the sand, a long lens pointed up at the bird.
  dab(ctx, x + 6, y + 4, 26, '120,96,60', 0.4);
  fillShape(ctx, [{ x: x - 9, y }, { x: x - 6, y: y - 34 }, { x: x + 6, y: y - 34 }, { x: x + 9, y }], '#3b4a5e');
  fillShape(ctx, [{ x: x - 9, y: y - 34 }, { x: x - 8, y: y - 64 }, { x: x + 8, y: y - 64 }, { x: x + 10, y: y - 34 }], '#e8e2d4');
  ctx.fillStyle = '#7a5a40';
  ctx.beginPath();
  ctx.arc(x, y - 73, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e7c4';
  ctx.fillRect(x - 11, y - 84, 22, 5);
  // The long lens, aimed up and right.
  ctx.save();
  ctx.translate(x + 4, y - 70);
  ctx.rotate(-1.0);
  ctx.fillStyle = '#e9e6de';
  ctx.fillRect(0, -5, 40, 10);
  ctx.fillStyle = '#1e1e22';
  ctx.fillRect(-8, -7, 10, 14);
  ctx.fillRect(38, -6, 4, 12);
  ctx.restore();
  inkLine(ctx, [{ x: x - 9, y }, { x: x - 8, y: y - 64 }, { x: x + 8, y: y - 64 }, { x: x + 9, y }], 1, 0.6, boil);
}

/** The beach far below, in wide px (the wide shot's frame). */
export function drawBeach(ctx: CanvasRenderingContext2D, wave: number, boil: number): void {
  // Clouds low over the Gulf.
  cloud(ctx, 180, 860, 120);
  cloud(ctx, 860, 930, 150);
  cloud(ctx, 520, 1000, 90);
  cloud(ctx, 300, 330, 110);
  cloud(ctx, 980, 260, 90);
  // The Gulf: deep at the horizon, turquoise over the sand bars.
  const sea = ctx.createLinearGradient(0, HORIZON, 0, 1450);
  sea.addColorStop(0, '#2f7fa8');
  sea.addColorStop(0.5, '#3fa4b8');
  sea.addColorStop(1, '#6fd0c8');
  ctx.fillStyle = sea;
  ctx.fillRect(-200, HORIZON, W + 400, 520);
  softLine(ctx, [{ x: -100, y: HORIZON + 2 }, { x: W + 100, y: HORIZON + 2 }], 10, '#d8eef4', 0.6, 3);
  const rng = seeded(4242);
  for (let i = 0; i < 46; i++) {
    const y = HORIZON + 14 + (rng() ** 1.6) * 360;
    const x = rng() * (W + 200) - 100 + Math.sin(wave * 2 * Math.PI + i) * 6;
    const len = 20 + ((y - HORIZON) / 360) * 70;
    softLine(ctx, [{ x, y }, { x: x + len, y: y - 1 }], 2 + (y - HORIZON) / 120, '#e9fbff', 0.5, 2);
  }
  // The surf line and the wet sand, then the dry sand.
  const shore: Pt[] = Array.from({ length: 41 }, (_, i) => {
    const x = -100 + (i / 40) * (W + 200);
    return { x, y: SHORE(x) };
  });
  const sand = ctx.createLinearGradient(0, 1400, 0, H);
  sand.addColorStop(0, '#d9c49a');
  sand.addColorStop(0.15, '#f2e2b8');
  sand.addColorStop(1, '#e6cc96');
  fillShape(ctx, [...shore, { x: W + 100, y: H + 50 }, { x: -100, y: H + 50 }], sand);
  softLine(ctx, shore.map((p) => ({ x: p.x, y: p.y + 8 })), 16, '#bfa77c', 0.45, 4);
  const foam = 6 * Math.sin(wave * 2 * Math.PI);
  softLine(ctx, shore.map((p) => ({ x: p.x, y: p.y - 4 + foam * 0.5 })), 10, '#ffffff', 0.85, 3);
  inkLine(ctx, shore, 1.2, 0.5, boil);
  pier(ctx, boil);
  // Umbrellas and towels dotted along the sand.
  const dots = seeded(77);
  for (let i = 0; i < 9; i++) {
    const x = 220 + dots() * 820;
    const y = 1520 + dots() * 330;
    const c = ['#e2553e', '#f2b134', '#3d8fd1', '#ffffff'][i % 4]!;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 1.2, y, 2.4, 16);
    dab(ctx, x + 8, y + 18, 20, '130,104,64', 0.3);
  }
  palm(ctx, 960, 1780, 260, 0.12, Math.sin(wave * 2 * Math.PI), boil);
  palm(ctx, 1050, 1700, 220, -0.08, Math.sin(wave * 2 * Math.PI + 1), boil);
  photographer(ctx, 760, 1660, boil);
}

/** The dashed line from the bird down to the sand. */
export function drawHeightLine(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([22, 16]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(27,26,31,0.7)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of [from, to]) {
    ctx.strokeStyle = 'rgba(27,26,31,0.7)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(p.x - 26, p.y);
    ctx.lineTo(p.x + 26, p.y);
    ctx.stroke();
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the camera's eye

/** A camera viewfinder: corner marks, a darker edge, the focus box round `aim` that locks (turns green). */
export function drawViewfinder(ctx: CanvasRenderingContext2D, alpha: number, aim: Pt, lock: number, size: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  const [x0, y0, x1, y1] = [70, 250, W - 70, 1330];
  const arm = 90;
  ctx.lineCap = 'square';
  for (const [w, c] of [[11, 'rgba(10,10,14,0.6)'], [6, '#ffffff']] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
      ctx.moveTo(x + dx * arm, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * arm);
    }
    ctx.stroke();
  }
  // A small centre cross.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 18, H / 2);
  ctx.lineTo(W / 2 + 18, H / 2);
  ctx.moveTo(W / 2, H / 2 - 18);
  ctx.lineTo(W / 2, H / 2 + 18);
  ctx.stroke();
  // The focus box: white while hunting, green once it locks.
  const c = lock > 0.5 ? '#5ef07a' : '#ffffff';
  const half = size / 2;
  const corner = half * 0.35;
  for (const [w, col] of [[9, 'rgba(10,10,14,0.55)'], [5, c]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const cx = aim.x + dx * half;
      const cy = aim.y + dy * half;
      ctx.moveTo(cx - dx * corner, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - dy * corner);
    }
    ctx.stroke();
  }
  // A recording-style dot, top left: the camera is live.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(x0 + 40, y0 + 46, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A hand-drawn red ring round `c`, drawn `u` (0 .. 1) of the way round. */
export function drawRing(ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, u: number, boil: number): void {
  if (u <= 0.01) return;
  const n = 64;
  const end = Math.round(n * 1.12 * u);
  const pts: Pt[] = [];
  for (let i = 0; i <= end; i++) {
    const a = -2.2 + (i / n) * Math.PI * 2;
    const wob = 1 + 0.03 * Math.sin(i * 0.5 + boil * 2) + 0.05 * (i / n);
    pts.push({ x: c.x + Math.cos(a) * rx * wob, y: c.y + Math.sin(a) * ry * wob });
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = 'rgba(20,10,8,0.6)';
  ctx.lineWidth = 17;
  ctx.stroke();
  ctx.strokeStyle = '#ff3b2a';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the print and the stamp

/** The print's inner picture, in frame px before it is tilted. */
export const PRINT = { x0: 110, y0: 270, x1: 970, y1: 860, border: 26, foot: 90, tilt: -0.045 } as const;

/** Runs `paint` inside the print (tilted, scaled in by `pop`), on its white card. */
export function inPrint(ctx: CanvasRenderingContext2D, pop: number, paint: () => void): void {
  const { x0, y0, x1, y1, border, foot, tilt } = PRINT;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1 + foot) / 2;
  const k = 1 + 0.25 * (1 - pop);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt * pop);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
  // The card's shadow, the card.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#fbf8f0';
  ctx.fillRect(x0 - border, y0 - border, x1 - x0 + 2 * border, y1 - y0 + border + foot);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  paint();
  ctx.restore();
  ctx.strokeStyle = 'rgba(27,26,31,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/** The red rubber stamp, slammed on: `u` 0 (above, big) .. 1 (down). */
export function drawStamp(ctx: CanvasRenderingContext2D, font: string, u: number, boil: number): void {
  if (u <= 0.01) return;
  const c = { x: 560, y: 965 };
  const k = 1 + 0.9 * (1 - u) ** 2;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-0.1);
  ctx.scale(k, k);
  ctx.globalAlpha = Math.min(1, u * 1.6) * 0.95;
  const red = '#d8261c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 92px ${font}`;
  const wide = ctx.measureText('1,000,000,000,000').width;
  const [w, h] = [wide + 64, 210];
  ctx.lineJoin = 'round';
  // A pale backing so it reads over the picture, then the double red border.
  ctx.fillStyle = 'rgba(255,248,236,0.82)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = red;
  ctx.lineWidth = 10;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
  ctx.fillStyle = red;
  ctx.font = `700 100px ${font}`;
  ctx.fillText('1 in', 0, -18);
  ctx.font = `700 92px ${font}`;
  ctx.fillText('1,000,000,000,000', 0, 74);
  // Worn ink: a few gaps where the stamp missed.
  ctx.globalCompositeOperation = 'destination-out';
  const rng = seeded(1717 + boil);
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(-w / 2 + rng() * w, -h / 2 + rng() * h, 3 + rng() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bead of sweat sliding down from `at`, `u` 0 .. 1: a teardrop, pointed on top. */
export function drawSweat(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u <= 0.01) return;
  const r = size * 0.45;
  const x = at.x;
  const y = at.y + u * size * 1.6;
  ctx.save();
  ctx.globalAlpha = Math.min(1, u * 4) * (1 - Math.max(0, (u - 0.85) / 0.15));
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.4);
  ctx.bezierCurveTo(x + r * 0.25, y - r * 1.6, x + r, y - r * 0.8, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * 0.8, x - r * 0.25, y - r * 1.6, x, y - r * 2.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, '#effaff');
  g.addColorStop(1, '#6fbbe8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,26,31,0.85)';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.15, r * 0.18, r * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
