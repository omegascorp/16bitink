import Phaser from 'phaser';
import { getHost, getSound } from '../host';
import { afterBattle, battleSides, DEFEND, gridOf } from '../logic/adventure';
import { act, activeStack, alive, canShoot, conquer, createBattle, experienceFor, moveHeadFor, occupiableHexes, stackAt, strikeChoices, strikeFrom, type BattleSide, type StrikeOption } from '../logic/battle';
import { chooseAction } from '../logic/battleAi';
import { cantCast, spellAmount } from '../logic/battleSpells';
import type { Action, BattleState, Stack } from '../logic/battleTypes';
import { creature } from '../logic/creatures';
import { damageRange, hurt, RANGE_PENALTY_DISTANCE, speedOf } from '../logic/damage';
import { footprintAt, isWide, occupiedHexes, shotDistance } from '../logic/footprint';
import type { Hex } from '../logic/hex';
import { tileIndex } from '../logic/map';
import { SPELLS, type SpellId } from '../logic/spells';
import { BattleCameras } from './battle/battleCameras';
import { BattleHud } from './battle/battleHud';
import { BattleView, type ViewOpts } from './battle/battleView';
import { unitInfo } from './battle/unitCard';
import { backdropSource, loadBattleArt } from './battle/pixelAssets';
import { texturePixels } from './battle/pixelUi';
import { hexAtPx, hexPx } from './battle/pixelLayout';
import { crispText } from './hidpi';
import type { MapScene } from './MapScene';
import { coverWhileLoading } from './LoadingScene';
import { PixelCursors, swordDir, type CursorKind } from './pixelCursors';
import { Session } from './session';

/** Pause before an AI unit acts, so the player can follow. */
const AI_DELAY = 380;

/** A battle set up directly, without a map (the dev sandbox). */
export interface SandboxBattle {
  readonly attacker: BattleSide;
  readonly defender: BattleSide;
  readonly seed: number;
  readonly terrain: string;
  readonly heroes: readonly [boolean, boolean];
  /** Keep the obstacles the battle rolled. */
  readonly obstacles: boolean;
  /** Run turns (the AI plays side 1; `auto` plays side 0 too); otherwise the field stays still for review. */
  readonly play: boolean;
  readonly auto: boolean;
  readonly view?: ViewOpts;
  /** Called once the field is drawn. */
  readonly onReady?: () => void;
}

interface BattleData {
  readonly monsterId: string;
  /** The site the monster guarded, taken on a win. */
  readonly then?: string;
  readonly sandbox?: SandboxBattle;
}

/** What tapping a hex would do now, and the hexes to light for it: where the unit would stand, and the hex it would strike. */
type Intent = { action: Action; text: string; key: string; landing?: readonly Hex[]; struck?: readonly Hex[]; cursor?: CursorKind; info?: Stack } | null;

/** The way a blow from hex `from` into hex `to` travels on screen, as a sword cursor direction. */
function swordDirBetween(from: Hex, to: Hex): ReturnType<typeof swordDir> {
  const a = hexPx(from);
  const b = hexPx(to);
  return swordDir(b.x - a.x, b.y - a.y);
}

/**
 * A battle with a map monster. The player taps lit hexes to move and enemies
 * to strike (the side tapped is where the strike comes from); the neutral
 * AI plays the other side. Auto plays the player's side too.
 */
export class BattleScene extends Phaser.Scene {
  private session: Session | null = null;
  private sandbox: SandboxBattle | null = null;
  private cams!: BattleCameras;
  private cursors!: PixelCursors;
  private hud!: BattleHud;
  private monsterId = '';
  private then: string | undefined;
  private state!: BattleState;
  private view!: BattleView;
  /** The field is laid out (not still painting the fighters' poses). */
  private live = false;
  private busy = false;
  /** An AI (or Auto) turn is counting down: only one may wait at a time. */
  private aiPending = false;
  private auto = false;
  private casting: SpellId | null = null;
  private pending: string | null = null;

  constructor() {
    super('Battle');
  }

