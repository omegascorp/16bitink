import { Pen } from '../../../src/art/pen';
import {
  ANAL, bottomAt, caudal, cubic, DORSAL2, dorsal1, EYE, GILL, lobeShape, midAt, middleLobe, PECTORAL, PELVIC, type Pt, pt, topAt,
} from './shape';

/**
 * The fossil's bones, in the fish's own units (drawn inside inFishSpace):
 * the plated skull and jaws, the shoulder girdle, the thick hollow
 * notochord that gives the coelacanth its name ("hollow spine"), the spines
 * above and below it, the bones inside each lobed fin, and the fin rays.
 * They ink in from the nose to the tail as `reveal` goes 0 .. 1.
 */
const BONE = '#efe5cc';

interface Bone {
  readonly pts: readonly Pt[];
  readonly width: number;
}

const line = (pts: readonly Pt[], width: number): Bone => ({ pts, width });
const seg = (a: Pt, b: Pt, width: number): Bone => line([a, pt((a.x + b.x) / 2, (a.y + b.y) / 2), b], width);

const BONES: readonly Bone[] = (() => {
  const out: Bone[] = [];
  // Skull: roof, eye socket, jaws, cheek plates, gill cover, shoulder girdle.
  out.push(line(cubic(pt(478, 4), pt(472, -60), pt(420, -100), pt(296, -134), 10), 7));
  out.push(line(Array.from({ length: 15 }, (_, i) => pt(EYE.x + Math.cos((i / 14) * Math.PI * 2) * EYE.r * 1.25, EYE.y + Math.sin((i / 14) * Math.PI * 2) * EYE.r * 1.25)), 5));
  out.push(line(cubic(pt(476, 30), pt(440, 66), pt(380, 88), pt(298, 86), 10), 7));
  out.push(line(cubic(pt(472, 24), pt(440, 36), pt(400, 44), pt(352, 46), 8), 4.5));
  out.push(line(cubic(pt(430, -70), pt(400, -60), pt(350, -40), pt(316, 0), 8), 3));
  out.push(line(cubic(pt(350, 10), pt(340, 40), pt(320, 70), pt(300, 92), 6), 3));
  out.push(line(GILL, 6));
  out.push(line(cubic(pt(254, -128), pt(226, -60), pt(222, 40), pt(244, 112), 10), 6));
  // The notochord, a thick tube, ringed.
  const axis = (x: number): Pt => pt(x, midAt(x) - 8);
  const xs = Array.from({ length: 31 }, (_, i) => 272 - i * 23.8);
  out.push(line(xs.map((x) => pt(x, axis(x).y - 10)), 4));
  out.push(line(xs.map((x) => pt(x, axis(x).y + 10)), 4));
  for (const x of xs.slice(1, -1)) out.push(seg(pt(x, axis(x).y - 10), pt(x - 3, axis(x).y + 10), 2.5));
  // Spines above it all along; ribs below the trunk, spines below the tail.
  for (let x = 236; x > -426; x -= 24) {
    const a = axis(x);
    out.push(seg(pt(a.x, a.y - 12), pt(x - 30, topAt(x - 30) + 26), 3));
    if (x > -70) out.push(seg(pt(a.x, a.y + 12), pt(x - 34, a.y + (bottomAt(x) - a.y) * 0.55), 2.8));
    else out.push(seg(pt(a.x, a.y + 12), pt(x - 30, bottomAt(x - 30) - 26), 3));
  }
  // Fins: the lobes' limb bones and rays, the first dorsal's spines, the tail's rays.
  for (const lobe of [PECTORAL, PELVIC, DORSAL2, ANAL]) {
    const s = lobeShape(lobe, 0);
    for (const [a, b] of s.bones) out.push(seg(a, b, 7));
    for (const [a, b] of s.rays) out.push(seg(a, b, 2.2));
  }
  for (const [a, b] of dorsal1(0).rays) out.push(seg(a, b, 3.4));
  for (const side of [-1, 1] as const) for (const [a, b] of caudal(side, 0).rays) out.push(seg(a, b, 2.4));
  for (const [a, b] of middleLobe(0).rays) out.push(seg(a, b, 2.2));
  return out;
})();

/** The skeleton inked in up to `reveal` (0 none .. 1 all), nose first; `glow` lights it from within (the cracks' blue). */
export function drawSkeleton(ctx: CanvasRenderingContext2D, reveal: number, boil: number, colour = BONE): void {
  if (reveal <= 0) return;
  const front = 500 - reveal * 1080;
  BONES.forEach((b, i) => {
    const x = Math.max(...b.pts.map((p) => p.x));
    const show = Math.max(0, Math.min(1, (x - front) / 90));
    if (show <= 0) return;
    const pen = new Pen(ctx, 5003 + i * 37 + boil * 977, 2);
    pen.stroke(b.pts, b.width, colour, 0.92 * show, false);
  });
}
