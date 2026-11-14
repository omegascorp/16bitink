import { damageTaken } from '../logic/damage';
import { DRIVE_FAMILIES, familyName, GUN_FAMILIES, HULL_FAMILIES, slotOf, withPart, type Family, type Slot } from '../logic/parts';
import { perksOf, rankOf, RANKS } from '../logic/rank';
import { bpAmount } from './blueprint';
import { RESEARCH_MAX, RESEARCH_STEP, researchSteps, tankStats, type ResearchLine } from '../logic/stats';
import { fit, LINES_BY_SLOT, MK_COST, MK_RANK, ownedPart, raiseMk, research, researchCost, UNLOCK_COST, unlock, type Progress, type Result } from '../logic/workshop';
import { esc, render } from './dom';
import { partIcon, tankCanvas } from './tankArt';

/**
 * The workshop between missions: your tank in the middle with its stats,
 * a tab per slot (gun, hull, drive) listing that slot's families with
 * their blueprints, and the buttons to unlock a family, raise its Mk (rank-gated)
 * or research its lines. Every change goes through src/logic/workshop.ts.
 */
const SLOTS: readonly { slot: Slot; name: string; families: readonly Family[] }[] = [
  { slot: 'gun', name: 'Gun', families: GUN_FAMILIES },
  { slot: 'hull', name: 'Hull', families: HULL_FAMILIES },
  { slot: 'drive', name: 'Drive', families: DRIVE_FAMILIES },
];
const LINE_NAMES: Readonly<Record<ResearchLine, string>> = { damage: 'Damage', reload: 'Reload', armour: 'Armour', hp: 'HP', speed: 'Speed', grip: 'Grip' };
const rankName = (id: string): string => RANKS.find((r) => r.id === id)?.name ?? id;
const famName = familyName;
const PCT = Math.round(RESEARCH_STEP * 100);

export interface WorkshopActions {
  readonly change: (p: Progress) => void;
  readonly back: () => void;
  readonly backLabel: string;
}

export function showWorkshop(root: HTMLElement, start: Progress, a: WorkshopActions): void {
  let p = start;
  let tab: Slot = 'gun';
  let note = '';
  const apply = (r: Result, done: string): void => {
    if (!r.ok) {
      note = r.reason;
    } else {
      p = r.progress;
      note = done;
      a.change(p);
    }
    draw();
  };
  const draw = (): void => {
    render(root, 'dark', html(p, tab, note, a.backLabel), {
      back: a.back,
      tab: (el) => {
        tab = el.dataset.slot as Slot;
        note = '';
        draw();
      },
      unlock: (el) => apply(unlock(p, el.dataset.f as Family), `${famName(el.dataset.f as Family)} unlocked`),
      mk: (el) => {
        const f = el.dataset.f as Family;
        const r = raiseMk(p, f);
        // The fitted part of that family is raised with it.
        const fitted = r.ok && p.loadout[slotOf(f)].family === f ? fit(r.progress, withPart(r.progress.loadout, ownedPart(r.progress, f)!)) : r;
        apply(fitted, `${famName(f)} raised to Mk ${'I'.repeat(r.ok ? r.progress.mk[f] ?? 1 : 1)}`);
      },
      fit: (el) => {
        const f = el.dataset.f as Family;
        apply(fit(p, withPart(p.loadout, ownedPart(p, f) ?? { family: f, mk: 1 })), `${famName(f)} fitted`);
      },
      research: (el) => apply(research(p, el.dataset.f as Family, el.dataset.line as ResearchLine), `${LINE_NAMES[el.dataset.line as ResearchLine]} researched`),
    });
    root.querySelector('.pic')!.appendChild(tankCanvas(p.loadout, innerHeight > 560 ? 2 : 1));
  };
  draw();
}

function statsHtml(p: Progress): string {
  const s = tankStats(p.loadout, p.research);
  const dps = (damageTaken(s.gun.damage, s.gun.family, 'halftracks', 7) * s.gun.shots) / s.gun.reload;
  const rows: [string, number][] = [['HP', s.maxHp], ['Speed', s.speed], ['Damage/s', dps], ['Range', s.gun.range]];
  return rows.map(([k, v]) => `<span class="dimt">${k}</span><span>${Math.round(v)}</span>`).join('');
}

