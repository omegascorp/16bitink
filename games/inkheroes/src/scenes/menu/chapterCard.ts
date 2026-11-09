import Phaser from 'phaser';
import { MAP_VIGNETTES } from '../../art/pixel/map';
import type { PartName } from '../../level/maps';
import type { MapRecord } from '../../logic/save';
import { cardButtonLook, drawFrame, drawRule, FILLS } from '../battle/pixelFrames';
import { INK, PixelButton, PixelImage, TextLabel } from '../battle/pixelUi';
import { MAP_TEX } from '../map/pixelMapArt';
import { partStates, type PartState } from './chapterProgress';

/** The chapter card: the picture of the part in play (192 × 96) framed, its name and goal, a line per part with where it stands, then the buttons; UI pixels. */
const PIC = { w: 192, h: 96 } as const;
const PAD = 8;
const CARD_W = PIC.w + 4 + PAD * 2 + 24;
/** On a short screen the list and the buttons stand in a column of their own, this wide, right of the picture. */
const SIDE_W = 208;
const PART_H = 20;
/** The way into the game stands taller than the way to start over. */
const PLAY_H = 40;
const OVER_H = 32;
const BTN_GAP = 6;
const GOAL_H = 45;
/** What a line says of where its part stands, and in what ink. */
const STANDING: Readonly<Record<PartState, { readonly says: string; readonly ink: typeof INK.title | typeof INK.good | typeof INK.dim }>> = {
  won: { says: 'Won', ink: INK.good },
  now: { says: 'In play', ink: INK.title },
  ahead: { says: '', ink: INK.dim },
};

/** A part on the card: its name, and its goal once its map is loaded. */
export type CardPart = PartName & { readonly goal?: { readonly text: string } };

/** Parts with no picture of their own yet, and the picture each borrows, tinted (every part drawn so far has its own). */
const VIGNETTE_STAND_IN: Readonly<Record<string, { readonly id: string; readonly tint: number }>> = {};

export interface ChapterCardSpec {
  readonly parts: readonly CardPart[];
  /** The chapter's last part, built or not, for "Part 5 of 7" (none: its last built). */
  readonly last?: number;
  readonly records: Readonly<Record<string, MapRecord>>;
  /** The part in play, and how far into it (a game is saved). */
  readonly playing: { readonly def: CardPart; readonly when: string } | null;
  readonly onPlay: () => void;
  /** A chapter this player can't play now (the full game's): what it is, and the one way on (buy, or try the fetch again). */
  readonly locked?: { readonly pitch: string; readonly label: string };
  /** Only when there is a game to throw away. */
  readonly onStartOver?: () => void;
  /** Spread over two columns, for a screen too short for one. */
  readonly wide?: boolean;
}

/** The top of the card to the end of the goal. */
const STORY_H = PAD + PIC.h + 4 + 6 + 15 + 3 + GOAL_H;
/** The list of parts to the end of the buttons. */
const ACTIONS_H = (spec: ChapterCardSpec): number => spec.parts.length * PART_H + 8 + PLAY_H + (spec.onStartOver ? BTN_GAP + OVER_H : 0) + PAD;

export const chapterCardWidth = (spec: ChapterCardSpec): number => (spec.wide ? CARD_W + SIDE_W : CARD_W);

/** The card's height for `spec` (it has a second button when a game can be started over). */
export const chapterCardHeight = (spec: ChapterCardSpec): number =>
  (spec.wide ? Math.max(STORY_H + PAD, PAD + ACTIONS_H(spec)) : STORY_H + 6 + ACTIONS_H(spec));

/**
 * A chapter as one story told in parts: the part in play (or the first) up
 * top, then each part as it stands in this game, the parts still ahead dim.
 * Continue picks the game up; with no game saved, the chapter starts again
 * from its first part. A chapter the player can't play yet shows what it
 * is and its one way on instead.
 */
