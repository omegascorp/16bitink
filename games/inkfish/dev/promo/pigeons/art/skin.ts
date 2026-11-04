import { makeCanvas, type Pt } from '../../../../src/art/pen';

/**
 * The wels catfish's skin for the side-on close-ups: marbled, not patched. An
 * olive-brown wash with dusky clouds whose edges melt away (a noise field
 * painted pixel by pixel), darkest along the top and fading into a pale creamy
 * throat and belly, under a wet gloss.
 */

export const step = (a: number, b: number, v: number): number => {
  const u = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number): number {
  const [ix, iy] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [step(0, 1, x - ix), step(0, 1, y - iy)];
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * fx;
  const low = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * fx;
  return top + (low - top) * fy;
}

function fbm(x: number, y: number): number {
  return 0.53 * noise(x, y) + 0.27 * noise(x * 2.1 + 9, y * 2.1 + 4) + 0.14 * noise(x * 4.3 + 2, y * 4.3 + 7) + 0.06 * noise(x * 8.7, y * 8.7);
}

/** The marbling, 0 clear .. 1 dusky: clouds folded through themselves, with no edge anywhere. */
export function cloud(x: number, y: number): number {
  const q = fbm(x * 0.017 + 3, y * 0.017);
  const r = fbm(x * 0.017 + 7, y * 0.017 + 5);
  return step(0.4, 0.68, fbm(x * 0.021 + 3.4 * q, y * 0.021 + 3.4 * r));
}

export type Rgb = readonly [number, number, number];
const CREAM: Rgb = [241, 232, 208];
const OLIVE: Rgb = [136, 124, 84];
const BROWN: Rgb = [88, 80, 52];
const DUSK: Rgb = [38, 36, 24];
const mix3 = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** The skin's colour for how far round the back it is: 0 the throat .. 1 the top. */
export function skin(dorsal: number, c: number): Rgb {
  const wash = dorsal < 0.5 ? mix3(CREAM, OLIVE, step(0.04, 0.5, dorsal)) : mix3(OLIVE, BROWN, step(0.5, 1, dorsal));
  return mix3(wash, DUSK, c * (0.2 + 0.62 * step(0.15, 1, dorsal)));
}

/** A field of colour painted pixel by pixel at `res` and smoothed up over the box. */
export function field(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, res: number, colour: (x: number, y: number) => Rgb): void {
  const [w, h] = [Math.ceil((x1 - x0) * res), Math.ceil((y1 - y0) * res)];
  const { canvas, ctx: c } = makeCanvas(w, h);
  const img = c.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const rgb = colour(x0 + i / res, y0 + j / res);
      const at = (j * w + i) * 4;
      img.data[at] = rgb[0];
      img.data[at + 1] = rgb[1];
      img.data[at + 2] = rgb[2];
      img.data[at + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/** Paints into a layer and lays it in softened (an average of small shifts), `blur` own units: brushed paint, not hard vector shapes. */
export function brushed(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, blur: number, paint: (c: CanvasRenderingContext2D) => void): void {
  const fine = 1.5;
  const { canvas, ctx: c } = makeCanvas(Math.ceil((x1 - x0) * fine), Math.ceil((y1 - y0) * fine));
  c.scale(fine, fine);
  c.translate(-x0, -y0);
  paint(c);
  const soft = makeCanvas(canvas.width, canvas.height);
  const n = 16;
  soft.ctx.globalCompositeOperation = 'lighter';
  soft.ctx.globalAlpha = 1 / n;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const d = blur * fine * Math.sqrt((i + 0.5) / n);
    soft.ctx.drawImage(canvas, Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.drawImage(soft.canvas, x0, y0, x1 - x0, y1 - y0);
}

/** A hard wet glint, a lens of pure white. */
export function glint(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number, a: number, alpha: number): void {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - c * len, y - s * len);
  ctx.quadraticCurveTo(x - s * w, y + c * w, x + c * len, y + s * len);
  ctx.quadraticCurveTo(x + s * w, y - c * w, x - c * len, y - s * len);
  ctx.fill();
  ctx.restore();
}

/** Catmull-Rom through `pts`, open at both ends. */
export function open(pts: readonly Pt[], n = 6): Pt[] {
  const at = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return [...out, pts[pts.length - 1]!];
}

/** `line` pushed sideways by `d(u)`, u 0 .. 1 along it; plus is to the left of travel on screen (up, going leftwards). */
export function offset(line: readonly Pt[], d: (u: number) => number): Pt[] {
  return line.map((p, i) => {
    const [a, b] = [line[Math.max(0, i - 1)]!, line[Math.min(line.length - 1, i + 1)]!];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const k = d(i / (line.length - 1));
    return { x: p.x - ((b.y - a.y) / len) * k, y: p.y + ((b.x - a.x) / len) * k };
  });
}
