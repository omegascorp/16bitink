import { anacondaArt } from '../../../src/art/chapters/floodedSnake';
import { CAPYBARA_ART } from '../../../src/art/chapters/floodedCrittersCapybara';
import { EGGEATER_ART } from '../../../src/art/chapters/savannaSnake';
import { MOUSE } from '../../../src/art/critters/mouse';
import { INK, PAPER } from '../../../src/art/palette';
import { CORN } from '../../../src/art/snakes/corn';
import { SNAKE_W, type SnakeArt, type SpriteArt } from '../../../src/art/types';
import { CAPTION_FONT } from '../captions';
import { OLIVE } from '../python/cast';
import { FRESHWATER_CROC_ART } from '../python/croc';
import type { Short } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { NEW_MEALS, NEW_SNAKES } from './art/index';

/**
 * The video's drawings on one test card, 1920×1080, every one at its real
 * size on one scale (px per cm), so new drawings can be judged against the
 * game's own: the snakes laid out as gentle waves (corn snake, olive python,
 * the two new pythons, the egg-eater), then the meals as the video draws
 * them going in, 'limp' (the game's mouse, the python short's freshwater
 * croc, the new fawn, deer and hyena), with the game's capybara for a
 * painted reference. `?only=<name>` (fawn, deer, hyena, burmese, rock)
 * shows one new drawing big, beside the croc and the capybara at the same
 * scale. Shown at longform.html?video=swallow-kit.
 */

const W = 1920;
const H = 1080;

interface SnakeItem {
  readonly name: string;
  readonly art: SnakeArt;
  /** Length and body width in life, cm. */
  readonly cm: number;
  readonly wide: number;
}

interface MealItem {
  readonly name: string;
  readonly art: SpriteArt;
  readonly pose: string;
  /** Art units nose to rump, and that length in life (cm). */
  readonly len: number;
  readonly cm: number;
}

const SNAKES: readonly SnakeItem[] = [
  { name: 'corn snake', art: CORN, cm: 120, wide: 3.2 },
  { name: 'olive python', art: anacondaArt(OLIVE), cm: 300, wide: 9 },
  { name: 'burmese', art: NEW_SNAKES.burmese!, cm: 450, wide: 14 },
  { name: 'rock', art: NEW_SNAKES.rock!, cm: 400, wide: 12 },
  { name: 'egg-eater', art: EGGEATER_ART!, cm: 90, wide: 2.2 },
];

const MEALS: readonly MealItem[] = [
  { name: 'mouse', art: MOUSE, pose: 'idle', len: 30, cm: 9 },
  { name: 'croc', art: FRESHWATER_CROC_ART, pose: 'swim0', len: 104, cm: 100 },
  ...Object.entries(NEW_MEALS).map(([name, m]) => ({ name, art: m.art, pose: 'limp', len: m.len, cm: m.cm })),
  { name: 'capybara (game)', art: CAPYBARA_ART, pose: 'graze', len: 90, cm: 120 },
];

interface BakedSnake {
  readonly item: SnakeItem;
  readonly strip: Strip;
  readonly head: Sprite;
}

const SNAKE_RES = 8;

function bakeSnake(item: SnakeItem): BakedSnake {
  return { item, strip: bakeStrip(item.art, SNAKE_RES), head: bakeSprite(item.art.head, 'shut', SNAKE_RES, 300) };
}

/** A snake `cm` long laid as a gentle wave from `x0` rightwards (head at the right), `k` px per cm. */
function drawSnakeAt(ctx: CanvasRenderingContext2D, s: BakedSnake, x0: number, y: number, k: number, boil: number): void {
  const len = s.item.cm * k;
  const width = Math.max(6, s.item.wide * k);
  const n = Math.max(24, Math.ceil(len / 4));
  const spine: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return { x: x0 + len * (1 - u), y: y + Math.sin(u * Math.PI * 2.2) * width * 1.6 };
  });
  const body = { spine, widths: spine.map((_, i) => width * taper(i / n)), along: width / SNAKE_W };
  drawBodyShadow(ctx, body, width);
  drawBody(ctx, s.strip, boil, body);
  const a = spine[0]!;
  const c = spine[3]!;
  drawSprite(ctx, s.head, boil, { x: a.x, y: a.y, scale: width / SNAKE_W, rotation: Math.atan2(a.y - c.y, a.x - c.x) });
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 30): void {
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A 1 m scale bar at (x, y). */
function ruler(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 100 * k, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.moveTo(x + 100 * k, y - 8);
  ctx.lineTo(x + 100 * k, y + 8);
  ctx.stroke();
  ctx.restore();
  label(ctx, '1 m · 3.3 ft', x + 50 * k, y - 14, 26);
}

export function createSwallowKit(ctx: CanvasRenderingContext2D, only: string | null): Short {
  const meals = MEALS.map((m) => ({ m, sprite: bakeSprite(m.art, m.pose, 6, 700) }));
  const focus = only ? [...MEALS.filter((m) => m.name === only || m.name === 'croc' || m.name.startsWith('capybara'))] : null;
  const snakeFocus = only ? SNAKES.filter((s) => s.name === only) : SNAKES;
  const snakes = snakeFocus.map(bakeSnake);

  function drawMeals(boil: number, list: readonly MealItem[], y: number, k: number): void {
    const gap = 40;
    const total = list.reduce((sum, m) => sum + m.cm * k * 1.25, 0) + gap * (list.length - 1);
    let x = (W - total) / 2;
    for (const m of list) {
      const wide = m.cm * k * 1.25;
      const baked = meals.find((b) => b.m.name === m.name)!;
      drawSprite(ctx, baked.sprite, boil, { x: x + wide / 2, y, scale: (m.cm * k) / m.len });
      label(ctx, `${m.name} · ${m.cm} cm`, x + wide / 2, y + Math.max(60, m.cm * k * 0.45));
      x += wide + gap;
    }
  }

  return {
    loopSeconds: 3,
    draw(t: number): void {
      const boil = boilAt(t);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      if (focus) {
        const k = 5.2;
        if (snakes.length) drawSnakeAt(ctx, snakes[0]!, 80, 260, 3.6, boil);
        drawMeals(boil, focus, 720, k);
        ruler(ctx, 80, 1020, k);
        return;
      }
      // Snakes on one scale (2 px per cm keeps the 4.5 m python on screen), stacked.
      const ks = 3.4;
      snakes.forEach((s, i) => {
        drawSnakeAt(ctx, s, 60, 90 + i * 100, ks, boil);
        label(ctx, `${s.item.name} · ${s.item.cm} cm`, 60 + s.item.cm * ks + 120, 100 + i * 100, 28);
      });
      ruler(ctx, 60, 600, ks);
      drawMeals(boil, MEALS, 820, 2.2);
    },
    audio: async () => new Blob(),
  };
}