export function chapterCard(scene: Phaser.Scene, owned: { destroy(): void }[], spec: ChapterCardSpec): Phaser.GameObjects.Container {
  const w = chapterCardWidth(spec);
  const h = chapterCardHeight(spec);
  const parts: Phaser.GameObjects.GameObject[] = [];
  const keep = <T extends { destroy(): void }>(o: T): T => {
    owned.push(o);
    return o;
  };
  parts.push(keep(new PixelImage(scene, drawFrame(w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 240], studs: true }))).img);
  const shown = spec.playing?.def ?? spec.parts[0]!;
  const picX = Math.floor((CARD_W - PIC.w - 4) / 2);
  parts.push(keep(new PixelImage(scene, drawFrame(PIC.w + 4, PIC.h + 4, { rim: 'gold', fill: FILLS.portrait })).setPosition(picX, PAD)).img);
  const borrowed = MAP_VIGNETTES[shown.id] ? null : VIGNETTE_STAND_IN[shown.id];
  if (MAP_VIGNETTES[shown.id]) parts.push(scene.add.image(picX + 2, PAD + 2, MAP_TEX.vignette(shown.id)).setOrigin(0));
  else if (borrowed && MAP_VIGNETTES[borrowed.id]) parts.push(scene.add.image(picX + 2, PAD + 2, MAP_TEX.vignette(borrowed.id)).setOrigin(0).setTint(borrowed.tint));
  const cx = Math.floor(CARD_W / 2);
  let y = PAD + PIC.h + 4 + 6;
  const title = keep(new TextLabel(scene, { kind: 'title', ink: INK.title, wrap: CARD_W - PAD * 2, anchor: { x: 0.5, y: 0 } }))
    .setText(`Part ${shown.n} of ${spec.last ?? spec.parts[spec.parts.length - 1]!.n}: ${shown.name}`).setPosition(cx, y);
  y += 15 + 3;
  const goalText = shown.goal?.text;
  const goal = spec.locked ? spec.locked.pitch : goalText ? `${goalText[0]!.toUpperCase()}${goalText.slice(1)}.${spec.playing ? `\n${spec.playing.when}` : ''}` : '';
  const body = keep(new TextLabel(scene, { ink: INK.text, wrap: CARD_W - PAD * 2 - 6, anchor: { x: 0.5, y: 0 } })).setText(goal).setPosition(cx, y);
  parts.push(title.img, body.img);
  y += GOAL_H + 2;
  if (spec.wide) {
    y = PAD;
  } else {
    parts.push(keep(new PixelImage(scene, drawRule(w - PAD * 4), { x: 0.5, y: 0 }).setPosition(cx, y)).img);
    y += 4;
  }
  // The list and the buttons: under the story, or in their own column beside it.
  const left = spec.wide ? CARD_W - PAD : 0;
  const room = w - left;
  const states: PartState[] = spec.locked ? spec.parts.map(() => 'ahead') : partStates(spec.parts, spec.playing?.def.id ?? null, spec.records);
  spec.parts.forEach((def, i) => {
    const state = states[i]!;
    const { says, ink } = STANDING[state];
    const name = keep(new TextLabel(scene, { ink: state === 'won' ? INK.text : ink, align: 'left', anchor: { x: 0, y: 0.5 } })).setText(`${def.n}. ${def.name}`).setPosition(left + PAD + 6, y + PART_H / 2);
    const standing = keep(new TextLabel(scene, { ink, align: 'right', anchor: { x: 1, y: 0.5 } })).setText(says).setPosition(w - PAD - 6, y + PART_H / 2);
    parts.push(name.img, standing.img);
    y += PART_H;
  });
  y += 8;
  const bw = room - PAD * 4;
  const label = spec.locked ? spec.locked.label : spec.playing ? 'Continue' : states.every((s) => s === 'won') ? 'Play the chapter again' : 'Start the chapter';
  const play = keep(new PixelButton(scene, { w: bw, h: PLAY_H, label, ...cardButtonLook('primary', 0), onClick: spec.onPlay }));
  play.setPosition(left + PAD * 2, y);
  parts.push(play.root);
  if (spec.onStartOver) {
    const over = keep(new PixelButton(scene, { w: bw, h: OVER_H, label: 'Start the chapter over', ...cardButtonLook('plain', 1), onClick: spec.onStartOver }));
    over.setPosition(left + PAD * 2, y + PLAY_H + BTN_GAP);
    parts.push(over.root);
  }
  return scene.add.container(0, 0, parts);
}
