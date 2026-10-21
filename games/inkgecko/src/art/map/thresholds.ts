import { createRng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { closed, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { boxPts } from './band';
import { castShadow } from './flora';
import { GLASS_X0, GLASS_X1 } from './greenhouseBand';
import { glassFront } from './glassWalls';
import { DOOR_OPEN, pot, WALL } from './greenhouseKit';
import { hedge } from './orchardKit';
import { dryStoneWall, standingStone } from './rockeryKit';

/**
 * The thresholds at the feet of chapters 3–5: the glasshouse's front wall
 * with its door standing open, a clipped hedge with a five-bar gate swung
 * back against it, and a dry-stone wall broken by two standing stones.
 */
const GATE_WOOD = '#b0946a';
const POST = '#8a6a4a';

/** The glasshouse's front end wall across the groove, its door open into the house, a pot by the step. */
export function greenhouseDoor(d: Draw, gate: { x: number; y: number }): void {
  const rng = createRng(d.pen.rng() * 1e9);
  glassFront(d, gate.y - 4, GLASS_X0 - WALL / 2, GLASS_X1 + WALL / 2, gate.x, rng);
  pot(d, pt(gate.x - DOOR_OPEN - 58, gate.y + 34), 17, rng, 'bloom');
  pot(d, pt(gate.x - DOOR_OPEN - 30, gate.y + 52), 11, rng, 'fern');
}

/** A square timber gatepost from above, with its shadow. */
function gatePost(d: Draw, c: { x: number; y: number }): void {
  const { pen } = d;
  const post = boxPts(c.x - 8, c.y - 8, c.x + 8, c.y + 8, 4);
  castShadow(d, post, 16, 0.16);
  pen.fill(post, PAPER_FILL, 1);
  pen.fill(post, POST, 0.65);
  pen.crescent(post, pt(-2, -3), () => pen.fill(post, d.ink, 0.25));
  pen.stroke(closed(post), 1, d.ink, 0.9, false);
  pen.dot(c.x - 2, c.y - 2, 1.2, PAPER_FILL, 0.6);
}

/**
 * A wooden five-bar gate swung right back against the hedge left of the
 * opening (drawn a little from the front, like the garden's gate): five
 * rails between its stiles, the diagonal brace, its shadow on the hedge.
 */
function fiveBarGate(d: Draw, x1: number, base: number): void {
  const { pen } = d;
  const w = 2 * DOOR_OPEN + 10;
  const h = 50;
  const x0 = x1 - w;
  const rails = Array.from({ length: 5 }, (_, k) => {
    const y = base - 5 - (k * (h - 10)) / 4;
    return boxPts(x0, y - 2.6, x1, y + 2.6, 10);
  });
  const stiles = [boxPts(x0, base - h, x0 + 6, base, 8), boxPts(x1 - 8, base - h - 3, x1, base + 1, 8)];
  const brace = ribbon([pt(x1 - 8, base - 5), pt(x0 + 6, base - h + 6)], () => 5).shape;
  for (const s of [...rails, ...stiles, brace]) pen.fill(s.map((p) => pt(p.x + 8, p.y + 6)), d.ink, 0.12);
  for (const s of [...rails, brace, ...stiles]) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, GATE_WOOD, 0.75);
    pen.crescent(s, pt(0, -2), () => pen.fill(s, mix(GATE_WOOD, d.ink, 0.5), 0.35));
    pen.stroke(closed(s), 0.75, d.ink, 0.85, false);
  }
  for (const y of [base - 9, base - h + 9]) {
    pen.stroke([pt(x1 + 10, y), pt(x1 - 22, y + 0.5)], 2.2, '#3a3a40', 0.8, false);
    pen.dot(x1 - 22, y + 0.5, 1.8, d.ink, 0.9);
  }
}

/** The orchard's threshold: a clipped hedge across the band, gateposts at the opening, the five-bar gate swung back. */
export function hedgeGate(d: Draw, gate: { x: number; y: number }): void {
  const rng = createRng(d.pen.rng() * 1e9);
  const gap = DOOR_OPEN + 16;
  hedge(d, -30, gate.x - gap - 6, gate.y, 40, rng);
  hedge(d, gate.x + gap + 6, MAP.width + 30, gate.y, 40, rng);
  gatePost(d, pt(gate.x - gap, gate.y));
  gatePost(d, pt(gate.x + gap, gate.y));
  fiveBarGate(d, gate.x - gap - 10, gate.y + 24);
}

/** The rockery's threshold: a dry-stone wall across the band, broken where the groove runs between two standing stones. */
export function stoneGap(d: Draw, gate: { x: number; y: number }): void {
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 16;
  dryStoneWall(d, -30, gate.x - 92, foot, rng);
  dryStoneWall(d, gate.x + 84, MAP.width + 30, foot, rng);
  standingStone(d, pt(gate.x - 74, foot + 4), 50, 88, rng);
  standingStone(d, pt(gate.x + 64, foot + 2), 38, 64, rng);
}
