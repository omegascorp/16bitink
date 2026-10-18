import Phaser from 'phaser';
import { getSound } from '../../host';
import { viewSize } from '../hidpi';
import { knotLine } from './knots';
import { voiceLine } from './voice';
import { RES } from './paint';
import { plateCard } from './plate';
import { plaque } from './plaque';
import { aside, heading, INK_TEXT, prose, scrawl, SEPIA } from './type';

/** A picture on a story card: a texture, the height to show it at, and a scribbled caption under it. */
export interface CardPicture {
  readonly key: string;
  readonly h: number;
  readonly caption?: string;
}

export interface StoryCardSpec {
  readonly title: string;
  readonly subtitle?: string;
  /** Who's talking, drawn at the left of their words. */
  readonly portrait?: CardPicture;
  /** What they say, as the suit records it: a sound trace, a burst per word (how many, and the seed of its sound). */
  readonly voice?: { readonly words: number; readonly seed: number };
  /** What they've written, in knots: how many words, and the seed that ties them. */
  readonly knots?: { readonly words: number; readonly seed: number };
  /** Pictures in a row, with an arrow between each (drawn in the dust, or what the radio shows). */
  readonly pictures?: readonly CardPicture[];
  /** What the prospector makes of it. */
  readonly text: string;
  /**
   * The narrator's line for it: its recording is narration/<line>.mp3
   * (spec, "Narration"). An id, not the words, so the words can be
   * touched up without losing the voice. None, and it's never read aloud.
   */
  readonly line?: string;
  readonly button: string;
  /** A second, lesser button beside the main one: it closes the card and does its own thing instead of the main one's. */
  readonly secondary?: { readonly label: string; readonly press: () => void };
}

const W = 640;
const PAD = 44;

/** The narrator scene (NarratorScene), as a card needs it: reading the card aloud while it's open, and on after. */
interface Narrator {
  sayOver(spec: StoryCardSpec): () => void;
}

export interface StoryCardOpts {
  /** Read aloud by the narrator (default); off for a card the narrator opened itself. */
  readonly narrate?: boolean;
}

/**
 * A card over the page for a moment in the story (the call, meeting the
 * Lamplighters, lift-off): who's talking and their voice (or their knotted
 * writing), pictures
 * in a row, what the prospector makes of it, and one button. A sheet under
 * it takes every tap meant for the page. Space or Enter closes it too.
 */
