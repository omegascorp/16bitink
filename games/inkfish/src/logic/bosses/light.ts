/**
 * How visible something dark is (0..1) `d` px from you in a light of radius
 * `light`: fully inside the light, fading at its edge, gone beyond. `share`
 * shrinks the reach for things that need to be well inside it to be seen.
 */
export function inLight(d: number, light: number, share = 1): number {
  const reach = light * share;
  const fade = reach * 0.35;
  return Math.max(0, Math.min(1, (reach - d) / fade));
}
