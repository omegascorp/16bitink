import { rgba } from '../../../src/art/wash';
import { ramp, VIDEO } from '../short';
import { CUT_HOME, CUT_OTHER, CUT_SAD, IT_AT, PECK_AT, ROCK_AT, THERE_AT, WARBLER_AT, WESTERN_AT, wrap } from './story';
import { type Sky, VIEW, zagros } from './zagros';

/**
 * The mood of each sentence as light, not as a colour filter over the frame:
 * the ridges and sky take the mood's colour freely, while on the rock and the
 * animals it is a key light from one side and shade closing in round the
 * subject, so the stone stays stone.
 */

interface Palette {
  /** The colour washed over the far ridges and how much of it (they show the mood most). */
  readonly skyTop: string;
  readonly skyA: number;
  /** The key light, soft over the near rock. */
  readonly tint: string;
  readonly tintA: number;
  /** The colour shade falls to, and how far it closes in round the subject. */
  readonly shade: string;
  readonly vignette: number;
}

const P = (skyTop: string, skyA: number, tint: string, tintA: number, shade: string, vignette: number): Palette => ({ skyTop, skyA, tint, tintA, shade, vignette });

const PALS = {
  surprise: P('#ff9a50', 0.08, '#ffc27a', 0.2, '#6b5560', 0.2),
  calm: P('#ffb26e', 0.04, '#ffd08a', 0.16, '#7a6068', 0.12),
  tender: P('#f4a6b8', 0.26, '#ffc8c0', 0.22, '#7a5a6c', 0.22),
  nervous: P('#6d8aa8', 0.5, '#a8c4dc', 0.16, '#3c4c60', 0.46),
  tension: P('#a8884a', 0.46, '#e0b860', 0.14, '#3a2e22', 0.58),
  shock: P('#e8452a', 0.42, '#ff7a3c', 0.3, '#4a1a1c', 0.5),
  dramatic: P('#16304c', 0.78, '#7cb0d8', 0.2, '#101c30', 0.72),
  laugh: P('#68c8ec', 0.02, '#fff4c4', 0.08, '#6a7a78', 0.04),
  sarcastic: P('#7a5a8e', 0.46, '#e0a890', 0.2, '#4a3a58', 0.4),
} as const;

/** When each mood begins and how long its crossfade takes; frame 1's mood holds before the first and after the last. */
const MOOD_KEYS: readonly { readonly t: number; readonly ramp: number; readonly pal: Palette }[] = [
  { t: WESTERN_AT - 0.25, ramp: 0.5, pal: PALS.calm },
  { t: WARBLER_AT - 0.45, ramp: 0.6, pal: PALS.tender },
  { t: THERE_AT - 0.3, ramp: 0.3, pal: PALS.nervous },
  { t: IT_AT - 0.2, ramp: 0.5, pal: PALS.tension },
  { t: PECK_AT - 0.02, ramp: 0.12, pal: PALS.shock },
  { t: ROCK_AT + 0.25, ramp: 0.3, pal: PALS.dramatic },
  { t: CUT_OTHER, ramp: 0.03, pal: PALS.laugh },
  { t: CUT_SAD, ramp: 0.03, pal: PALS.sarcastic },
  { t: CUT_HOME, ramp: 0.02, pal: PALS.surprise },
];

const mixHex = (a: string, b: string, w: number): string => {
  const ch = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16);
  const c = [1, 3, 5].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * w).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
};

const mixPal = (a: Palette, b: Palette, w: number): Palette => ({
  skyTop: mixHex(a.skyTop, b.skyTop, w), skyA: a.skyA + (b.skyA - a.skyA) * w, tint: mixHex(a.tint, b.tint, w), tintA: a.tintA + (b.tintA - a.tintA) * w,
  shade: mixHex(a.shade, b.shade, w), vignette: a.vignette + (b.vignette - a.vignette) * w,
});

export function paletteAt(t: number): Palette {
  const u = wrap(t);
  let prev: Palette = PALS.surprise;
  for (const key of MOOD_KEYS) {
    if (u < key.t) return prev;
    const w = ramp(u, key.t, key.t + key.ramp);
    if (w < 1) return mixPal(prev, key.pal, w);
    prev = key.pal;
  }
  return prev;
}

/**
 * The sky and the ridges, in screen space: from the rock they stand small,
 * high and out of focus behind its lip; `up` (0..1) tilts the camera up to
 * them, sharp and filling the frame.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, t: number, sky: Sky, up: number): void {
  const pal = paletteAt(t);
  const art = zagros(sky);
  const k = 0.62 + (1.02 - 0.62) * up;
  const y = 460 + (1130 - 460) * up - 1500 * k;
  const w = VIEW.w * k;
  const x = 540 - w * 0.5;
  ctx.drawImage(art.soft, x, y, w, VIEW.h * k);
  if (up > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, up);
    ctx.drawImage(art.sharp, x, y, w, VIEW.h * k);
    ctx.restore();
  }
  if (pal.skyA > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = pal.skyA * 0.75;
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = pal.skyA * 0.6;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  }
}

/** The moods' light over the near picture, centred on what matters in the shot (and a slow throb while the bird is unsure). */
export function drawGrade(ctx: CanvasRenderingContext2D, t: number, focus: { readonly x: number; readonly y: number }): void {
  const pal = paletteAt(t);
  const u = wrap(t);
  ctx.save();
  // Shade closing in: multiply, clear on the subject.
  const nervous = ramp(u, THERE_AT, THERE_AT + 0.5) * (1 - ramp(u, PECK_AT - 0.1, PECK_AT));
  const throb = nervous * 0.08 * Math.max(0, Math.sin((2 * Math.PI * u) / 0.85)) ** 2;
  const edge = Math.min(0.92, pal.vignette + throb);
  const shade = ctx.createRadialGradient(focus.x, focus.y, 260, focus.x, focus.y, 1180);
  shade.addColorStop(0, rgba(pal.shade, 0));
  shade.addColorStop(0.5, rgba(pal.shade, edge * 0.62));
  shade.addColorStop(1, rgba(pal.shade, edge));
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The key light from the upper left.
  const key = ctx.createLinearGradient(0, 200, 1000, 1500);
  key.addColorStop(0, rgba(pal.tint, pal.tintA * 1.6));
  key.addColorStop(0.7, rgba(pal.tint, pal.tintA * 0.25));
  key.addColorStop(1, rgba(pal.tint, 0));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}
