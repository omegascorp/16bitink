import { route, type Route } from '../krait/path';
import { smooth } from '../short';
import type { Pt } from '../sprites';
import { type Cast, type MealId, SNAKE_CM, type SnakeId } from './cast';
import { write } from './hud';
import { drawGround, drawRuler, type LineView } from './lineupMarks';
import { vignette } from './scene';
import { camAt, type CamKey } from './steps';
import { drawSnake, type SnakePose, type View } from './swallower';
import { T, sectionStart as s } from './timeline';

export { drawCrown, drawRosette } from './lineupMarks';

/**
 * The size comparison, a classic stacked chart: one snake per row in meal
 * order (the egg-eater's row on top, filled in the twist), every tail at
 * 0 on one ruler (0–16 ft) along the bottom, each snake a gentle wave at
 * true length (world units are cm) with its meal as a lump, its meal's
 * weight tagged at its head. Each snake slides into its row head first
 * after its scene; the camera eases in log space between the new row and
 * the whole chart.
 */

const ROW = 46;
const RULER_Y = 5 * ROW + 42;

interface Slot {
  readonly snake: SnakeId;
  readonly meal: MealId;
  readonly row: number;
  readonly cm: number;
  readonly wide: number;
  readonly tag: string;
  /** When it slides in (-1: always there). */
  readonly joins: number;
  /** Where the lump rests, as a share of the body back from the head. */
  readonly rest: number;
  readonly route: Route;
}

function slot(snake: SnakeId, meal: MealId, row: number, tag: string, joins: number, rest: number, cm = SNAKE_CM[snake].cm, wide = SNAKE_CM[snake].wide): Slot {
  const n = 8;
  const span = cm * 0.985;
  const amp = Math.min(wide * 0.9, 9);
  const knots: Pt[] = Array.from({ length: n + 1 }, (_, i) => ({ x: span * (i / n), y: row * ROW + Math.sin((i / n) * Math.PI * 3) * amp }));
  return { snake, meal, row, cm, wide, tag, joins, rest, route: route(knots, 0.5) };
}

export const SLOTS: readonly Slot[] = [
  slot('corn', 'mouse', 1, '0.06 lb', T.goUp - 0.4, 0.45),
  slot('olive', 'croc', 2, '≈ 6 lb', T.snakeEating, 0.42),
  slot('burmese', 'fawn', 3, '35 lb', T.snorkel + 0.3, 0.38, 340, 11),
  slot('burmese', 'deer', 4, '77 lb', T.thrilled, 0.36),
  slot('rock', 'hyena', 5, '≈ 150 lb', T.wasnt + 0.7, 0.55),
];
const EGG_ROW = slot('eggeater', 'egg', 0, '', -1, 0.4);

/** The egg-eater coiled round its egg (the cold open's silhouette, the twist's first look). */
const EGG_AT: Pt = { x: 40, y: 0 };
const COIL = route(Array.from({ length: 15 }, (_, i) => {
  const a = Math.PI * 0.2 + (i / 14) * Math.PI * 2.6;
  const r = 11 - i * 0.45;
  return { x: EGG_AT.x + Math.cos(-a) * r, y: EGG_AT.y + Math.sin(-a) * r * 0.85 };
}), 0.4);

/** When the line-up fills the screen. */
export const LINEUP_WINDOWS: readonly (readonly [number, number])[] = [
  [T.lining, s(1) - 0.05], [T.goUp - 0.4, s(2) - 0.05], [T.snakeEating, s(3) - 0.05], [T.snorkel + 0.3, s(5) - 0.05],
  [T.thrilled, s(6) - 0.05], [T.wasnt + 0.7, T.thisOne], [T.biggestMouth, 999],
];

export const lineupOn = (t: number): boolean => LINEUP_WINDOWS.some(([a, b]) => t >= a && t < b);

