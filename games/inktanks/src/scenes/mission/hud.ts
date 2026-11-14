import { damageTaken } from '../../logic/damage';
import { sumIntel } from '../../logic/intel';
import type { Match } from '../../logic/match/match';
import type { MatchEvent, Tank } from '../../logic/match/types';
import { familyName, partLabel, withPart, type Family, type Part } from '../../logic/parts';
import { tankStats, type TankStats } from '../../logic/stats';
import { partsArt } from '../../render/partsArt';
import { pickupUrl } from '../../render/pickupArt';
import { bpIcon } from '../../ui/blueprint';
import { SWAP_HOLD } from '../../logic/match/pickups';
import type { LandMap } from './landMap';

/**
 * The mission HUD, in the DOM over the canvas: kill feed top left, the
 * objective line top centre with an arrow at the screen edge to the next
 * target, minimap and timer (when the level has one) top right, HP and part
 * icons bottom centre, the swap card above them when a part lies underneath.
 */
/** Where a world point is on screen, in CSS px (from the mission scene's camera). */
export type Project = (x: number, y: number) => { x: number; y: number };
const ARROW_MARGIN = 36;
/** How long a tip stays, and below what HP share the 'use a kit' tip shows (once a mission). */
const TIP_S = 4.5;
const LOW_HP = 0.4;
const $ = <T extends HTMLElement>(root: HTMLElement, sel: string): T => root.querySelector(sel) as T;

export class Hud {
  private readonly feed: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly icons: HTMLElement;
  private readonly kits: HTMLElement;
  private readonly tip: HTMLElement;
  private tipUntil = 0;
  private lowHpTipped = false;
  private kitsShown = '';
  private touch = false;
  private tipDone = false;
  private seenBag: Readonly<Partial<Record<Family, number>>> = {};
  private readonly timer: HTMLElement;
  private readonly arrow: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly card: HTMLElement;
  private readonly mini: HTMLCanvasElement;
  readonly swapBtn: HTMLElement;
  readonly repairBtn: HTMLElement;
  private cardFor: number | null = null;
  private loadoutRef: Tank['loadout'] | null = null;

  constructor(private readonly root: HTMLElement, private readonly lm: LandMap, private readonly firstBlueprints: { seen: boolean; mark: () => void } = { seen: true, mark: () => undefined }) {
    const map = lm.canvas;
    root.innerHTML = `
      <div class="feed"></div>
      <div class="topright"><canvas class="mini"></canvas><div class="row"><span class="timer"></span></div></div>
      <div class="goal"></div><div class="arrow"></div>
      <div class="card"></div>
      <div class="bottom"><div class="icons"></div><div class="hpbar"><i></i><b></b></div><span class="kits"></span></div>
      <div class="tip"></div>
      <button class="btn swap">Swap</button><button class="btn repair">Repair</button>`;
    this.feed = $(root, '.feed');
    this.hp = $(root, '.hpbar i');
    this.hpText = $(root, '.hpbar b');
    this.icons = $(root, '.icons');
    this.kits = $(root, '.kits');
    this.tip = $(root, '.tip');
    this.timer = $(root, '.timer');
    this.arrow = $(root, '.arrow');
    this.goal = $(root, '.goal');
    this.card = $(root, '.card');
    this.mini = $<HTMLCanvasElement>(root, '.mini');
    this.swapBtn = $(root, '.swap');
    this.repairBtn = $(root, '.repair');
    const w = 200;
    this.mini.width = w;
    this.mini.height = Math.round((w * map.height) / map.width);
  }

  event(m: Match, e: MatchEvent): void {
    if (e.kind === 'kill') {
      const v = m.tank(e.victim)!;
      const k = e.killer !== null ? m.tank(e.killer) : null;
      this.line(k ? `${who(k)} <i>${e.by}</i> ${who(v)}` : `${who(v)} <i>${e.by}</i>`);
    } else if (e.kind === 'alarm' && m.alarm.count === 1) this.line('<b class="red">Alarm! Guards are coming</b>');
    else if (e.kind === 'escape') {
      const t = m.tank(e.tank);
      if (t) this.line(t.role === 'crew' ? `${t.name} is home` : `<b class="red">${who(t)} got away</b>`);
    } else if (e.kind === 'pickup' && e.what === 'intel' && m.tank(e.tank)?.isPlayer) this.blueprints(m, e.amount);
    else if (e.kind === 'pickup' && e.what === 'kit' && m.tank(e.tank)?.isPlayer) this.showTip(m, `Repair kit! ${this.useKey()} to fix your tank`);
  }

