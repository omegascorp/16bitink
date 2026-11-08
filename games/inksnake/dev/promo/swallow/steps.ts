import { route, type Route } from '../krait/path';
import { clamp01, lerp, smooth } from '../short';
import type { Pt } from '../sprites';
import type { Boards, Camera } from './boards';
import { SNAKE_CM, type MealId, type SnakeId } from './cast';
import { HEAD_STRETCH, LIP, type SnakePose } from './swallower';
import { T, sectionStart as s } from './timeline';

/**
 * The five meals, each its own top-down shot on its own ground: the snake
 * comes in from the right head first, its jaws walk over the meal (a step
 * at a time, one side then the other), then the lump slides down the body
 * and the snake creeps on. Board px per cm is the shot's scale, so every
 * snake and meal is its true size. Times come from timeline.ts.
 */

export interface CamKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface Step {
  readonly id: string;
  readonly board: keyof Boards;
  readonly snake: SnakeId;
  readonly meal: MealId;
  /** Board px per cm. */
  readonly scale: number;
  /** The snake's length and width in life (cm), if not the species' default. */
  readonly cm?: number;
  readonly wide?: number;
  readonly route: Route;
  /** Route distance of the meal's middle. */
  readonly mealS: number;
  /** Keys of how far the meal is in (p) over time: below 0 the snake is still coming (p = -1 off screen). */
  readonly gulp: readonly (readonly [number, number])[];
  /** When the lump slides from behind the head to `rest` (share of the body). */
  readonly lump: readonly [number, number];
  readonly rest: number;
  /** When the coils squeeze, in pulses. */
  readonly squeeze?: readonly [number, number];
  readonly cams: readonly CamKey[];
}

/** The route distance nearest a point. */
function sNear(r: Route, p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s <= r.length; s += 2) {
    const q = r.at(s);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) [best, bestD] = [s, d];
  }
  return best;
}

function step(base: Omit<Step, 'route' | 'mealS'>, knots: readonly Pt[], meal: Pt): Step {
  const r = route(knots);
  return { ...base, route: r, mealS: sNear(r, meal) };
}

export const CORN_STEP = step({
  id: 'corn', board: 'farm', snake: 'corn', meal: 'mouse', scale: 3.1,
  gulp: [[s(1) - 0.2, -1], [T.cornSnake + 1.6, -0.02], [T.mice + 0.2, 0], [T.ounce - 0.3, 1]],
  lump: [T.ounce - 0.3, T.goUp], rest: 0.45,
  cams: [{ t: s(1), x: 560, y: 290, zoom: 2.6 }, { t: T.mice, x: 440, y: 288, zoom: 5.4 }, { t: T.ounce, x: 560, y: 285, zoom: 2.7 }, { t: T.goUp, x: 560, y: 285, zoom: 2.4 }],
}, [{ x: 1500, y: 380 }, { x: 980, y: 230 }, { x: 760, y: 330 }, { x: 560, y: 250 }, { x: 420, y: 290 }, { x: 200, y: 280 }, { x: -200, y: 280 }], { x: 405, y: 290 });

/** The olive python's swallow (olive.ts draws its coil before it, then cuts to this). */
export const OLIVE_STEP = step({
  id: 'olive', board: 'lake', snake: 'olive', meal: 'croc', scale: 1.45,
  gulp: [[T.tookDown - 0.1, -0.02], [T.tookDown + 0.3, 0], [T.fiveOrSix - 0.6, 1]],
  lump: [T.fiveOrSix - 0.6, T.australia + 1], rest: 0.42,
  cams: [{ t: s(2), x: 520, y: 270, zoom: 2.1 }, { t: T.coiled, x: 400, y: 255, zoom: 3.1 }, { t: T.tookDown + 1, x: 420, y: 255, zoom: 3.0 }, { t: T.fiveOrSix, x: 480, y: 265, zoom: 2.3 }, { t: s(3), x: 500, y: 270, zoom: 2.0 }],
}, [{ x: 1600, y: 300 }, { x: 1000, y: 160 }, { x: 760, y: 320 }, { x: 560, y: 220 }, { x: 400, y: 253 }, { x: 160, y: 255 }, { x: -300, y: 258 }], { x: 360, y: 254 });

export const FAWN_STEP = step({
  id: 'fawn', board: 'swamp', snake: 'burmese', meal: 'fawn', scale: 1.35, cm: 340, wide: 11,
  gulp: [[s(4) - 0.2, -1], [T.next + 0.2, 0.55], [T.burmese, 1]],
  lump: [T.burmese, T.snorkel + 1], rest: 0.4,
  cams: [{ t: s(4), x: 420, y: 275, zoom: 3.8 }, { t: T.burmese, x: 520, y: 270, zoom: 2.3 }, { t: T.thirtyFive, x: 560, y: 270, zoom: 2.1 }, { t: T.snorkel, x: 560, y: 280, zoom: 2.0 }],
}, [{ x: 1500, y: 420 }, { x: 1050, y: 180 }, { x: 800, y: 360 }, { x: 560, y: 230 }, { x: 380, y: 280 }, { x: 150, y: 270 }, { x: -300, y: 270 }], { x: 340, y: 278 });

