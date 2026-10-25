import { INK, pathOf, type Pen, type Pt } from '../../../src/art/pen';
import { lerp } from '../short';

/**
 * The sheepshead's mouth, seen from the front on its snout (the cartoon
 * three-quarter cheat): fleshy lips over a row of flat, very human front
 * teeth, and behind them, when it opens wide, the rows of round molars it
 * crushes shells with (three rows on top, two below). Also used for the
 * people's grins in the snapshots, with their flaws.
 *
 * Local px, the origin at the middle of the mouth, +y down.
 */

export interface MouthShape {
  readonly lips: number;
  readonly jaw: number;
  readonly smile: number;
  readonly pucker: number;
  readonly rows: number;
}

/** A person's grin's flaws, for the snapshots. */
export interface Flaws {
  readonly gap?: boolean;
  readonly braces?: boolean;
  readonly crooked?: boolean;
}

export interface MouthLook {
  /** Lip colour and its shadow. */
  readonly lip: string;
  readonly lipDark: string;
  readonly enamel: string;
  readonly flaws?: Flaws;
  /** Black-and-white mugshot mode (0 .. 1): the lips go grey. */
  readonly mono?: number;
}

export const FISH_MOUTH: MouthLook = { lip: '#b4a19b', lipDark: '#7d6964', enamel: '#f6f1e2' };

const HALF_W = 116;
/** The upper teeth's biting edge at the middle; it curves up towards the corners (a smile line). */
const EDGE_Y = 10;
const UPPER = { widths: [25, 31, 40, 40, 31, 25], heights: [46, 54, 66, 66, 54, 46] } as const;
const LOWER = { widths: [23, 27, 30, 30, 27, 23], heights: [40, 45, 50, 50, 45, 40] } as const;
const GAP = 3;
const JAW_DROP = 172;

const edgeAt = (x: number, smile: number): number => EDGE_Y - (10 + 10 * smile) * (x / 100) ** 2;

interface Frame {
  readonly w: number;
  readonly cornerY: number;
  /** The opening's upper and lower edge at x (lips' inner edges). */
  readonly upperEdge: (x: number) => number;
  readonly lowerEdge: (x: number) => number;
  /** The lower teeth's tops at x. */
  readonly lowerTeeth: (x: number) => number;
}

function frameOf(m: MouthShape): Frame {
  const w = HALF_W * (1 - 0.62 * m.pucker);
  const cornerY = 6 - m.smile * 30;
  const drop = m.jaw * JAW_DROP;
  // How open the lips are towards the corner: wide in the middle, pinched at the corners.
  const bulge = (x: number): number => Math.max(0, 1 - (x / w) ** 2) ** 0.6;
  const upperEdge = (x: number): number => lerp(cornerY, lerp(edgeAt(x, m.smile) + 2, edgeAt(x, m.smile) - 64, m.lips), bulge(x));
  const lowerTeeth = (x: number): number => edgeAt(x, m.smile) - 7 + drop;
  const lowerEdge = (x: number): number => lerp(cornerY, lerp(edgeAt(x, m.smile) + 2 + drop * 0.85, lowerTeeth(x) + 52, m.lips) + drop * 0.15 * m.lips, bulge(x));
  return { w, cornerY, upperEdge, lowerEdge, lowerTeeth };
}

const sample = (from: number, to: number, n: number, f: (x: number) => number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = lerp(from, to, i / n);
    return { x, y: f(x) };
  });

/** The opening between the lips (closed polygon), or null when the lips meet. */
function opening(fr: Frame): Pt[] {
  return [...sample(-fr.w, fr.w, 28, fr.upperEdge), ...sample(fr.w, -fr.w, 28, fr.lowerEdge)];
}

/** One flat front tooth: rounded at the biting edge, its root hidden under the gum (`hangs`: a top tooth). */
function toothShape(cx: number, edge: number, w: number, h: number, hangs: boolean): Pt[] {
  const s = hangs ? -1 : 1;
  const r = w * 0.3;
  const root = edge + s * h;
  const arc = (ox: number, from: number, to: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => {
      const a = lerp(from, to, i / 6);
      return { x: ox + Math.cos(a) * r, y: edge + s * r + Math.sin(a) * r };
    });
  const mid = Math.PI + (s * Math.PI) / 2;
  return [
    { x: cx - w / 2, y: root },
    ...arc(cx - w / 2 + r, Math.PI, mid),
    ...arc(cx + w / 2 - r, mid, s > 0 ? Math.PI * 2 : 0),
    { x: cx + w / 2, y: root },
  ];
}

