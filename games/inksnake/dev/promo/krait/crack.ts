import { coralHead } from '../../../src/art/chapters/reefPlaceCoral';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { mix } from '../../../src/art/wash';
import type { Key } from '../short';
import { clamp01, ramp } from '../short';
import { drawSprite, type Pt } from '../sprites';
import type { Cast } from './cast';
import { route } from './path';
import { drawKrait, EEL_SCALE, type Camera, type KraitPose, toScreen } from './snake';
import { BITE_AT, CRACK_FROM, curve, cycles, HIDING_AT, OUT_FROM, VENOM_AT } from './story';

/**
 * Inside the crack (beats 3 and 4): seen from above, close, between the walls
 * of two coral heads (painted by the reef's coral painter), dark. A moray
 * waits head down in the slot, only its yellow eyes catching the light; the
 * krait's head creeps up from the crack's mouth, tongue flicking, and
 * strikes. The set has its own board px, the slot running up the middle.
 */
const WALLS = { x0: -120, y0: -220, w: 240, h: 440, res: 10 } as const;
const ROCK = '#26343a';

/** The coral walls on either side of the slot, on dark rock. */
export function paintWalls(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(WALLS.w * WALLS.res, WALLS.h * WALLS.res);
  ctx.scale(WALLS.res, WALLS.res);
  ctx.translate(-WALLS.x0, -WALLS.y0);
  ctx.fillStyle = ROCK;
  ctx.fillRect(WALLS.x0, WALLS.y0, WALLS.w, WALLS.h);
  // The slot's floor: dark sand down the middle.
  const floor = ctx.createLinearGradient(-30, 0, 30, 0);
  floor.addColorStop(0, ROCK);
  floor.addColorStop(0.5, mix('#5b6a5e', ROCK, 0.35));
  floor.addColorStop(1, ROCK);
  ctx.fillStyle = floor;
  ctx.fillRect(-30, WALLS.y0, 60, WALLS.h);
  const heads: readonly [number, number, number][] = [
    [-74, -150, 52], [70, -128, 50], [-70, -30, 56], [74, -6, 58], [-66, 92, 50], [72, 118, 52], [-72, 196, 48], [70, 222, 46],
  ];
  heads.forEach(([x, y, r], i) => coralHead(makeDraw(ctx, 900 + i, 0, 0), { x, y }, r));
  releaseScratch();
  return canvas;
}

/** The krait comes up the slot from the crack's mouth (bottom). */
const KRAIT_ROUTE = route([{ x: 4, y: 460 }, { x: -6, y: 300 }, { x: 5, y: 180 }, { x: 0, y: 80 }, { x: 0, y: -60 }]);
const S_AT = (y: number): number => {
  let best = 0;
  for (let s = 0; s < KRAIT_ROUTE.length; s += 0.5) if (Math.abs(KRAIT_ROUTE.at(s).y - y) < Math.abs(KRAIT_ROUTE.at(best).y - y)) best = s;
  return best;
};

const KRAIT_HEAD: readonly Key[] = [
  { t: CRACK_FROM, at: S_AT(175) },
  { t: 7.3, at: S_AT(78), rate: 30 },
  { t: BITE_AT - 0.06, at: S_AT(66), rate: 0 },
  { t: BITE_AT + 0.06, at: S_AT(44), rate: 40 },
  { t: OUT_FROM, at: S_AT(41), rate: 0 },
];

/** The moray in the slot, head down, the frame's centre just past its hole's mouth. */
const MORAY_AT: Pt = { x: 0, y: -8 };
/** Its eyes in its 'out' frame (eel units: snout at +18, the head swaying to +y in 'out0'). */
const EYES: readonly Pt[] = [{ x: 14.6, y: 1.6 }, { x: 14.6, y: 6.2 }];

export function crackKrait(t: number): KraitPose {
  const strike = t >= BITE_AT - 0.06;
  return {
    route: KRAIT_ROUTE,
    headS: curve(KRAIT_HEAD, t),
    length: 300,
    width: 20,
    bulges: [],
    head: strike ? 'strike' : 'shut',
    tongue: [6.0, 6.55, 6.95, 7.3].reduce((m, s) => Math.max(m, t >= s && t < s + 0.3 ? Math.sin(((t - s) / 0.3) * Math.PI) : 0), 0),
  };
}

