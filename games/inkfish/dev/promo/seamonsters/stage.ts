import { INK, PAPER } from '../../../src/art/pen';
import { smooth } from '../short';
import { drawYou } from '../swallowyou/art/people';
import { createSea, type Look, type Sea } from '../swallowyou/sea';
import { drawSiphonophoreAlong } from './art/siphonophore';
import { drawTinted } from './fx';
import { drawMonster, heightRatio, type MonsterPose, pointOn, SQUID_EYE } from './cast';
import { between, centreOn, closeOn, fitTop, frame, H, rowUpTo, type Shot, slotOf, toScreen, type View, viewAt, W, zoomOf } from './lineup';
import { type Monster, MONSTERS, SIPHONOPHORE, YOU_FT } from './species';
import { ARRIVE, sectionStart, T } from './timeline';

/**
 * The line-up itself, from "you" (section 1) to the siphonophore laid out
 * over the blue whale (section 10): the sea, the seabed with its ruler in
 * feet, "you" at the left, each animal swimming in from the right to its
 * slot when it's named and staying there, the camera's shots on them, and
 * the poses the narration calls for (the frilled shark's teeth, the
 * manatee's chewing and blink, the basking shark's tunnel of a mouth).
 */

const s = sectionStart;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const bump = (t: number, from: number, to: number, fade = 0.3): number => smooth((t - from) / fade) * (1 - smooth((t - to) / fade));

/** How long an animal takes to swim from off screen to its slot. */
const SWIM_IN = 2.6;

/** The siphonophore's straight run over the blue whale: from the whale's snout, 150 ft along, a little above its back. */
export function siphonophoreRun(): { readonly x0: number; readonly x1: number; readonly y: number } {
  const b = slotOf('blue');
  return { x0: b.front, x1: b.front + SIPHONOPHORE.feet, y: b.y - heightRatio('blue') * b.feet * 0.5 - 5 };
}

/** A close shot on part of an animal (`along` its length from the front), `width` feet across, centred on its middle line. */
function headClose(m: Monster, along: number, width: number): View {
  const sl = slotOf(m);
  const x = sl.front + along * sl.feet;
  return centreOn(frame(x - width * 0.35, x + width * 0.65, 0.05), sl.y);
}

/** The camera, shot by shot (each eases in from the one before). */
function makeShots(): Shot[] {
  const run = siphonophoreRun();
  return [
    { at: 0, view: fitTop(frame(-7, 9, 0.04), -YOU_FT, 200), ease: 0.01 },
    { at: T.keepEye, view: fitTop(frame(-4, 12, 0.08), -YOU_FT, 200), ease: 1.4 },
    { at: ARRIVE.frilled, view: rowUpTo('frilled'), ease: 1.5 },
    { at: T.teeth - 0.3, view: headClose('frilled', 0.05, 2.6), ease: 0.8 },
    { at: T.pregnant + 0.2, view: rowUpTo('frilled'), ease: 1.0 },
    { at: ARRIVE.manatee, view: closeOn('manatee'), ease: 1.6 },
    { at: T.rude - 0.4, view: headClose('manatee', 0.1, 5), ease: 0.8 },
    { at: s(4), view: rowUpTo('manatee'), ease: 0.01 },
    { at: ARRIVE.oarfish, view: closeOn('oarfish'), ease: 1.8 },
    { at: T.crest - 0.3, view: headClose('oarfish', 0.04, 7), ease: 0.8 },
    { at: T.japan, view: closeOn('oarfish'), ease: 1.2 },
    { at: T.badDay - 0.4, view: rowUpTo('oarfish'), ease: 1.5 },
    { at: ARRIVE.basking, view: closeOn('basking'), ease: 1.6 },
    { at: T.plankton - 0.5, view: headClose('basking', 0.12, 13), ease: 0.8 },
    { at: s(7) - 0.4, view: rowUpTo('basking'), ease: 0.01 },
    { at: ARRIVE.squid, view: closeOn('squid'), ease: 1.6 },
    { at: T.plates - 0.3, view: headClose('squid', SQUID_EYE.along, 24), ease: 0.8 },
    { at: T.colossal + 0.4, view: closeOn('squid'), ease: 1.0 },
    { at: T.dark, view: rowUpTo('squid'), ease: 2.2 },
    { at: ARRIVE.sperm, view: closeOn('sperm'), ease: 1.8 },
    { at: T.brain - 0.3, view: headClose('sperm', 0.12, 22), ease: 0.8 },
    { at: T.wasReal, view: rowUpTo('sperm'), ease: 1.6 },
    { at: ARRIVE.blue, view: closeOn('blue'), ease: 2.2 },
    { at: T.wins, view: rowUpTo('blue'), ease: 1.6 },
    { at: T.notLength, view: fitTop(frame(run.x0 - 6, run.x1 + 4, 0.05), run.y - 4), ease: 2.0 },
    { at: T.weirder - 0.2, view: fitTop(frame(-YOU_FT, run.x1 + 4, 0.03), run.y - 4), ease: 2.6 },
  ];
}