function drawTeeth(pen: Pen, row: typeof UPPER | typeof LOWER, edge: (x: number) => number, down: boolean, look: MouthLook, crooked: number): void {
  const { ctx } = pen;
  const gaps = look.flaws?.gap ? [0, 0, 14, 0, 0] : [0, 0, 0, 0, 0];
  const total = row.widths.reduce((s, w) => s + w, 0) + GAP * (row.widths.length - 1) + gaps.reduce((s, g) => s + g, 0);
  let x = -total / 2;
  row.widths.forEach((w, i) => {
    const cx = x + w / 2;
    x += w + GAP + (gaps[i] ?? 0);
    if (look.flaws?.crooked && down === false && i === 4) return; // a missing tooth
    const h = row.heights[i]!;
    const tip = edge(cx) + (crooked ? crooked * Math.sin(i * 2.3) * 9 : 0);
    const shape = toothShape(cx, tip, w, h + 30, !down);
    ctx.save();
    if (crooked) {
      ctx.translate(cx, tip);
      ctx.rotate(Math.sin(i * 1.9) * 0.16 * crooked);
      ctx.translate(-cx, -tip);
    }
    // Enamel: bright in the middle, shaded to the sides and towards the root.
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, '#c9c1ad');
    g.addColorStop(0.3, look.enamel);
    g.addColorStop(0.65, look.enamel);
    g.addColorStop(1, '#bdb49f');
    ctx.fillStyle = g;
    pathOf(ctx, shape);
    ctx.fill();
    // A glint on each.
    pen.hair([{ x: cx - w * 0.18, y: tip - (down ? -h * 0.2 : h * 0.15) }, { x: cx - w * 0.12, y: tip - (down ? -h * 0.55 : h * 0.6) }], 2.2, '#ffffff', 0.7);
    pen.stroke(shape.slice(1, -1), 2.4, INK, 0.9, false);
    ctx.restore();
  });
  if (look.flaws?.braces && down === false) {
    pen.stroke(sample(-total / 2 + 6, total / 2 - 6, 10, (xx) => edge(xx) - 22), 4, '#8a8f96', 1, false);
    row.widths.forEach((_, i) => {
      const cx = -total / 2 + row.widths.slice(0, i).reduce((s, w) => s + w + GAP, 0) + row.widths[i]! / 2;
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(cx - 6, edge(cx) - 28, 12, 12);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 6, edge(cx) - 28, 12, 12);
    });
  }
}