const all = (t: number): CamKey => ({ t, x: 250, y: 140, zoom: 3 });
const row = (t: number, r: number, x: number, zoom: number): CamKey => ({ t, x, y: r * ROW, zoom });
const CAMS: readonly CamKey[] = [
  row(T.lining, 1, 70, 7), row(T.mouse, 1, 70, 7.5), row(T.hyena + 0.4, 5, 220, 3.6), all(T.unhinge), all(T.champion), row(T.barely, 0, EGG_AT.x, 9),
  row(T.goUp - 0.4, 1, 65, 8.5), row(s(2) - 0.05, 1, 110, 5),
  row(T.snakeEating, 2, 160, 5), { t: T.snakeEating + 2.2, x: 170, y: 70, zoom: 3.8 },
  row(T.snorkel + 0.3, 3, 180, 4.6), { t: s(5) - 0.05, x: 220, y: 100, zoom: 3.2 },
  row(T.thrilled, 4, 230, 3.9), all(T.heart - 0.4), all(s(6) - 0.05),
  row(T.wasnt + 0.7, 5, 210, 4), all(T.wasnt + 2.4), all(T.notClose), all(T.y2023 - 0.2),
  row(T.y2023 + 1.4, 0, EGG_AT.x, 9), row(T.thisOne, 0, EGG_AT.x, 10), row(T.biggestMouth, 0, 70, 7), all(T.barely7 - 0.2), all(999),
];

export function lineView(t: number): LineView {
  const c = camAt(CAMS, t);
  return { x: c.x, y: c.y, zoom: c.zoom, at: (p) => ({ x: (p.x - c.x) * c.zoom + 960, y: (p.y - c.y) * c.zoom + 540 }) };
}

function slotPose(cast: Cast, sl: Slot, route0: Route, t: number, withMeal: boolean): SnakePose {
  return {
    snake: cast.snakes[sl.snake], route: route0, headS: route0.length, length: sl.cm, width: sl.wide,
    ...(withMeal ? { meal: { meal: cast.meals[sl.meal], scale: 1, p: 1, at: sl.cm * sl.rest } } : {}),
    tongue: Math.max(0, Math.sin(t * 4 + sl.row)) ** 6,
  };
}

/** A row's view, shifted while its snake slides in from the left (head first). */
function slideView(v: LineView, sl: Slot, t: number): View {
  const dx = sl.joins < 0 ? 0 : -(1 - smooth((t - sl.joins) / 1.3)) * (sl.cm + 1100 / v.zoom);
  return { zoom: v.zoom, at: (p) => v.at({ x: p.x + dx, y: p.y }) };
}

export interface LineupOpts {
  /** Every row is there (the cold open and the end). */
  readonly everyone?: boolean;
  /** The egg-eater: coiled at its egg, in its row with an egg lump, or not there. */
  readonly egg?: 'coil' | 'lump' | null;
  /** The egg-eater as a dark unnamed shape (the cold open). */
  readonly eggDark?: number;
}

function drawEgg(ctx: CanvasRenderingContext2D, cast: Cast, v: LineView, boil: number): void {
  const e = v.at(EGG_AT);
  const egg = cast.meals.egg;
  const k = (egg.cm * v.zoom) / egg.len;
  const f = egg.sprite.frame * k;
  ctx.drawImage(egg.sprite.frames[boil % egg.sprite.frames.length]!, e.x - f / 2, e.y - f / 2, f, f);
}

/** Draws the line-up at t; returns the view, each row's head on screen, and the egg-eater's. */
export function drawLineup(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, o: LineupOpts = {}): { readonly view: LineView; readonly heads: readonly Pt[]; readonly egg: Pt } {
  const v = lineView(t);
  drawGround(ctx, v);
  drawRuler(ctx, v, RULER_Y, 1);
  const heads = SLOTS.map((sl) => {
    const view = o.everyone ? v : slideView(v, sl, t);
    const on = o.everyone || t >= sl.joins;
    if (on) drawSnake(ctx, slotPose(cast, sl, sl.route, t, true), view, boil);
    const head = view.at(sl.route.at(sl.route.length));
    const a = o.everyone ? 1 : smooth((t - sl.joins - 1.1) / 0.3);
    if (on) write(ctx, sl.tag, head.x + 18, head.y - Math.max(14, sl.wide * v.zoom * 0.9), Math.max(30, Math.min(60, 18 + v.zoom * 8)), { align: 'left', alpha: a });
    return head;
  });
  let egg = v.at(EGG_AT);
  if (o.egg === 'coil') {
    drawEgg(ctx, cast, v, boil);
    drawSnake(ctx, { ...slotPose(cast, EGG_ROW, COIL, t, false), mouth: 'open', dark: o.eggDark ?? 0 }, v, boil);
  } else if (o.egg === 'lump') {
    drawSnake(ctx, slotPose(cast, EGG_ROW, EGG_ROW.route, t, true), v, boil);
    egg = v.at(EGG_ROW.route.at(EGG_ROW.route.length));
  }
  vignette(ctx, 0.3);
  return { view: v, heads, egg };
}
