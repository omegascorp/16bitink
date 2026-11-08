import { INK, Pen, pathOf } from '../../../src/art/pen';
import { type Pt, project, pt } from './geom';

/**
 * A California mussel standing on its hinge on the rock, gape up: two
 * blue-black valves with a brown rim, growth lines and a sheen. The front
 * valve swings towards the viewer about the hinge to open it; inside, the
 * back valve's pearly lining and the orange meat. Drawn in scene px with the
 * camera already applied, at pool x `x` (its middle).
 */

const LENGTH = 360;
const HEIGHT = 150;
/** The mussel sits in front of the star's body, between its front arms. */
export const MUSSEL_Z = 175;
/** How far the front valve swings open at gape 1, and the back valve leans away. */
const FRONT_SWING = 0.45;
const BACK_LEAN = 0.45;
const RIM = 7;
const N = 28;

const SHELL = '#1f2434';
const SHELL_DARK = '#0d1019';
const SHELL_SHEEN = '#7d86a8';
const RIM_BROWN = '#5b4630';
const NACRE = '#c9d3e6';
const NACRE_PINK = '#e7cfdc';
const NACRE_BLUE = '#8fa4c8';
const MEAT = '#ec8a3a';
const MEAT_DARK = '#9a4a1c';
const MEAT_LIGHT = '#f8c27a';

/** The valve's outline profile: 0 at the pointed umbo, broad and round at the far end. */
function prof(u: number): number {
  return u < 0.6 ? (u / 0.6) ** 0.7 : Math.sqrt(Math.max(0, 1 - ((u - 0.6) / 0.4) ** 2));
}

/** The free edge's height at u (the gape), and the hinge edge's. */
const topOf = (u: number): number => HEIGHT * prof(u);
const hingeOf = (u: number): number => 6 * Math.sin(Math.PI * u);

/** A point of a valve at u along it, `h` up from the hinge, swung by `angle` (+ towards the viewer). */
function onValve(x: number, u: number, h: number, angle: number): Pt {
  const X = x - LENGTH / 2 + u * LENGTH;
  return project({ x: X, y: h * Math.cos(angle), z: MUSSEL_Z + h * Math.sin(angle) });
}

const swingOf = (gape: number): { readonly front: number; readonly back: number } => ({ front: FRONT_SWING * gape, back: -BACK_LEAN * gape });

const us = Array.from({ length: N + 1 }, (_, i) => i / N);

function outline(x: number, angle: number, inset = 0): Pt[] {
  const top = us.map((u) => onValve(x, u, Math.max(hingeOf(u), topOf(u) - inset), angle));
  const bottom = [...us].reverse().map((u) => onValve(x, u, hingeOf(u), angle));
  return [...top, ...bottom];
}

/** The front valve's free edge (the lip), left to right, on screen. */
export function frontLip(x: number, gape: number): Pt[] {
  const a = swingOf(gape).front;
  return us.map((u) => onValve(x, u, topOf(u), a));
}

/** The middle of the gape on screen: halfway between the two lips at the shell's tallest point. */
export function gapeMiddle(x: number, gape: number): Pt {
  const s = swingOf(gape);
  const a = onValve(x, 0.55, topOf(0.55), s.front);
  const b = onValve(x, 0.55, topOf(0.55), s.back);
  return pt((a.x + b.x) / 2, (a.y + b.y) / 2);
}

/** A point on the front valve's outside at u along, `k` of the way up (for the tube feet). */
export const onFront = (x: number, gape: number, u: number, k: number): Pt => onValve(x, u, hingeOf(u) + (topOf(u) - hingeOf(u)) * k, swingOf(gape).front);

/** Everything above the front valve's lip, for clipping what sits in the gape (the paper). */
export function aboveFrontLip(x: number, gape: number): Pt[] {
  const lip = frontLip(x, gape);
  return [pt(lip[0]!.x - 2000, lip[0]!.y), ...lip, pt(lip[lip.length - 1]!.x + 2000, lip[lip.length - 1]!.y), pt(lip[lip.length - 1]!.x + 2000, -4000), pt(lip[0]!.x - 2000, -4000)];
}

/** The back valve: its dark rim, the pearly lining inside, and the meat (`meat` 1 whole .. 0 gone). */
export function drawBackHalf(ctx: CanvasRenderingContext2D, x: number, gape: number, meat: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.8);
  const s = swingOf(gape);
  const shell = outline(x, s.back);
  pen.fill(shell, SHELL_DARK, 1);
  if (gape > 0.01) {
    const lining = outline(x, s.back, RIM);
    pen.fill(lining, NACRE, 1);
    pen.clipped(lining, () => {
      const top = onValve(x, 0.6, topOf(0.6), s.back);
      const bottom = onValve(x, 0.6, 0, s.back);
      const g = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y + 40);
      g.addColorStop(0, 'rgba(60,72,110,0.85)');
      g.addColorStop(0.35, 'rgba(143,164,200,0.4)');
      g.addColorStop(1, 'rgba(231,207,220,0.2)');
      ctx.fillStyle = g;
      pathOf(ctx, lining);
      ctx.fill();
      // Pearly bands following the rim.
      for (const k of [0.2, 0.38, 0.56]) pen.hair(us.map((u) => onValve(x, u, Math.max(hingeOf(u), topOf(u) * (1 - k) - RIM), s.back)), 3, k < 0.3 ? NACRE_BLUE : NACRE_PINK, 0.55);
      pen.hair(us.slice(4, 22).map((u) => onValve(x, u, topOf(u) * 0.7, s.back)), 5, '#ffffff', 0.35);
      if (meat > 0.01) drawMeat(ctx, pen, x, s.back, meat);
      // A narrow gape is a black slit: no light gets in.
      pen.fill(lining, '#020308', 0.92 * (1 - Math.min(1, gape / 0.35)));
    });
  }
  pen.stroke([...shell, shell[0]!], 3.2, INK);
}

