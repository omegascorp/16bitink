import { paintMapChunk, SIGN_BOARD } from '../src/art/map/paintMap';
import { makeCanvas } from '../src/art/pen';
import { computeMapLayout, MAP, type MapChapter, type MapLayout } from '../src/scenes/map/layout';

// Dev-only sheet for reviewing the level map's backdrop: the whole scroll
// painted chunk by chunk exactly as the scene bakes it, with node rings and
// the name boards outlined, plus full-resolution crops of the built bands.
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
/** World px per chunk, as the scene bakes. */
const CHUNK = 1024;
/** Texture px per world px for the timing run (the game bakes at 2). */
const TIME_RES = Number(params.get('res') ?? 2);
/** Display scale of the whole scroll. */
const VIEW = 0.5;

const ids = (prefix: string): string[] => Array.from({ length: 10 }, (_, i) => `${prefix}-${i + 1}`);
const DRAFTS = ['The Greenhouse', 'The Orchard', 'The Rockery', 'The Allotment', 'The Wild Meadow', 'The Old Barn', 'The Ruins', 'The Night Garden'];
const chapters: MapChapter[] = [
  { name: 'The Garden', place: 'garden', levelIds: ids('garden') },
  { name: 'The Pond', place: 'pond', levelIds: ids('pond') },
  ...DRAFTS.map((name, i): MapChapter => ({ name, place: 'draft', levelIds: ids(`draft${i + 3}`) })),
];
const layout = computeMapLayout(chapters);

function heading(text: string): void {
  sheet.append(Object.assign(document.createElement('h2'), { textContent: text }));
}

/** Rings at the nodes and the name boards' faces, to judge placement. */
function overlay(ctx: CanvasRenderingContext2D, l: MapLayout, y0: number, y1: number): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(179,50,43,0.8)';
  ctx.fillStyle = 'rgba(179,50,43,0.9)';
  ctx.font = '20px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of l.nodes) {
    if (n.y < y0 - 40 || n.y > y1 + 40) continue;
    ctx.beginPath();
    ctx.arc(n.x, n.y, MAP.nodeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(String(n.index + 1), n.x, n.y);
  }
  ctx.setLineDash([8, 6]);
  ctx.font = 'italic 34px Georgia';
  for (const r of l.regions) {
    if (r.sign.y < y0 - 60 || r.sign.y > y1 + 60) continue;
    ctx.strokeRect(r.sign.x - SIGN_BOARD.w / 2, r.sign.y - SIGN_BOARD.h / 2, SIGN_BOARD.w, SIGN_BOARD.h);
    ctx.fillStyle = 'rgba(38,49,106,0.9)';
    ctx.fillText(r.chapter.name, r.sign.x, r.sign.y + 2);
  }
  ctx.restore();
}

/** Bakes one chunk as the scene does, at `res`, returning the canvas and how long it took (forced to finish). */
function bake(i: number, res: number): { canvas: HTMLCanvasElement; ms: number } {
  const y0 = i * CHUNK;
  const h = Math.min(CHUNK, layout.height - y0);
  const { canvas, ctx } = makeCanvas(Math.ceil(layout.width * res), Math.ceil(h * res));
  const t0 = performance.now();
  ctx.scale(res, res);
  ctx.translate(0, -y0);
  paintMapChunk(ctx, layout, y0, h);
  ctx.getImageData(0, 0, 1, 1);
  return { canvas, ms: performance.now() - t0 };
}

function wholeScroll(): void {
  heading(`The whole scroll: ${layout.regions.length} chapters, ${layout.width} × ${Math.round(layout.height)} world px, chunks of ${CHUNK} at ${VIEW}× (no gaps between them)`);
  const row = document.createElement('div');
  row.className = 'row';
  const stack = document.createElement('div');
  stack.className = 'stack';
  const log = document.createElement('figcaption');
  row.append(stack, log);
  sheet.append(row);
  const count = Math.ceil(layout.height / CHUNK);
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const shown = bake(i, VIEW);
    const timed = bake(i, TIME_RES);
    const ctx = shown.canvas.getContext('2d')!;
    ctx.setTransform(VIEW, 0, 0, VIEW, 0, -i * CHUNK * VIEW);
    overlay(ctx, layout, i * CHUNK, (i + 1) * CHUNK);
    shown.canvas.style.width = `${layout.width * VIEW}px`;
    stack.append(shown.canvas);
    times.push(`chunk ${String(i).padStart(2)}  y ${String(i * CHUNK).padStart(5)}  ${timed.ms.toFixed(0).padStart(4)} ms @${TIME_RES}×`);
  }
  const all = times.map((t) => Number(t.match(/(\d+) ms/)![1]));
  times.push('', `mean ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(0)} ms, max ${Math.max(...all)} ms`);
  log.textContent = times.join('\n');
  (window as unknown as { mapTimes: number[] }).mapTimes = all;
}

