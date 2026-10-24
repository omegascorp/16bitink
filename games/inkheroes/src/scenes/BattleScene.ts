import { runInSlices } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { FIELD_H, FIELD_W, HEX, FIELD_PAD } from '../art/battlefield';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { INK, PAPER } from '../art/palette';
import { heroFigure, poseJobs, TEX, type Figure } from '../art/textures';
import { getSound } from '../host';
import { afterBattle, battleSides, gridOf } from '../logic/adventure';
import { act, activeStack, alive, canShoot, createBattle, experienceFor, moves, stackById, strikeFrom } from '../logic/battle';
import { chooseAction } from '../logic/battleAi';
import { cantCast, spellAmount } from '../logic/battleSpells';
import type { Action, BattleState, Stack } from '../logic/battleTypes';
import { creature } from '../logic/creatures';
import { damageRange, hurt, speedOf } from '../logic/damage';
import { distance, hexUnder, type Hex } from '../logic/hex';
import { tileIndex } from '../logic/map';
import { SPELLS, type SpellId } from '../logic/spells';
import { openCard } from './CardScene';
import { BattleView } from './battle/battleView';
import { screenScene, toView, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { inkText } from './ui';
import { HAND, paintedButton } from './uiPaint';

const BAR_H = 96;
/** Pause before an AI unit acts, so the player can follow. */
const AI_DELAY = 380;

interface BattleData {
  readonly monsterId: string;
}

/** What tapping a hex would do now. */
type Intent = { action: Action; text: string; key: string; from?: Hex | null } | null;

/**
 * A battle with a map monster. The player taps lit hexes to move and enemies
 * to strike (the side tapped is where the strike comes from); the neutral
 * AI plays the other side. Auto plays the player's side too.
 */
export class BattleScene extends Phaser.Scene {
  private session!: Session;
  private monsterId = '';
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
    screenScene(this);
    this.cameras.main.setBackgroundColor(PAPER);
    this.session = Session.get(this);
    this.monsterId = data.monsterId;
    this.busy = false;
    this.aiPending = false;
    this.auto = false;
    this.casting = null;
    this.pending = null;
    this.live = false;
    const adv = this.session.adv;
    const sides = battleSides(adv, data.monsterId);
    const start = createBattle(sides.attacker, sides.defender, sides.seed);
    this.state = start.state;
    // The fighters' poses are painted as the battle opens (once; they're kept for the next).
    const figures: Figure[] = [...new Set(this.state.stacks.map((s) => s.creature)), heroFigure('player')];
    const jobs = poseJobs(this, figures, ['idle', 'walk', 'attack']);
    if (!jobs.length) {
      this.begin(sides.seed);
      return;
    }
    const v = viewSize(this);
    const label = inkText(this, v.width / 2, v.height / 2, 'the armies form up…', 32);
    void runInSlices(jobs).then(() => {
      if (!this.sys.isActive()) return;
      label.destroy();
      this.begin(sides.seed);
    });
  }

  /** Lays out the field and the bar, wires the input and starts the first turn. */
  private begin(seed: number): void {
    const adv = this.session.adv;
    const g = gridOf(this.session.def);
    const terrain = g.terrain[tileIndex(g, adv.hero.x, adv.hero.y)]!;
    this.view = new BattleView(this, this.state, terrain === 'water' ? 'grass' : terrain, seed, [true, false]);
    this.live = true;
    this.status = this.add.text(0, 0, '', { fontFamily: HAND, padding: { x: 8, y: 4 }, fontSize: '26px', color: INK }).setOrigin(0.5, 0);
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
    const m = this.view.root;
    m.setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 300 });
    void this.next();
  }

  update(_t: number, delta: number): void {
    if (this.live) this.view.update(delta);
  }

  /**
   * The field as big as the screen allows: the buttons in a bar along the
   * bottom, or, on a short screen (a phone held sideways), in a column on
   * the right without the turn order.
   */
  private layout(): void {
    const v = viewSize(this);
    const short = v.height < 520 && v.width > v.height;
    this.status.setPosition(v.width / 2, 2);
    if (short) {
      const col = 128;
      const s = Math.min((v.width - col) / FIELD_W, (v.height - 34) / FIELD_H);
      this.view.root.setScale(s).setPosition((v.width - col - FIELD_W * s) / 2, 30);
      this.bar.setPosition(0, 0).setScale(1);
      const step = Math.min(54, (v.height - 20) / this.buttons.length);
      this.buttons.forEach((b, i) => b.setPosition(v.width - col / 2, 10 + step * (i + 0.5)).setScale(Math.min(1, step / 50)));
      // No room for the turn order beside the status line: the active unit is lit on the field instead.
      this.order.setVisible(false);
      return;
    }
    const s = Math.min(v.width / FIELD_W, (v.height - BAR_H - 34) / FIELD_H);
    this.view.root.setScale(s).setPosition((v.width - FIELD_W * s) / 2, 30);
    this.bar.setPosition(v.width / 2, v.height - BAR_H / 2).setScale(Math.min(1, v.width / 760));
    [-300, -180, -60, 240].forEach((x, i) => this.buttons[i]!.setPosition(x, 22).setScale(1));
    this.order.setPosition(0, -22).setScale(1).setVisible(true);
  }

  private buildBar(): void {
    const btn = (x: number, label: string, fn: () => void, kind: 'paper' | 'leaf' | 'sky' = 'paper'): Phaser.GameObjects.Container =>
      paintedButton(this, x, 22, label, fn, { width: 108, height: 42, size: 22, kind });
    this.order = this.add.container(0, -22);
    this.autoBtn = btn(240, 'Auto', () => this.toggleAuto(), 'sky');
    this.buttons = [
      btn(-300, 'Wait', () => this.playerAct({ type: 'wait' })),
      btn(-180, 'Defend', () => this.playerAct({ type: 'defend' })),
      btn(-60, 'Spell', () => this.openSpells(), 'sky'),
      this.autoBtn,
    ];
    this.bar = this.add.container(0, 0, [this.order, ...this.buttons]);
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
  private marks(hover: Hex | null = null, from: Hex | null = null): void {
    const a = activeStack(this.state);
    if (!a) return;
    const mine = this.mine();
    const reach = mine ? [...moves(this.state).keys()].filter((h) => h !== a.hex) : [];
    const targets = mine ? this.state.stacks.filter((s) => s.side !== a.side && alive(s) && (canShoot(this.state, a) || strikeFrom(this.state, s).size > 0)).map((s) => s.hex) : [];
    this.view.showMarks({ active: a.hex, reach, targets, hover, from });
  }

  private hexAt(p: Phaser.Input.Pointer): Hex | null {
    const v = toView(p.x, p.y);
    const f = this.view.toField(v.x, v.y);
    return hexUnder(f.x - FIELD_PAD.x, f.y - FIELD_PAD.y, HEX);
  }

  /** What tapping this point would do, with its preview text. */
  private intent(p: Phaser.Input.Pointer): Intent {
    if (!this.mine() || this.busy) return null;
    const me = activeStack(this.state)!;
    const h = this.hexAt(p);
    if (h === null) return null;
    const target = this.state.stacks.find((s) => alive(s) && s.hex === h);
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
        const d = distance(me.hex, target.hex);
        return { action: { type: 'shoot', target: target.id }, text: `Shoot the ${name}: ${this.preview(me, target, { ranged: true, distance: d, moved: 0 })}${d > 7 ? ' (far: half damage)' : ''}`, key: `shoot-${target.id}` };
      }
      const from = this.bestFrom(p, target);
      if (from === null) return { action: { type: 'wait' }, text: `The ${name} are out of reach`, key: 'no' };
      const moved = strikeFrom(this.state, target).get(from) ?? 0;
      return { action: { type: 'attack', target: target.id, from }, text: `Attack the ${name}: ${this.preview(me, target, { ranged: false, distance: 1, moved })}`, key: `attack-${target.id}-${from}`, from };
    }
    if (!target && moves(this.state).has(h) && h !== me.hex) return { action: { type: 'move', to: h }, text: 'Move here', key: `move-${h}` };
    return null;
  }

  /** "12–18 damage, 1–2 fall" */
  private preview(a: Stack, d: Stack, ctx: { ranged: boolean; distance: number; moved: number }): string {
    const r = damageRange(this.state, a, d, ctx);
    const k0 = hurt(d, r.min).kills;
    const k1 = hurt(d, r.max).kills;
    return `${r.min === r.max ? r.min : `${r.min}–${r.max}`} damage, ${k0 === k1 ? k0 : `${k0}–${k1}`} fall`;
  }

  /** Of the hexes the active unit can strike `target` from, the one nearest the pointer. */
  private bestFrom(p: Phaser.Input.Pointer, target: Stack): Hex | null {
    const options = [...strikeFrom(this.state, target).keys()];
    if (options.length === 0) return null;
    const v = toView(p.x, p.y);
    const f = this.view.toField(v.x, v.y);
    let best = options[0]!;
    let bd = Infinity;
    for (const h of options) {
      const c = this.view.root ? { ...hexCentre(h) } : { x: 0, y: 0 };
      const d = Math.hypot(c.x - f.x, c.y - f.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  private hover(p: Phaser.Input.Pointer): void {
    if (p.wasTouch || this.busy) return;
    const i = this.intent(p);
    if (this.mine()) {
      this.marks(this.hexAt(p), i?.from ?? null);
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
      this.marks(this.hexAt(p), i.from ?? null);
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
          return { label: `${SPELLS[id].name} · ${SPELLS[id].mana} mana`, note: why ?? SPELLS[id].says, kind: why ? 'paper' as const : 'sky' as const, onClick: () => {
            if (why) return;
            this.casting = id;
            this.status.setText(`Choose a target for ${SPELLS[id].name}`);
          } };
        }),
        { label: 'Close', kind: 'paper', onClick: () => undefined },
      ],
    });
  }

  /** The units still to act this round, in order, along the bar. */
  private drawOrder(): void {
    this.order.removeAll(true);
    const live = this.state.stacks.filter((s) => alive(s) && !s.acted);
    const fresh = live.filter((s) => !s.waited).sort((a, b) => speedOf(b) - speedOf(a));
    const waited = live.filter((s) => s.waited).sort((a, b) => speedOf(a) - speedOf(b));
    [...fresh, ...waited].slice(0, 9).forEach((s, i) => {
      const x = -320 + i * 44;
      const bg = this.add.circle(x, 0, 19, s.side === 0 ? 0x2f55a8 : 0xb98a3e, i === 0 ? 0.45 : 0.18).setStrokeStyle(i === 0 ? 2.5 : 1, 0x232a4f, 0.7);
      const img = this.add.image(x, 16, TEX.creature(s.creature, 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.3 / CREATURE_RES);
      this.order.add([bg, img]);
    });
  }

  private finish(): void {
    const won = this.state.winner === 0;
    const adv = this.session.adv;
    const lost = adv.hero.army.map((slot, i) => {
      const st = this.state.stacks.find((x) => x.side === 0 && x.slot === i);
      return slot && st ? { name: creature(slot.creature).plural, n: st.startCount - st.count } : null;
    }).filter((x): x is { name: string; n: number } => !!x && x.n > 0);
    const xp = experienceFor(this.state, 0);
    getSound(this)?.play(won ? 'win' : 'lose');
    const done = (): void => {
      this.session.set(afterBattle(this.session.adv, this.session.def, this.monsterId, this.state));
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

/** A hex's centre on the field, in field units. */
function hexCentre(h: Hex): { x: number; y: number } {
  return fieldPointOf(h);
}

import { fieldPoint as fieldPointOf } from '../art/battlefield';
void stackById;
