/**
 * The native view: the game draws at a small native size and the canvas is
 * blown up by a whole number of device pixels, so every art pixel is the
 * same square. About 480 x 270 on a desktop (4x on 1920 x 1080); on a
 * phone in landscape a closer view (about 180 native px high) so a tank
 * still reads under a thumb.
 */
export interface View {
  nativeW: number;
  nativeH: number;
  /** Device pixels per native pixel. */
  scale: number;
  dpr: number;
}

const DESKTOP_HEIGHT = 270;
const PHONE_HEIGHT = 180;

export function viewFor(cssW: number, cssH: number, dpr: number): View {
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  const target = Math.min(cssW, cssH) < 500 ? PHONE_HEIGHT : DESKTOP_HEIGHT;
  const scale = Math.max(1, Math.round(devH / target));
  return { nativeW: Math.ceil(devW / scale), nativeH: Math.ceil(devH / scale), scale, dpr };
}
