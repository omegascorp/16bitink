import { SPOTS } from '../content/ch1/chapterLand';
import { CHAPTERS, gate, medalCount, nextLevel, spotState, type GateContext } from '../logic/campaign';
import { rankOf } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { workshopButton } from './blueprint';
import { esc, medalsHtml, render } from './dom';
import { rankLine } from './rankArt';

export interface MapData {
  readonly progress: Progress;
  readonly gate: GateContext;
  /** Level names by number, for the spots' labels. */
  readonly names: (n: number) => string | null;
  /** World point → CSS px over the canvas (the chapter map scene's camera). */
  readonly project: (x: number, y: number) => { x: number; y: number };
}

export interface MapActions {
  readonly level: (n: number) => void;
  /** A chapter chip (index 0–4) other than the one shown. */
  readonly chapter: (index: number) => void;
  readonly workshop: () => void;
  readonly menu: () => void;
}

/**
 * The level select over the painted Meadowlands: the ten spots on the road
 * with their medals, locked ones dimmed, the next one bobbing; chips for
 * the five chapters along the bottom (2–5 "coming" or locked).
 */
export function showMap(root: HTMLElement, d: MapData, a: MapActions): () => void {
  const next = nextLevel(d.gate);
  const rank = rankOf(d.progress.xp);
  const spots = SPOTS.map((_, i) => {
    const n = i + 1;
    const st = spotState(n, d.gate, next);
    const name = d.names(n);
    return `<button class="spot ${st}" data-act="level" data-n="${n}" aria-label="Level ${n}${name ? `: ${esc(name)}` : ''}">${n}</button>
      <div class="spotmedals" data-n="${n}">${st === 'locked' ? '' : medalsHtml(d.progress.medals[n])}</div>
      ${n === next && name ? `<div class="spotname" data-n="${n}">${esc(name)}</div>` : ''}`;
  }).join('');
  const chips = CHAPTERS.map((c) => {
    const here = c.index === 0;
    let medals = 0;
    for (let n = c.first; n <= c.last; n++) medals += medalCount(d.progress.medals, n);
    const g = gate(c.first, d.gate);
    const sub = here ? `${medals} / 30` : g === 'paywall' ? 'full game' : g === 'coming' ? 'coming' : `${medals} / 30`;
    return `<button class="chip${here ? ' here' : ''}" data-act="chapter" data-i="${c.index}">${c.index + 1}. ${esc(c.name)}<b>${sub}</b></button>`;
  }).join('');
  render(root, 'map', `
    <svg class="trail" width="100%" height="100%"><polyline points="" /></svg>
    ${spots}
    <div class="panel top"><span class="t12 dimt">Chapter 1</span> <span class="gold">Meadowlands</span> <span class="t12">${rankLine(rank)}</span></div>
    <div class="corner left"><button class="btn small" data-act="menu">Menu</button></div>
    <div class="corner right">${workshopButton(d.progress, 'small')}</div>
    <div class="chapters">${chips}</div>`, {
    level: (el) => a.level(Number(el.dataset.n)),
    chapter: (el) => {
      const i = Number(el.dataset.i);
      if (i !== 0) a.chapter(i);
    },
    workshop: a.workshop,
    menu: a.menu,
  });
  const trail = root.querySelector('polyline')!;
  const place = (): void => {
    trail.setAttribute('points', SPOTS.map((s) => d.project(s.x, s.y)).map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' '));
    for (const el of root.querySelectorAll<HTMLElement>('[data-n]')) {
      const p = d.project(SPOTS[Number(el.dataset.n) - 1]!.x, SPOTS[Number(el.dataset.n) - 1]!.y);
      const dy = el.classList.contains('spotmedals') ? 34 : el.classList.contains('spotname') ? -62 : 0;
      el.style.left = `${Math.round(p.x)}px`;
      el.style.top = `${Math.round(p.y + dy)}px`;
    }
  };
  place();
  const ro = new ResizeObserver(() => requestAnimationFrame(place));
  ro.observe(root);
  return () => ro.disconnect();
}