/** The water behind the row: brighter for the small animals, darker as the row grows, black for the squid and the twist. */
const LOOKS: readonly { readonly at: number; readonly look: Look }[] = [
  { at: 0, look: 'tropic' },
  { at: s(4), look: 'cold' },
  { at: s(7), look: 'deep' },
  { at: s(9), look: 'cold' },
  { at: T.notLength, look: 'deep' },
];

function drawWater(ctx: CanvasRenderingContext2D, sea: Sea, t: number, view: View): void {
  let i = 0;
  while (i + 1 < LOOKS.length && t >= LOOKS[i + 1]!.at) i++;
  const now = LOOKS[i]!;
  const prev = LOOKS[Math.max(0, i - 1)]!;
  const k = i === 0 ? 1 : smooth((t - now.at) / 1.5);
  const pan = (view.left + view.right) * 0.5 * zoomOf(view);
  sea.draw(ctx, k < 1 ? prev.look : now.look, t, pan, zoomOf(view) / 60);
  if (k > 0 && k < 1) {
    ctx.save();
    ctx.globalAlpha = k;
    sea.draw(ctx, now.look, t, pan, zoomOf(view) / 60);
    ctx.restore();
  }
}

/** A tick step that leaves about 120 px between ticks: 1, 2, 5, 10, 20, 50 ft. */
function tickStep(zoom: number): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100];
  return steps.find((st) => st * zoom >= 110) ?? 100;
}