  /** "+5 [icon] blueprints (Cannon, Wheels)": the families that grew since the last pickup; the first time ever, a tip. */
  private blueprints(m: Match, amount: number): void {
    const gained = (Object.keys(m.intel) as Family[]).filter((f) => (m.intel[f] ?? 0) > (this.seenBag[f] ?? 0));
    this.seenBag = { ...m.intel };
    const names = gained.map(familyName).join(', ');
    this.line(`<span class="bpn">+${amount} ${bpIcon()} blueprints${names ? ` (${names})` : ''}</span>`);
    if (!this.firstBlueprints.seen && !this.tipDone) {
      this.tipDone = true;
      this.firstBlueprints.mark();
      this.showTip(m, `${bpIcon()} <b>Blueprints!</b> Spend them in the Workshop to upgrade your tank.`);
    }
  }

  /** "Press Q" on a keyboard, "Tap Repair" on a phone; lower case mid-sentence. */
  private useKey(mid = false): string {
    const verb = this.touch ? 'Tap' : 'Press';
    return `${mid ? verb.toLowerCase() : verb} ${this.touch ? '<b>Repair</b>' : '<kbd>Q</kbd>'}`;
  }

  private showTip(m: Match, html: string): void {
    this.tip.innerHTML = html;
    this.tip.style.display = 'block';
    this.tipUntil = m.t + TIP_S;
  }

  /** Kit slots as icons, filled or empty, with the key that uses one. */
  private drawKits(p: Tank): void {
    const key = `${p.kits}/${p.maxKits}/${p.repairT > 0}/${this.touch}`;
    if (key === this.kitsShown) return;
    this.kitsShown = key;
    const url = pickupUrl('kit');
    const slot = (full: boolean) => (url ? `<img class="${full ? 'on' : 'off'}" src="${url}" alt="">` : `<i class="${full ? 'on' : 'off'}">+</i>`);
    const slots = Array.from({ length: p.maxKits }, (_, i) => slot(i < p.kits)).join('');
    const hint = p.repairT > 0 ? '<em>repairing</em>' : this.touch || p.kits === 0 ? '' : '<kbd>Q</kbd>';
    this.kits.innerHTML = `${slots}${hint}`;
    this.kits.title = 'Repair kits';
  }

  /** Tips that come from what the player is doing: a kit they can't carry, or low HP with a kit to use. */
  private drawTips(m: Match, p: Tank): void {
    if (p.onFullKit && m.t >= this.tipUntil - TIP_S + 1) this.showTip(m, `Kit bag full: ${this.useKey(true)} to use one, then pick this up`);
    if (!this.lowHpTipped && p.kits > 0 && p.repairT <= 0 && p.hp / p.stats.maxHp < LOW_HP) {
      this.lowHpTipped = true;
      this.showTip(m, `Low HP! ${this.useKey()} to use a repair kit`);
    }
    if (m.t > this.tipUntil) this.tip.style.display = 'none';
  }

  private line(html: string): void {
    const d = document.createElement('div');
    d.innerHTML = html;
    this.feed.prepend(d);
    while (this.feed.children.length > 5) this.feed.lastChild!.remove();
    setTimeout(() => d.remove(), 6000);
  }

