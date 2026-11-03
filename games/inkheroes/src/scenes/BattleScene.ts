import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { BANNER, UI, UI_HEX } from '../art/palette';
import type { PlateKind } from '../art/uiArtParts';
import { TEX } from '../art/textures';
import { getSound } from '../host';
import { afterBattle, battleSides, gridOf } from '../logic/adventure';
import { act, activeStack, alive, canShoot, createBattle, experienceFor, moveHeadFor, occupiableHexes, stackAt, strikeFrom, strikeOptions, type BattleSide, type StrikeOption } from '../logic/battle';
import { chooseAction } from '../logic/battleAi';
import { cantCast, spellAmount } from '../logic/battleSpells';
import type { Action, BattleState, Stack } from '../logic/battleTypes';
import { creature } from '../logic/creatures';
import { damageRange, hurt, speedOf } from '../logic/damage';
import { footprintAt, isWide, occupiedHexes, shotDistance } from '../logic/footprint';
import type { Hex } from '../logic/hex';
import { tileIndex } from '../logic/map';
import { SPELLS, type SpellId } from '../logic/spells';
import { openCard } from './CardScene';
import { BattleCameras } from './battle/battleCameras';
import { BattleView, type ViewOpts } from './battle/battleView';
import { loadBattleArt } from './battle/pixelAssets';
import { FIELD_RECT, hexAtPx, hexPx } from './battle/pixelLayout';
import { crispText, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { loadingText } from './ui';
import { paintedButton, title } from './uiPaint';

/** The action bar with the turn order over the buttons, below the field when the screen has that much spare height, CSS px. */
const BAR_H = 96;
/** The turn order's height (its portraits stand over their discs), CSS px. */
const ORDER_ROW = 44;
const BTN = { w: 108, h: 42, gap: 8 } as const;
/** Turn-order slots: spacing, and how many at most. */
const ORDER_STEP = 44;
const ORDER_MAX = 9;
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
type Intent = { action: Action; text: string; key: string; landing?: readonly Hex[]; struck?: readonly Hex[] } | null;

/**
 * A battle with a map monster. The player taps lit hexes to move and enemies
 * to strike (the side tapped is where the strike comes from); the neutral
 * AI plays the other side. Auto plays the player's side too.
 */
export class BattleScene extends Phaser.Scene {
  private session: Session | null = null;
  private sandbox: SandboxBattle | null = null;
  private cams!: BattleCameras;
  /** How many turn-order slots fit the bar as laid out. */
  private orderMax = ORDER_MAX;
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
  private status!: Phaser.GameObjects.Text;
  private order!: Phaser.GameObjects.Container;
  private bar!: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Container[] = [];
  private autoBtn!: Phaser.GameObjects.Container;

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
    const v = viewSize(this);
    const label = loadingText(this, v.width / 2, v.height / 2, 'the armies form up…', 32);
    this.cams.hud.add(label);
    void loadBattleArt(this, this.state.stacks.map((s) => s.creature), terrain).then(() => {
      if (!this.sys.isActive()) return;
      label.destroy();
      this.begin(terrain, sides.seed, heroes);
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
    this.view = new BattleView(this, this.cams, this.state, terrain, seed, heroes, this.sandbox?.view);
    this.live = true;
    this.status = title(this, 0, 4, '', 18, { color: UI.text }).setOrigin(0.5, 0);
    this.cams.hud.add(this.status);
    this.buildBar();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.view.destroy();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.hover(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.tap(p));
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
      if (a) this.status.setText(`${creature(a.creature).plural} (${a.count})`);
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

  /**
   * The pixel world at its whole-number zoom, centred. With room to spare
   * below it (a phone held upright) the bar goes there, the turn order over
   * the buttons; otherwise the buttons stand in the field's lower side
   * margins under the heroes, as in Heroes 3, and the turn order and the
   * messages go in the backdrop band over the field.
   */
  private layout(): void {
    this.cams.refit();
    this.view.fitBackdrop();
    const v = viewSize(this);
    const r = this.cams.rect();
    if (v.height - (r.y + r.h) >= BAR_H) {
      this.status.setPosition(v.width / 2, r.y >= 28 ? r.y - 26 : 2);
      const y = Math.min(r.y + r.h + 4 + BAR_H / 2, v.height - BAR_H / 2);
      this.bar.setPosition(v.width / 2, y).setScale(Math.min(1, v.width / 760));
      [-300, -180, -60, 240].forEach((x, i) => this.buttons[i]!.setPosition(x, 22).setScale(1));
      this.order.setPosition(0, -22).setScale(1);
      this.orderMax = ORDER_MAX;
    } else {
      this.status.setPosition(v.width / 2, r.y + 2);
      this.bar.setPosition(0, 0).setScale(1);
      // Each lower corner of the screen, between its edge and the field's, under the hero.
      const zone = r.x + FIELD_RECT.x * r.k;
      const s = Phaser.Math.Clamp((zone - 8) / BTN.w, 0.6, 1);
      const bottom = v.height - 8;
      const half = Math.ceil(this.buttons.length / 2);
      this.buttons.forEach((b, i) => {
        const right = i >= half;
        const row = right ? this.buttons.length - 1 - i : half - 1 - i;
        const y = bottom - (BTN.h / 2 + row * (BTN.h + BTN.gap)) * s;
        b.setPosition(right ? v.width - zone / 2 : zone / 2, y).setScale(s);
      });
      // The turn order under the messages, in the band over the field.
      const os = Phaser.Math.Clamp((FIELD_RECT.y * r.k - 30) / ORDER_ROW, 0.6, 1);
      this.order.setPosition(v.width / 2, r.y + 30 + (ORDER_ROW / 2) * os).setScale(os);
      this.orderMax = Phaser.Math.Clamp(Math.floor((FIELD_RECT.w * r.k) / (ORDER_STEP * os)), 0, ORDER_MAX);
    }
    if (this.state) this.drawOrder();
  }

  private buildBar(): void {
    const btn = (x: number, label: string, fn: () => void, kind: PlateKind = 'plain'): Phaser.GameObjects.Container =>
      paintedButton(this, x, 22, label, fn, { width: BTN.w, height: BTN.h, size: 15, kind });
    this.order = this.add.container(0, -22);
    this.autoBtn = btn(240, 'Auto', () => this.toggleAuto(), 'crown');
    this.buttons = [
      btn(-300, 'Wait', () => this.playerAct({ type: 'wait' })),
      btn(-180, 'Defend', () => this.playerAct({ type: 'defend' })),
      btn(-60, 'Spell', () => this.openSpells(), 'crown'),
      this.autoBtn,
    ];
    this.bar = this.add.container(0, 0, [this.order, ...this.buttons]);
    this.cams.hud.add(this.bar);
  }

  private mine(): boolean {
    const a = activeStack(this.state);
    return !!a && a.side === 0 && !this.auto;
  }

  /** Runs the next turn: the AI's (or Auto's), or waits for the player. */
  private async next(): Promise<void> {
    if (this.state.winner !== null) {
      this.finish();
      return;
    }
    this.drawOrder();
    const a = activeStack(this.state)!;
    if (a.side === 1 || this.auto) {
      if (this.aiPending) return;
      this.aiPending = true;
      this.marks();
      this.status.setText(`${creature(a.creature).plural} act`);
      await new Promise((r) => this.time.delayedCall(AI_DELAY, r));
      this.aiPending = false;
      // Auto may have been switched off during the pause: then it's the player's move after all.
      const now = activeStack(this.state);
      if (this.state.winner !== null || !now || this.busy) return;
      if (now.side === 1 || this.auto) await this.perform(chooseAction(this.state));
      else void this.next();
      return;
    }
    this.status.setText(`${creature(a.creature).plural} (${a.count}): your move`);
    this.marks();
  }

  private async perform(action: Action): Promise<void> {
    if (this.busy) return;
    const before = this.state;
    let step: ReturnType<typeof act>;
    try {
      step = act(before, action);
    } catch {
      // An action that isn't allowed now changes nothing, and the battle stays ready for the next.
      this.status.setText('That can’t be done now');
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
    if (this.busy || !this.mine()) return;
    if (action.type === 'wait' && activeStack(this.state)?.waited) {
      this.status.setText('Already waited this round: move, attack or defend');
      return;
    }
    void this.perform(action);
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    (this.autoBtn.list[1] as Phaser.GameObjects.Text).setText(this.auto ? 'Stop' : 'Auto');
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
      return { action: { type: 'cast', spell: this.casting, target: target.id }, text: `Cast ${def.name} on the ${creature(target.creature).plural}${extra}`, key: `cast-${target.id}` };
    }
    if (target && target.side !== me.side) {
      const name = creature(target.creature).plural;
      if (canShoot(this.state, me)) {
        const d = shotDistance(me, target);
        return { action: { type: 'shoot', target: target.id }, text: `Shoot the ${name}: ${this.preview(me, target, { ranged: true, distance: d, moved: 0 })}${d > 7 ? ' (far: half damage)' : ''}`, key: `shoot-${target.id}` };
      }
      const o = this.bestOption(p, target);
      if (!o) return { action: { type: 'wait' }, text: `The ${name} are out of reach`, key: 'no' };
      return {
        action: { type: 'attack', target: target.id, from: o.from }, text: `Attack the ${name}: ${this.preview(me, target, { ranged: false, distance: 1, moved: o.steps })}`,
        key: `attack-${target.id}-${o.from}-${o.struck}`, landing: o.hexes, struck: [o.struck],
      };
    }
    // A tap on any hex the unit could cover moves it there (a tail spot gives its head).
    const head = target ? null : moveHeadFor(this.state, h);
    if (head === null) return null;
    return { action: { type: 'move', to: head }, text: 'Move here', key: `move-${head}`, landing: footprintAt(head, isWide(me.creature), me.side) ?? [head] };
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
    for (const o of strikeOptions(this.state, target)) {
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
    if (p.wasTouch || this.busy) return;
    const i = this.intent(p);
    if (this.mine()) {
      this.marks(this.hexAt(p), i);
      const a = activeStack(this.state)!;
      this.status.setText(i?.text ?? (this.casting ? `Choose a target for ${SPELLS[this.casting].name}` : `${creature(a.creature).plural} (${a.count}): your move`));
    }
  }

  private tap(p: Phaser.Input.Pointer): void {
    if (this.busy || !this.mine() || this.scene.isActive('Card')) return;
    const i = this.intent(p);
    if (!i || i.key === 'no') {
      if (i) this.status.setText(i.text);
      return;
    }
    // On touch, the first tap shows what would happen; a second tap on the same thing does it.
    if (p.wasTouch && this.pending !== i.key) {
      this.pending = i.key;
      this.marks(this.hexAt(p), i);
      this.status.setText(`${i.text} · tap again`);
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
    if (this.busy || !this.mine()) return;
    const hero = this.state.heroes[0];
    if (!hero || hero.spells.length === 0) {
      this.status.setText('Your hero has no spells');
      return;
    }
    openCard(this, {
      title: `Spellbook · ${hero.mana} mana`,
      body: this.state.cast[0] ? 'Your hero has already cast a spell this round.' : 'Cast one spell a round; your unit still takes its turn.',
      buttons: [
        ...hero.spells.map((id) => {
          const why = cantCast(this.state, 0, id, null);
          return { label: `${SPELLS[id].name} · ${SPELLS[id].mana} mana`, note: why ?? SPELLS[id].says, kind: why ? 'plain' as const : 'crown' as const, onClick: () => {
            if (why) return;
            this.casting = id;
            this.status.setText(`Choose a target for ${SPELLS[id].name}`);
          } };
        }),
        { label: 'Close', kind: 'plain', onClick: () => undefined },
      ],
    });
  }

  /** The units still to act this round, in order, along the bar. */
  private drawOrder(): void {
    this.order.removeAll(true);
    const live = this.state.stacks.filter((s) => alive(s) && !s.acted);
    const fresh = live.filter((s) => !s.waited).sort((a, b) => speedOf(b) - speedOf(a));
    const waited = live.filter((s) => s.waited).sort((a, b) => speedOf(a) - speedOf(b));
    const shown = [...fresh, ...waited].slice(0, this.orderMax);
    shown.forEach((s, i) => {
      // Centred on the order's position.
      const x = (i - (shown.length - 1) / 2) * ORDER_STEP;
      const bg = this.add.circle(x, 0, 19, parseInt((s.side === 0 ? BANNER.player : BANNER.neutral).slice(1), 16), i === 0 ? 0.85 : 0.45).setStrokeStyle(i === 0 ? 2.5 : 1, UI_HEX.gilt, i === 0 ? 1 : 0.6);
      this.order.add(bg);
      // The painted portrait made at boot (the turn order keeps the ink figures until the HUD's pixel pass).
      const key = TEX.creature(s.creature, 0);
      if (this.textures.exists(key)) this.order.add(this.add.image(x, 16, key).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.3 / CREATURE_RES));
    });
  }

  private finish(): void {
    const won = this.state.winner === 0;
    if (!this.session) {
      openCard(this, { title: won ? 'Victory!' : 'Defeat', body: 'Sandbox battle over.', buttons: [{ label: 'Again', onClick: () => this.scene.restart() }] });
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
    openCard(this, {
      title: won ? 'Victory!' : 'Defeat',
      body: won
        ? `${lost.length ? `Fallen: ${lost.map((l) => `${l.n} ${l.name}`).join(', ')}.` : 'Not one of yours fell.'}\n+${xp} experience`
        : `${adv.hero.name}'s army is beaten.`,
      buttons: [{ label: won ? 'Back to the map' : 'Go on', onClick: done }],
    });
  }
}
