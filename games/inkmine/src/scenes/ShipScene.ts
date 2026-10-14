import Phaser from 'phaser';
import { ART_RES, BLUE, BLUE_HEX, PAPER, PAPER_HEX } from '../art/palette';
import { bakeCharacters, bakePickups, PROSPECTOR_RES, TEX } from '../art/textures';
import { getProfile, setProfile } from '../host';
import { levelById, levelOrder, PLANETS, planetOf, slotOf } from '../level/levels';
import type { LevelDef } from '../level/types';
import { blueprintId, canBuild, recipeOf, recipeProgress, type BuildCheck } from '../logic/blueprints';
import { build, isOpen, upgradeShip, type Profile } from '../logic/economy';
import { PIECES, prospectorLook, type Piece } from '../logic/gear';
import { countOf, holdSize } from '../logic/hold';
import { markGain, markStat } from '../logic/marks';
import { contractText, goalText, rewardText } from '../logic/mission';
import { ORES, type OreKey } from '../logic/ore';
import { canUpgrade, capOf, landerLookOf, maxLevel, MODULE_KEYS, MODULES, nextCost, type ModuleKey } from '../logic/ship';
import { relayoutOnResize, screenScene, toView, viewSize } from './hidpi';
import { holdText } from './ResultScene';
import { inkButton, inkText, noteText, PENCIL, wobblyRect } from './ui';

export interface ShipData {
  readonly levelId?: string;
  /** A line to show at the top after building or buying something. */
  readonly news?: string;
  /** Where the page was scrolled to, kept across a rebuild. */
  readonly scrollY?: number;
}

const SOFT_INK = '#4a463e';
const GAP = 20;
/** Columns side by side from this layout width; narrower screens stack them and scroll. */
const WIDE = 1180;
const PIECE_NAMES: Readonly<Record<Piece, string>> = { drill: 'Drill', cell: 'Cell', pack: 'Pack', suit: 'Suit', helmet: 'Helmet', jetpack: 'Jetpack' };

/** Where each blueprint is found, from the built levels: a mission's reward or a vault. */
function blueprintSources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const planet of PLANETS) {
    for (const l of planet.levels) {
      if (l.mission.blueprint) out.set(l.mission.blueprint, `reward for ${l.name} (${planet.name} ${slotOf(l.id)})`);
      for (const it of l.items) if (it.blueprint) out.set(it.blueprint, `in a vault on ${l.name} (${planet.name} ${slotOf(l.id)})`);
    }
  }
  return out;
}

/** The build button's label when it can't build yet. */
const BUILD_WHY: Readonly<Record<BuildCheck, string>> = {
  ok: 'Build', built: 'built', notFound: 'no blueprint', materials: 'needs ore', credits: 'credits', order: 'locked',
};

/**
 * The ship, between landings: a notebook page. The fabricator builds gear
 * from found blueprints (pencil for what you could have, ink once built),
 * the lander's modules are bought with credits, and the next landing's
 * briefing waits with the button to land.
 */
export class ShipScene extends Phaser.Scene {
  private levelId = '';
  private readonly sources = blueprintSources();

  constructor() {
    super('Ship');
  }

  create(data: ShipData): void {
    screenScene(this, true);
    relayoutOnResize(this, data);
    this.cameras.main.setBackgroundColor(PAPER);
    const profile = getProfile(this);
    const order = levelOrder();
    const level = levelById(data.levelId ?? '') ?? levelById(order.find((id) => isOpen(profile, order, id) && !profile.levels[id]?.won) ?? order[0]!)!;
    this.levelId = level.id;
    const planet = planetOf(level.id);
    bakeCharacters(this, prospectorLook(profile.gear), landerLookOf(profile.ship));
    bakePickups(this, planet.style.stone);

    const { width } = viewSize(this);
    const wide = width >= WIDE;
    const colW = wide ? (width - GAP * 4) / 3 : Math.min(620, width - GAP * 2);
    inkText(this, GAP, 34, 'The ship', 48).setOrigin(0, 0.5);
    inkText(this, width - GAP, 30, `${profile.credits} credits`, 30).setOrigin(1, 0.5);
    inkText(this, width - GAP, 62, holdSize(profile.hold) ? `hold: ${holdText(profile.hold)}` : 'hold: empty', 20, SOFT_INK).setOrigin(1, 0.5);
    if (data.news) inkText(this, width / 2, 34, data.news, 30, BLUE).setOrigin(0.5);

    const top = 96;
    const x = (i: number): number => (wide ? GAP + i * (colW + GAP) : (width - colW) / 2);
    let y = top;
    const h1 = this.fabricator(x(0), y, colW, profile);
    y = wide ? top : y + h1 + GAP;
    const h2 = this.lander(x(1), y, colW, profile);
    y = wide ? top : y + h2 + GAP;
    const h3 = this.briefing(x(2), y, colW, level, profile);
    const bottom = wide ? top + Math.max(h1, h2, h3) : y + h3;
    this.scroll(bottom + GAP, data.scrollY ?? 0);
  }

