/**
 * Shared by the croc/shark heads: draws a whole-animal painting into a scratch
 * layer, in units where the bite point is the origin (one unit = `k` screen
 * px), and lays it onto the canvas with its left edge (behind the shoulders)
 * faded out.
 */
export interface Rect { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

const scratch = new Map<string, HTMLCanvasElement>();

/** A cleared scratch canvas of this size (one per key, reused every frame). */
export function scratchCanvas(key: string, w: number, h: number): HTMLCanvasElement {
  let c = scratch.get(key);
  if (!c) {
    c = document.createElement('canvas');
    scratch.set(key, c);
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

export function drawCropped(
  ctx: CanvasRenderingContext2D, at: { readonly x: number; readonly y: number }, k: number, rect: Rect, fade: number,
  draw: (c: CanvasRenderingContext2D) => void,
): void {
  const m = ctx.getTransform();
  const sc = Math.hypot(m.a, m.b);
  const w = Math.max(2, Math.ceil((rect.x1 - rect.x0) * k * sc));
  const h = Math.max(2, Math.ceil((rect.y1 - rect.y0) * k * sc));
  const layer = scratchCanvas('crop', w, h);
  const c = layer.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, w, h);
  c.setTransform(sc * k, 0, 0, sc * k, -rect.x0 * k * sc, -rect.y0 * k * sc);
  c.save();
  draw(c);
  c.restore();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createLinearGradient(0, 0, w, 0);
  const f = Math.min(1, (fade * k * sc) / w);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(f, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, 0, 0, w, h, at.x + rect.x0 * k, at.y + rect.y0 * k, w / sc, h / sc);
}
