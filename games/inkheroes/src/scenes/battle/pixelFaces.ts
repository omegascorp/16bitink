/** A face, cut 1:1 from the unit's idle frame (art pixels, never scaled). */
export const FACE = 32;
/** How far above the face a bigger cut starts, so the head stays near its top with the shoulders below. */
const HEADROOM = 6;

interface FaceArt {
  readonly w: number;
  readonly h: number;
  /** The centre of the face in the idle frame. */
  readonly face?: { readonly x: number; readonly y: number };
}

const within = (v: number, size: number, room: number): number => Math.max(0, Math.min(v, room - size));

/**
 * What to cut from an idle frame for a portrait `size` across: the FACE
 * square round the face point (the frame's upper middle if it has none), or
 * for a bigger slot more of the same art rather than the art enlarged, the
 * head near the top. It stays in the frame, so it never shows the next one.
 */
export function faceBox(art: FaceArt, size: number): { x: number; y: number; w: number; h: number } {
  const c = art.face ?? { x: Math.floor(art.w / 2), y: Math.floor(art.h / 3) };
  const w = Math.min(size, art.w);
  const h = Math.min(size, art.h);
  const y = size > FACE ? c.y - FACE / 2 - HEADROOM : c.y - FACE / 2;
  return { x: within(c.x - Math.floor(w / 2), w, art.w), y: within(y, h, art.h), w, h };
}
