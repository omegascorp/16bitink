import Phaser from 'phaser';
import { HIGHLIGHT_HEX, INK, PAPER_HEX, SAND_DRY, SAND_GRAIN } from '../art/palette';
import { getHost } from '../host';
import { BIOMES, LEVELS_PER_BEACH } from '../level/biomes';
import { shellLadder } from '../level/build';
import { BEACHES, beachIndexOf, FREE_BEACHES, isFreeEnd, levelById, themeOf } from '../level/levels';
import { createRng } from '../logic/rng';
import { beachTally, loadProgress } from '../logic/save';
import { SHELLS } from '../logic/shells';
import { BackdropView } from './game/backdropView';
import { Confetti } from './beachEnd/confetti';
import { offerCard, type Offer } from './beachEnd/offerCard';
import { shellParade } from './beachEnd/shellParade';
import { DPR, viewSize } from './hidpi';
import type { ResultData } from './ResultScene';
import { clock, drawBlots, HAND_FONT, inkButton, inkText } from './ui';

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
    const { width, height } = viewSize(this);
    const L = height > width * 1.1 ? TALL : WIDE;
    const zoom = Math.min(width / L.w, height / L.h);
    this.fitCamera(L, zoom);

    // Plain paper well past every edge, whatever the screen's shape.
    this.add.rectangle(-L.w, -L.h, L.w * 3, L.h * 3, PAPER_HEX).setOrigin(0);
    this.backdrop = new BackdropView(this, themeOf(def.id), L.ground, L.w * 4, ['sky']);
    this.sand(L);
    this.confetti = new Confetti(this, CONFETTI_DEPTH);

    this.title(L, `${biome.name} complete!`);
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

  /** Shows the layout's box centred, as big as fits; text is rasterized to match. */
  private fitCamera(L: Layout, zoom: number): void {
    const cam = this.cameras.main;
    cam.setZoom(DPR * zoom).centerOn(L.w / 2, L.h / 2);
    const res = DPR * Math.max(1, zoom);
    const onAdded = (obj: Phaser.GameObjects.GameObject): void => {
      if (obj instanceof Phaser.GameObjects.Text) obj.setResolution(res);
    };
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded));
  }

  /** The beach in front of the faraway scenery, with a hand-inked top edge. */
  private sand(L: Layout): void {
    const g = this.add.graphics().setDepth(5);
    const rng = createRng(31);
    const pts: Phaser.Math.Vector2[] = [];
    for (let x = -L.w; x <= L.w * 2; x += 40) pts.push(new Phaser.Math.Vector2(x, L.ground + 8 + Math.sin(x / 170) * 5 + (rng() - 0.5) * 2));
    g.fillStyle(Phaser.Display.Color.HexStringToColor(SAND_DRY).color, 1)
      .fillPoints([...pts, new Phaser.Math.Vector2(L.w * 2, L.h * 2), new Phaser.Math.Vector2(-L.w, L.h * 2)], true);
    g.lineStyle(2.4, Phaser.Display.Color.HexStringToColor(INK).color, 0.9).strokePoints(pts, false);
    const grain = Phaser.Display.Color.HexStringToColor(SAND_GRAIN).color;
    for (let i = 0; i < 260; i++) g.fillStyle(grain, 0.18 + rng() * 0.2).fillCircle(-L.w * 0.2 + rng() * L.w * 1.4, L.ground + 20 + rng() * L.h, 0.8 + rng() * 1.2);
  }

  /** The headline, with a swipe of highlighter drawn across it. */
  private title(L: Layout, text: string): void {
    const t = inkText(this, L.title.x, L.title.y, text, L.title.size).setDepth(21).setScale(0.6).setAlpha(0);
    if (t.width > L.title.maxW) t.setFontSize(Math.floor((L.title.size * L.title.maxW) / t.width));
    const w = t.width + 36;
    const swipe = this.add.graphics().setDepth(20);
    swipe.fillStyle(HIGHLIGHT_HEX, 0.6).fillRoundedRect(0, -L.title.size * 0.22, w, L.title.size * 0.5, 10);
    swipe.setPosition(L.title.x - w / 2, L.title.y + L.title.size * 0.12).setScale(0, 1).setRotation(-0.012);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 520, ease: 'Back.Out', delay: 120 });
    this.tweens.add({ targets: swipe, scaleX: 1, duration: 480, ease: 'Cubic.Out', delay: 520 });
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
    inkButton(this, L.buttons.xs[0], L.buttons.y, '← back to the chart', go('Menu'), { width: 250, height: 50, size: 26 }).setDepth(12);
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
