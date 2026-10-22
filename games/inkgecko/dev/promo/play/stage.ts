import { GECKO_MOUTH, GECKO_TAIL } from '../../../src/art/geckoArt';
import { BLUE, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { BOARD } from '../../../src/level/types';
import { CHARM_FADES_AFTER, CHARM_NAMES } from '../../../src/logic/charms';
import { D } from '../../../src/logic/line';
import { pointAt, type Path, type Pt } from '../../../src/logic/path';
import { HAND_FONT, SAFE } from '../captions';
import { VIDEO } from '../short';
import { boilAt, drawSprite, type Kit, type Sprite } from '../sprites';
import { eventsBefore, frameAt, type Recording, type Snap } from './director';

/**
 * Draws a recorded board the way the game's views do (scenes/game/*View.ts):
 * the painted ground, splashes under the line, the burrow and the well
 * (blushing as the line nears it), the marbles rolling and shrinking into
 * the holes, charm marks, shots spinning, the Hedgehog, the gecko with its
 * skin washed in the loaded marble's colour, and the words that float up
 * off pops. The board is turned a quarter, as the game turns it on a phone
 * held upright (GameScene.fit), and seen through a camera that can move.
 */

/** Where on the video the camera's centre lands: a little above the middle, clear of the bottom buttons. */
export const FOCUS = { x: VIDEO.width / 2, y: 760 } as const;

/** The camera: the board point at FOCUS, and screen px per board px. */
export interface View {
  readonly cx: number;
  readonly cy: number;
  readonly z: number;
}

/** Where a board point lands on the video (the board turned a quarter clockwise). */
export function toScreen(p: Pt, v: View): Pt {
  return { x: FOCUS.x - v.z * (p.y - v.cy), y: FOCUS.y + v.z * (p.x - v.cx) };
}

/** Sets ctx to draw in board px through the view. */
export function applyView(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.setTransform(0, v.z, -v.z, 0, FOCUS.x + v.z * v.cy, FOCUS.y - v.z * v.cx);
}

/** Time-based wobbles (a mark's pulse, a shot's spin) that turn a whole number of times a loop, so the seam can't show. */
export const loopRate = (loopS: number, period: number): number => (2 * Math.PI * Math.max(1, Math.round(loopS / period))) / loopS;

/** The well starts to blush once the line's front is this far along (fxView.ts BLUSH_FROM), up to this red. */
const BLUSH_FROM = 0.7;
const BLUSH = '#f07a6e';
/** How long a splash and a floating word last, s (fxView.ts). */
const SPLASH_S = 1.4;
const WORD_S = 1.25;
/** Words are sized in board px (fxView.say) and drawn this much bigger on the video, as the game lifts them on a phone. */
const WORD_LIFT = 1.6;
/** Room kept between a word and the frame's edge, video px. */
const WORD_MARGIN = 24;

/** A layer to tint a sprite on (Phaser's tint multiplies the texture's colour). */
let tintLayer: HTMLCanvasElement | null = null;

/** The sprite multiplied by `colour`, its transparency kept. */
function tinted(s: Sprite, colour: string, amount = 1): Sprite {
  tintLayer ??= document.createElement('canvas');
  const c = tintLayer;
  if (c.width !== s.canvas.width || c.height !== s.canvas.height) {
    c.width = s.canvas.width;
    c.height = s.canvas.height;
  }
  const g = c.getContext('2d')!;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(s.canvas, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = amount;
  g.fillStyle = colour;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(s.canvas, 0, 0);
  return { ...s, canvas: c };
}

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
/** A steady angle from a position, for splashes (the game picks one at random). */
const spinOf = (x: number, y: number): number => ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * Math.PI * 2;

export interface StageOptions {
  /** Words not to float up (the game's "streak N!" counts on past the loop). */
  readonly quiet?: readonly ('streak' | 'gap' | 'points')[];
  /** Moves a charm's name off the line on screen (video px), so it doesn't hide what the charm does. */
  readonly charmWordShift?: Pt;
}

export class Stage {
  private readonly blushRate: number;
  private readonly markRate: number;
  private readonly spinRate: number;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly kit: Kit,
    private readonly ground: HTMLCanvasElement,
    readonly rec: Recording,
    private readonly opts: StageOptions = {},
  ) {
    const L = rec.loopS;
    // The game's well pulses every 2π × 120 ms at full alarm; the mark every 2π × 160 ms; a shot spins a turn every 2π × 60 ms.
    this.blushRate = loopRate(L, 2 * Math.PI * 0.12);
    this.markRate = loopRate(L, 2 * Math.PI * 0.16);
    this.spinRate = loopRate(L, 2 * Math.PI * 0.06);
  }

  draw(t: number, view: View): void {
    const { ctx } = this;
    const snap = frameAt(this.rec, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    applyView(ctx, view);
    ctx.drawImage(this.ground, 0, 0, BOARD.w, BOARD.h);
    this.drawSplashes(t);
    this.drawHoles(t, snap);
    this.drawMarbles(t, snap);
    this.drawShots(t, snap);
    this.drawHedgehog(t, snap);
    this.drawGecko(t, snap);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawWords(t, view);
  }

  private path(i: number): Path {
    return this.rec.paths[i]!;
  }

  /** Paint splats where marbles popped (fxView.splash): out to full size in 0.18 s, fading from 0.5 s. */
  private drawSplashes(t: number): void {
    for (const { age, e } of eventsBefore(this.rec, t, SPLASH_S)) {
      if (e.type !== 'pop') continue;
      const grow = 1 - (1 - clamp01(age / 0.18)) ** 2;
      const scale = 0.25 + 0.6 * grow;
      const alpha = 0.95 * (1 - clamp01((age - 0.5) / 0.9));
      for (const m of e.marbles) drawSprite(this.ctx, this.kit.splash[m.colour], m.x, m.y, scale, spinOf(m.x, m.y), alpha);
    }
  }

  /** The burrow at each track's start and the well at its end, the well blushing and pulsing as the line nears it. */
  private drawHoles(t: number, snap: Snap): void {
    const f = boilAt(t);
    this.rec.paths.forEach((path, i) => {
      const a = pointAt(path, 0);
      drawSprite(this.ctx, this.kit.burrow[f]!, a.x, a.y);
      const b = pointAt(path, path.length);
      const blush = clamp01(((snap.danger[i] ?? 0) - BLUSH_FROM) / (1 - BLUSH_FROM));
      const pulse = blush > 0 ? 0.5 + 0.5 * Math.sin(t * this.blushRate) : 0;
      const well = this.kit.well[f]!;
      drawSprite(this.ctx, blush > 0 ? tinted(well, BLUSH, blush * (0.45 + 0.55 * pulse)) : well, b.x, b.y);
    });
  }

  /** The lines (marblesView.sync): each marble where it is drawn, turning as it rolls, smaller coming out of the burrow and going into the well. */
  private drawMarbles(t: number, snap: Snap): void {
    snap.lines.forEach((line, li) => {
      const path = this.path(li);
      const L = path.length;
      for (const m of line) {
        const at = Math.max(0, Math.min(L, m.shown));
        const p = pointAt(path, at);
        const out = clamp01((m.shown + D * 0.6) / D);
        const into = clamp01((L - m.shown) / D + 0.35);
        const size = Math.min(out, into);
        if (size <= 0.05) continue;
        drawSprite(this.ctx, this.kit.marble[m.colour][boilAt(t, m.look)]!, p.x, p.y, size, m.shown / (D * 0.9), Math.min(1, size * 1.5));
        if (!m.charm || size <= 0.3) continue;
        const fading = m.charmAge > CHARM_FADES_AFTER - 3;
        const blink = fading && Math.floor(t / 0.12) % 2 === 0 ? 0.25 : 1;
        drawSprite(this.ctx, this.kit.mark(m.charm), p.x, p.y, size * (1 + Math.sin(t * this.markRate) * 0.08), 0, blink);
      }
    });
  }

  /** Shots in flight, spinning. */
  private drawShots(t: number, snap: Snap): void {
    for (const s of snap.shots) drawSprite(this.ctx, this.kit.marble[s.colour][boilAt(t)]!, s.x, s.y, 1, t * this.spinRate);
  }

  /** The Hedgehog trundling up its line, nose towards the burrow, feet stepping; it pops out of sight when it has eaten its fill. */
  private drawHedgehog(t: number, snap: Snap): void {
    let h = snap.hedgehog;
    let alpha = 1;
    if (!h) {
      const gone = eventsBefore(this.rec, t, 0.22).find((x) => x.e.type === 'hedgehogGone');
      if (!gone) return;
      h = frameAt(this.rec, t - gone.age - 1 / 30).hedgehog;
      alpha = 1 - gone.age / 0.22;
      if (!h) return;
    }
    const path = this.path(h.line);
    const s = Math.max(0, Math.min(path.length, h.s));
    const p = pointAt(path, s);
    const back = pointAt(path, Math.min(path.length, s + 8));
    const step = Math.floor(t / 0.13) % 2;
    drawSprite(this.ctx, this.kit.hedgehog[step]![boilAt(t)]!, p.x, p.y, 1 + (1 - alpha) * 0.3, Math.atan2(p.y - back.y, p.x - back.x), alpha);
  }

  /** The gecko (geckoView.ts): tinted skin, the next marble in its tail, its pen lines, the loaded marble at its snout. */
  private drawGecko(t: number, snap: Snap): void {
    const { ctx, kit } = this;
    const g = snap.gecko;
    const pose = snap.spitting ? 'spit' : 'idle';
    const f = boilAt(t);
    const b = 1 + Math.sin(snap.bounce * Math.PI) * 0.25;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle + Math.PI / 2);
    drawSprite(ctx, tinted(kit.geckoSkin[pose][f]!, snap.tint), 0, 0);
    drawSprite(ctx, kit.marble[snap.next][f]!, GECKO_TAIL.x, GECKO_TAIL.y, 0.62 * b);
    drawSprite(ctx, kit.geckoLines[pose][f]!, 0, 0);
    if (!snap.spitting) drawSprite(ctx, kit.marble[snap.loaded][f]!, GECKO_MOUTH.x, GECKO_MOUTH.y, b);
    ctx.restore();
  }

  /** Words floating up off the board (fxView.say): they hold, then rise and fade. */
  private drawWords(t: number, view: View): void {
    const quiet = new Set(this.opts.quiet ?? []);
    const say = (age: number, at: Pt, lift: number, text: string, size: number, colour = BLUE, shift: Pt = { x: 0, y: 0 }): void => {
      const p = toScreen(at, view);
      const u = clamp01((age - 0.35) / 0.9);
      const px = size * view.z * WORD_LIFT;
      this.ctx.font = `700 ${px}px ${HAND_FONT}`;
      // Kept whole inside the frame and the band the Shorts buttons leave clear.
      const half = this.ctx.measureText(text).width / 2 + px * 0.2 + WORD_MARGIN;
      const x = Math.max(half, Math.min(VIDEO.width - half, p.x + shift.x));
      const y = Math.max(SAFE.top + px * 0.6, Math.min(SAFE.bottom - px * 0.6, p.y + shift.y - lift * view.z - 30 * view.z * u));
      this.ctx.save();
      this.ctx.globalAlpha = 1 - u;
      this.ctx.font = `700 ${px}px ${HAND_FONT}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = px * 0.2;
      this.ctx.strokeStyle = PAPER_FILL;
      this.ctx.strokeText(text, x, y);
      this.ctx.fillStyle = colour;
      this.ctx.fillText(text, x, y);
      this.ctx.restore();
    };
    for (const { age, e } of eventsBefore(this.rec, t, WORD_S)) {
      if (e.type === 'pop') {
        if (!quiet.has('points')) say(age, e, 8, `+${e.points}`, 15);
        if (e.combo > 0) say(age, e, 30, `combo ×${e.combo + 1}!`, 20 + Math.min(e.combo, 4) * 3);
      } else if (e.type === 'streak' && !quiet.has('streak')) say(age, e, -22, `streak ${e.streak}!`, 16);
      else if (e.type === 'gap' && !quiet.has('gap')) say(age, e, -40, e.gaps > 1 ? `${e.gaps}-gap shot!` : 'gap shot!', 17);
      else if (e.type === 'charm') {
        const shift = this.opts.charmWordShift ?? { x: 0, y: 0 };
        say(age, e, 50, `${CHARM_NAMES[e.charm]}!`, 22, BLUE, shift);
      }
    }
  }
}
