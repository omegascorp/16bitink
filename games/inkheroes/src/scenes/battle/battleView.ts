import Phaser from 'phaser';
import type { Pose } from '../../art/pixel/manifest';
import { getSound } from '../../host';
import { alive, isStone, playerSide, stackById } from '../../logic/battle';
import type { BattleEvent, BattleState, Stack } from '../../logic/battleTypes';
import { createRng } from '../../logic/rng';
import { creature, lineOf } from '../../logic/creatures';
import { throughGate, type SiegePart } from '../../logic/siege';
import { HEX_COUNT, type Hex } from '../../logic/hex';
import { SPELLS } from '../../logic/spells';
import { adjacent, facesTarget, footprintAt, occupiedHexes, sizeOf } from '../../logic/footprint';
import type { BattleCameras } from './battleCameras';
import { badgeTexture, backdropSource, bufferTexture, heroArt, obstacleArt, PX_TEX, unitArt } from './pixelAssets';
import { FIGURE_DEPTH, PixelFigure } from './pixelFigure';
import { Backdrop } from './pixelBackdrop';
import { feetOn, feetPx, heroFeet, hexPx, TOWER_FEET, WORLD } from './pixelLayout';
import { PixelBuffer, type Rgba } from './pixelRaster';
import { INK, texturePixels } from './pixelUi';
import { partAt, SiegeView } from './siegeView';
import { rampLook } from './rampView';
import { bodyMiddle, onBodyMiddle } from './bodyAnchor';
import type { FigureArt } from './standIns';

/** How far above the part struck by hand its message floats, native pixels. */
const STRIKE_FLOAT = 44;
const GRID_KEY = 'px-battle-grid';
const MARKS_KEY = 'px-battle-marks';
/** Layer depths: the ground, its grid and highlights, then figures by row (FIGURE_DEPTH + y), then badges and shots over all. */
const DEPTH = { bg: 0, grid: 1, marks: 2, badge: 1000, shot: 2000, feet: 3000 } as const;
/** The grid: dark green, translucent, one pixel. */
const GRID_INK: Rgba = [12, 28, 6, 178];
/** Highlights: a translucent fill and a one-pixel rim. */
const MARK = {
  reach: { fill: [10, 6, 4, 56], rim: [224, 194, 122, 110] },
  target: { fill: [176, 48, 31, 60], rim: [224, 87, 74, 220] },
  active: { fill: [240, 207, 120, 80], rim: [245, 205, 90, 240] },
  from: { fill: [240, 207, 120, 64], rim: [245, 205, 90, 230] },
  struck: { fill: [230, 60, 40, 140], rim: [255, 140, 110, 255] },
  hover: { fill: [255, 240, 200, 36], rim: [255, 240, 200, 180] },
} as const satisfies Record<string, { fill: Rgba; rim: Rgba }>;
/** The count badge's top-left from the feet, facing right (mirrored facing left): low in its own hex, so facing foes' badges never overlap. */
const BADGE_AT = { x: 2, y: -3 } as const;
/** A walker's time a hex, and the pause as a unit settles where it stops, ms. */
const WALK_MS = 200;
const SETTLE_MS = 120;
/** How far a melee attacker steps in toward its foe for the blow (a fraction of the way). */
const LUNGE = 0.22;
/** How high a flyer rises at the top of its arc, native pixels. */
const FLY_LIFT = 20;
/** How high a slung stone arcs, native pixels. */
const STONE_ARC = 14;
/** Where floats rise from: this share of the art's height above the feet. */
const FLOAT_ABOVE = 0.6;
/** A stack turned to stone, until its lost turn: a tint only multiplies, so a cold blue is what cancels the art's warm colours to grey. */
const STONE_TINT = 0x7388b0;

/** The hexes a stack stands on, head first: a bigger unit is stood centred on them (between two, on the middle of three). */
function stackHexes(s: Stack): readonly Hex[] {
  return occupiedHexes(s);
}

/** Where a stack's feet go: on its hex, or up on its tower. */
const stackFeet = (s: Stack): { x: number; y: number } => (s.tower === undefined ? feetOn(stackHexes(s)) : TOWER_FEET[s.tower]!);

