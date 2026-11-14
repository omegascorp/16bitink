import type { MatchReport } from '../logic/match/report';
import { bonusText } from '../logic/mission/bonus';
import type { Outcome } from '../logic/mission/outcome';
import type { LevelDef } from '../logic/level/types';
import { newlyAffordable } from '../logic/blueprints';
import { familyName, FAMILIES } from '../logic/parts';
import { rankOf, toNextRank, type RankId } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { bpAmount, workshopButton } from './blueprint';
import { clock, esc, render } from './dom';
import { partIcon } from './tankArt';

/** What each rank brings (design doc "Military ranks"), for the promotion moment. */
export const RANK_UNLOCKS: Readonly<Record<RankId, string>> = {
  private: 'The workshop and 1 repair kit',
  corporal: 'You carry 2 repair kits',
  sergeant: 'Mk II parts in the workshop',
  staffSergeant: 'Supply drops (coming soon)',
  lieutenant: 'Mk III parts in the workshop',
  captain: 'A wingman tank (coming soon)',
  major: 'Artillery strikes (coming soon)',
  colonel: 'A second wingman (coming soon)',
  brigadier: 'Ace prototypes in the workshop (coming soon)',
  general: 'Gold insignia',
};

export interface ResultsData {
  readonly def: LevelDef;
  readonly title: string;
  readonly report: MatchReport;
  readonly outcome: Outcome;
  readonly xpBefore: number;
  readonly xpAfter: number;
  /** Progress before and after the mission, to show what became affordable. */
  readonly before: Progress;
  readonly after: Progress;
  /** The next button: a level to play, the full-game offer, or nothing. */
  readonly next: { readonly kind: 'level'; readonly n: number } | { readonly kind: 'offer'; readonly label: string } | { readonly kind: 'none'; readonly note: string | null };
}

export interface ResultsActions {
  readonly retry: () => void;
  readonly map: () => void;
  readonly next: () => void;
  readonly workshop: () => void;
}

const failText = (reason: string): string => (reason === 'destroyed' ? 'Your tank was destroyed' : reason === 'time' ? 'Out of time' : reason.charAt(0).toUpperCase() + reason.slice(1));

/** After a mission: win or fail, medals (new ones pop in), blueprints per family, XP and a promotion. */
export function showResults(root: HTMLElement, d: ResultsData, a: ResultsActions): void {
  const { def, report: r, outcome: o } = d;
  const lines = [d.title, bonusText(def.bonus[0]), bonusText(def.bonus[1])];
  const medals = lines.map((t, i) => `<div class="bonus${o.medals[i] ? '' : ' dimt'}"><span class="medal${o.medals[i] ? ' on' : ''}${o.fresh[i] ? ' pop' : ''}" style="animation-delay:${0.3 + i * 0.4}s"></span>${esc(t)}${o.fresh[i] ? ' <span class="green t12">new</span>' : ''}</div>`).join('');
  const intel = FAMILIES.filter((f) => (r.intel[f] ?? 0) > 0)
    .map((f) => `${partIcon({ family: f, mk: 1 })}<span>${esc(familyName(f))}</span><span class="bpn">${bpAmount(r.intel[f] ?? 0, true)}</span>`).join('');
  const ready = newlyAffordable(d.before, d.after);
  const readyHtml = ready.length > 0
    ? `<div class="ready-line">Upgrade ready: ${esc(ready.slice(0, 2).map((u) => u.label).join(', '))}${ready.length > 2 ? ` +${ready.length - 2} more` : ''}</div>`
    : '';
  const before = rankOf(d.xpBefore);
  const after = rankOf(d.xpAfter);
  const promoted = after.xp > before.xp;
  const up = toNextRank(d.xpAfter);
  const share = up ? (d.xpAfter - after.xp) / (up.next.xp - after.xp) : 1;
  const nextBtn = d.next.kind === 'level' ? `<button class="btn go" data-act="next">Level ${d.next.n}</button>` : d.next.kind === 'offer' ? `<button class="btn gold" data-act="next">${esc(d.next.label)}</button>` : '';
  render(root, 'dark', `
    <div class="panel sheet rise">
      <div class="row spread"><div class="t36 ${o.passed ? 'gold' : 'red'}">${o.passed ? 'Mission passed' : esc(failText(r.reason))}</div>
        <div class="t12 dimt">Level ${def.number} · ${esc(def.name)} · ${clock(r.time)} · ${r.kills} kills</div></div>
      <div class="cols">
        <div class="col"><div class="dimt t12">Medals</div>${medals}
          ${o.passed ? '' : '<div class="t12 dimt">Blueprints you picked up are yours to keep. Retry from the start.</div>'}</div>
        <div class="col">
          <div class="dimt t12">Blueprints collected: ${bpAmount(r.intelCount)}</div>
          <div class="bplist">${intel || '<span class="dimt t12" style="grid-column:1/-1">None this time</span>'}</div>
          ${readyHtml}
          <div class="dimt t12">Rank</div>
          <div class="row spread"><span class="rank"><i></i>${esc(after.name)}</span><span class="green">+${o.xp} XP</span></div>
          <div class="bar"><i class="xp" style="width:${Math.round(share * 100)}%"></i></div>
          <div class="t12 dimt">${up ? `${up.need} XP to ${esc(up.next.name)}` : 'Top rank'}</div>
        </div>
      </div>
      ${promoted ? `<div class="promo"><div class="t12 dimt">Promoted!</div><div class="t36 gold">${esc(after.name)}</div><div class="t12">${esc(RANK_UNLOCKS[after.id])}</div></div>` : ''}
      ${d.next.kind === 'none' && d.next.note ? `<div class="t12 dimt center row">${esc(d.next.note)}</div>` : ''}
      <div class="row center"><button class="btn" data-act="map">Map</button>${workshopButton(d.after)}<button class="btn${o.passed ? '' : ' go'}" data-act="retry">${o.passed ? 'Play again' : 'Retry'}</button>${o.passed ? nextBtn : ''}</div>
    </div>`, { ...a });
}
