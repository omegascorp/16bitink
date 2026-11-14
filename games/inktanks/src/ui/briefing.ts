import { MISSION_NAMES } from '../logic/campaign';
import type { Match } from '../logic/match/match';
import { bonusText } from '../logic/mission/bonus';
import type { Medals } from '../logic/mission/outcome';
import { partLabel } from '../logic/parts';
import { perksOf } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { paintLandMap } from '../scenes/mission/landMap';
import { workshopButton } from './blueprint';
import { esc, render } from './dom';
import { partIcon, tankCanvas } from './tankArt';

/** The commander's portrait, once the art exists; a missing file just leaves it out. */
const portraits = import.meta.glob<string>('../art/pixel/ui/commander.png', { eager: true, query: '?url', import: 'default' });
const commanderUrl = Object.values(portraits)[0] ?? null;

export interface BriefingActions {
  readonly start: () => void;
  readonly workshop: () => void;
  readonly back: () => void;
}

/**
 * Before a mission: its number and name, type, the main objective in one
 * line, the two bonus objectives (lit when already earned), a small map
 * with your start and the target, and the tank you're taking.
 */
export function showBriefing(root: HTMLElement, m: Match, p: Progress, a: BriefingActions): void {
  const def = m.level.def;
  const had: Medals = p.medals[def.number] ?? [false, false, false];
  const l = p.loadout;
  const bonus = def.bonus.map((b, i) => `<div class="bonus"><span class="medal${had[i + 1] ? ' on' : ''}"></span>${esc(bonusText(b))}</div>`).join('');
  render(root, 'dark briefing', `
    <div class="panel sheet rise">
      <div class="row spread"><div><span class="dimt">Level ${def.number}</span> <span class="t36 gold">${esc(def.name)}</span></div><span class="panel paper t12">${MISSION_NAMES[def.type]}</span></div>
      <div class="cols">
        <div class="col">
          <div class="row" style="align-items:flex-start;gap:12px">
            ${commanderUrl ? `<img class="commander" src="${commanderUrl}" alt="Your commander">` : ''}
            <div class="col" style="gap:4px"><div class="dimt t12">Main objective</div>
            <div class="objective"><span class="medal${had[0] ? ' on' : ''}"></span>${esc(m.objective.title)}</div></div>
          </div>
          ${def.timeLimit ? `<div class="t12 red">Time limit ${Math.floor(def.timeLimit / 60)}:${String(def.timeLimit % 60).padStart(2, '0')}</div>` : ''}
          <div class="dimt t12">Bonus objectives</div>
          ${bonus}
          <p class="t12 hide-short">${esc(def.briefing)}</p>
        </div>
        <div class="col">
          <div class="mapbox"></div>
          <div class="row"><div class="pic"></div><div class="col"><div class="row">${partIcon(l.gun)}${partIcon(l.hull)}${partIcon(l.drive)}</div>
            <div class="t12 hide-short">${esc([l.gun, l.hull, l.drive].map(partLabel).join(' · '))}</div><div class="t12 dimt">Repair kits: ${perksOf(p.xp).repairKits}</div></div></div>
        </div>
      </div>
      <div class="row center"><button class="btn" data-act="back">Map</button>${workshopButton(p)}<button class="btn go" data-act="start">Start</button></div>
    </div>`, { ...a });
  root.querySelector('.pic')!.appendChild(tankCanvas(l, 1));
  root.querySelector('.mapbox')!.appendChild(briefingMap(m));
}

/** The level's land, with the objective's marks, the target ringed and your start. */
function briefingMap(m: Match): HTMLCanvasElement {
  const lm = paintLandMap(m.land, Math.min(0.16, 320 / m.land.width));
  const c = document.createElement('canvas');
  c.className = 'minimap';
  c.width = lm.canvas.width;
  c.height = lm.canvas.height;
  const g = c.getContext('2d')!;
  g.drawImage(lm.canvas, 0, 0);
  g.translate(-lm.x0 * lm.scale, -lm.y0 * lm.scale);
  const s = lm.scale;
  const ring = (x: number, y: number, r: number, colour: string, w: number): void => {
    g.strokeStyle = '#14110c';
    g.lineWidth = w + 2;
    g.beginPath();
    g.arc(x * s, y * s, r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = colour;
    g.lineWidth = w;
    g.stroke();
  };
  for (const k of m.objective.marks()) ring(k.x, k.y, Math.max(4, k.r * s), k.kind === 'exit' || k.kind === 'pickup' ? '#8cc85a' : '#f4ecd8', 1.5);
  const target = m.objective.status().target;
  if (target) ring(target.x, target.y, 8, '#f0c040', 3);
  for (const t of m.tanks) {
    if (!t.alive || t.isPlayer || t.team === m.player?.team) continue;
    if (t.ace || t.role === 'boss') ring(t.x, t.y, 6, '#f0c040', 2.5);
  }
  g.fillStyle = '#14110c';
  g.fillRect(m.start.x * s - 5, m.start.y * s - 5, 10, 10);
  g.fillStyle = '#3c6cc8';
  g.fillRect(m.start.x * s - 4, m.start.y * s - 4, 8, 8);
  return c;
}