/** The ground line a company on a tower sorts on: just in front of the tower's own. */
const TOWER_SORT = 2;
/** Where a landed company's fall begins and how long it takes, ms. */
const FALL_MS = 420;

/** What the cards and floats call each part of a town's walls. */
const SIEGE_NAMES: Readonly<Record<SiegePart, string>> = {
  wallNorth: 'The north wall', wallGateNorth: 'The wall by the gate', wallGateSouth: 'The wall by the gate', wallSouth: 'The south wall',
  gate: 'The gate', keep: 'The keep', towerNorth: 'The north tower', towerSouth: 'The south tower',
};

/** How long a fleeing side takes to leave the field, ms. */
const FLEE_FADE = 700;

interface UnitSprite {
  readonly fig: PixelFigure;
  readonly badge: Phaser.GameObjects.Image;
  readonly side: number;
}

/** Highlights to show for the active unit. */
export interface Marks {
  /** The active unit's hex (or every hex of a bigger stack). */
  readonly active: Hex | readonly Hex[] | null;
  readonly reach: readonly Hex[];
  readonly targets: readonly Hex[];
  /** The hex the pointer is over; where the unit would stand for the move or strike under it, and the hex it would strike. */
  readonly hover?: Hex | null;
  readonly landing?: readonly Hex[];
  readonly struck?: readonly Hex[];
}

/** Shows a message rising from a native world point (the HUD's float); `big` for round changes. */
export type Floater = (x: number, y: number, text: string, ink: Rgba, big?: boolean) => void;

/** Review switches for the dev sandbox. */
export interface ViewOpts {
  /** Every figure loops this pose instead of the battle's own. */
  readonly pose?: Pose;
  /** A magenta dot where every unit's feet should be, to check the art's foot points. */
  readonly feet?: boolean;
  /** The id of the player's hero in this fight (the one picked on the map), for their own art. */
  readonly heroId?: string;
  /** The rival lord's id, for his own art when he has it (Sethi). */
  readonly rivalId?: string;
}

/**
 * Draws a battle in the native 960 × 540 pixel world: the terrain's
 * background, a pixel-exact hex grid and highlights, the heroes in the top
 * corners, every unit (feet on its hex centre, sorted by row) with its count
 * badge, and the animations of each event. Messages float up through the HUD's `floater`.
 */
export class BattleView {
  private readonly units = new Map<number, UnitSprite>();
  /** Three-hex units' art, re-anchored on the body's middle, by creature. */
  private readonly centred = new Map<string, FigureArt>();
  /** Done once the last melee striker is back from its lunge. */
  private recovered: Promise<void> = Promise.resolve();
  /** Each side's hero beside the field, if it has one. */
  private readonly heroes: (PixelFigure | null)[] = [null, null];
  private readonly obstacles: Phaser.GameObjects.Image[] = [];
  private readonly marks = new PixelBuffer(WORLD.w, WORLD.h);
  private readonly extras: Phaser.GameObjects.GameObject[] = [];
  private readonly backdrop: Backdrop;
  private readonly walls: SiegeView | null = null;
  /** The side the player plays: theirs are the navy badges, and their hero the player's. */
  private readonly me: number;

  constructor(private readonly scene: Phaser.Scene, private readonly cams: BattleCameras, state: BattleState, terrain: string, seed: number, heroes: readonly [boolean, boolean], private readonly floater: Floater, private readonly opts: ViewOpts = {}) {
    const layer = cams.world;
    this.backdrop = new Backdrop(scene, backdropSource(terrain, seed), DEPTH.bg);
    for (const o of this.backdrop.objects) layer.add(o);
    this.backdrop.fit(cams.margin());
    this.paintGrid();
    bufferTexture(scene, MARKS_KEY, this.marks);
    this.addStill(scene.add.image(0, 0, MARKS_KEY).setOrigin(0).setDepth(DEPTH.marks));
    this.addStill(scene.add.image(0, 0, GRID_KEY).setOrigin(0).setDepth(DEPTH.grid));
    this.placeObstacles(state.obstacles, seed);
    this.me = playerSide(state);
    if (state.siege) this.walls = new SiegeView(scene, layer, state.siege, rampLook(state));
    heroes.forEach((has, side) => {
      if (!has) return;
      // The other side's hero is always the rival lord (monsters and garrisons fight without one).
      const hero = side === this.me ? heroArt('player', opts.heroId) : heroArt('rival', opts.rivalId);
      const fig = new PixelFigure(scene, layer, hero.art, (pose) => PX_TEX.hero(hero.id, pose), heroFeet(side as 0 | 1, !!state.siege), side === 1);
      if (opts.pose) fig.hold(opts.pose);
      this.heroes[side] = fig;
    });
    for (const s of state.stacks) this.addUnit(s);
    this.sync(state);
  }

