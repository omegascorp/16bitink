import Phaser from 'phaser';
import { MAP_VIGNETTES } from '../../art/pixel/map';
import type { MapDef } from '../../level/types';
import type { MapRecord } from '../../logic/save';
import { drawFrame, drawRule, FILLS } from '../battle/pixelFrames';
import { INK, PixelButton, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import { MAP_TEX } from '../map/pixelMapArt';

/** The chapter card: the picture of the part in play (192 × 96) framed, its name and goal, a line per part with its laurels, then the buttons; UI pixels. */
const PIC = { w: 192, h: 96 } as const;
const PAD = 8;
export const CHAPTER_CARD_W = PIC.w + 4 + PAD * 2 + 24;
const PART_H = 24;
const BTN_H = 24;
const BTN_GAP = 6;
const GOAL_H = 45;

export interface ChapterCardSpec {
  readonly parts: readonly MapDef[];
  readonly records: Readonly<Record<string, MapRecord>>;
  /** The part in play, and how far into it (a game is saved). */
  readonly playing: { readonly def: MapDef; readonly when: string } | null;
  readonly onPlay: () => void;
  /** Only when there is a game to throw away. */
  readonly onStartOver?: () => void;
}

/** The card's height for `spec` (it has a second button when a game can be started over). */
export const chapterCardHeight = (spec: ChapterCardSpec): number =>
  PAD + PIC.h + 4 + 6 + 15 + 3 + GOAL_H + 6 + spec.parts.length * PART_H + 8 + BTN_H + (spec.onStartOver ? BTN_GAP + BTN_H : 0) + PAD;

/**
 * Chapter 1 as one story told in parts: the part in play (or the first) up
 * top, then each part with the laurels won on it, the parts still ahead dim.
 * Continue picks the game up; with no game saved, the chapter starts again
 * from its first part.
 */
export function chapterCard(scene: Phaser.Scene, owned: { destroy(): void }[], spec: ChapterCardSpec): Phaser.GameObjects.Container {
  const w = CHAPTER_CARD_W;
  const h = chapterCardHeight(spec);
  const parts: Phaser.GameObjects.GameObject[] = [];
  const keep = <T extends { destroy(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };
  parts.push(keep(new PixelImage(scene, drawFrame(w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 240], studs: true }))).img);
  const shown = spec.playing?.def ?? spec.parts[0]!;
  const picX = Math.floor((w - PIC.w - 4) / 2);
  parts.push(keep(new PixelImage(scene, drawFrame(PIC.w + 4, PIC.h + 4, { rim: 'gold', fill: FILLS.portrait })).setPosition(picX, PAD)).img);
  if (MAP_VIGNETTES[shown.id]) parts.push(scene.add.image(picX + 2, PAD + 2, MAP_TEX.vignette(shown.id)).setOrigin(0));
  const cx = Math.floor(w / 2);
  let y = PAD + PIC.h + 4 + 6;
  const title = keep(new TextLabel(scene, { kind: 'title', ink: INK.title, wrap: w - PAD * 2, anchor: { x: 0.5, y: 0 } }))
    .setText(`Part ${shown.n} of ${spec.parts.length}: ${shown.name}`).setPosition(cx, y);
  y += 15 + 3;
  const goal = `${shown.goal.text[0]!.toUpperCase()}${shown.goal.text.slice(1)}.${spec.playing ? `\n${spec.playing.when}` : ''}`;
  const body = keep(new TextLabel(scene, { ink: INK.text, wrap: w - PAD * 2 - 6, anchor: { x: 0.5, y: 0 } })).setText(goal).setPosition(cx, y);
  parts.push(title.img, body.img);
  y += GOAL_H + 2;
  parts.push(keep(new PixelImage(scene, drawRule(w - PAD * 4), { x: 0.5, y: 0 }).setPosition(cx, y)).img);
  y += 4;
  for (const def of spec.parts) {
    const rec = spec.records[def.id];
    const now = def.id === shown.id;
    // Ahead: not reached in this game, and never won.
    const ahead = !rec && !now && def.n > shown.n;
    const ink = now ? INK.title : ahead ? INK.dim : INK.text;
    const name = keep(new TextLabel(scene, { ink, align: 'left', anchor: { x: 0, y: 0.5 } })).setText(`${def.n}. ${def.name}`).setPosition(PAD + 6, y + PART_H / 2);
    parts.push(name.img);
    for (let i = 0; i < 3; i++) {
      const img = scene.add.image(w - PAD - 6 - (3 - i) * 22, y, UI_TEX.laurel).setOrigin(0);
      if (!rec || i >= rec.blots) img.setTint(0x3a2c20).setAlpha(ahead ? 0.4 : 0.75);
      parts.push(img);
    }
    y += PART_H;
  }
  y += 8;
  const bw = w - PAD * 4;
  const done = spec.parts.every((d) => spec.records[d.id]);
  const label = spec.playing ? 'Continue' : done ? 'Play the chapter again' : 'Start the chapter';
  const play = keep(new PixelButton(scene, { w: bw, h: BTN_H, label, rim: 'gold', onClick: spec.onPlay }));
  play.setPosition(PAD * 2, y);
  parts.push(play.root);
  if (spec.onStartOver) {
    const over = keep(new PixelButton(scene, { w: bw, h: BTN_H, label: 'Start the chapter over', onClick: spec.onStartOver }));
    over.setPosition(PAD * 2, y + BTN_H + BTN_GAP);
    parts.push(over.root);
  }
  return scene.add.container(0, 0, parts);
}