/** The sand and the ruler printed along its edge, in feet from you. */
function drawSeabed(ctx: CanvasRenderingContext2D, view: View, dark: number): void {
  const SEABED_Y = view.bed;
  if (SEABED_Y >= H) return;
  const g = ctx.createLinearGradient(0, SEABED_Y, 0, H);
  g.addColorStop(0, `rgba(${Math.round(196 - 120 * dark)},${Math.round(176 - 110 * dark)},${Math.round(132 - 80 * dark)},1)`);
  g.addColorStop(1, `rgba(${Math.round(120 - 80 * dark)},${Math.round(104 - 70 * dark)},${Math.round(76 - 50 * dark)},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, SEABED_Y, W, H - SEABED_Y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, SEABED_Y);
  ctx.lineTo(W, SEABED_Y);
  ctx.stroke();
  const z = zoomOf(view);
  const step = tickStep(z);
  const first = Math.ceil(view.left / step) * step;
  ctx.fillStyle = INK;
  ctx.font = '700 30px Caveat';
  ctx.textAlign = 'center';
  for (let ft = Math.max(0, first); ft <= view.right; ft += step) {
    const x = (ft - view.left) * z;
    ctx.fillRect(x - 1.5, SEABED_Y, 3, 18);
    for (let k = 1; k < 5; k++) {
      const xm = x + (k * step * z) / 5;
      if (xm < W) ctx.fillRect(xm - 1, SEABED_Y, 2, 9);
    }
    if (ft > 0) ctx.fillText(`${ft} ft`, x, SEABED_Y + 50);
  }
}

/** Where an animal is at t: swimming in from beyond the frame's right edge to its slot, then holding there. */
function frontAt(m: Monster, t: number, view: View): number {
  const sl = slotOf(m);
  const u = clamp01((t - ARRIVE[m]) / SWIM_IN);
  const from = Math.max(sl.front, view.right) + sl.feet * 0.15;
  const eased = 1 - (1 - u) ** 3;
  return from + (sl.front - from) * eased;
}

/** Each animal's pose at t, from the narration's beats. */
function poseOf(m: Monster, t: number): MonsterPose {
  switch (m) {
    case 'frilled':
      return { gape: 0.12 + 0.8 * bump(t, T.teeth - 0.2, T.pregnant, 0.35) };
    case 'manatee': {
      const blink = bump(t, T.rude + 0.5, T.rude + 1.3, 0.35);
      const eating = t > T.thirteen && t < s(4);
      return { chew: eating ? 0.5 + 0.5 * Math.sin(t * 7) : 0, blink, grass: eating };
    }
    case 'basking':
      return { gape: 0.85 + 0.15 * bump(t, T.plankton - 0.5, T.rots, 0.5) };
    case 'sperm':
      return { gape: 0.35 * bump(t, T.hunts, T.sperm, 0.3) };
    default:
      return {};
  }
}

export interface StageKit {
  readonly sea: Sea;
  readonly shots: readonly Shot[];
}

export function createStageKit(): StageKit {
  return { sea: createSea(), shots: makeShots() };
}

export function viewOf(kit: StageKit, t: number): View {
  return viewAt(kit.shots, t);
}

/** Screen position of a point on an animal (fractions of its box), as it stands at t. */
export function monsterPoint(kit: StageKit, m: Monster, t: number, along: number, down: number): { readonly x: number; readonly y: number } {
  const v = viewOf(kit, t);
  const sl = slotOf(m);
  const z = zoomOf(v);
  const front = toScreen(v, frontAt(m, t, v), sl.y);
  return pointOn(m, front, sl.feet * z, -1, along, down);
}

/** The row on the stage: the water, the seabed and its ruler, you, every animal that has arrived, and the siphonophore once it's named. */
export function drawStage(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const v = viewOf(kit, t);
  const z = zoomOf(v);
  drawWater(ctx, kit.sea, t, v);
  const dark = t >= s(7) && t < s(9) ? 0.7 : t >= T.notLength ? 0.8 : t >= s(4) ? 0.3 : 0;
  drawSeabed(ctx, v, dark);
  // You: a paper halo, so you read on any water.
  const you = toScreen(v, 0, 0);
  if (you.x > -200) drawYou(ctx, you.x, you.y, YOU_FT * z, t, { arms: t > T.weirder ? 'shrug' : 'down', halo: Math.max(2, Math.min(8, z * 0.4)) });
  for (const m of MONSTERS) {
    if (t < ARRIVE[m]) continue;
    const sl = slotOf(m);
    const front = toScreen(v, frontAt(m, t, v), sl.y);
    const len = sl.feet * z;
    if (front.x > W + 40 || front.x + len < -40) continue;
    drawMonster(ctx, m, front, len, -1, t, poseOf(m, t));
  }
  drawRun(ctx, v, t);
}

/** The siphonophore laid out straight over the blue whale, drawn from its swimming bells back as the camera follows it. */
function drawRun(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  if (t < T.notLength) return;
  const run = siphonophoreRun();
  const reveal = t < T.y2020 ? 0.35 * smooth((t - T.notLength) / 1.2) : 1;
  const n = 220;
  const path = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const x = run.x0 + (run.x1 - run.x0) * u;
    const y = run.y + 1.2 * Math.sin(u * 19 + t * 0.6) + 0.6 * Math.sin(u * 47 - t * 0.9);
    return toScreen(v, x, y);
  });
  // Its swimming bells lead at the whale's snout end (path[0], pointing left), so its polyps hang on side 1.
  drawSiphonophoreAlong(ctx, path, t, { reveal, glow: 0.7, side: 1, width: Math.max(5, Math.min(14, zoomOf(v) * 0.7)) });
}

/** The camera for the cold open's fly-by: from you along the whole row in silhouette. */
export function flyByView(u: number): View {
  return between(frame(-3, 12, 0.1), rowUpTo('blue'), u);
}

/** The whole row as dark silhouettes (the cold open's fly-by): no water, no ruler. */
export function drawSilhouettes(ctx: CanvasRenderingContext2D, v: View, t: number, alpha: number): void {
  const z = zoomOf(v);
  drawTinted(ctx, '#0c1622', alpha, (c) => {
    const you = toScreen(v, 0, 0);
    drawYou(c, you.x, you.y, YOU_FT * z, t, { fill: PAPER, halo: 0 });
    for (const m of MONSTERS) {
      const sl = slotOf(m);
      drawMonster(c, m, toScreen(v, sl.front, sl.y), sl.feet * z, -1, t, poseOf(m, t));
    }
  });
}
