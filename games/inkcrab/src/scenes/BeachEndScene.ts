import Phaser from 'phaser';
import { INK } from '../art/palette';
import { getHost } from '../host';
import { BIOMES, LEVELS_PER_BEACH } from '../level/biomes';
import { shellLadder } from '../level/build';
import { BEACHES, beachIndexOf, FREE_BEACHES, isFreeEnd, levelById, themeOf } from '../level/levels';
import { beachTally, loadProgress } from '../logic/save';
import { SHELLS } from '../logic/shells';
import type { BackdropView } from './game/backdropView';
import { Confetti } from './beachEnd/confetti';
import { offerCard, type Offer } from './beachEnd/offerCard';
import { shellParade } from './beachEnd/shellParade';
import type { ResultData } from './ResultScene';
import { beachStage, fitStage, headline, isTall } from './stage';
import { clock, drawBlots, HAND_FONT, inkButton } from './ui';

const SOFT_INK = '#4a463e';
/** Layout space the scene is designed in; the camera scales it to fit the screen. */
interface Layout {
  readonly w: number;
  readonly h: number;
  readonly title: { readonly x: number; readonly y: number; readonly size: number; readonly maxW: number };
  readonly ground: number;
  readonly parade: readonly [number, number];
  readonly stats: number;
  readonly card: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly buttons: { readonly y: number; readonly xs: readonly [number, number] };
}

const WIDE: Layout = {
  w: 1280, h: 720,
  title: { x: 360, y: 118, size: 62, maxW: 680 },
  ground: 380,
  parade: [40, 680],
  stats: 520,
  card: { x: 1000, y: 368, w: 470, h: 520 },
  buttons: { y: 616, xs: [225, 495] },
};

const TALL: Layout = {
  w: 720, h: 1280,
  title: { x: 360, y: 80, size: 54, maxW: 680 },
  ground: 470,
  parade: [76, 696],
  stats: 580,
  card: { x: 360, y: 905, w: 620, h: 500 },
  buttons: { y: 1215, xs: [215, 505] },
};

/** Behind the offer card, so a piece never sits on the unlock button. */
const CONFETTI_DEPTH = 25;
/** How far into the sand the shell row stands. */
const SET_IN = 22;
const ENCORES = 5;

/**
 * The end of a beach: the climb from the first shell to the biggest told as
 * a row of shells on the sand, the crab hopping in the last one, ink
 * confetti, and the beach's tally. After the last free beach it pins on the
 * offer to unlock the rest; for an owner it shows the next beach.
 */
export class BeachEndScene extends Phaser.Scene {
  private confetti!: Confetti;
  private backdrop!: BackdropView;

  constructor() {
    super('BeachEnd');
  }

  create(data: ResultData): void {
    const host = getHost(this);
    const def = levelById(data.levelId) ?? BEACHES[0]!.at(-1)!;
    const beach = Math.max(0, beachIndexOf(def.id));
    const biome = BIOMES[beach]!;
    const L = isTall(this) ? TALL : WIDE;
    fitStage(this, L);
    this.backdrop = beachStage(this, L, themeOf(def.id), L.ground);
    this.confetti = new Confetti(this, CONFETTI_DEPTH);

    headline(this, L.title, `${biome.name} complete!`);
    const ladder = shellLadder(def);
    const first = ladder[0]!;
    const last = ladder.at(-1)!;
    this.add.text(L.title.x, L.title.y + L.title.size * 0.85, `From a ${SHELLS[first].name} to a ${SHELLS[last].name}: all grown up.`, { fontFamily: HAND_FONT, fontSize: '28px', color: SOFT_INK })
      .setOrigin(0.5).setDepth(20);

    // Shells sit down in the sand, a little in front of its inked edge.
    const parade = shellParade(this, ladder, L.parade[0], L.parade[1], L.ground + SET_IN, 10);
    this.stats(L, BEACHES[beach]!.map((l) => l.id));
    this.buttons(L, def.id);
    offerCard(this, L.card.x, L.card.y, L.card.w, L.card.h, this.offer(beach, data.levelId)).setDepth(30);

    void parade.onDone.then(() => this.celebrate(L, parade.hero));
  }

  update(time: number, delta: number): void {
    this.backdrop.update(time);
    this.confetti.update(Math.min(delta / 1000, 0.05));
  }

  /** The beach's tally: blots earned of all there were, and its time. */
  private stats(L: Layout, ids: readonly string[]): void {
    const tally = beachTally(loadProgress(getHost(this).storage), ids);
    const cx = (L.parade[0] + L.parade[1]) / 2;
    const g = this.add.graphics().setDepth(12);
    const text = `${tally.blots} of ${tally.maxBlots} ink blots · ${clock(tally.time)} on this beach`;
    const label = this.add.text(0, L.stats, text, { fontFamily: HAND_FONT, fontSize: '26px', color: INK }).setOrigin(0, 0.5).setDepth(12);
    const left = cx - (label.width + 40) / 2;
    drawBlots(g, left + 12, L.stats, 1, 11, 1);
    label.setX(left + 34);
    for (const o of [g, label]) {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, delay: 2400, duration: 500 });
    }
  }

  private buttons(L: Layout, levelId: string): void {
    let leaving = false;
    const go = (key: string, payload?: object) => (): void => {
      if (leaving) return;
      leaving = true;
      this.scene.start(key, payload);
    };
    inkButton(this, L.buttons.xs[0], L.buttons.y, '← map', go('Menu'), { width: 250, height: 50, size: 26 }).setDepth(12);
    inkButton(this, L.buttons.xs[1], L.buttons.y, 'replay level', go('Game', { levelId }), { width: 200, height: 50, size: 26 }).setDepth(12);
  }

  private offer(beach: number, levelId: string): Offer {
    const host = getHost(this);
    if (!host.unlocked && isFreeEnd(levelId)) {
      const rest = BIOMES.slice(FREE_BEACHES);
      return { kind: 'buy', beaches: rest, levels: rest.length * LEVELS_PER_BEACH, price: host.price, signedIn: host.signedIn === true, onBuy: () => host.onBuy() };
    }
    const next = BEACHES[beach + 1];
    return { kind: 'next', beach: BIOMES[beach + 1], onSail: next?.[0] ? () => this.scene.start('Game', { levelId: next[0]!.id }) : undefined };
  }

  /** A big burst from the crab and both sides, then a few encores. */
  private celebrate(L: Layout, hero: { x: number; y: number }): void {
    this.confetti.burst(hero.x, hero.y, 70, 760);
    this.confetti.burst(L.parade[0], L.ground, 30, 900, 0.4);
    this.confetti.burst(L.parade[1], L.ground, 30, 900, 0.4);
    this.time.addEvent({ delay: 2600, repeat: ENCORES - 1, callback: () => this.confetti.burst(hero.x, hero.y, 22, 560) });
  }
}
