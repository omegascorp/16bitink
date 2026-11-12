import { CH1_LAND } from '../src/content/ch1/land';
import { CH1_MISSIONS, ch1Mission } from '../src/content/ch1/missions';
import { openCircle, openLand } from '../src/logic/land';
import { Match } from '../src/logic/match/match';
import { matchReport } from '../src/logic/match/report';
import { outcome } from '../src/logic/mission/outcome';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { Controls } from '../src/scenes/mission/controls';
import { runDropMap } from '../src/scenes/mission/dropMap';
import { Hud } from '../src/scenes/mission/hud';
import { paintLandMap } from '../src/scenes/mission/landMap';
import { MissionScene } from '../src/scenes/mission/MissionScene';
import { showResults } from '../src/scenes/mission/results';
import { makeGame, qnum, query, setReady } from './boot';

/**
 * A playable mission on the placeholder chapter 1 land.
 *   ?level=N      the mission (1–10)
 *   ?seed=S       the match seed
 *   ?rot=rot32    RotSprite instead of free rotation
 *   ?bot=1        a bot drives your tank (watch a mission)
 *   ?auto=1       skip the tap: land at the centre (screenshots)
 *   ?t=N          fast-forward the match N seconds before showing it
 *   ?demo=N       report ready (for dev/snap.mjs) N seconds after it starts
 *   ?map=1        report ready on the drop map, waiting for the tap
 */
const level = Math.min(CH1_MISSIONS.length, Math.max(1, qnum('level', 1)));
const def = ch1Mission(level);
const land = openLand(CH1_LAND, level);
const map = paintLandMap(land, Math.min(0.25, 900 / (land.bounds.x1 - land.bounds.x0 + 240)));
const overlay = document.getElementById('overlay')!;
const auto = query.get('auto') === '1' ? (() => { const c = openCircle(land); return { x: c.x, y: c.y }; })() : null;

async function start(): Promise<void> {
  if (query.get('map') === '1') setTimeout(setReady, 2600);
  const drop = await runDropMap(overlay, land, map, `Level ${level}: ${def.name}`, auto);
  const match = new Match({ land: CH1_LAND, mission: def, seed: qnum('seed', Date.now() % 100000), player: { loadout: STARTER_LOADOUT, drop }, playerBot: query.get('bot') === '1' });
  for (let t = qnum('t', 0); t > 0 && !match.over; t -= 1 / 30) match.step(1 / 30);
  match.drainEvents();
  const hud = new Hud(document.getElementById('hud')!, map);
  let scene: MissionScene | null = null;
  const controls = new Controls(document.getElementById('game')!, (x, y) => scene!.toWorld(x, y));
  controls.bindButtons(hud.swapBtn, hud.repairBtn);
  scene = new MissionScene(match, {
    input: (p) => controls.read(p),
    onEvents: (events) => {
      for (const e of events) hud.event(match, e);
    },
    onFrame: () => match.player && hud.update(match, match.player, controls.touchUsed),
    onOver: () => {
      const r = matchReport(match);
      setTimeout(() => {
        hud.hide();
        showResults(overlay, def, r, outcome(def, r, undefined), () => location.reload(), level < CH1_MISSIONS.length ? `?level=${level + 1}` : null);
        if (query.has('demo')) setReady();
      }, 1200);
    },
  }, query.get('rot') === 'rot32' ? 'rot32' : 'free');
  makeGame(document.getElementById('game')!, scene);
  const demo = qnum('demo', 0);
  setTimeout(setReady, 1500 + demo * 1000);
  Object.assign(window, { match, scene });
}

void start();