/** The camera: a slow nervous push in, a jolt on the bite. */
export function crackCamera(t: number): Camera {
  const push = ramp(t, CRACK_FROM, 7.6);
  const jolt = t >= BITE_AT ? Math.max(0, 1 - (t - BITE_AT) / 0.4) : 0;
  return {
    x: 1.5 * Math.sin(cycles(7, t)) + jolt * 3.5 * Math.sin((t - BITE_AT) * 70),
    y: 40 - 22 * push + jolt * 2.5 * Math.cos((t - BITE_AT) * 61),
    zoom: 10.2 + 2.6 * push + jolt * 0.8,
  };
}

/** The moray's eyes: opening on "hiding", dimming after the venom. */
const eyesOpen = (t: number): number => clamp01((t - HIDING_AT + 0.05) / 0.12) * (1 - 0.75 * ramp(t, VENOM_AT + 0.1, VENOM_AT + 0.4));

export interface CrackSet {
  readonly walls: HTMLCanvasElement;
}

/** Draws the inside of the crack at t. */
export function drawCrack(ctx: CanvasRenderingContext2D, cast: Cast, set: CrackSet, t: number, boil: number): void {
  const cam = crackCamera(t);
  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, 1080, 1920);
  const tl = toScreen(cam, { x: WALLS.x0, y: WALLS.y0 });
  ctx.drawImage(set.walls, tl.x, tl.y, WALLS.w * cam.zoom, WALLS.h * cam.zoom);
  // The moray, head down: swaying from side to side, then slack.
  const limp = ramp(t, VENOM_AT, VENOM_AT + 0.5);
  const pose = limp > 0.5 ? 'out1' : Math.sin(cycles(5, t)) > 0 ? 'out0' : 'out1';
  const m = toScreen(cam, MORAY_AT);
  const eelPx = EEL_SCALE * cam.zoom;
  const turn = Math.PI / 2 + 0.12 * limp;
  drawSprite(ctx, cast.moray[pose], boil, { x: m.x, y: m.y, scale: eelPx, rotation: turn });
  drawKrait(ctx, cast, cam, crackKrait(t), boil);
  // The dark: light only from the crack's mouth below, and a little on the moray's face.
  const head = toScreen(cam, KRAIT_ROUTE.at(curve(KRAIT_HEAD, t)));
  const dark = ctx.createRadialGradient(head.x, head.y + 120, 40, head.x, head.y + 60, 1000);
  dark.addColorStop(0, 'rgba(3,6,14,0)');
  dark.addColorStop(0.3, 'rgba(3,6,14,0.3)');
  dark.addColorStop(0.6, 'rgba(3,6,14,0.62)');
  dark.addColorStop(1, 'rgba(3,6,14,0.86)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, 1080, 1920);
  // The eyes in the dark: a yellow glint each, with a glow.
  const open = eyesOpen(t);
  if (open > 0) {
    for (const e of EYES) {
      const sway = pose === 'out1' ? -4.6 : 0;
      const local = { x: e.x, y: e.y + sway };
      const p = { x: m.x - Math.sin(turn) * local.y * eelPx + Math.cos(turn) * local.x * eelPx, y: m.y + Math.cos(turn) * local.y * eelPx + Math.sin(turn) * local.x * eelPx };
      const r = 1.15 * eelPx;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      glow.addColorStop(0, `rgba(240,200,70,${0.45 * open})`);
      glow.addColorStop(1, 'rgba(240,200,70,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(turn);
      ctx.scale(1, Math.max(0.08, open));
      ctx.fillStyle = '#e8c043';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#120c06';
      ctx.beginPath();
      ctx.arc(r * 0.1, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,235,0.95)';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Where the bite lands on screen (for the flash and the venom). */
export function biteAt(t: number): Pt {
  const cam = crackCamera(t);
  return toScreen(cam, { x: 0, y: 22 });
}
