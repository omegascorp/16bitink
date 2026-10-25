import { closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../critters/birdKit';

/**
 * The rhinoceros hornbill's bill from above: long, ivory, stained yellow
 * and orange at its base, and over it the casque, orange-red, broad at the
 * forehead and narrowing forward to its upturned horn, the curl seen
 * end-on as a paler rounded point. Pecking, the head is down: the bill
 * foreshortened, the casque looming.
 */
export interface HornHead {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  /** Bill base and tip x (the bill lies along y = 0). */
  readonly bill: readonly [number, number];
  readonly billW: number;
  /** 0 level, 1 thrust down to peck. */
  readonly down: number;
}

const B = {
  ivory: '#eee3c2',
  ivoryDeep: '#b8a77a',
  stain: '#e7b54a',
  red: '#c4361e',
  orange: '#e9762b',
  yellow: '#f3b93f',
  deep: '#7a2112',
  cut: '#3a2a1c',
} as const;

function billShape(h: HornHead): Pt[] {
  const [b, t] = h.bill;
  const l = t - b;
  const w = h.billW;
  return [...cub(pt(b, -w), pt(b + l * 0.4, -w * 0.9), pt(b + l * 0.82, -w * 0.42), pt(t, 0), 10), ...cub(pt(t, 0), pt(b + l * 0.82, w * 0.42), pt(b + l * 0.4, w * 0.9), pt(b, w), 10).slice(1)];
}

function casqueShape(h: HornHead): Pt[] {
  const [b, t] = h.bill;
  const l = t - b;
  const w = h.billW * (1.08 + h.down * 0.15);
  const end = b + l * (0.64 + h.down * 0.16);
  return [
    ...cub(pt(b - 1.6, -w * 0.95), pt(b + l * 0.25, -w * 1.18), pt(end - l * 0.22, -w * 0.9), pt(end, -w * 0.22), 10),
    ...cub(pt(end, -w * 0.22), pt(end + 0.9, 0), pt(end + 0.9, 0), pt(end, w * 0.22), 4).slice(1),
    ...cub(pt(end, w * 0.22), pt(end - l * 0.22, w * 0.9), pt(b + l * 0.25, w * 1.18), pt(b - 1.6, w * 0.95), 10).slice(1),
  ];
}

export function casqueBill(d: Draw, h: HornHead): void {
  const { pen } = d;
  const [b, t] = h.bill;
  const l = t - b;
  const bill = billShape(h);
  pen.fill(bill.map((p) => pt(p.x + 0.7, p.y + 1.1)), d.ink, 0.2);
  pen.fill(bill, PAPER_FILL, 1);
  pen.fill(bill, B.ivory, 0.95);
  pen.clipped(bill, () => {
    glaze(d, b + 1, 0, l * 0.35, h.billW * 1.2, 0, B.stain, 0.7);
    pen.crescent(bill, pt(-0.5, -0.9), () => pen.fill(bill, B.ivoryDeep, 0.6));
    // Fine ridges across the bill, as on worn horn.
    for (let k = 0.45; k < 0.95; k += 0.08) pen.hair([pt(b + l * k, -h.billW * 0.6), pt(b + l * k + 0.4, h.billW * 0.6)], 0.15, B.ivoryDeep, 0.5);
  });
  pen.stroke(closed(bill), 0.6, d.ink, 1, false);
  pen.hair([pt(b + l * 0.62, 0), pt(t - 0.4, 0)], 0.3, B.cut, 0.55);
  const casque = casqueShape(h);
  pen.fill(casque.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.25);
  pen.fill(casque, PAPER_FILL, 1);
  pen.fill(casque, B.orange, 0.95);
  pen.clipped(casque, () => {
    glaze(d, b + 1, 0, l * 0.32, h.billW * 1.3, 0, B.red, 0.85);
    glaze(d, b + l * 0.42, -h.billW * 0.3, l * 0.22, h.billW * 0.5, 0, B.yellow, 0.7);
    pen.crescent(casque, pt(-0.6, -1.1), () => pen.fill(casque, B.deep, 0.45));
    // The upturned horn's curl, end-on: a pale rounded point with the ridge over it.
    const end = b + l * (0.64 + h.down * 0.16);
    glaze(d, end - 1.6, 0, 2.2, h.billW * 0.5, 0, B.yellow, 0.85);
    pen.hair([pt(end - 3.4, -h.billW * 0.55), pt(end - 2, 0), pt(end - 3.4, h.billW * 0.55)], 0.35, B.deep, 0.6);
    pen.hair([pt(b, -0.3), pt(end - 2.4, -0.2)], 0.5, B.yellow, 0.6);
  });
  pen.stroke(closed(casque), 0.7, d.ink, 1, false);
}
