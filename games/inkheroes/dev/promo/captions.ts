import { VIDEO } from './short';

/**
 * Text over the shorts in the game's display face (Cinzel, the menus' and
 * cards' titles), light on a dark halo, kept inside the area Shorts, Reels and
 * TikTok leave clear (their buttons cover the top ~14% and the bottom ~35%):
 * between y ≈ 270 and 1250. Captions are phrases, a few words on screen
 * together with the word being said lit, never one word popping at a time.
 */
export const CAPTION_FONT = 'Cinzel';
export const CAPTION_WEIGHTS = [700, 900] as const;
/** The game's book face (EB Garamond), for labels that need lowercase: units like "m" and "ft" (Cinzel has only capitals). */
export const BOOK_FONT = '"EB Garamond"';

export interface TextInk {
  readonly fill: string;
  readonly halo: string;
}
/** Parchment on near-black: the game's card text. */
export const LIGHT: TextInk = { fill: '#fbf1d8', halo: '#120b05' };
/** The game's gilt, for the word being said and the call to action. */
export const GILT = '#f6c445';
export const RED = '#ff5a3c';

/** One centred line with a dark halo that keeps it readable over the pixel art. */
export function drawTextLine(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha = 1, ink: TextInk = LIGHT, weight: 700 | 900 = 900,
  family: string = CAPTION_FONT,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.strokeStyle = ink.halo;
  ctx.lineWidth = size * 0.2;
  ctx.globalAlpha = 0.92 * alpha;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ink.fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A word of the voiceover, with start and end in the take (divide by the tempo for the video). */
export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A caption line: its words, and when it is on screen (video seconds). */
export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

export interface Phrases {
  readonly lines: readonly Line[];
  /** The hook's lines stand together from frame 1 until the next line starts. */
  readonly hookLines: number;
  readonly hookTo: number;
  /** When the hook's lines come back up before the loop point, ready for frame 1. */
  readonly hookFrom: number;
  hookAlpha(u: number): number;
  /** The word being said, counted through the hook's lines (−1 none). */
  hookWord(u: number): number;
  /** The line on screen after the hook, and the word being said in it (−1 none yet). */
  captionAt(u: number): { readonly line: Line; readonly word: number } | null;
}

/**
 * The voiceover cut into lines of `lineWords` words each, each line on
 * screen from its first word until the next takes over. `u` is loop time.
 */
export function phrases(words: readonly Word[], tempo: number, lineWords: readonly number[], hookLines: number, loopS: number): Phrases {
  if (lineWords.reduce((s, n) => s + n, 0) !== words.length) throw new Error('caption lines must hold every word');
  const startOf = (i: number): number => words[i]!.start / tempo;
  const first = lineWords.map((_, i) => lineWords.slice(0, i).reduce((s, n) => s + n, 0));
  const hookFrom = loopS - 0.24;
  const lines = lineWords.map((n, i) => ({
    words: words.slice(first[i]!, first[i]! + n),
    from: i === 0 ? 0 : startOf(first[i]!),
    to: i + 1 < lineWords.length ? startOf(first[i + 1]!) : hookFrom,
  }));
  const hookTo = lines[hookLines]!.from;
  const ramp = (u: number, a: number, b: number): number => {
    const c = Math.max(0, Math.min(1, (u - a) / (b - a)));
    return c * c * (3 - 2 * c);
  };
  return {
    lines,
    hookLines,
    hookTo,
    hookFrom,
    hookAlpha: (u) => (u < hookTo ? 1 : ramp(u, hookFrom, loopS - 0.04)),
    hookWord: (u) => (u < hookTo ? words.slice(0, first[hookLines]!).reduce((now, _, i) => (u >= startOf(i) ? i : now), -1) : -1),
    captionAt: (u) => {
      const line = lines.slice(hookLines).find((l) => u >= l.from && u < l.to);
      if (!line) return null;
      return { line, word: line.words.reduce((now, w, i) => (u >= w.start / tempo ? i : now), -1) };
    },
  };
}

export interface PhraseStyle {
  readonly y: number;
  readonly size: number;
  /** How bright the words not yet said are (0..1). */
  readonly unsaid: number;
  readonly alpha?: number;
  readonly ink?: TextInk;
  readonly hot?: string;
}

const MAX_W = 980;

/** One caption line, word by word, shrunk to fit: said words full, the word being said lit, the rest dimmer. */
export function drawPhrase(ctx: CanvasRenderingContext2D, words: readonly string[], now: number, s: PhraseStyle): void {
  if (words.length === 0) return;
  const ink = s.ink ?? LIGHT;
  ctx.save();
  ctx.font = `900 ${s.size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const wordInk = i === now ? { fill: s.hot ?? GILT, halo: ink.halo } : ink;
    drawTextLine(ctx, w, x + (widths[i]! * k) / 2, s.y, s.size * k, (s.alpha ?? 1) * (i <= now ? 1 : s.unsaid), wordInk);
    x += (widths[i]! + space) * k;
  });
}

export interface CaptionLayout {
  readonly hook: { readonly y: number; readonly gap: number; readonly size: number };
  readonly line: { readonly y: number; readonly size: number };
}

/** The hook's lines in full from frame 1 (the word being said lit), then each line as it is said. */
export function drawCaptions(ctx: CanvasRenderingContext2D, p: Phrases, layout: CaptionLayout, u: number): void {
  const hook = p.hookAlpha(u);
  if (hook > 0) {
    let now = p.hookWord(u);
    p.lines.slice(0, p.hookLines).forEach((l, i) => {
      drawPhrase(ctx, l.words.map((w) => w.text), now, { y: layout.hook.y + i * layout.hook.gap, size: layout.hook.size, unsaid: 1, alpha: hook });
      now -= l.words.length;
    });
  }
  const c = p.captionAt(u);
  if (c) drawPhrase(ctx, c.line.words.map((w) => w.text), c.word, { y: layout.line.y, size: layout.line.size, unsaid: 0.6 });
}

/** A small label (a name, a size), in the display face, or the book face for units. */
export function drawLabel(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number, fill = '#fbf1d8', family: string = CAPTION_FONT,
): void {
  drawTextLine(ctx, text, x, y, size, alpha, { fill, halo: '#120b05' }, 700, family);
}