export function storyCard(scene: Phaser.Scene, spec: StoryCardSpec, onClose: () => void, depth = 80, opts: StoryCardOpts = {}): Phaser.GameObjects.GameObject[] {
  const { width, height } = viewSize(scene);
  const parts: Phaser.GameObjects.GameObject[] = [heading(scene, 0, 30, spec.title, 28).setOrigin(0.5, 0)];
  let y = 70;
  if (spec.subtitle) {
    parts.push(aside(scene, 0, y, spec.subtitle, 18, W - PAD * 2, SEPIA).setOrigin(0.5, 0));
    y += 34;
  }
  const words = spec.voice ? voiceLine(scene, spec.voice.words, spec.voice.seed) : spec.knots ? knotLine(scene, spec.knots.words, spec.knots.seed) : null;
  if (spec.portrait || words) {
    const ph = spec.portrait?.h ?? 0;
    let kx = -W / 2 + PAD;
    if (spec.portrait) {
      const img = scene.add.image(kx, y + ph, spec.portrait.key).setOrigin(0, 1);
      img.setScale(ph / img.height);
      parts.push(img);
      kx += img.displayWidth + 18;
    }
    if (words) {
      const k = scene.add.image(kx, y + Math.max(ph, 40) / 2, words).setOrigin(0, 0.5);
      // Baked at RES: shown at its own size, or smaller to fit what's left of the row.
      k.setScale(Math.min(1, (W / 2 - PAD - kx) / (k.width / RES)) / RES);
      parts.push(k);
    }
    y += Math.max(ph, 40) + 16;
  }
  if (spec.pictures?.length) {
    const pics = spec.pictures;
    const rowH = Math.max(...pics.map((p) => p.h));
    const gap = 54;
    const imgs = pics.map((p) => {
      const img = scene.add.image(0, y + rowH / 2, p.key);
      img.setScale(p.h / img.height);
      return img;
    });
    const total = imgs.reduce((s, i) => s + i.displayWidth, 0) + gap * (imgs.length - 1);
    let x = -total / 2;
    imgs.forEach((img, i) => {
      img.setX(x + img.displayWidth / 2);
      parts.push(img);
      const cap = pics[i]!.caption;
      if (cap) parts.push(scrawl(scene, img.x, y + rowH + 2, cap, 24, INK_TEXT).setOrigin(0.5, 0));
      x += img.displayWidth;
      if (i < imgs.length - 1) parts.push(scrawl(scene, x + gap / 2, y + rowH / 2, '→', 34, INK_TEXT).setOrigin(0.5));
      x += gap;
    });
    y += rowH + (pics.some((p) => p.caption) ? 34 : 8) + 10;
  }
  const t = prose(scene, -W / 2 + PAD, y, spec.text, 19, W - PAD * 2);
  parts.push(t);
  y += t.height + 30;
  const h = y + 56;
  for (const part of parts) (part as unknown as { y: number }).y -= h / 2;
  let closed = false;
  // A key held from before the card (Space held to fly up to the outpost) repeats: only a fresh press closes it.
  const onKey = (e: KeyboardEvent): void => {
    if (!e.repeat) close();
  };
  const made: Phaser.GameObjects.GameObject[] = [];
  const close = (then: () => void = onClose): void => {
    if (closed) return;
    closed = true;
    scene.input.keyboard?.off('keydown-SPACE', onKey);
    scene.input.keyboard?.off('keydown-ENTER', onKey);
    for (const o of made) o.destroy();
    uncover();
    then();
  };
  const bw = (text: string): number => Math.max(200, text.length * 15 + 44);
  const second = spec.secondary;
  if (second) {
    const [w1, w2] = [bw(spec.button), bw(second.label)];
    const gap = 16;
    const left = -(w1 + w2 + gap) / 2;
    parts.push(plaque(scene, left + w2 / 2, h / 2 - 46, second.label, () => close(second.press), { width: w2, height: 46, kind: 'secondary', size: 15 }));
    parts.push(plaque(scene, left + w2 + gap + w1 / 2, h / 2 - 46, spec.button, () => close(), { width: w1, height: 46, kind: 'primary', size: 15 }));
  } else parts.push(plaque(scene, 0, h / 2 - 46, spec.button, () => close(), { width: Math.max(220, spec.button.length * 17 + 48), height: 46, kind: 'primary' }));
  // Taps meant for the page under the card go nowhere.
  const sheet = scene.add.rectangle(0, 0, width, height, 0x1f2a55, 0.18).setOrigin(0).setScrollFactor(0).setDepth(depth - 1).setInteractive();
  // Pinned with its children: Phaser hit-tests each child by its own scroll factor, so on a scrolled page the button's tap area would slide off it.
  const card = plateCard(scene, width / 2, height / 2, W, h, parts, 113).setScrollFactor(0, 0, true).setDepth(depth);
  made.push(sheet, card);
  scene.input.keyboard?.on('keydown-SPACE', onKey);
  scene.input.keyboard?.on('keydown-ENTER', onKey);
  // Read aloud while it's open, and on in the narrator's strip once it's closed.
  const voice = opts.narrate === false ? null : (scene.scene.get('Narrator') as unknown as Narrator | null);
  const uncover = voice?.sayOver(spec) ?? ((): void => undefined);
  // A soft swell as it opens, and the speaker's voice as its trace shows it.
  const sound = getSound(scene);
  sound?.play('swell');
  if (spec.voice) sound?.speak(spec.voice.words, spec.voice.seed);
  return made;
}
