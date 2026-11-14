import { CH1_LEVELS, ch1Level } from '../src/content/ch1/levels';
import { mergeIntel, sumIntel } from '../src/logic/intel';
import { buildLand } from '../src/logic/land';
import { parseTank } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import { matchReport } from '../src/logic/match/report';
import { outcome } from '../src/logic/mission/outcome';
import type { IntelBag } from '../src/logic/workshop';
import { Controls } from '../src/scenes/mission/controls';
import { Hud } from '../src/scenes/mission/hud';
import { paintLandMap } from '../src/scenes/mission/landMap';
import { MissionScene } from '../src/scenes/mission/MissionScene';
import { showResults } from '../src/scenes/mission/results';
import { makeGame, qnum, query, setReady } from './boot';
import { HUD_CSS } from '../src/ui/hudCss';
import type Phaser from 'phaser';

/**
 * A playable chapter 1 level, starting at its start point.
 *   ?level=N      the level (1–10)
 *   ?seed=S       the match seed
 *   ?tank=gun/hull/drive   your tank, e.g. cannon1/medium1/halftracks1 (default: the starter)
 *   ?kits=N       repair kits
 *   ?rot=rot32    RotSprite instead of free rotation
 *   ?bot=1        a bot drives your tank (watch a level)
 *   ?t=N          fast-forward N seconds before showing it
 *   ?demo=N       report ready (for dev/snap.mjs) N seconds after it starts
 * A fail shows the panel with Retry, which restarts on the spot; intel
 * picked up is kept across retries (shown on the panel).
 */
document.head.insertAdjacentHTML('beforeend', `<style>${HUD_CSS}</style>`);
const level = ch1Level(Math.min(CH1_LEVELS.length, Math.max(1, qnum('level', 1))));
const def = level.def;
const land = buildLand(level.land);
const map = paintLandMap(land, Math.min(0.25, 200 / land.width));
const overlay = document.getElementById('overlay')!;
const tank = parseTank(query.get('tank') ?? 'machinegun1/light1/wheels1');
let kept: IntelBag = {};
let game: Phaser.Game | null = null;
let tries = 0;
let scene: MissionScene | null = null;
// One set of controls for the page; each retry's HUD rebinds its buttons.
const controls = new Controls(document.getElementById('game')!, (x, y) => scene!.toWorld(x, y));

function start(): void {
  overlay.innerHTML = '';
  tries++;
  const match = new Match({ level, seed: qnum('seed', Date.now() % 100000) + tries, player: { loadout: tank, kits: qnum('kits', 1) }, playerBot: query.get('bot') === '1' });
  for (let t = qnum('t', 0); t > 0 && !match.over; t -= 1 / 30) match.step(1 / 30);
  match.drainEvents();
  const hudRoot = document.getElementById('hud')!;
  hudRoot.style.display = '';
  const hud = new Hud(hudRoot, map);
  controls.bindButtons(hud.swapBtn, hud.repairBtn);
  const sc = new MissionScene(match, {
    input: (p) => controls.read(p),
    onEvents: (events) => {
      for (const e of events) hud.event(match, e);
    },
    onFrame: () => match.player && hud.update(match, match.player, controls.touchUsed, (x, y) => sc.toScreen(x, y)),
    onOver: () => {
      const r = matchReport(match);
      kept = mergeIntel(kept, r.intel);
      setTimeout(() => {
        hud.hide();
        const shown = { ...r, intel: kept, intelCount: sumIntel(kept) };
        showResults(overlay, def, match.objective.title, shown, outcome(def, r, undefined), retry, def.number < CH1_LEVELS.length ? `?level=${def.number + 1}` : null);
        if (query.has('demo')) setReady();
      }, 1200);
    },
  }, query.get('rot') === 'rot32' ? 'rot32' : 'free');
  scene = sc;
  game = makeGame(document.getElementById('game')!, sc);
  const demo = qnum('demo', 0);
  setTimeout(setReady, 1500 + demo * 1000);
  Object.assign(window, { match, scene: sc });
}

function retry(): void {
  game?.destroy(true);
  game = null;
  start();
}

start();
