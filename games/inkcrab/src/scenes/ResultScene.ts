import Phaser from 'phaser';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_SPAN } from '../art/critterArt';
import { BOIL, INK, RED, RED_HEX } from '../art/palette';
import { TEX } from '../art/textures';
import { levelGoal } from '../level/build';
import { LEVEL_ORDER, levelById, LEVELS, nextLevel, themeOf } from '../level/levels';
import type { LevelDef } from '../level/types';
import { blotReasons, catchTip, isNewBest } from '../logic/resultCard';
import { shellPx, SHELLS, type ShellKind } from '../logic/shells';
import type { HunterId } from '../logic/sim';
import { SPECIES, type SpeciesId } from '../logic/species';
import { KESTREL_SPAN } from '../art/birds/kestrel';
import type { BackdropView } from './game/backdropView';
import { drawGrowthBar } from './growthBar';
import { crabInShell, POP_DELAY } from './heroCrab';
import { noteCard } from './noteCard';
import { loseParts, winParts, type CardButtons } from './result/cards';
import { Confetti } from './beachEnd/confetti';
import { beachStage, fitStage, headline, isTall, type Headline } from './stage';
import { clock, HAND_FONT, wobblyRect } from './ui';

export interface ResultData {
  readonly levelId: string;
  readonly won: boolean;
  readonly time: number;
  readonly blots: number;
  readonly livesLost: number;
  /** The crab's size and shell when the level ended. */
  readonly size: number;
  readonly shell: ShellKind | null;
  /** Fastest finish before this one, if the level had been finished. */
  readonly previousBest?: number;
  /** What caught the crab last, when it was caught. */
  readonly caughtBy?: HunterId | null;
}

interface Layout {
  readonly w: number;
  readonly h: number;
  readonly title: Headline;
  readonly ground: number;
  /** Where the crab's shell stands, and where the stats sit under it. */
  readonly hero: number;
  readonly stats: number;
  readonly card: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

const WIDE: Layout = {
  w: 1280, h: 720,
  title: { x: 360, y: 118, size: 76, maxW: 660 },
  ground: 380, hero: 330, stats: 520,
  card: { x: 1000, y: 368, w: 470, h: 540 },
};

const TALL: Layout = {
  w: 720, h: 1280,
  title: { x: 360, y: 96, size: 72, maxW: 660 },
  ground: 470, hero: 330, stats: 600,
  card: { x: 360, y: 950, w: 620, h: 540 },
};

const SOFT_INK = '#4a463e';
const LOSS_MARK = 0xf2b8b0;
/** How many shell-widths across the crab is drawn, within these bounds (layout px). */
const HERO_ZOOM = 5;
const HERO_W: readonly [number, number] = [110, 190];
const LOSSES = 'losses';

/**
 * After a level: the crab on the beach, hopping in its shell after a win or
 * hiding from a red-inked hunter after a loss, and a note with the blots
 * and why, the time, and what comes next (or a tip and a try again).
 */
export class ResultScene extends Phaser.Scene {
  private backdrop!: BackdropView;
  private confetti!: Confetti;
  private leaving = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.leaving = false;
    const def = levelById(data.levelId) ?? LEVELS[0]!;
    const L = isTall(this) ? TALL : WIDE;
    fitStage(this, L);
    this.backdrop = beachStage(this, L, themeOf(def.id), L.ground);
    this.confetti = new Confetti(this, 25);

    const number = LEVEL_ORDER.indexOf(def.id) + 1;
    headline(this, L.title, data.won ? 'Grown up!' : 'Caught!', data.won ? undefined : RED, data.won ? undefined : LOSS_MARK);
    this.add.text(L.title.x, L.title.y + L.title.size * 0.8, `Level ${number} · ${def.name}`, { fontFamily: HAND_FONT, fontSize: '30px', color: SOFT_INK }).setOrigin(0.5).setDepth(20);

    const kind = data.shell ?? 'periwinkle';
    const width = Phaser.Math.Clamp(shellPx(SHELLS[kind].maxSize) * HERO_ZOOM, HERO_W[0], HERO_W[1]);
    crabInShell(this, kind, L.hero, L.ground + 22, width, 10, data.won ? 'happy' : 'hiding');
    if (data.won) {
      this.time.delayedCall(POP_DELAY + 500, () => this.confetti.burst(L.hero, L.ground - width * 0.4, 36, 600));
      this.timeRow(L, data, def);
    } else {
      this.hunter(data.caughtBy ?? biggestHunter(def), L.hero + width * 1.15, L.ground + 22, width);
      this.reached(L, data.size, levelGoal(def));
    }
    noteCard(this, L.card.x, L.card.y, L.card.w, L.card.h, this.cardParts(L, data, def)).setDepth(30);
  }

  update(time: number, delta: number): void {
    this.backdrop.update(time);
    this.confetti.update(Math.min(delta / 1000, 0.05));
  }

  private go(key: string, payload?: object): () => void {
    return () => {
      if (this.leaving) return;
      this.leaving = true;
      this.scene.start(key, payload);
    };
  }