  /** A frame behind a section, drawn once its rows are measured. */
  private section(x: number, y: number, w: number, h: number, title: string, seed: number): void {
    const g = this.add.graphics().setDepth(-1);
    g.fillStyle(PAPER_HEX, 1).fillRect(x, y, w, h);
    wobblyRect(g, x, y, w, h, seed, 1.6, BLUE_HEX);
    inkText(this, x + 16, y + 24, title, 30).setOrigin(0, 0.5);
  }

  /** The fabricator sheet: the prospector as they are, then each piece's mark and its next blueprint. */
  private fabricator(x: number, y: number, w: number, p: Profile): number {
    const figH = 170;
    this.add.image(x + w / 2, y + 56 + figH / 2, TEX.prospector('idle', prospectorLook(p.gear), 0)).setScale(3.2 / PROSPECTOR_RES);
    let ry = y + 56 + figH;
    for (const piece of PIECES) ry += this.pieceRow(piece, x, ry, w, p);
    const h = ry - y + 8;
    this.section(x, y, w, h, 'Fabricator', 11);
    return h;
  }

  /** One gear piece: its mark and what it does, then its next blueprint (pencil until found) and the build button. Returns the row's height. */
  private pieceRow(piece: Piece, x: number, ry: number, w: number, p: Profile): number {
    const mk = p.gear[piece];
    inkText(this, x + 16, ry + 14, `${PIECE_NAMES[piece]} · Mk ${mk}`, 24).setOrigin(0, 0.5);
    inkText(this, x + w - 16, ry + 14, markStat(piece, mk), 20, SOFT_INK).setOrigin(1, 0.5);
    const r = recipeOf(blueprintId(piece, mk + 1));
    const note = (text: string): number => noteText(this, x + 16, ry + 30, text, 19, w - 32, PENCIL).height + 42;
    if (!r) return note('the best there is on this planet');
    const why = canBuild(r, p.found, p.gear, p.hold, p.credits);
    if (why === 'notFound') return note(`Mk ${r.mk} blueprint not found: ${this.sources.get(r.id) ?? 'on a later landing'}`);
    const gain = noteText(this, x + 16, ry + 30, `Mk ${r.mk}: ${markGain(piece, r.mk)}`, 19, w - 150, BLUE);
    const have = recipeProgress(r, p.hold);
    const parts = Object.entries(r.materials).map(([ore, n]) => {
      const got = countOf(have, ore as OreKey);
      return `${ORES[ore as OreKey].name} ${got}/${n}${got >= n! ? ' ✓' : ''}`;
    });
    const recipe = noteText(this, x + 16, gain.y + gain.height + 2, `${parts.join(' · ')} · ${r.fee} cr`, 18, w - 150, why === 'ok' ? BLUE : SOFT_INK);
    inkButton(this, x + w - 70, ry + 58, BUILD_WHY[why], () => this.build(r.id), { width: 116, height: 40, size: 20, disabled: why !== 'ok' });
    return Math.max(recipe.y + recipe.height, ry + 80) - ry + 12;
  }

  private build(id: string): void {
    const r = build(getProfile(this), id);
    if (!r.ok) return;
    setProfile(this, r.profile);
    const made = recipeOf(id)!;
    this.scene.restart({ levelId: this.levelId, news: `Built: ${PIECE_NAMES[made.piece]} Mk ${made.mk}!`, scrollY: this.cameras.main.scrollY });
  }

  /** The lander and its modules, bought with credits. */
  private lander(x: number, y: number, w: number, p: Profile): number {
    const figH = 170;
    this.add.image(x + w / 2, y + 56 + figH, TEX.lander(landerLookOf(p.ship), 0)).setOrigin(0.5, 1).setScale(1.1 / ART_RES);
    let ry = y + 56 + figH;
    for (const k of MODULE_KEYS) ry += this.moduleRow(k, x, ry, w, p);
    const h = ry - y + 8;
    this.section(x, y, w, h, 'Lander', 23);
    return h;
  }

