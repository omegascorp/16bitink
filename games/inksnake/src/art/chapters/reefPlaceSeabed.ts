import type { Rng } from '../../logic/rng';
import type { Pt } from '../../logic/vec';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { specks } from '../places/farmGroundParts';
import { type Busy, perArea } from '../places/farmKit';
import { mix, rgba } from '../wash';
import { ALGAE, ALGAE_DEEP, type Cay, DEEP_DARK, FOAM, glazeAt, H, MID, REEF_DARK, SAND_UNDER, shoreDist, W, WATER_INK } from './reefPlaceKit';

/**
 * The sea floor seen through the water (so its colours are cooled towards
 * the sea's and its lines are soft): pale sand patches with ripple marks,
 * darker patches of reef with algae and small coral clumps, blue starfish.
 */
const CLUMP_COLOURS = ['#c98f74', '#a989b3', '#d7a65e', '#8fa7a0', '#c47c86', '#b9b07a'] as const;

/** A small coral clump on the bottom: a soft shadow, a lumpy wash of colour, polyp dots, a faint contour. */
export function underwaterClump(d: Draw, p: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const colour = mix(CLUMP_COLOURS[Math.floor(rng() * CLUMP_COLOURS.length)]!, MID, 0.4);
  const shape = blob(p, r, r * (0.7 + rng() * 0.3), rng, 0.3, 16, rng() * TAU);
  pen.fill(shape.map((q) => pt(q.x + SHADOW.x * r * 0.5, q.y + SHADOW.y * r * 0.5)), DEEP_DARK, 0.22);
  pen.fill(shape, colour, 0.75);
  pen.crescent(shape, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(shape, DEEP_DARK, 0.2));
  glazeAt(pen.ctx, p.x - r * 0.3, p.y - r * 0.3, r * 0.6, r * 0.5, 0, FOAM, 0.25);
  specks(d, mix(colour, DEEP_DARK, 0.4), 0.5, Array.from({ length: Math.round(r * 2) }, () => {
    const q = polar(p, rng() * TAU, Math.sqrt(rng()) * r * 0.8);
    return [q.x, q.y, 0.35 + rng() * 0.4] as const;
  }));
  pen.hair([...shape, shape[0]!], 0.5, mix(d.ink, MID, 0.35), 0.45);
}

/** A blue sea star (Linckia) on the sand: five long rounded arms, a darker spine of each, a soft shadow. */
export function starfish(d: Draw, p: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const turn = rng() * TAU;
  const arm = (k: number, s: number): Pt[] => {
    const a = turn + (k / 5) * TAU + (rng() - 0.5) * 0.25;
    const bend = (rng() - 0.5) * 0.5;
    const tip = polar(p, a + bend * 0.4, r * s);
    const side = (q: number): Pt => polar(p, a + q, r * 0.22 * s);
    return [side(-0.9), polar(p, a - 0.12 + bend * 0.2, r * 0.6 * s), tip, polar(p, a + 0.12 + bend * 0.2, r * 0.6 * s), side(0.9)];
  };
  const shape = Array.from({ length: 5 }, (_, k) => arm(k, 1)).flat();
  const colour = mix('#3f7fc8', MID, 0.3);
  pen.fill(shape.map((q) => pt(q.x + SHADOW.x * 1.6, q.y + SHADOW.y * 1.6)), DEEP_DARK, 0.25);
  pen.fill(shape, colour, 0.85);
  pen.crescent(shape, pt(-SHADOW.x * 1.2, -SHADOW.y * 1.2), () => pen.fill(shape, DEEP_DARK, 0.3));
  for (let k = 0; k < 5; k++) pen.hair([p, polar(p, turn + (k / 5) * TAU, r * 0.8)], 0.5, mix(colour, '#ffffff', 0.4), 0.5);
  pen.hair([...shape, shape[0]!], 0.55, mix(d.ink, MID, 0.2), 0.6);
}