  private addStill(img: Phaser.GameObjects.Image): void {
    this.cams.world.add(img);
    this.extras.push(img);
  }

  /** The grid, every hex rim once (shared edges come out the same pixels), into its own native texture. */
  private paintGrid(): void {
    const b = new PixelBuffer(WORLD.w, WORLD.h);
    for (let h = 0; h < HEX_COUNT; h++) {
      const p = hexPx(h);
      b.hex(p.x, p.y, null, GRID_INK);
    }
    bufferTexture(this.scene, GRID_KEY, b);
  }

  /** A rock or a tree on each obstacle hex (seeded as the painted field chose), feet on the centre. */
  private placeObstacles(obstacles: readonly Hex[], seed: number): void {
    for (const h of obstacles) {
      const tree = createRng(seed ^ (h * 2654435761))() >= 0.5;
      const art = obstacleArt(tree);
      const p = feetPx(h);
      const img = this.scene.add.image(p.x, p.y, art.key).setDisplayOrigin(art.footX, art.footY).setDepth(FIGURE_DEPTH + p.y);
      this.addStill(img);
      this.obstacles.push(img);
    }
  }

  /** A unit's art, its feet under the body's middle when it fills three hexes (measured once per kind from its idle strip). */
  private figureArtFor(id: Stack['creature']): FigureArt {
    const art = unitArt(id);
    if (sizeOf(id) < 3) return art;
    const known = this.centred.get(id);
    if (known) return known;
    const key = PX_TEX.unit(id, 'idle');
    const middle = this.scene.textures.exists(key) ? bodyMiddle(texturePixels(this.scene, key), art.w, art.frames.idle) : null;
    const out = onBodyMiddle(art, middle);
    this.centred.set(id, out);
    return out;
  }

  private addUnit(s: Stack): void {
    const art = this.figureArtFor(s.creature);
    const fig = new PixelFigure(this.scene, this.cams.world, art, (pose) => PX_TEX.unit(s.creature, pose), stackFeet(s), s.side === 1);
    if (this.opts.pose) fig.hold(this.opts.pose);
    if (s.tower !== undefined) fig.sortOn(hexPx(s.hex).y + TOWER_SORT);
    const badge = this.scene.add.image(0, 0, badgeTexture(this.scene, s.side === this.me ? 0 : 1, s.count)).setOrigin(0).setDepth(DEPTH.badge);
    this.cams.world.add(badge);
    this.units.set(s.id, { fig, badge, side: s.side });
  }

  /** Puts every unit where the state has it, its count on its badge. */
  sync(state: BattleState): void {
    for (const s of state.stacks) {
      const u = this.units.get(s.id)!;
      const p = stackFeet(s);
      u.fig.setFeet(p.x, p.y);
      if (s.tower === undefined) u.fig.sortOn(null);
      // A side whose hero fled has left the field with them.
      // A ramp's workers are drawn as the ramp itself, on the wall.
      const here = alive(s) && state.fled !== s.side && !creature(s.creature).ramp;
      u.fig.sprite.setVisible(here).setAlpha(1);
      if (isStone(s)) u.fig.sprite.setTint(STONE_TINT);
      else u.fig.restTint();
      this.setBadge(u, s.count, here);
    }
    if (state.fled !== undefined) this.heroes[state.fled]?.sprite.setVisible(false);
    this.walls?.hold(state.stacks.some((s) => alive(s) && throughGate(occupiedHexes(s))));
    if (state.siege) this.walls?.show(state.siege);
    if (this.opts.feet) this.markFeet(state);
  }

