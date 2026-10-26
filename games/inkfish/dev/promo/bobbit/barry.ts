import { clamp01, lerp } from '../short';
import { TEXT } from './script';
import { cycles, HID_AT, peekAt, type Pt, tankZoomAt, waveAt, type Worm, wrap } from './story';

/**
 * Barry in the aquarium, as numbers (tank.ts draws him): the crack in the
 * rock he lives in, the room's camera rushing in on it, where he is (hiding
 * with his antennae out, or peeking up), and where his name tag sits.
 */

/** The crack in the rock Barry lives in (room px), and his size. */
export const NOTCH: Pt = { x: 700, y: 905 };
export const BARRY_SIZE = 0.5;

export interface RoomCamera {
  readonly focus: Pt;
  readonly at: Pt;
  readonly zoom: number;
}

/** The room's camera: pulled back on the tank, then rushing in on the crack in the rock. */
export function tankCamAt(t: number): RoomCamera {
  const zoom = tankZoomAt(t);
  const q = clamp01((zoom - 1) / 1.5);
  return { focus: { x: lerp(540, NOTCH.x, q), y: lerp(960, NOTCH.y - 60, q) }, at: { x: 540, y: lerp(960, 800, q) }, zoom };
}
export const roomToScreen = (cam: RoomCamera, p: Pt): Pt => ({ x: cam.at.x + (p.x - cam.focus.x) * cam.zoom, y: cam.at.y + (p.y - cam.focus.y) * cam.zoom });

/** Barry: out of sight, then (from "hid") below the lip of the crack with his long antennae out, then peeking up. */
export function barryAt(t: number): Worm {
  const peek = peekAt(t);
  const hidden = wrap(t) >= HID_AT - 0.1 ? 1 : 0;
  return {
    head: { x: NOTCH.x + 4 * Math.sin(cycles(3, t)), y: NOTCH.y + (230 * hidden + 420 * (1 - hidden)) * (1 - peek) - 150 * peek },
    axis: -0.08 + 0.1 * Math.sin(cycles(2, t)) * peek,
    jaw: 0.08 + waveAt(t),
    twitch: 0.9,
    reach: 1 + 1.8 * (1 - peek),
  };
}

/** Where the name tag's "BARRY" sits on screen (baseline centre and size). */
export function tagPlacement(t: number): { readonly x: number; readonly y: number; readonly size: number } {
  const cam = tankCamAt(t);
  const b = barryAt(t);
  const at = roomToScreen(cam, { x: b.head.x + 4, y: b.head.y + 62 });
  return { x: at.x, y: at.y, size: (TEXT.tag.size / 2.5) * cam.zoom };
}