  create(data: BattleData): void {
    crispText(this);
    this.cams = new BattleCameras(this);
    this.sandbox = data.sandbox ?? null;
    this.session = this.sandbox ? null : Session.get(this);
    this.monsterId = data.monsterId;
    this.then = data.then;
    this.busy = false;
    this.aiPending = false;
    this.auto = this.sandbox?.auto ?? false;
    this.casting = null;
    this.pending = null;
    this.live = false;
    const { sides, terrain, heroes } = this.setup(data);
    const start = createBattle(sides.attacker, sides.defender, sides.seed);
    this.state = this.sandbox && !this.sandbox.obstacles ? { ...start.state, obstacles: [] } : start.state;
    // The loading screen stays up until every fighter's poses and the ground are in and laid out.
    const cover = coverWhileLoading(this, 'the armies form up…');
    void loadBattleArt(this, this.state.stacks.map((s) => s.creature), terrain)
      .then(() => cover.laying('the armies take the field…'))
      .then(() => {
        if (this.sys.isActive()) this.begin(terrain, sides.seed, heroes);
        cover.close();
      });
  }

  /** The two sides, the ground and who has a hero: from the map (the monster fought) or the sandbox. */
  private setup(data: BattleData): { sides: { attacker: BattleSide; defender: BattleSide; seed: number }; terrain: string; heroes: readonly [boolean, boolean] } {
    const sb = this.sandbox;
    if (sb) return { sides: sb, terrain: sb.terrain, heroes: sb.heroes };
    const session = this.session!;
    const adv = session.adv;
    const sides = battleSides(adv, data.monsterId);
    const g = gridOf(session.def);
    const terrain = g.terrain[tileIndex(g, adv.hero.x, adv.hero.y)]!;
    return { sides, terrain: terrain === 'water' ? 'grass' : terrain, heroes: [!!sides.attacker.hero, !!sides.defender.hero] };
  }