/** One row of round molars, an arch of little cobbles (`pop` 0 .. 1 grows it in). */
function drawMolarRow(pen: Pen, cy: number, halfW: number, n: number, r: number, depth: number, pop: number, up: boolean): void {
  if (pop <= 0) return;
  const { ctx } = pen;
  const k = Math.min(1, pop * 1.15) * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, pop)));
  const shade = Math.round(lerp(232, 170, depth));
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const x = u * halfW;
    // The arch curves back: the side molars sit further up (top rows) or down (bottom rows).
    const y = cy - (up ? 1 : -1) * Math.abs(u) ** 2 * r * 0.8;
    const rx = r * k * (1 - 0.18 * Math.abs(u));
    const ry = r * 0.78 * k;
    ctx.save();
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, 1, x, y, rx * 1.1);
    g.addColorStop(0, `rgb(${shade + 18},${shade + 10},${shade - 12})`);
    g.addColorStop(1, `rgb(${shade - 50},${shade - 58},${shade - 70})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    pen.stroke(ellipsePts(x, y, rx, ry, 12), 1.8, INK, 0.75, false);
    pen.hair([{ x: x - rx * 0.4, y: y - ry * 0.3 }, { x: x + rx * 0.1, y: y - ry * 0.5 }], 1.6, '#fffaf0', 0.55);
  }
}

const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * rx, y: cy + Math.sin((i / n) * Math.PI * 2) * ry }));

/** The pucker: two plump lips pushed out into a ring round a small dark hole. */
function drawPucker(pen: Pen, m: MouthShape, look: MouthLook): void {
  const { ctx } = pen;
  const p = m.pucker;
  const rx = lerp(HALF_W, 72, p);
  const ry = lerp(40, 72, p);
  const ring = ellipsePts(0, 4, rx, ry, 30);
  const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.4, 2, 0, 4, rx * 1.1);
  g.addColorStop(0, '#f0b8b8');
  g.addColorStop(0.6, '#d98a92');
  g.addColorStop(1, '#a35a66');
  ctx.save();
  ctx.fillStyle = g;
  pathOf(ctx, ring);
  ctx.fill();
  ctx.restore();
  // The hole and the crease between the lips.
  const hole = ellipsePts(0, 6, rx * 0.26, ry * 0.2, 16);
  pen.fill(hole, '#3a1218', 0.95);
  pen.hair([{ x: -rx * 0.95, y: 4 }, { x: -rx * 0.3, y: 6 }], 2.2, INK, 0.7);
  pen.hair([{ x: rx * 0.3, y: 6 }, { x: rx * 0.95, y: 4 }], 2.2, INK, 0.7);
  // Wrinkles round the ring, and a shine on the top lip.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    pen.hair([{ x: Math.cos(a) * rx * 0.45, y: 4 + Math.sin(a) * ry * 0.45 }, { x: Math.cos(a) * rx * 0.85, y: 4 + Math.sin(a) * ry * 0.85 }], 1.6, '#7a3d48', 0.55);
  }
  pen.hair([{ x: -rx * 0.45, y: -ry * 0.55 }, { x: rx * 0.1, y: -ry * 0.72 }], 5, '#ffe9ec', 0.6);
  pen.closed(ring, 3.4, INK);
  void look;
}

/** Draws the mouth: inside, molars, teeth, then the lips over them. */
export function drawMouth(pen: Pen, m: MouthShape, look: MouthLook): void {
  if (m.pucker > 0.5) {
    drawPucker(pen, m, look);
    return;
  }
  const { ctx } = pen;
  const fr = frameOf(m);
  const open = opening(fr);
  const mono = look.mono ?? 0;
  const lip = mono > 0.5 ? '#9c9c98' : look.lip;
  const lipDark = mono > 0.5 ? '#5d5d5a' : look.lipDark;

  pen.clipped(open, () => {
    // The dark of the mouth, warmer at the back.
    const g = ctx.createRadialGradient(0, EDGE_Y + m.jaw * 70, 4, 0, EDGE_Y + m.jaw * 60, HALF_W * 1.1);
    g.addColorStop(0, '#5a1c22');
    g.addColorStop(1, '#1d080b');
    ctx.fillStyle = g;
    ctx.fillRect(-HALF_W - 20, -120, HALF_W * 2 + 40, 360);
    if (m.jaw > 0.05) {
      // The tongue, low at the back.
      const ty = fr.lowerTeeth(0) - 18;
      pen.fill(ellipsePts(0, ty + 10, 70 * m.jaw + 10, 26 * m.jaw, 18), '#9b4650', 0.85);
      // Three rows of molars on top, two below, each further back (narrower, smaller, darker).
      const top = edgeAt(0, m.smile) + 22;
      drawMolarRow(pen, top, 70, 5, 15, 0, m.rows, true);
      drawMolarRow(pen, top + 30, 54, 4, 13, 0.35, m.rows - 1, true);
      drawMolarRow(pen, top + 58, 36, 3, 11, 0.65, m.rows - 2, true);
      const bottom = fr.lowerTeeth(0) - 20;
      drawMolarRow(pen, bottom, 66, 5, 14, 0.1, m.rows - 3, false);
      drawMolarRow(pen, bottom - 30, 46, 4, 12, 0.45, m.rows - 4, false);
    }
    drawTeeth(pen, LOWER, fr.lowerTeeth, true, look, look.flaws?.crooked ? 0.6 : 0);
    // The gum above the top teeth.
    pen.fill([...sample(-HALF_W, HALF_W, 16, (x) => edgeAt(x, m.smile) - 58), ...sample(HALF_W, -HALF_W, 16, (x) => edgeAt(x, m.smile) - 120)], mono > 0.5 ? '#7a7a77' : '#c7837f', 1);
    drawTeeth(pen, UPPER, (x) => edgeAt(x, m.smile), false, look, look.flaws?.crooked ? 1 : 0);
  });

  // The lips: fleshy bands above and below the opening.
  const upperOuter = sample(-fr.w - 8, fr.w + 8, 28, (x) => fr.upperEdge(Math.max(-fr.w, Math.min(fr.w, x))) - 26 - 10 * Math.max(0, 1 - (x / fr.w) ** 2));
  const lowerOuter = sample(fr.w + 8, -fr.w - 8, 28, (x) => fr.lowerEdge(Math.max(-fr.w, Math.min(fr.w, x))) + 30 + 8 * Math.max(0, 1 - (x / fr.w) ** 2));
  const upperLip = [...upperOuter, ...sample(fr.w, -fr.w, 28, fr.upperEdge)];
  const lowerLip = [...sample(-fr.w, fr.w, 28, fr.lowerEdge), ...lowerOuter];
  for (const [shape, top] of [[upperLip, true], [lowerLip, false]] as const) {
    const ys = shape.map((p) => p.y);
    const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, top ? lipDark : lip);
    g.addColorStop(1, top ? lip : lipDark);
    ctx.save();
    ctx.fillStyle = g;
    pathOf(ctx, shape);
    ctx.fill();
    ctx.restore();
  }
  // A wet shine on the lower lip, creases at the corners.
  pen.hair(sample(-fr.w * 0.45, fr.w * 0.2, 6, (x) => fr.lowerEdge(x) + 14), 4, '#f4e6e0', 0.45);
  pen.hair([{ x: -fr.w - 4, y: fr.cornerY }, { x: -fr.w - 22, y: fr.cornerY - 14 - 10 * m.smile }], 2.4, INK, 0.7);
  pen.hair([{ x: fr.w + 4, y: fr.cornerY }, { x: fr.w + 22, y: fr.cornerY - 14 - 10 * m.smile }], 2.4, INK, 0.7);
  // Ink: the lips' outer lines and the opening.
  pen.stroke(upperOuter, 3.2, INK);
  pen.stroke([...lowerOuter].reverse(), 3.2, INK);
  pen.closed(open, 3, INK);
}