/** A crop of the world at full size, painted as one odd-sized chunk (another check that seams can fall anywhere). */
function crop(title: string, y0: number, h: number): void {
  heading(title);
  const res = window.devicePixelRatio || 1;
  const { canvas, ctx } = makeCanvas(Math.ceil(layout.width * res), Math.ceil(h * res));
  ctx.scale(res, res);
  ctx.translate(0, -y0);
  paintMapChunk(ctx, layout, y0, h);
  canvas.style.width = `${layout.width}px`;
  sheet.append(canvas);
}

/** Paints rows y0..y1 at 1× into a fresh canvas and returns its pixels. */
function pixels(y0: number, y1: number): Uint8ClampedArray {
  const { ctx } = makeCanvas(layout.width, y1 - y0);
  ctx.translate(0, -y0);
  paintMapChunk(ctx, layout, y0, y1 - y0);
  return ctx.getImageData(0, 0, layout.width, y1 - y0).data;
}

/** The pixels painted whole, painted split, and their difference ×8, for chasing a seam. */
function showDiff(a: Uint8ClampedArray, b: Uint8ClampedArray, h: number): void {
  const { canvas, ctx } = makeCanvas(layout.width, h * 3);
  const img = ctx.createImageData(layout.width, h * 3);
  img.data.set(a, 0);
  img.data.set(b, a.length);
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) img.data[a.length * 2 + i + c] = 255 - Math.min(255, Math.abs(a[i + c]! - b[i + c]!) * 8);
    img.data[a.length * 2 + i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  sheet.append(canvas);
}

/** Each chunk boundary painted whole and as two chunks meeting there: how far apart the pixels are. */
function seams(): void {
  heading('Seams: each chunk boundary painted in one piece and in two, compared');
  const lines: string[] = [];
  const pad = 48;
  let worst = 0;
  for (let y = CHUNK; y < layout.height; y += CHUNK) {
    const whole = pixels(y - pad, y + pad);
    const split = new Uint8ClampedArray(whole.length);
    split.set(pixels(y - pad, y), 0);
    split.set(pixels(y, y + pad), layout.width * pad * 4);
    let sum = 0;
    let max = 0;
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let i = 0; i < whole.length; i++) {
      const dlt = Math.abs(whole[i]! - split[i]!);
      sum += dlt;
      if (dlt > max) max = dlt;
      if (dlt > 4) {
        const px = (i >> 2) % layout.width;
        const py = Math.floor((i >> 2) / layout.width) - pad;
        box.x0 = Math.min(box.x0, px);
        box.x1 = Math.max(box.x1, px);
        box.y0 = Math.min(box.y0, py);
        box.y1 = Math.max(box.y1, py);
      }
    }
    worst = Math.max(worst, max);
    if (params.get('seams') === String(y)) showDiff(whole, split, pad * 2);
    const where = box.x0 <= box.x1 ? `  at x ${box.x0}..${box.x1}, y ${box.y0}..${box.y1} from the seam` : '';
    lines.push(`y ${String(y).padStart(5)}  mean ${(sum / whole.length).toFixed(3)}  max ${max}${where}`);
  }
  lines.push('', `worst channel difference ${worst} / 255`);
  sheet.append(Object.assign(document.createElement('figcaption'), { textContent: lines.join('\n') }));
}

const [garden, pond, draft] = layout.regions;
if (!params.has('crops')) wholeScroll();
if (params.has('seams')) seams();
crop('The Garden, full size: the terrace, wall and gate, the lower lawn', garden!.gate.y - 900, 1220);
crop('The Garden into the Pond, full size', pond!.bottom - 700, 1100);
crop('The Pond, full size: a bridge, the island, the top shore into the draft', pond!.top - 200, 1100);
crop('The Greenhouse (draft), full size', draft!.top - 50, 900);