/** The deer: frame 1 of the video and section 5 share this shot (the swallow pauses in between). */
export const DEER_STEP = step({
  id: 'deer', board: 'swamp', snake: 'burmese', meal: 'deer', scale: 1.2,
  gulp: [[0, 0.58], [T.notEven, 0.66], [T.remember, 0.68], [T.tenInches + 0.2, 0.9], [T.measured + 4.4, 1]],
  lump: [T.measured + 4.4, T.thrilled], rest: 0.42,
  cams: [
    { t: 0, x: 378, y: 290, zoom: 5.2 }, { t: T.seventySeven, x: 400, y: 290, zoom: 4.6 }, { t: T.notEven, x: 420, y: 290, zoom: 3.0 }, { t: T.remember, x: 395, y: 290, zoom: 4.8 },
    { t: T.fifteenFoot, x: 560, y: 285, zoom: 2.05 }, { t: T.tenInches - 0.5, x: 410, y: 285, zoom: 3.1 }, { t: T.footWide - 1, x: 520, y: 285, zoom: 2.3 },
  ],
}, [{ x: 1500, y: 380 }, { x: 1100, y: 190 }, { x: 860, y: 370 }, { x: 640, y: 220 }, { x: 440, y: 290 }, { x: 160, y: 285 }, { x: -300, y: 285 }], { x: 360, y: 287 });

export const HYENA_STEP = step({
  id: 'hyena', board: 'savanna', snake: 'rock', meal: 'hyena', scale: 1.25,
  gulp: [[s(6) - 0.2, -1], [T.kenya, -0.02], [T.kenya + 0.6, 0.2], [T.hyenaSaid + 1.6, 1]],
  lump: [T.hyenaSaid + 1.6, T.wasnt], rest: 0.42,
  cams: [{ t: s(6), x: 600, y: 270, zoom: 2.0 }, { t: T.kenya, x: 450, y: 270, zoom: 3.2 }, { t: T.hyenaSaid, x: 430, y: 272, zoom: 3.8 }, { t: T.hundredFifty, x: 540, y: 270, zoom: 2.15 }, { t: T.wasnt, x: 540, y: 270, zoom: 2.0 }],
}, [{ x: 1500, y: 400 }, { x: 1080, y: 180 }, { x: 840, y: 360 }, { x: 620, y: 220 }, { x: 430, y: 280 }, { x: 160, y: 270 }, { x: -300, y: 270 }], { x: 360, y: 274 });

export const STEPS = [CORN_STEP, OLIVE_STEP, FAWN_STEP, DEER_STEP, HYENA_STEP] as const;

/** Piecewise-smooth through keys [t, value]. */
export function keyed(keys: readonly (readonly [number, number])[], t: number): number {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!;
    const [t0, v0] = keys[i - 1]!;
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1]![1];
}

export function camAt(keys: readonly CamKey[], t: number): Camera {
  const x = keyed(keys.map((k) => [k.t, k.x]), t);
  const y = keyed(keys.map((k) => [k.t, k.y]), t);
  const zoom = Math.exp(keyed(keys.map((k) => [k.t, Math.log(k.zoom)]), t));
  return { x, y, zoom };
}

/** The snake's pose in its shot at t (the board px world). */
export function stepPose(st: Step, snake: SnakePose['snake'], meal: NonNullable<SnakePose['meal']>['meal'], t: number): SnakePose {
  const size = SNAKE_CM[st.snake];
  const length = (st.cm ?? size.cm) * st.scale;
  const width = (st.wide ?? size.wide) * st.scale;
  const mealLen = meal.cm * st.scale;
  const raw = keyed(st.gulp, t);
  // The jaws walk: in steps, one side then the other.
  const walk = raw > 0 && raw < 1 ? 0.025 * Math.sin(raw * Math.PI * 14) : 0;
  const p = clamp01(raw + walk) + Math.min(0, raw);
  const front = LIP * ((width * HEAD_STRETCH) / 24);
  const atP0 = st.mealS - mealLen / 2 - front;
  const lumpU = smooth((t - st.lump[0]) / (st.lump[1] - st.lump[0]));
  const creep = Math.max(0, t - st.lump[0]) * 2.2;
  const headS = p < 0 ? atP0 + p * length * 1.4 : atP0 + Math.min(1, p) * mealLen + (raw >= 1 ? Math.min(creep, mealLen * 0.6) : 0);
  const at = lerp(mealLen / 2 + width * 0.5, length * st.rest, lumpU);
  const tongue = p < 0 ? Math.max(0, Math.sin(t * 5.3)) ** 3 : 0;
  const sq = st.squeeze && t > st.squeeze[0] && t < st.squeeze[1] ? Math.max(0, Math.sin((t - st.squeeze[0]) * Math.PI * 2.2)) ** 2 : 0;
  return { snake, route: st.route, headS, length, width, meal: { meal, scale: st.scale, p: raw >= 1 ? 1 : p, at }, tongue, squeeze: sq };
}
