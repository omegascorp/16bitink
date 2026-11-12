import { damageTaken } from '../../logic/damage';
import { sumIntel } from '../../logic/intel';
import type { Match } from '../../logic/match/match';
import type { MatchEvent, Tank } from '../../logic/match/types';
import { targetsLeft } from '../../logic/match/objective';
import { partLabel, withPart, type Part } from '../../logic/parts';
import { tankStats, type TankStats } from '../../logic/stats';
import { partsArt } from '../../render/partsArt';
import { SWAP_HOLD } from '../../logic/match/pickups';
import { mainObjectiveText } from '../../logic/mission/text';
import type { LandMap } from './landMap';

/**
 * The mission HUD, in the DOM over the canvas: kill feed top left, minimap
 * with storm timer and tanks left top right, HP and part icons bottom
 * centre, the swap card above them when a part lies underneath.
 */
const $ = <T extends HTMLElement>(root: HTMLElement, sel: string): T => root.querySelector(sel) as T;

export class Hud {
  private readonly feed: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly icons: HTMLElement;
  private readonly kits: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly left: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly card: HTMLElement;
  private readonly mini: HTMLCanvasElement;
  readonly swapBtn: HTMLElement;
  readonly repairBtn: HTMLElement;
  private cardFor: number | null = null;
  private loadoutRef: Tank['loadout'] | null = null;

  constructor(private readonly root: HTMLElement, private readonly lm: LandMap) {
    const map = lm.canvas;
    root.innerHTML = `
      <div class="feed"></div>
      <div class="topright"><canvas class="mini"></canvas><div class="row"><span class="timer"></span><span class="left"></span></div></div>
      <div class="goal"></div>
      <div class="card"></div>
      <div class="bottom"><div class="icons"></div><div class="hpbar"><i></i><b></b></div><span class="kits"></span></div>
      <button class="btn swap">Swap</button><button class="btn repair">Repair</button>`;
    this.feed = $(root, '.feed');
    this.hp = $(root, '.hpbar i');
    this.hpText = $(root, '.hpbar b');
    this.icons = $(root, '.icons');
    this.kits = $(root, '.kits');
    this.timer = $(root, '.timer');
    this.left = $(root, '.left');
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
      this.line(k ? `${who(k)} <i>${e.by}</i> ${who(v)}` : `${who(v)} lost to the storm`);
    } else if (e.kind === 'supplyWarn') this.line('<b class="red">Supply drop incoming</b>');
    else if (e.kind === 'storm' && e.phase > 0) this.line('The storm moves in');
    else if (e.kind === 'pickup' && e.what === 'intel' && m.tank(e.tank)?.isPlayer) this.line(`+${e.amount} intel`);
  }

  private line(html: string): void {
    const d = document.createElement('div');
    d.innerHTML = html;
    this.feed.prepend(d);
    while (this.feed.children.length > 5) this.feed.lastChild!.remove();
    setTimeout(() => d.remove(), 6000);
  }

  update(m: Match, p: Tank, touch: boolean): void {
    const share = Math.max(0, p.hp / p.stats.maxHp);
    this.hp.style.width = `${share * 100}%`;
    this.hp.style.background = share > 0.5 ? '#8cc85a' : share > 0.25 ? '#e0b040' : '#d85a3a';
    this.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`;
    this.kits.textContent = `Kits ${p.kits}${p.repairT > 0 ? ' (repairing)' : ''}`;
    if (this.loadoutRef !== p.loadout) {
      this.loadoutRef = p.loadout;
      this.icons.innerHTML = [p.loadout.gun, p.loadout.hull, p.loadout.drive].map(iconHtml).join('');
    }
    const st = m.stormNow;
    this.timer.textContent = m.cfg.mission.storm === 'on' ? `${st.shrinking ? 'Closing' : 'Storm'} ${Math.ceil(st.timer)}s` : '';
    this.left.textContent = `${m.aliveTanks()} left`;
    this.goal.textContent = goalText(m);
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
    if (m.cfg.mission.storm === 'on') {
      c.lineWidth = 1.5;
      c.strokeStyle = '#b090d8';
      c.beginPath();
      c.arc(m.stormNow.circle.x * s, m.stormNow.circle.y * s, m.stormNow.circle.r * s, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#f4ecd8';
      c.beginPath();
      c.arc(m.stormNow.next.x * s, m.stormNow.next.y * s, m.stormNow.next.r * s, 0, Math.PI * 2);
      c.stroke();
    }
    for (const t of m.tanks) {
      if (!t.alive || t.role === 'bossTurret') continue;
      // Enemies show when close, or for 2 s after they fire (or always, carrying the prototype).
      const seen = t.isPlayer || t.team === p.team || m.t - t.firedAt < 2 || Math.hypot(t.x - p.x, t.y - p.y) < 560 || t.carrying || t.ace || t.role === 'boss';
      if (!seen) continue;
      c.fillStyle = t.isPlayer ? '#3c6cc8' : t.team === 0 ? '#8cc85a' : t.ace || t.role === 'boss' ? '#f0c040' : '#d85a3a';
      const r = t.isPlayer ? 3.5 : 2.5;
      c.fillRect(t.x * s - r, t.y * s - r, r * 2, r * 2);
    }
    c.restore();
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

function goalText(m: Match): string {
  const o = m.objective;
  switch (o.main.kind) {
    case 'royale':
      return mainObjectiveText(m.cfg.mission);
    case 'raid':
      return `Destroy the fuel: ${o.targets.length - targetsLeft(m)} / ${o.main.need}`;
    case 'escort':
      return 'Stay near the truck to keep it moving';
    case 'hold':
      return `Hold the hill: ${Math.floor(o.holdT)} / ${o.main.seconds} s`;
    case 'ace':
      return m.aceIntelTaken ? 'Ace intel taken' : `Destroy ${o.main.ace.name} and take the intel`;
    case 'salvage':
      return m.player?.carrying ? 'Bring the prototype to the green ring' : 'Find the crashed prototype';
    case 'fortress':
      return `Break the ${o.main.boss.name}'s turrets, then its hull`;
  }
}

export function intelSummary(m: Match): string {
  return `${sumIntel(m.intel)} intel` + (Object.keys(m.intel).length ? `: ${Object.entries(m.intel).map(([k, v]) => `${k} ${v}`).join(', ')}` : '');
}
