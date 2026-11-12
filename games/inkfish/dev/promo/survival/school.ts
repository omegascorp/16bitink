import { createRng } from '../../../src/logic/rng';
import { drawPop, YELLOW_ON_INK } from '../swallowyou/text';
import { smooth } from '../short';
import { drawOut } from './hud';
import { drawPosed } from './scene';
import { TUNAS, type FishId } from './species';
import { T } from './timeline';
import { TUNA_HAIL } from './verdicts';

/**
 * The school of 90 skipjack that packs the tank in the cold open and round 1:
 * a back layer hazed by the water and a front layer, swimming in place until
 * "stop", then slowing; round 1's hail of OUT stamps, and the school swimming
 * off. One tuna up front is the "hero" the breathing diagram is drawn on.
 */

interface Tuna {
  readonly kind: FishId;
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly facing: 1 | -1;
  readonly ph: number;
  readonly back: boolean;
  /** When its OUT stamp lands, and when it starts swimming off. */
  readonly stamp: number;
  readonly leave: number;
}

export const HERO = { x: 300, y: 560, len: 150 } as const;

const rng = createRng(9090);
const order = Array.from({ length: 90 }, (_, i) => i).sort(() => rng() - 0.5);

export const SCHOOL: readonly Tuna[] = Array.from({ length: 90 }, (_, i) => {
  const back = i < 54;
  const hero = i === 89;
  const col = back ? i % 9 : (i - 54) % 9;
  const row = back ? Math.floor(i / 9) : Math.floor((i - 54) / 9);
  const rows = back ? 6 : 4;
  const x = hero ? HERO.x : 170 + col * 195 + (rng() - 0.5) * 120 + (row % 2) * 90;
  const y = hero ? HERO.y : 270 + ((row + 0.5) / rows) * 560 + (rng() - 0.5) * 60;
  const kind = hero ? 'tuna' : TUNAS[(i * 3 + Math.floor(rng() * 2)) % TUNAS.length]!;
  const grow = kind === 'bluefin' ? 1.25 : kind === 'bigeye' ? 1.08 : 1;
  return {
    kind, x, y, len: (hero ? HERO.len : back ? 92 + rng() * 14 : 112 + rng() * 18) * grow, facing: hero || rng() < 0.7 ? 1 : -1, ph: rng() * 6.28, back,
    stamp: TUNA_HAIL.from + (order[i]! / 90) * (TUNA_HAIL.to - TUNA_HAIL.from),
    leave: T.andThen - 0.6 + rng() * 1.2,
  };
});

/** How hard the school is swimming: full until "stop", then hanging still. */
const effortAt = (t: number): number => 0.6 * (1 - smooth((t - T.tunaStop) / 1.2)) + 0.05;

/** One layer of the school at t (`back` for the hazed far layer). */
export function drawSchool(ctx: CanvasRenderingContext2D, t: number, boil: number, back: boolean): void {
  const widen = t >= T.tunaStop && t < T.andThen + 2 ? 'wide' : null;
  for (const f of SCHOOL) {
    if (f.back !== back) continue;
    const u = t - f.leave;
    if (u > 3) continue;
    const swim = 1 - smooth((t - T.stop) / 1.5) * 0.85;
    let x = f.x + Math.sin(t * 0.5 + f.ph) * 26 * swim;
    let facing = f.facing;
    if (u > 0) {
      facing = -1;
      x -= 200 * u + 650 * u * u;
    }
    const y = f.y + Math.sin(t * 0.9 + f.ph) * 6;
    drawPosed(ctx, f.kind, x, y, f.len, facing, t + f.ph, boil, { effort: u > 0 ? 0.9 : effortAt(t), expr: widen });
    if (t >= f.stamp) drawOut(ctx, x, y, back ? 24 : 30, t, f.stamp, 1 - smooth((u - 1) / 1));
  }
}

/** A front tuna of each kind, named as the narrator says it. */
const NAMED: readonly { readonly kind: FishId; readonly label: string; readonly at: number }[] = [
  { kind: 'tuna', label: 'skipjack', at: T.skipjack1 },
  { kind: 'yellowfin', label: 'yellowfin', at: T.yellowfin1 },
  { kind: 'bluefin', label: 'bluefin', at: T.bluefin1 },
];

export function drawTunaNames(ctx: CanvasRenderingContext2D, t: number): void {
  for (const n of NAMED) {
    const f = SCHOOL.find((s) => !s.back && s.kind === n.kind && s.x > 350 && s.x < 1600 && s.y > 470 && s.y < 860) ?? SCHOOL.find((s) => !s.back && s.kind === n.kind);
    if (!f) continue;
    drawPop(ctx, n.label, f.x, f.y - f.len * 0.42, 44, t, n.at, T.ninetyOut - 0.1, YELLOW_ON_INK);
  }
}

/** The far layer's haze: the water between the two layers. */
export function drawHaze(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#6cc4ec';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