/** The mussel's body lying in the back valve: an orange mantle with a frilly dark edge, shrinking as it's digested. */
function drawMeat(ctx: CanvasRenderingContext2D, pen: Pen, x: number, angle: number, meat: number): void {
  const k = 0.25 + 0.75 * meat;
  const u0 = 0.5 - 0.4 * k;
  const u1 = 0.5 + 0.42 * k;
  const n = 26;
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    const edge = Math.sin((Math.PI * i) / n);
    const frill = 5 * Math.sin(i * 2.7) * edge;
    top.push(onValve(x, u, hingeOf(u) + (topOf(u) - RIM - hingeOf(u)) * (0.2 + 0.68 * k * edge ** 0.6) + frill, angle));
    bottom.push(onValve(x, u, hingeOf(u) + 4, angle));
  }
  const body = [...top, ...bottom.reverse()];
  pen.fill(body, MEAT, 0.92 * (0.5 + 0.5 * meat));
  pen.clipped(body, () => {
    const a = onValve(x, 0.5, topOf(0.5) * 0.8, angle);
    const b = onValve(x, 0.5, 0, angle);
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(248,194,122,0.7)');
    g.addColorStop(1, 'rgba(154,74,28,0.55)');
    ctx.fillStyle = g;
    pathOf(ctx, body);
    ctx.fill();
  });
  // The mantle's frilly edge, and the gills' fine lines.
  pen.stroke(top, 3, MEAT_DARK, 0.9);
  for (let i = 3; i < n - 2; i += 3) pen.hair([top[i]!, bottom[n - i]!], 1.4, MEAT_DARK, 0.4);
  pen.hair(top.slice(3, n - 2).map((p) => pt(p.x, p.y + 10)), 2.2, MEAT_LIGHT, 0.6);
}

/** The front valve, swung open by the gape: blue-black with growth lines, a brown rim and a sheen along the ridge. */
export function drawFrontValve(ctx: CanvasRenderingContext2D, x: number, gape: number, seed: number): void {
  const pen = new Pen(ctx, seed + 7, 0.8);
  const a = swingOf(gape).front;
  const shell = outline(x, a);
  pen.fill(shell, SHELL, 1);
  pen.clipped(shell, () => {
    const top = onValve(x, 0.55, topOf(0.55), a);
    const bottom = onValve(x, 0.55, 0, a);
    const g = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    g.addColorStop(0, 'rgba(92,74,52,0.55)');
    g.addColorStop(0.3, 'rgba(70,80,112,0.35)');
    g.addColorStop(1, 'rgba(5,6,12,0.75)');
    ctx.fillStyle = g;
    pathOf(ctx, shell);
    ctx.fill();
    // Growth lines echoing the free edge, fanning from the umbo.
    for (const k of [0.3, 0.48, 0.64, 0.78, 0.9]) {
      pen.hair(us.map((u) => onValve(x, u * k + (1 - k) * 0.02, hingeOf(u) + (topOf(u) - hingeOf(u)) * k, a)), 1.6, '#0a0c14', 0.7);
      pen.hair(us.map((u) => onValve(x, u * k + (1 - k) * 0.02, hingeOf(u) + (topOf(u) - hingeOf(u)) * k - 3, a)), 1.1, SHELL_SHEEN, 0.28);
    }
    // The sheen along the ridge, and the brown edge of the shell's skin.
    pen.hair(us.slice(3, 25).map((u) => onValve(x, u, hingeOf(u) + (topOf(u) - hingeOf(u)) * 0.6, a)), 9, SHELL_SHEEN, 0.32);
    pen.hair(us.slice(5, 22).map((u) => onValve(x, u, hingeOf(u) + (topOf(u) - hingeOf(u)) * 0.63, a)), 3, '#d6dcf0', 0.35);
    pen.stroke(us.map((u) => onValve(x, u, topOf(u) - 4, a)), 6, RIM_BROWN, 0.75);
  });
  pen.stroke([...shell, shell[0]!], 3.6, INK);
  // A narrow gape: a black slit between the lips with a glint on each, so even a paper-thin crack reads.
  if (gape > 0.02 && gape < 0.5) {
    const k = Math.max(0, 1 - Math.abs(gape - 0.15) / 0.35);
    const back = swingOf(gape).back;
    const span = us.slice(3, 27);
    const backLip = span.map((u) => onValve(x, u, topOf(u), back));
    const front = span.map((u) => onValve(x, u, topOf(u), a));
    pen.fill([...backLip, ...[...front].reverse()], '#000000', 0.95 * k);
    pen.hair(backLip, 2.4, '#c9d3ee', 0.85 * k);
    pen.hair(front.map((p) => pt(p.x, p.y + 2)), 2.6, '#eef3ff', 0.9 * k);
  }
  // Byssus threads to the rock.
  for (let i = 0; i < 6; i++) {
    const u = 0.25 + i * 0.09;
    const from = onValve(x, u, hingeOf(u), a);
    pen.hair([from, pt(from.x - 30 + i * 14, from.y + 22 + (i % 2) * 8)], 1.4, '#5e4a33', 0.75);
  }
}