  private cardParts(L: Layout, data: ResultData, def: LevelDef): Phaser.GameObjects.GameObject[] {
    const { w, h } = L.card;
    const retry = this.go('Game', { levelId: def.id });
    const chart = this.go('Menu');
    if (!data.won) {
      const losses = ((this.registry.get(LOSSES) as number | undefined) ?? -1) + 1;
      this.registry.set(LOSSES, losses);
      return loseParts(this, w, h, catchTip(data.caughtBy, losses), def, levelGoal(def), this.withEnter({ primary: { label: 'Try again', go: retry }, secondary: [{ label: '← chart', go: chart }] }));
    }
    const next = nextLevel(def.id);
    const buttons: CardButtons = next
      ? { primary: { label: 'Next level →', go: this.go('Game', { levelId: next.id }) }, secondary: [{ label: 'replay', go: retry }, { label: '← chart', go: chart }] }
      : { primary: { label: '← back to the chart', go: chart }, secondary: [{ label: 'replay', go: retry }] };
    const preview = next ? { number: LEVEL_ORDER.indexOf(next.id) + 1, def: next, goal: levelGoal(next) } : undefined;
    return winParts(this, w, h, blotReasons(data.time, def.parTime, data.livesLost), preview, this.withEnter(buttons));
  }

  /** Enter or Space presses the big button. */
  private withEnter(b: CardButtons): CardButtons {
    const kb = this.input.keyboard;
    kb?.once('keydown-ENTER', b.primary.go);
    kb?.once('keydown-SPACE', b.primary.go);
    return b;
  }

  /** The time against par, stamped NEW BEST when it beats the last one. */
  private timeRow(L: Layout, data: ResultData, def: LevelDef): void {
    const text = this.add.text(L.hero, L.stats, `${clock(data.time)}  ·  par ${clock(def.parTime)}`, { fontFamily: HAND_FONT, fontSize: '34px', color: INK })
      .setOrigin(0.5).setDepth(12).setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, delay: 1100, duration: 400 });
    if (!isNewBest(data.previousBest, data.time)) return;
    const g = this.add.graphics();
    const label = this.add.text(0, 0, 'NEW BEST!', { fontFamily: HAND_FONT, fontSize: '28px', color: RED }).setOrigin(0.5);
    wobblyRect(g, -label.width / 2 - 12, -22, label.width + 24, 44, 909, 2.2, RED_HEX);
    const stamp = this.add.container(L.hero + text.width / 2 + 100, L.stats, [g, label]).setRotation(-0.16).setDepth(13).setScale(2.2).setAlpha(0);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, delay: 1700, duration: 260, ease: 'Quad.In' });
  }

  /** How far the crab got: the growth bar, filled to the size it reached. */
  private reached(L: Layout, size: number, goal: number): void {
    const bar = { x: L.hero - 200, y: L.stats - 8, w: 400, h: 16 };
    const g = this.add.graphics().setDepth(12);
    const marks = Array.from({ length: Math.max(0, goal - 2) }, (_, i) => (i + 1) / (goal - 1));
    drawGrowthBar(g, bar, goal > 1 ? (size - 1) / (goal - 1) : 1, marks, 1, false);
    const label = this.add.text(L.hero, L.stats + 36, `reached size ${size} of ${goal}`, { fontFamily: HAND_FONT, fontSize: '26px', color: INK }).setOrigin(0.5).setDepth(12);
    for (const o of [g, label]) {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, delay: 1100, duration: 400 });
    }
  }

  /** The red-inked creature that caught it, looming over the shell and pacing (a bird hovering over it). */
  private hunter(by: HunterId, x: number, ground: number, width: number): void {
    if (!(by in SPECIES)) {
      // A bird: hovering over the shell, wings beating.
      const k = (width * 1.3) / KESTREL_SPAN;
      const bird = this.add.image(x, ground - width * 1.6, TEX.bird(by, false, true, 0)).setScale(-k, k).setDepth(11).setAlpha(0);
      this.tweens.add({ targets: bird, alpha: 1, delay: POP_DELAY + 200, duration: 500 });
      this.tweens.add({ targets: bird, y: bird.y - 10, delay: POP_DELAY + 700, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      let wing = 0;
      this.time.addEvent({ delay: 100, loop: true, callback: () => bird.setTexture(TEX.bird(by, false, true, (wing = (wing + 1) % BOIL))) });
      return;
    }
    const species = by as SpeciesId;
    const k = width / CRITTER_SPAN[species];
    const art = this.add.image(x + 40, ground, TEX.critter(species, true, 0))
      .setOrigin(0.5, (CRITTER_FRAME / 2 + CRITTER_GROUND) / CRITTER_FRAME).setScale(-k, k).setDepth(11).setAlpha(0);
    this.tweens.add({ targets: art, alpha: 1, x, delay: POP_DELAY + 200, duration: 500, ease: 'Quad.Out' });
    // Creatures that stay put (an antlion, an octopus) don't pace.
    if (!SPECIES[species].move || SPECIES[species].move === 'walk') this.tweens.add({ targets: art, x: x + 18, delay: POP_DELAY + 900, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    let f = 0;
    this.time.addEvent({ delay: 200, loop: true, callback: () => art.setTexture(TEX.critter(species, true, (f = (f + 1) % BOIL))) });
  }
}

/** The species of the level's biggest creature: the likeliest to have done the catching. */
function biggestHunter(def: LevelDef): SpeciesId {
  const groups = [...(def.critters ?? [])].sort((a, b) => b.sizes[1] - a.sizes[1]);
  return groups[0]?.species ?? 'ghostcrab';
}