  update(m: Match, p: Tank, touch: boolean, project: Project): void {
    const share = Math.max(0, p.hp / p.stats.maxHp);
    this.hp.style.width = `${share * 100}%`;
    this.hp.style.background = share > 0.5 ? '#8cc85a' : share > 0.25 ? '#e0b040' : '#d85a3a';
    this.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`;
    this.touch = touch;
    this.drawKits(p);
    this.drawTips(m, p);
    if (this.loadoutRef !== p.loadout) {
      this.loadoutRef = p.loadout;
      this.icons.innerHTML = [p.loadout.gun, p.loadout.hull, p.loadout.drive].map(iconHtml).join('');
    }
    const left = m.timeLeft();
    this.timer.style.display = left === null ? 'none' : '';
    if (left !== null) this.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    const status = m.objective.status();
    this.goal.textContent = status.text;
    this.drawArrow(status.target, project);
    this.swapBtn.style.display = touch && p.onPart !== null ? 'block' : 'none';
    this.repairBtn.style.display = touch ? 'block' : 'none';
    this.drawCard(m, p);
    this.drawMini(m, p);
  }

  private drawCard(m: Match, p: Tank): void {
    const pick = p.onPart !== null ? m.pickups.find((x) => x.id === p.onPart) : null;
    if (!pick || pick.kind !== 'part') {
      this.card.style.display = 'none';
      this.cardFor = null;
      return;
    }
    this.card.style.display = 'block';
    if (this.cardFor !== pick.id) {
      this.cardFor = pick.id;
      const now = tankStats(p.loadout, p.research);
      const next = tankStats(withPart(p.loadout, pick.part), p.research);
      this.card.innerHTML = `<div class="title">${iconHtml(pick.part)} ${partLabel(pick.part)}</div>${diffs(now, next)}<div class="hint">Hold E to swap</div><div class="hold"><i></i></div>`;
    }
    ($(this.card, '.hold i')).style.width = `${(p.swapT / SWAP_HOLD) * 100}%`;
  }

  private drawMini(m: Match, p: Tank): void {
    const c = this.mini.getContext('2d')!;
    const s = this.mini.width / this.lm.w;
    c.drawImage(this.lm.canvas, 0, 0, this.mini.width, this.mini.height);
    c.save();
    c.translate(-this.lm.x0 * s, -this.lm.y0 * s);
    for (const k of m.objective.marks()) {
      c.strokeStyle = k.kind === 'artillery' ? '#ff7a5a' : k.state === 'ours' || k.state === 'done' || k.kind === 'exit' || k.kind === 'pickup' ? '#8cc85a' : k.state === 'theirs' ? '#d85a3a' : '#f4ecd8';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(k.x * s, k.y * s, Math.max(3, k.r * s), 0, Math.PI * 2);
      c.stroke();
    }
    for (const t of m.tanks) {
      if (!t.alive || t.role === 'bossTurret') continue;
      // Enemies show when close, or for 2 s after they fire (or always, carrying the prototype).
      const seen = t.isPlayer || t.team === p.team || m.t - t.firedAt < 2 || Math.hypot(t.x - p.x, t.y - p.y) < 560 || t.ace || t.role === 'boss';
      if (!seen) continue;
      c.fillStyle = t.isPlayer ? '#3c6cc8' : t.team === 0 ? '#8cc85a' : t.ace || t.role === 'boss' ? '#f0c040' : '#d85a3a';
      const r = t.isPlayer ? 3.5 : 2.5;
      c.fillRect(t.x * s - r, t.y * s - r, r * 2, r * 2);
    }
    c.restore();
  }

  /** An arrow at the screen edge pointing to an off-screen target. */
  private drawArrow(target: { x: number; y: number } | null, project: Project): void {
    if (!target) {
      this.arrow.style.display = 'none';
      return;
    }
    const sp = project(target.x, target.y);
    const w = innerWidth;
    const h = innerHeight;
    const on = sp.x > ARROW_MARGIN && sp.x < w - ARROW_MARGIN && sp.y > ARROW_MARGIN && sp.y < h - ARROW_MARGIN;
    this.arrow.style.display = on ? 'none' : 'block';
    if (on) return;
    const cx = w / 2;
    const cy = h / 2;
    const a = Math.atan2(sp.y - cy, sp.x - cx);
    // Push out from the centre to the margin box along the target's direction.
    const k = Math.min((w / 2 - ARROW_MARGIN) / Math.max(1e-6, Math.abs(Math.cos(a))), (h / 2 - ARROW_MARGIN) / Math.max(1e-6, Math.abs(Math.sin(a))));
    this.arrow.style.transform = `translate(${cx + Math.cos(a) * k}px, ${cy + Math.sin(a) * k}px) rotate(${a}rad)`;
  }

  hide(): void {
    this.root.style.display = 'none';
  }
}

function who(t: Tank): string {
  return t.isPlayer ? '<b>You</b>' : `${t.crew} ${t.name}`;
}

export function iconHtml(p: Part): string {
  const url = partsArt().icon(p);
  const tier = 'I'.repeat(p.mk);
  return url ? `<span class="ic"><img src="${url}" alt=""><em>${tier}</em></span>` : `<span class="ic txt">${p.family.slice(0, 3)}<em>${tier}</em></span>`;
}

function diffs(a: TankStats, b: TankStats): string {
  const ref = { drive: 'halftracks' as const, armour: 7 };
  const dps = (s: TankStats) => (damageTaken(s.gun.damage, s.gun.family, ref.drive, ref.armour) * s.gun.shots) / s.gun.reload;
  const rows: [string, number, number][] = [['HP', a.maxHp, b.maxHp], ['Speed', a.speed, b.speed], ['Damage/s', dps(a), dps(b)], ['Range', a.gun.range, b.gun.range]];
  return rows
    .filter(([, x, y]) => Math.abs(x - y) > 0.5)
    .map(([n, x, y]) => `<div class="d ${y > x ? 'up' : 'down'}">${n} ${Math.round(x)} → ${Math.round(y)}</div>`)
    .join('');
}


export function intelSummary(m: Match): string {
  return `${sumIntel(m.intel)} blueprints` + (Object.keys(m.intel).length ? `: ${Object.entries(m.intel).map(([k, v]) => `${k} ${v}`).join(', ')}` : '');
}
