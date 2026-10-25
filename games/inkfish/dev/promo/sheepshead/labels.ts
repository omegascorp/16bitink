import { fishPoint } from './fish';
import { cameraAt, capAt, fishAt, molarsLabel, type Pt, sheepsheadLabel, toScreen } from './story';

/**
 * Where every piece of text sits on screen (baseline centre, size), kept
 * here so it can be checked: inside the band the Shorts buttons leave clear,
 * y 270 .. 1240 (the credit sits at 1292).
 */

export interface TextSpot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** 0 hidden .. 1 shown. */
  readonly shown: number;
}

export const CAPTION_Y = 1180;
export const CAPTION_SIZE = 96;

/** "molars", to the right of the open mouth, over the cheek. */
export const molarsSpot = (t: number): TextSpot => ({ x: 912, y: 700, size: 84, shown: molarsLabel(t) });

/** "sheepshead", across the flank, kept inside the frame's width. */
export function sheepsheadSpot(t: number): TextSpot {
  const tag = toScreen(cameraAt(t), fishPoint(fishAt(t), { x: 820, y: -60 }));
  return { x: Math.min(820, Math.max(260, tag.x)), y: tag.y, size: 96, shown: sheepsheadLabel(t) };
}

/** Where the "CONVICT FISH" board hangs on the fish (body px), and its lettering on screen. */
export const PLACARD: Pt = { x: 560, y: 300 };
export function placardSpot(t: number): TextSpot {
  const v = cameraAt(t);
  const p = toScreen(v, fishPoint(fishAt(t), PLACARD));
  return { x: p.x, y: p.y, size: 74 * v.zoom * fishAt(t).scale, shown: capAt(t) };
}