  /** Lays out the field and the bar, wires the input and starts the first turn. */
  private begin(terrain: string, seed: number, heroes: readonly [boolean, boolean]): void {
    this.hud = new BattleHud(this, this.cams, {
      wait: () => this.playerAct({ type: 'wait' }),
      defend: () => this.playerAct({ type: 'defend' }),
      spell: () => this.openSpells(),
      auto: () => this.toggleAuto(),
      ...(getHost(this)?.cheats && this.session ? { win: () => this.cheatWin() } : {}),
    }, !!this.state.heroes[0]?.spells.length);
    this.hud.setAuto(this.auto);
    const src = backdropSource(terrain, seed);
    if ('scenery' in src) this.hud.setScenery({ atlas: texturePixels(this, src.atlasKey), art: src.scenery, seed });
    this.view = new BattleView(this, this.cams, this.state, terrain, seed, heroes, (x, y, text, ink, big) => this.hud.float(x, y, text, ink, big), this.sandbox?.view);
    this.live = true;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.cursors = new PixelCursors(this.game.canvas);
    this.input.mouse?.disableContextMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.view.destroy();
      this.hud.destroy();
      this.cursors.reset();
    });
    // A pointer over a button (or a card) is the interface's, not the field's.
    this.input.on('pointermove', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => (over.length ? this.cursors.set(null) : this.hover(p)));
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.tap(p);
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-W', () => this.playerAct({ type: 'wait' }));
    kb?.on('keydown-D', () => this.playerAct({ type: 'defend' }));
    kb?.on('keydown-C', () => this.openSpells());
    kb?.on('keydown-A', () => this.toggleAuto());
    if (this.sandbox && !this.sandbox.play) {
      // Review: the field holds still, the first unit lit.
      this.drawOrder();
      this.marks();
      const a = activeStack(this.state);
      if (a) this.hud.setStatus(`${creature(a.creature).plural} (${a.count})`);
      this.sandbox.onReady?.();
      return;
    }
    if (this.sandbox) this.sandbox.onReady?.();
    else {
      this.cams.world.setAlpha(0);
      this.tweens.add({ targets: this.cams.world, alpha: 1, duration: 300 });
    }
    void this.next();
  }

  update(_t: number, delta: number): void {
    if (this.live) this.view.update(delta);
  }

  /** The pixel world at its whole-number zoom, centred, its background to the canvas's edges, and the interface round it. */
  private layout(): void {
    this.cams.refit();
    this.view.fitBackdrop();
    this.hud.layout();
    if (this.state) this.drawOrder();
  }

  private mine(): boolean {
    const a = activeStack(this.state);
    return !!a && a.side === 0 && !this.auto && !this.byItself(a);
  }

  /** Whose turn plays itself: the enemy's, a war machine's, or all under Auto. */
  private byItself(a: Stack): boolean {
    return a.side === 1 || this.auto || !!creature(a.creature).machine;
  }

  /** Runs the next turn: the AI's (or Auto's), or waits for the player. */
  private async next(): Promise<void> {
    if (this.state.winner !== null) {
      this.finish();
      return;
    }
    this.drawOrder();
    const a = activeStack(this.state)!;
    if (this.byItself(a)) {
      if (this.aiPending) return;
      this.aiPending = true;
      this.marks();
      this.hud.setStatus(`${creature(a.creature).plural} act`);
      await new Promise((r) => this.time.delayedCall(AI_DELAY, r));
      this.aiPending = false;
      // Auto may have been switched off during the pause: then it's the player's move after all.
      const now = activeStack(this.state);
      if (this.state.winner !== null || !now || this.busy) return;
      if (this.byItself(now)) await this.perform(chooseAction(this.state));
      else void this.next();
      return;
    }
    this.hud.setStatus(`${creature(a.creature).plural} (${a.count}): your move`);
    this.marks();
  }

  private async perform(action: Action): Promise<void> {
    if (this.busy) return;
    this.cursors.set(null);
    const before = this.state;
    let step: ReturnType<typeof act>;
    try {
      step = act(before, action);
    } catch {
      // An action that isn't allowed now changes nothing, and the battle stays ready for the next.
      this.hud.setStatus('That can’t be done now');
      return;
    }
    this.busy = true;
    this.pending = null;
    this.view.showMarks({ active: null, reach: [], targets: [] });
    let s = before;
    for (const ev of step.events) {
      if (ev.type === 'strike') getSound(this)?.play(ev.ranged ? 'shoot' : 'hit');
      await this.view.play(ev, s, step.state);
      if (ev.type === 'move') this.view.sync({ ...s, stacks: s.stacks.map((x) => (x.id === ev.stack ? { ...x, hex: ev.path[ev.path.length - 1]! } : x)) });
      s = step.state;
    }
    this.state = step.state;
    this.view.sync(this.state);
    this.busy = false;
    void this.next();
  }

  private playerAct(action: Action): void {
    if (this.busy || !this.mine() || this.hud.modal) return;
    if (action.type === 'wait' && activeStack(this.state)?.waited) {
      this.hud.setStatus('Already waited this round: move, attack or defend');
      return;
    }
    void this.perform(action);
  }

  /** The testing cheat: on the player's turn, the battle ends in a win. */
  private cheatWin(): void {
    if (this.state.winner !== null || this.busy || this.hud.modal) return;
    this.auto = false;
    this.hud.setAuto(false);
    this.state = conquer(this.state);
    this.finish();
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    this.hud.setAuto(this.auto);
    if (this.auto && !this.busy && !this.aiPending) void this.next();
  }

  /** Lights the active unit, where it can go and whom it can hit. */
  private marks(hover: Hex | null = null, intent: Intent = null): void {
    const a = activeStack(this.state);
    if (!a) return;
    const mine = this.mine();
    // Every hex a move could cover (a two-hex unit's tails included), and every hex of each enemy it can hit.
    const reach = mine ? [...occupiableHexes(this.state)] : [];
    const targets = mine ? this.state.stacks.filter((s) => s.side !== a.side && alive(s) && (canShoot(this.state, a) || strikeFrom(this.state, s).size > 0)).flatMap(occupiedHexes) : [];
    this.view.showMarks({ active: occupiedHexes(a), reach, targets, hover, landing: intent?.landing, struck: intent?.struck });
  }

  private hexAt(p: Phaser.Input.Pointer): Hex | null {
    const w = this.cams.toWorld(p.x, p.y);
    return hexAtPx(Math.floor(w.x), Math.floor(w.y));
  }

  /** What tapping this point would do, with its preview text. */
  private intent(p: Phaser.Input.Pointer): Intent {
    if (!this.mine() || this.busy) return null;
    const me = activeStack(this.state)!;
    const h = this.hexAt(p);
    if (h === null) return null;
    const target = stackAt(this.state, h);
    if (this.casting) {
      if (!target) return null;
      const why = cantCast(this.state, 0, this.casting, target);
      const def = SPELLS[this.casting];
      if (why) return { action: { type: 'wait' }, text: why, key: 'no' };
      const amount = spellAmount(this.state, 0, this.casting);
      const extra = def.target === 'enemy' && amount ? `: ${amount} damage, ${hurt(target, amount).kills} fall` : '';
      return { action: { type: 'cast', spell: this.casting, target: target.id }, text: `Cast ${def.name} on the ${creature(target.creature).plural}${extra}`, key: `cast-${target.id}`, cursor: 'cast' };
    }
    if (target && target.side !== me.side) {
      const name = creature(target.creature).plural;
      if (canShoot(this.state, me)) {
        const d = shotDistance(me, target);
        const far = d > RANGE_PENALTY_DISTANCE;
        return { action: { type: 'shoot', target: target.id }, text: `Shoot the ${name}: ${this.preview(me, target, { ranged: true, distance: d, moved: 0 })}${far ? ' (far: half damage)' : ''}`, key: `shoot-${target.id}`, cursor: far ? 'shootFar' : 'shoot' };
      }
      const o = this.bestOption(p, target);
      if (!o) return this.infoIntent(target, `The ${name} are out of reach · click for their stats`);
      return {
        action: { type: 'attack', target: target.id, from: o.from }, text: `Attack the ${name}: ${this.preview(me, target, { ranged: false, distance: 1, moved: o.steps })}`,
        key: `attack-${target.id}-${o.from}-${o.struck}`, landing: o.hexes, struck: [o.struck],
        cursor: `sword-${swordDirBetween(o.contact, o.struck)}`,
      };
    }
    if (target) return this.infoIntent(target, `${target.count} ${creature(target.creature).plural} · click for their stats`);
    // A tap on any hex the unit could cover moves it there (a tail spot gives its head).
    const head = target ? null : moveHeadFor(this.state, h);
    if (head === null) return null;
    return { action: { type: 'move', to: head }, text: 'Move here', key: `move-${head}`, landing: footprintAt(head, isWide(me.creature), me.side) ?? [head], cursor: 'move' };
  }

  /** Hovering a unit there's nothing to do to: the "?" cursor, and a click shows its stats. */
  private infoIntent(target: Stack, text: string): Intent {
    return { action: { type: 'wait' }, text, key: `info-${target.id}`, cursor: 'info', info: target };
  }

  /** Opens a unit's stats card. */
  private showUnit(s: Stack): void {
    this.hud.openUnit(unitInfo(this.state, s));
  }

  /** "12–18 damage, 1–2 fall" */
  private preview(a: Stack, d: Stack, ctx: { ranged: boolean; distance: number; moved: number }): string {
    const r = damageRange(this.state, a, d, ctx);
    const k0 = hurt(d, r.min).kills;
    const k1 = hurt(d, r.max).kills;
    return `${r.min === r.max ? r.min : `${r.min}–${r.max}`} damage, ${k0 === k1 ? k0 : `${k0}–${k1}`} fall`;
  }

  /** Of the places the active unit can strike `target` from, the one whose touching hex is nearest the pointer. */
  private bestOption(p: Phaser.Input.Pointer, target: Stack): StrikeOption | null {
    const f = this.cams.toWorld(p.x, p.y);
    let best: StrikeOption | null = null;
    let bd = Infinity;
    for (const o of strikeChoices(this.state, target)) {
      const c = hexPx(o.contact);
      const d = Math.hypot(c.x - f.x, c.y - f.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private hover(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) return;
    if (this.busy) {
      this.cursors.set(null);
      return;
    }
    const i = this.intent(p);
    this.cursors.set(i?.cursor ?? null);
    if (this.mine()) {
      this.marks(this.hexAt(p), i);
      const a = activeStack(this.state)!;
      this.hud.setStatus(i?.text ?? (this.casting ? `Choose a target for ${SPELLS[this.casting].name}` : `${creature(a.creature).plural} (${a.count}): your move`));
    }
  }

  private tap(p: Phaser.Input.Pointer): void {
    if (this.hud.modal) return;
    // A right click on any unit shows its stats, whoever's turn it is (as in Heroes 3).
    if (p.rightButtonReleased()) {
      const h = this.hexAt(p);
      const s = h === null ? undefined : stackAt(this.state, h);
      if (s) this.showUnit(s);
      return;
    }
    if (this.busy || !this.mine()) return;
    const i = this.intent(p);
    if (i?.info) {
      this.showUnit(i.info);
      return;
    }
    if (!i || i.key === 'no') {
      if (i) this.hud.setStatus(i.text);
      return;
    }
    // On touch, the first tap shows what would happen; a second tap on the same thing does it.
    if (p.wasTouch && this.pending !== i.key) {
      this.pending = i.key;
      this.marks(this.hexAt(p), i);
      this.hud.setStatus(`${i.text} · tap again`);
      return;
    }
    if (i.action.type === 'cast') {
      this.casting = null;
      getSound(this)?.play('spell');
      const step = act(this.state, i.action);
      void this.playCast(step);
      return;
    }
    void this.perform(i.action);
  }

  private async playCast(step: ReturnType<typeof act>): Promise<void> {
    this.busy = true;
    for (const ev of step.events) await this.view.play(ev, this.state, step.state);
    this.state = step.state;
    this.view.sync(this.state);
    this.busy = false;
    void this.next();
  }

  private openSpells(): void {
    if (this.busy || !this.mine() || this.hud.modal) return;
    const hero = this.state.heroes[0];
    if (!hero || hero.spells.length === 0) return;
    this.hud.openBook({
      mana: hero.mana,
      spells: hero.spells,
      why: (id) => cantCast(this.state, 0, id, null),
      onPick: (id) => {
        this.casting = id;
        this.hud.setStatus(`Choose a target for ${SPELLS[id].name}`);
      },
      note: this.state.cast[0] ? 'Your hero has already cast a spell this round.' : 'Cast one spell a round; your unit still takes its turn.',
    });
  }

  /** The units still to act this round, in order: the turn order's faces. */
  private drawOrder(): void {
    const live = this.state.stacks.filter((s) => alive(s) && !s.acted);
    const fresh = live.filter((s) => !s.waited).sort((a, b) => speedOf(b) - speedOf(a));
    const waited = live.filter((s) => s.waited).sort((a, b) => speedOf(a) - speedOf(b));
    this.hud.setOrder([...fresh, ...waited]);
  }

  private finish(): void {
    const won = this.state.winner === 0;
    if (!this.session) {
      this.hud.openCard({ title: won ? 'Victory!' : 'Defeat', body: 'Sandbox battle over.', buttons: [{ label: 'Again', onClick: () => this.scene.restart() }] });
      return;
    }
    const session = this.session;
    const adv = session.adv;
    const lost = adv.hero.army.map((slot, i) => {
      const st = this.state.stacks.find((x) => x.side === 0 && x.slot === i);
      return slot && st ? { name: creature(slot.creature).plural, n: st.startCount - st.count } : null;
    }).filter((x): x is { name: string; n: number } => !!x && x.n > 0);
    const xp = experienceFor(this.state, 0);
    getSound(this)?.play(won ? 'win' : 'lose');
    const done = (): void => {
      session.set(afterBattle(session.adv, session.def, this.monsterId, this.state, this.then));
      this.scene.stop();
      (this.scene.get('Map') as MapScene).back();
    };
    this.hud.openCard({
      title: won ? 'Victory!' : 'Defeat',
      body: won
        ? `${lost.length ? `Fallen: ${lost.map((l) => `${l.n} ${l.name}`).join(', ')}.` : 'Not one of yours fell.'}\n+${xp} experience`
        : this.monsterId.startsWith(DEFEND) ? `The garrison is beaten, and the town falls.` : `${adv.hero.name}'s army is beaten.`,
      buttons: [{ label: won ? 'Back to the map' : 'Go on', onClick: done }],
    });
  }
}