/** Ripple marks on a sandy bottom: short wavy crests, lit on one side, over a round patch r across. */
function ripples(d: Draw, c: Pt, r: number, angle: number, rng: Rng, alpha: number): void {
  const { ctx } = d.pen;
  const dir = pt(Math.cos(angle), Math.sin(angle));
  const nrm = pt(-dir.y, dir.x);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, off, a] of [[FOAM, -0.7, alpha], [WATER_INK, 0.7, alpha * 0.6]] as const) {
    ctx.strokeStyle = rgba(colour, a);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let o = -r; o <= r; o += 5 + rng() * 2) {
      const half = Math.sqrt(Math.max(0, r * r - o * o)) * (0.6 + rng() * 0.35);
      if (half < 5) continue;
      const s = pt(c.x + nrm.x * o - dir.x * half, c.y + nrm.y * o - dir.y * half);
      ctx.moveTo(s.x + nrm.x * off, s.y + nrm.y * off);
      for (let t = 4; t <= half * 2; t += 4) {
        const wav = Math.sin(t * 0.35 + o) * 1.1;
        ctx.lineTo(s.x + dir.x * t + nrm.x * (wav + off), s.y + dir.y * t + nrm.y * (wav + off));
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft-edged patch laid in thin glazes over each other, its drying edge showing only here and there. */
function softPatch(d: Draw, c: Pt, r: number, ry: number, turn: number, colour: string, alpha: number, rng: Rng): void {
  const { ctx } = d.pen;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  glazeAt(ctx, c.x, c.y, r * 1.05, ry * 1.05, turn, colour, alpha * 0.7, 0.7);
  for (let i = 0; i < 6; i++) {
    const u = (rng() - 0.5) * r * 1.1;
    const v = (rng() - 0.5) * ry * 1.1;
    glazeAt(ctx, c.x + u * cos - v * sin, c.y + u * sin + v * cos, r * (0.35 + rng() * 0.3), ry * (0.35 + rng() * 0.3), turn + (rng() - 0.5), colour, alpha * 0.5);
  }
  const rim = closed(blob(c, r * 0.95, ry * 0.95, rng, 0.25, 36, turn));
  for (let i = 0; i < rim.length - 2; ) {
    const n = 2 + Math.floor(rng() * 4);
    if (rng() < 0.3) d.pen.hair(rim.slice(i, i + n + 1), 0.9, mix(colour, DEEP_DARK, 0.3), alpha * 0.6);
    i += n;
  }
}

/** A patch of reef on the bottom: darker rock furred with algae, small coral clumps crowded on it, its crevices dark. */
function reefPatch(d: Draw, c: Pt, r: number, rng: Rng): void {
  const ry = r * (0.5 + rng() * 0.4);
  const turn = rng() * TAU;
  softPatch(d, c, r, ry, turn, mix(REEF_DARK, MID, 0.2), 0.3, rng);
  const inside = (): Pt => {
    const a = rng() * TAU;
    const k = Math.sqrt(rng()) * 0.85;
    return pt(c.x + Math.cos(a) * r * k * Math.cos(turn) - Math.sin(a) * ry * k * Math.sin(turn), c.y + Math.cos(a) * r * k * Math.sin(turn) + Math.sin(a) * ry * k * Math.cos(turn));
  };
  specks(d, mix(ALGAE_DEEP, MID, 0.25), 0.35, Array.from({ length: Math.round(r * 4) }, () => {
    const q = inside();
    return [q.x, q.y, 0.6 + rng() * 1.5] as const;
  }));
  specks(d, mix(ALGAE, MID, 0.3), 0.35, Array.from({ length: Math.round(r * 2) }, () => {
    const q = inside();
    return [q.x, q.y, 0.5 + rng()] as const;
  }));
  for (let i = 0; i < Math.round(r / 9); i++) underwaterClump(d, inside(), 2.5 + rng() * 4, rng);
  specks(d, DEEP_DARK, 0.45, Array.from({ length: Math.round(r * 0.6) }, () => {
    const q = inside();
    return [q.x, q.y, 0.5 + rng() * 0.8] as const;
  }));
}

/** The whole sea floor: sand patches, reef patches, scattered clumps and algae (busy at the edges, sparse in the middle and off the level's things), a starfish or two. */
export function paintSeabed(d: Draw, cays: readonly Cay[], busy: Busy, rng: Rng): void {
  const angle = rng() * TAU;
  for (let k = 0; k < 9; k++) {
    const c = pt(rng() * W, rng() * H);
    if (shoreDist(cays, c.x, c.y) < 30) continue;
    const r = 30 + rng() * 55;
    softPatch(d, c, r, r * (0.55 + rng() * 0.35), rng() * TAU, mix(SAND_UNDER, MID, 0.3), 0.34, rng);
    ripples(d, c, r * 0.7, angle + (rng() - 0.5) * 0.5, rng, 0.12);
  }
  for (let k = 0; k < 10; k++) {
    const c = pt(rng() * W, rng() * H);
    if (shoreDist(cays, c.x, c.y) < 40 || busy(c.x, c.y) < 0.15) continue;
    reefPatch(d, c, 24 + rng() * 46, rng);
  }
  for (let k = 0; k < perArea(140); k++) {
    const p = pt(rng() * W, rng() * H);
    if (shoreDist(cays, p.x, p.y) < 12 || rng() > busy(p.x, p.y) * 1.4) continue;
    if (rng() < 0.35) specks(d, mix(ALGAE, MID, 0.3), 0.45, Array.from({ length: 8 }, () => [p.x + (rng() - 0.5) * 8, p.y + (rng() - 0.5) * 8, 0.8 + rng()] as const));
    else underwaterClump(d, p, 3 + rng() * 5, rng);
  }
  for (let k = 0; k < 2 + Math.floor(rng() * 2); k++) {
    const p = pt(60 + rng() * (W - 120), 60 + rng() * (H - 120));
    if (shoreDist(cays, p.x, p.y) > 10 && busy(p.x, p.y) > 0.3) starfish(d, p, 6 + rng() * 2, rng);
  }
}