  /** One module: its level and what it gives, the next level and its price, the button. Returns the row's height. */
  private moduleRow(k: ModuleKey, x: number, ry: number, w: number, p: Profile): number {
    const m = MODULES[k];
    const lvl = p.ship[k];
    inkText(this, x + 16, ry + 14, `${m.name} · ${lvl}/${maxLevel(k)}`, 24).setOrigin(0, 0.5);
    const now = noteText(this, x + 16, ry + 28, m.gives[lvl]!, 19, w - 150, SOFT_INK);
    const cost = nextCost(p.ship, k);
    const why = canUpgrade(p.ship, k, p.credits);
    const below = now.y + now.height + 2;
    if (cost === null) {
      const t = noteText(this, x + 16, below, 'fully fitted', 18, w - 150, PENCIL);
      return t.y + t.height - ry + 12;
    }
    const next = why === 'hull' ? `next: ${m.gives[lvl + 1]} · refit first` : `next: ${m.gives[lvl + 1]} · ${cost} cr`;
    const t = noteText(this, x + 16, below, next, 18, w - 150, why === 'ok' ? BLUE : PENCIL);
    const label = why === 'ok' ? (k === 'hull' ? 'Refit' : 'Fit') : why === 'hull' ? `hull ${capOf(p.ship, k) + 1}` : 'credits';
    inkButton(this, x + w - 70, ry + 44, label, () => this.upgrade(k), { width: 116, height: 40, size: 20, disabled: why !== 'ok' });
    return Math.max(t.y + t.height, ry + 68) - ry + 12;
  }

  private upgrade(k: ModuleKey): void {
    const r = upgradeShip(getProfile(this), k);
    if (!r.ok) return;
    setProfile(this, r.profile);
    this.scene.restart({ levelId: this.levelId, news: `Fitted: ${MODULES[k].name}!`, scrollY: this.cameras.main.scrollY });
  }

  /** The next landing: its mission and pay, the contracts, and the buttons to land or go back to the chart. */
  private briefing(x: number, y: number, w: number, level: LevelDef, p: Profile): number {
    const planet = planetOf(level.id);
    const parts: { text: string; size: number; color: string }[] = [
      { text: `${planet.name} ${slotOf(level.id)} · ${level.name}`, size: 28, color: BLUE },
      { text: level.hint, size: 20, color: SOFT_INK },
      { text: `Mission: ${level.mission.goals.map(goalText).join(', then ')}.`, size: 22, color: BLUE },
      { text: `Pays ${rewardText(level.mission)}.`, size: 20, color: BLUE },
      { text: 'Contracts:', size: 22, color: BLUE },
      ...level.contracts.map((c) => {
        const paid = p.levels[level.id]?.paid.includes(c.kind);
        return { text: `${paid ? '☑' : '☐'} ${contractText(c)} · ${paid ? 'paid' : `${c.pay} cr`}`, size: 20, color: paid ? PENCIL : BLUE };
      }),
    ];
    // Measure first, then draw the frame under the text.
    const texts: Phaser.GameObjects.Text[] = [];
    let ty = y + 56;
    for (const part of parts) {
      const t = noteText(this, x + 16, ty, part.text, part.size, w - 32, part.color).setDepth(1);
      texts.push(t);
      ty += t.height + 8;
    }
    const h = ty - y + 90;
    this.section(x, y, w, h, 'Next landing', 37);
    inkButton(this, x + w / 2 + 80, y + h - 44, 'Land ▸', () => this.scene.start('Game', { levelId: level.id }), { width: 150, height: 50 }).setDepth(1);
    inkButton(this, x + w / 2 - 90, y + h - 44, '◂ Chart', () => this.scene.start('Chart'), { width: 150, height: 50, size: 24 }).setDepth(1);
    return h;
  }

  /** On a screen too short for the page, drag or wheel to scroll it. */
  private scroll(contentH: number, startY: number): void {
    const { height } = viewSize(this);
    if (contentH <= height) return;
    const cam = this.cameras.main;
    // Clamped by hand: camera bounds don't sit right with this zoomed, top-left-origin camera.
    const to = (y: number): void => {
      cam.setScroll(0, Phaser.Math.Clamp(y, 0, contentH - height));
    };
    to(startY);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => to(cam.scrollY + dy));
    let last: number | null = null;
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      last = toView(ptr.x, ptr.y, this).y;
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (last === null || !ptr.isDown) return;
      const now = toView(ptr.x, ptr.y, this).y;
      to(cam.scrollY - (now - last));
      last = now;
    });
    this.input.on('pointerup', () => {
      last = null;
    });
  }
}