function html(p: Progress, tab: Slot, note: string, backLabel: string): string {
  const rank = rankOf(p.xp);
  const tabs = SLOTS.map((s) => `<button class="btn small${s.slot === tab ? ' gold' : ''}" data-act="tab" data-slot="${s.slot}">${s.name}: ${esc(famName(p.loadout[s.slot].family))}</button>`).join('');
  const cards = SLOTS.find((s) => s.slot === tab)!.families.map((f) => famCard(p, f)).join('');
  return `
    <div class="panel sheet rise">
      <div class="row spread"><span class="t36 gold">Workshop</span><span class="rank"><i></i>${esc(rank.name)} <span class="t12 dimt">${p.xp} XP</span></span><button class="btn small" data-act="back">${esc(backLabel)}</button></div>
      <div class="explain">Destroy enemy tanks to collect blueprints of their parts, then spend them here to upgrade yours. Each part has its own blueprints.</div>
      <div class="cols">
        <div class="col" style="flex:0 0 auto;align-items:center"><div class="pic"></div><div class="intelrow t12">${statsHtml(p)}</div></div>
        <div class="col" style="flex:1 1 auto">
          <div class="row">${tabs}</div>
          <div class="slots">${cards}</div>
          <div class="t12 ${note.startsWith('needs') || note.includes('not') ? 'red' : 'green'}">${esc(note) || '&nbsp;'}</div>
        </div>
      </div>
    </div>`;
}

/** A cost button: bright when payable, dimmed with "need N more" when short, locked with the rank when gated. */
function costBtn(label: string, cost: number, have: number, attrs: string, lockedBy: string | null, extra = ''): string {
  const bp = bpAmount(cost);
  if (lockedBy) return `<button class="btn small dim" ${attrs} data-blocked="1"><span>${label} ${bp}</span><span class="why2"><i class="lock"></i>needs ${esc(lockedBy)}</span></button>`;
  if (have < cost) return `<button class="btn small dim" ${attrs}><span>${label} ${extra}${bp}</span><span class="why2">need ${cost - have} more</span></button>`;
  return `<button class="btn small gold" ${attrs}><span>${label} ${extra}${bp}</span></button>`;
}

function famCard(p: Progress, f: Family): string {
  const have = p.intel[f] ?? 0;
  const unlocked = p.unlocked.includes(f);
  const fitted = p.loadout[slotOf(f)].family === f;
  const mk = p.mk[f] ?? 1;
  const acts: string[] = [];
  let goal = UNLOCK_COST;
  if (!unlocked) {
    acts.push(costBtn('Unlock', UNLOCK_COST, have, `data-act="unlock" data-f="${f}"`, null));
  } else {
    if (!fitted) acts.push(`<button class="btn small go" data-act="fit" data-f="${f}">Fit</button>`);
    if (mk < 3) {
      const next = (mk + 1) as 2 | 3;
      const rankOk = perksOf(p.xp).maxMk >= next;
      goal = MK_COST[next];
      acts.push(costBtn(`Mk ${'I'.repeat(next)}`, MK_COST[next], have, `data-act="mk" data-f="${f}"`, rankOk ? null : rankName(MK_RANK[next])));
    }
    for (const line of LINES_BY_SLOT[slotOf(f)] as readonly ResearchLine[]) {
      const steps = researchSteps(p.research, f, line);
      const cost = researchCost(p, f, line);
      const pips = `<span class="pips">${Array.from({ length: RESEARCH_MAX }, (_, i) => `<u${i < steps ? ' class="on"' : ''}></u>`).join('')}</span>`;
      if (cost === null) acts.push(`<button class="btn small dim" disabled><span>${LINE_NAMES[line]} maxed ${pips}</span></button>`);
      else acts.push(costBtn(`${LINE_NAMES[line]} +${PCT}%`, cost, have, `data-act="research" data-f="${f}" data-line="${line}"`, null, ''));
    }
  }
  const share = Math.min(1, have / goal);
  return `<div class="fam${fitted ? ' fitted' : ''}${unlocked ? '' : ' locked'}">
    ${partIcon({ family: f, mk: unlocked ? mk : 1 })}
    <div class="famhead">${esc(famName(f))}${unlocked ? ` <span class="gold t12">Mk ${'I'.repeat(mk)}</span>` : ' <span class="t12 dimt">locked</span>'}${fitted ? ' <span class="t12 green">fitted</span>' : ''}</div>
    <div class="bpline"><span class="t12">${esc(famName(f))} blueprints:</span><span class="big">${bpAmount(have)}</span></div>
    <div class="bar wide"><i style="width:${Math.round(share * 100)}%"></i></div>
    <div class="acts">${acts.join('')}</div>
  </div>`;
}