  /** The count badge at the unit's lower front corner: right of the feet facing right, left of them facing left. */
  private setBadge(u: UnitSprite, count: number, visible: boolean): void {
    u.badge.setTexture(badgeTexture(this.scene, u.side === this.me ? 0 : 1, count));
    const { x, y } = u.fig.feet;
    const left = u.side === 1;
    u.badge.setPosition(left ? x - BADGE_AT.x - u.badge.width + 1 : x + BADGE_AT.x, y + BADGE_AT.y).setVisible(visible);
  }

  private markFeet(state: BattleState): void {
    for (const s of state.stacks) {
      const p = stackFeet(s);
      const dot = this.scene.add.rectangle(p.x, p.y, 1, 1, 0xff00ff).setOrigin(0).setDepth(DEPTH.feet);
      this.addStill(dot as unknown as Phaser.GameObjects.Image);
    }
  }

  showMarks(m: Marks): void {
    const b = this.marks;
    b.clear();
    const at = (h: Hex, k: keyof typeof MARK): void => {
      const p = hexPx(h);
      b.hex(p.x, p.y, MARK[k].fill, MARK[k].rim);
    };
    for (const h of m.reach) at(h, 'reach');
    for (const h of m.targets) at(h, 'target');
    if (m.active !== null) for (const h of typeof m.active === 'number' ? [m.active] : m.active) at(h, 'active');
    if (m.landing?.length) for (const h of m.landing) at(h, 'from');
    else if (m.hover !== null && m.hover !== undefined) at(m.hover, 'hover');
    for (const h of m.struck ?? []) at(h, 'struck');
    const tex = this.scene.textures.get(MARKS_KEY) as Phaser.Textures.CanvasTexture;
    tex.context.putImageData(new ImageData(new Uint8ClampedArray(b.data), b.w, b.h), 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /** Plays one event; `after` is the state once it has happened. */
  async play(ev: BattleEvent, before: BattleState, after: BattleState): Promise<void> {
    switch (ev.type) {
      case 'move':
        return this.playMove(ev.stack, ev.path, ev.flies, stackById(before, ev.stack));
      case 'strike': {
        const a = this.units.get(ev.stack)!;
        const t = this.units.get(ev.target)!;
        await this.playStrike(a, t, ev.ranged, stackById(after, ev.stack), stackById(after, ev.target));
        this.hit(t.fig);
        this.floatAt(t.fig, `−${ev.damage}${ev.kills ? `  ${ev.kills} fall` : ''}${ev.lucky ? '  Lucky!' : ''}${ev.soaked ? `  Ward soaks ${ev.soaked}` : ''}`, ev.retaliation ? INK.retaliation : INK.damage);
        await this.wait(260);
        this.syncOne(after, ev.target);
        return;
      }
      case 'spell': {
        const t = this.units.get(ev.target)!;
        // The hero raises the sword and the spell lands as it comes down.
        const caster = this.heroes[ev.side];
        if (caster) await new Promise<void>((resolve) => void caster.attack(resolve));
        await this.flash(t.fig);
        const def = SPELLS[ev.spell];
        this.floatAt(t.fig, ev.amount && def.target === 'enemy' ? `${def.name}: −${ev.amount}${ev.kills ? `  ${ev.kills} fall` : ''}` : def.name, INK.spell);
        this.syncOne(after, ev.target);
        await this.wait(200);
        return;
      }
      case 'siege': {
        const cat = this.units.get(ev.stack)!;
        const swing = cat.fig.attack();
        await this.wait(cat.fig.msToStrike());
        getSound(this.scene)?.play('shoot');
        await this.walls?.hurl(cat.fig.shotPoint(), ev.part, PX_TEX.stone, ev.blows === 0);
        getSound(this.scene)?.play('hit');
        if (after.siege) this.walls?.show(after.siege);
        this.floater(WORLD.w / 2, 40, ev.blows === 0 ? 'The stone goes wide' : ev.down ? `${SIEGE_NAMES[ev.part]} falls!` : `${SIEGE_NAMES[ev.part]} is hit`, ev.down ? INK.title : INK.text);
        await swing;
        await this.wait(200);
        return;
      }
      case 'ramp': {
        // The workers' turn (or a round's start): the ramp appears or grows a stage.
        this.walls?.rampDust(ev.part);
        if (after.siege) this.walls?.show(after.siege);
        const done = ev.stage >= ev.need;
        const at = partAt(ev.part);
        this.floater(at.x - 30, at.y - STRIKE_FLOAT, ev.stage === 0 ? 'The workers begin a ramp' : done ? 'The ramp is ready!' : 'The ramp grows…', done ? INK.title : INK.text);
        await this.wait(done ? 420 : 260);
        return;
      }
      case 'bash': {
        const u = this.units.get(ev.stack)!;
        const struck = new Promise<void>((resolve) => void u.fig.attack(resolve));
        await struck;
        getSound(this.scene)?.play('hit');
        this.walls?.jolt(ev.part);
        if (after.siege) this.walls?.show(after.siege);
        const at = partAt(ev.part);
        this.floater(at.x, at.y - STRIKE_FLOAT, ev.left ? `${SIEGE_NAMES[ev.part]} shudders: ${ev.left} more ${ev.left === 1 ? 'strike' : 'strikes'}` : `${SIEGE_NAMES[ev.part]} falls!`, ev.left ? INK.text : INK.title);
        await this.wait(260);
        return;
      }
      case 'moat': {
        const u = this.units.get(ev.stack)!;
        this.hit(u.fig);
        this.floatAt(u.fig, `Moat: −${ev.damage}${ev.kills ? `  ${ev.kills} fall` : ''}`, INK.damage);
        this.syncOne(after, ev.stack);
        await this.wait(350);
        return;
      }
      case 'fall': {
        const u = this.units.get(ev.stack)!;
        const to = feetOn(footprintAt(ev.to, sizeOf(stackById(after, ev.stack).creature), stackById(after, ev.stack).side) ?? [ev.to]);
        u.badge.setVisible(false);
        u.fig.sortOn(null);
        await this.glide(u.fig, to, FALL_MS, 'Quad.easeIn');
        this.floatAt(u.fig, 'The tower falls!', INK.damage);
        await this.wait(250);
        return;
      }
      case 'wait':
      case 'defend': {
        this.floatAt(this.units.get(ev.stack)!.fig, ev.type === 'wait' ? 'waits' : 'defends', INK.text);
        await this.wait(250);
        return;
      }
      case 'heal': {
        const t = this.units.get(ev.target)!;
        this.floatAt(t.fig, `+${ev.amount} health`, INK.good);
        this.syncOne(after, ev.target);
        await this.wait(250);
        return;
      }
      case 'morale': {
        this.floatAt(this.units.get(ev.stack)!.fig, ev.good ? 'High morale! Again!' : 'Low morale: falters', ev.good ? INK.good : INK.damage, 10);
        await this.wait(450);
        return;
      }
      case 'afflict': {
        this.floatAt(this.units.get(ev.stack)!.fig, ev.effect === 'curse' ? 'Cursed!' : 'Poisoned!', INK.damage, 10);
        await this.wait(350);
        return;
      }
      case 'poison': {
        const u = this.units.get(ev.stack)!;
        this.hit(u.fig);
        this.floatAt(u.fig, `Poison: −${ev.damage}${ev.kills ? `  ${ev.kills} fall` : ''}`, INK.damage);
        this.syncOne(after, ev.stack);
        await this.wait(350);
        return;
      }
      case 'rebirth': {
        const u = this.units.get(ev.stack)!;
        this.syncOne(after, ev.stack);
        await this.flash(u.fig);
        this.floatAt(u.fig, `Rises again! ${ev.count}`, INK.good, 10);
        await this.wait(450);
        return;
      }
      case 'stone': {
        this.floatAt(this.units.get(ev.stack)!.fig, ev.lost ? 'Stone: loses its turn' : 'Turned to stone!', INK.damage, 10);
        await this.wait(450);
        return;
      }
      case 'flee': {
        // The hero rides off, and the companies left to them melt away with them.
        const name = before.heroes[ev.side]?.name ?? 'The enemy';
        this.floater(WORLD.w / 2, WORLD.h / 2, `${name} flees the field!`, INK.title, true);
        const going = [...this.units.values()].filter((u) => u.side === ev.side);
        const fig = this.heroes[ev.side];
        const sprites = [...going.flatMap((u) => [u.fig.sprite, u.badge]), ...(fig ? [fig.sprite] : [])];
        this.scene.tweens.add({ targets: sprites, alpha: 0, duration: FLEE_FADE });
        await this.wait(FLEE_FADE + 200);
        return;
      }
      case 'round': {
        if (ev.round > 1) {
          this.floater(WORLD.w / 2, WORLD.h / 2, `Round ${ev.round}`, INK.title, true);
          await this.wait(350);
        }
        return;
      }
      default:
        return;
    }
  }

  private async playMove(id: number, path: readonly Hex[], flies: boolean, from: Stack): Promise<void> {
    // A swooper flies off right after its strike: let the lunge finish first.
    await this.recovered;
    const u = this.units.get(id)!;
    u.badge.setVisible(false);
    if (!flies && throughGate(path)) await this.walls?.openGate();
    u.fig.walk();
    // The sprite follows the footprint: a bigger unit's midpoint as its head steps along the path.
    const feetAt = (head: Hex): { x: number; y: number } => feetOn(footprintAt(head, sizeOf(from.creature), from.side) ?? [head]);
    if (flies) {
      const to = feetAt(path[path.length - 1]!);
      if (to.x !== u.fig.feet.x) u.fig.face(to.x < u.fig.feet.x);
      await this.fly(u.fig, to);
    } else {
      for (const h of path) {
        const to = feetAt(h);
        if (to.x !== u.fig.feet.x) u.fig.face(to.x < u.fig.feet.x);
        await this.glide(u.fig, to, WALK_MS, 'Linear');
      }
    }
    u.fig.idle();
    await this.wait(SETTLE_MS);
    u.fig.face(from.side === 1);
  }

  /**
   * Faces the foe, steps in through the wind-up (melee) or looses a shot, and
   * resolves as the blow lands. A melee striker keeps its side's facing
   * unless the foe is behind it (facesTarget, as VCMI), when it turns round
   * for the blow and back after; a retaliation is judged the same way with
   * the roles swapped. A shooter turns toward its target.
   */
  private async playStrike(a: UnitSprite, t: UnitSprite, ranged: boolean, striker: Stack, target: Stack): Promise<void> {
    const facing = a.fig.facingLeft;
    const natural = striker.side === 1;
    if (ranged) {
      if (t.fig.feet.x !== a.fig.feet.x) a.fig.face(t.fig.feet.x < a.fig.feet.x);
    } else if (!adjacent(striker, target)) a.fig.face(t.fig.feet.x < a.fig.feet.x); // `after` has a swooper home already: go by the sprites.
    else a.fig.face(facesTarget(striker.side, occupiedHexes(striker), occupiedHexes(target)) ? natural : !natural);
    const home = { ...a.fig.feet };
    const lunge = { x: home.x + (t.fig.feet.x - home.x) * LUNGE, y: home.y + (t.fig.feet.y - home.y) * LUNGE };
    if (!ranged) void this.glide(a.fig, lunge, Math.max(120, a.fig.msToStrike()), 'Quad.easeIn');
    let struck!: () => void;
    const blow = new Promise<void>((resolve) => (struck = resolve));
    const swing = a.fig.attack(struck);
    await blow;
    // The slingers (all three levels) throw stones; the other shooters loose arrows.
    if (ranged) await this.projectile(a.fig, t.fig, lineOf(striker.creature) !== 'bowman');
    else this.recovered = swing.then(() => this.glide(a.fig, home, 200, 'Quad.easeOut'));
    void swing.then(() => a.fig.face(facing));
  }

  private syncOne(state: BattleState, id: number): void {
    const s = stackById(state, id);
    const u = this.units.get(id)!;
    this.setBadge(u, s.count, alive(s));
    if (alive(s)) return;
    getSound(this.scene)?.play('death');
    // No tilt in pixel art: the fallen blink, then fade away.
    const img = u.fig.sprite;
    this.scene.tweens.add({
      targets: img, alpha: { from: 1, to: 0.25 }, duration: 70, yoyo: true, repeat: 2,
      onComplete: () => this.scene.tweens.add({ targets: img, alpha: 0, duration: 320, onComplete: () => img.setVisible(false).setAlpha(1) }),
    });
  }

  /** A stone (slinger) or an arrow (centaur), whole pixels, from where the art looses it to the target. */
  private async projectile(from: PixelFigure, to: PixelFigure, arrow: boolean): Promise<void> {
    const start = from.shotPoint();
    const end = to.chest();
    const shot = this.scene.add.image(start.x, start.y, arrow ? PX_TEX.arrow : PX_TEX.stone).setDepth(DEPTH.shot);
    if (arrow) shot.setOrigin(1, 0.5).setFlipX(end.x < start.x);
    else shot.setOrigin(0.5);
    this.cams.world.add(shot);
    const arc = arrow ? 0 : STONE_ARC;
    const ms = 160 + Math.hypot(end.x - start.x, end.y - start.y) * 0.9;
    await this.counter(ms, 'Linear', (u) => {
      shot.setPosition(Math.round(start.x + (end.x - start.x) * u), Math.round(start.y + (end.y - start.y) * u - arc * Math.sin(Math.PI * u)));
    });
    shot.destroy();
  }

  /** A blow lands: a red flash and a two-pixel jolt. */
  private hit(fig: PixelFigure): void {
    fig.sprite.setTint(0xd0574e);
    this.scene.time.delayedCall(90, () => fig.restTint());
    [2, -2, 2, 0].forEach((dx, i) => this.scene.time.delayedCall(40 * (i + 1), () => fig.offset(0, dx)));
  }

  /** A spell lands: the target blinks pale gold. */
  private async flash(fig: PixelFigure): Promise<void> {
    for (let i = 0; i < 3; i++) {
      fig.sprite.setTint(0xfff3c0).setTintMode(Phaser.TintModes.FILL);
      await this.wait(70);
      fig.restTint();
      await this.wait(70);
    }
  }

  private floatAt(fig: PixelFigure, text: string, ink: Rgba, extra = 0): void {
    this.floater(fig.feet.x, fig.feet.y - Math.round(fig.art.footY * FLOAT_ABOVE) - extra, text, ink);
  }

  /** A walker or a lunge: straight there, whole pixels every frame. */
  private glide(fig: PixelFigure, to: { x: number; y: number }, ms: number, ease: string): Promise<void> {
    const from = { ...fig.feet };
    return this.counter(ms, ease, (u) => fig.setFeet(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u));
  }

  /** A flyer takes off, beats across in an arc (longer flights take longer) and lands. */
  private async fly(fig: PixelFigure, to: { x: number; y: number }): Promise<void> {
    const from = { ...fig.feet };
    const ms = Phaser.Math.Clamp(260 + Math.hypot(to.x - from.x, to.y - from.y) * 3, 360, 950);
    await this.counter(ms, 'Sine.easeInOut', (u) => {
      fig.setFeet(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u);
      fig.offset(FLY_LIFT * Math.sin(Math.PI * u));
    });
    fig.offset(0);
    fig.setFeet(to.x, to.y);
  }

  /** Runs `step(u)` with u eased from 0 to 1 over `ms`. */
  private counter(ms: number, ease: string, step: (u: number) => void): Promise<void> {
    return new Promise((resolve) => this.scene.tweens.addCounter({
      from: 0, to: 1, duration: ms, ease,
      onUpdate: (tw) => step(tw.getValue() ?? 0),
      onComplete: () => {
        step(1);
        resolve();
      },
    }));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  /** Extends the background to cover the canvas as it is now (after a resize). */
  fitBackdrop(): void {
    this.backdrop.fit(this.cams.margin());
  }

  /** Every unit's and hero's animation. */
  update(delta: number): void {
    this.backdrop.update(delta);
    for (const u of this.units.values()) u.fig.update(delta);
    for (const h of this.heroes) h?.update(delta);
  }

  destroy(): void {
    for (const u of this.units.values()) {
      u.fig.destroy();
      u.badge.destroy();
    }
    for (const h of this.heroes) h?.destroy();
    for (const o of this.extras) o.destroy();
    this.walls?.destroy();
    this.backdrop.destroy();
    for (const key of [GRID_KEY, MARKS_KEY]) if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
  }
}
