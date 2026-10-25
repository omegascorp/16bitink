import type { Rng } from '../../logic/rng';
import type { LevelDef, SolidDef } from '../../level/types';
import { polar } from '../groundKit';
import { pt, TAU, type Draw } from '../kit';
import type { Pt } from '../pen';
import { perArea } from '../places/farmKit';
import { frond } from './barrensPlaceFrond';
import type { Board, Look } from './barrensPlaceGround';
import { burnDepth, H, W } from './barrensPlaceKit';
import { barkFlake, bluestem, lichenColony, mossCushion, oakLeaf, pineCone, twig, wintergreen } from './barrensPlaceParts';

/**
 * The Pine Barrens floor's plants and litter, gathering towards the edges
 * and away from the level's things: bracken reaching in from beyond the
 * board, colonies of reindeer lichen, wintergreen, bronze little bluestem,
 * haircap moss on damp ground; cones, flakes of bark and twigs round the
 * pines, a few cones out in the open, scrub-oak leaves by a hollow.
 */

/** Tries `tries` spots and paints at up to `n` of them where `ok` says. */
function scatter(n: number, tries: number, rng: Rng, ok: (p: Pt) => boolean, paint: (p: Pt) => void): void {
  for (let k = 0, made = 0; k < tries && made < n; k++) {
    const p = pt(rng() * W, rng() * H);
    if (!ok(p)) continue;
    paint(p);
    made++;
  }
}

/** A point just inside one side of the board, and the way in from it. */
function edgeRoot(rng: Rng): [Pt, number] {
  const side = Math.floor(rng() * 4);
  const u = 0.06 + rng() * 0.88;
  if (side === 0) return [pt(W * u, -6), Math.PI / 2];
  if (side === 1) return [pt(W + 6, H * u), Math.PI];
  if (side === 2) return [pt(W * u, H + 6), -Math.PI / 2];
  return [pt(-6, H * u), 0];
}

/** Bracken fronds reaching in over the board's edges, some turning bronze. */
function bracken(d: Draw, look: Look, b: Board, rng: Rng): void {
  const room = (p: Pt): boolean => b.busy(p.x, p.y) > 0.42 && b.clear(p, 12) && burnDepth(b.burn, p.x, p.y) < -16 && b.bare.at(p.x, p.y) < 0.5;
  for (let k = 0, made = 0; k < 60 && made < look.ferns; k++) {
    const [base, inward] = edgeRoot(rng);
    const ang = inward + (rng() - 0.5) * 1.1;
    const len = 46 + rng() * 34;
    const mid = polar(base, ang, len * 0.55);
    if (!room(mid) || !room(polar(base, ang, len))) continue;
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) frond(d, polar(base, ang + Math.PI / 2, (i - (n - 1) / 2) * 16), ang + (rng() - 0.5) * 0.6, len * (0.75 + rng() * 0.3), rng, { bronze: rng() < 0.4 ? 0.5 + rng() * 0.5 : rng() * 0.25, lift: 4, keep: room });
    made++;
  }
}

/** The floor's plants: see the module comment. */
function plants(d: Draw, look: Look, b: Board, rng: Rng): void {
  const unburnt = (p: Pt): boolean => burnDepth(b.burn, p.x, p.y) < -28;
  const ok = (p: Pt, min: number, room = 8): boolean => b.busy(p.x, p.y) > min && b.clear(p, room) && b.bare.at(p.x, p.y) < 0.25 && unburnt(p);
  scatter(Math.round(perArea(16) * look.lichen), 400, rng, (p) => ok(p, 0.3 + rng() * 0.35, 20), (c) => lichenColony(d, c, 14 + rng() * 22, rng, (p) => ok(p, 0.2)));
  // A stray small cushion or two out nearer the middle.
  scatter(Math.round(perArea(5) * look.lichen), 200, rng, (p) => ok(p, 0.12, 30) && b.busy(p.x, p.y) < 0.35, (c) => lichenColony(d, c, 6, rng, (p) => ok(p, 0.1)));
  if (look.damp) scatter(perArea(12), 300, rng, (p) => ok(p, 0.5, 14), (c) => mossCushion(d, c, 7 + rng() * 9, rng));
  scatter(perArea(20), 400, rng, (p) => ok(p, 0.55, 12), (c) => {
    for (let i = 0; i < 2 + rng() * 4; i++) {
      const p = polar(c, rng() * TAU, rng() * 14);
      if (ok(p, 0.4)) wintergreen(d, p, 6 + rng() * 2.5, rng);
    }
  });
  scatter(perArea(24), 400, rng, (p) => ok(p, 0.5, 12), (c) => bluestem(d, c, 11 + rng() * 9, rng));
}

/** Cones, bark flakes and twigs round each pine; a few cones and twigs in the open; oak leaves. */
function litterBits(d: Draw, level: LevelDef, look: Look, b: Board, rng: Rng): void {
  const pines = (level.solids ?? []).filter((s): s is Extract<SolidDef, { kind: 'circle' }> => s.look === 'pine' && s.kind === 'circle');
  const free = (p: Pt, room = 5): boolean => b.clear(p, room) && b.bare.at(p.x, p.y) < 0.4 && p.x > 4 && p.y > 4 && p.x < W - 4 && p.y < H - 4;
  for (const s of pines) {
    for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
      barkFlake(d, polar(s, rng() * TAU, s.r + 4 + rng() * 20), 2 + rng() * 2.5, rng);
    }
    for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) {
      const p = polar(s, rng() * TAU, s.r + 26 + rng() * 60);
      if (free(p) && burnDepth(b.burn, p.x, p.y) < 0) pineCone(d, p, 10 + rng() * 3, rng);
    }
  }
  scatter(perArea(10), 300, rng, (p) => free(p, 14) && b.busy(p.x, p.y) > 0.3 && burnDepth(b.burn, p.x, p.y) < 0, (p) => pineCone(d, p, 9.5 + rng() * 3, rng));
  scatter(perArea(14), 300, rng, (p) => free(p, 14) && b.busy(p.x, p.y) > 0.45 && burnDepth(b.burn, p.x, p.y) < -10, (p) => twig(d, p, rng() * TAU, 14 + rng() * 22, rng));
  scatter(perArea(look.oak ? 40 : 5), 400, rng, (p) => free(p, 10) && b.busy(p.x, p.y) > 0.3 && burnDepth(b.burn, p.x, p.y) < -10, (p) => oakLeaf(d, p, 7 + rng() * 3, rng));
}

export function paintFloor(d: Draw, level: LevelDef, look: Look, b: Board, rng: Rng): void {
  plants(d, look, b, rng);
  litterBits(d, level, look, b, rng);
  bracken(d, look, b, rng);
}
