import { KINDS } from '../src/content/ch1/kinds';
import { LEVEL_08 } from '../src/content/ch1/levels/level08';
import { loadLevel } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import type { Tank } from '../src/logic/match/types';
import { MissionScene } from '../src/scenes/mission/MissionScene';
import { partsArt } from '../src/render/partsArt';
import { makeGame, qnum, query, setReady } from './boot';

/**
 * The stress test: 30 bot tanks fighting in one screen of level 8's rail
 * yard (3 × 3 screens, ground streamed in chunks), with an FPS counter.
 * R (or the button) toggles RotSprite (32 steps, only parts in use) and GPU
 * free rotation. Dead tanks come back at once, so there are always 30.
 *   ?rot=rot32|free   ?tanks=30   ?seed=S
 * window.__fps holds one-second samples for dev/fps.mjs.
 */
const TANKS = qnum('tanks', 30);
const CLUSTER = 330;
// Level 8's rail yard with TANKS hunters in two teams that fight each other (stress only: levels never set teams).
const level = loadLevel({ ...LEVEL_08, enemies: Array.from({ length: TANKS }, (_, i) => ({ role: 'hunter' as const, clan: i % 2 ? 'boars' as const : 'weasels' as const, tank: ['machinegun1/light1/wheels1', 'cannon1/medium1/halftracks1', 'rockets1/heavy1/tracks1'][i % 3]!, at: { x: 1440, y: 810 } })), objective: { kind: 'assault' } }, KINDS);
const match = new Match({ level, seed: qnum('seed', 4), player: null });
match.tanks.forEach((t, i) => Object.assign(t, { team: 1 + (i % 2) }));
const centre = { x: 1440, y: 810 };

function place(t: Tank, i: number): void {
  for (let k = 0; k < 20; k++) {
    const a = (i / TANKS) * Math.PI * 2 + k;
    const r = CLUSTER * (0.4 + ((i * 37 + k * 11) % 60) / 100);
    const x = centre.x + Math.cos(a) * r * 1.4;
    const y = centre.y + Math.sin(a) * r * 0.8;
    if (match.navPassable(x, y)) {
      t.x = x;
      t.y = y;
      return;
    }
  }
  t.x = centre.x;
  t.y = centre.y;
}

const bots = match.tanks.filter((t) => t.role === 'tank');
bots.forEach((t, i) => {
  place(t, i);
});
const cam = { ...bots[0]!, x: centre.x, y: centre.y } as Tank;

const fps: number[] = [];
let frames = 0;
let last = performance.now();
let worst = 0;
const numbers = document.getElementById('numbers')!;
let scene: MissionScene;

function revive(): void {
  bots.forEach((t, i) => {
    if (t.alive) return;
    t.alive = true;
    t.hp = t.stats.maxHp;
      place(t, i);
  });
}

function report(): void {
  const s = scene.stats();
  const now = performance.now();
  const sec = (now - last) / 1000;
  const f = frames / sec;
  fps.push(f);
  frames = 0;
  last = now;
  const onScreen = bots.filter((t) => t.alive && Math.abs(t.x - centre.x) < 480 && Math.abs(t.y - centre.y) < 270).length;
  const allKeys = partsArt().urls.size;
  numbers.textContent = [
    `${scene.bank.mode === 'rot32' ? 'RotSprite 32 steps' : 'GPU free rotation'}  ${f.toFixed(1)} FPS  worst frame ${worst.toFixed(1)} ms`,
    `tanks ${bots.filter((t) => t.alive).length} (${onScreen} on screen, ${s.views} drawn)  shots ${match.shots.length}`,
    `ground chunks ${s.chunks} = ${s.groundMB.toFixed(1)} MB`,
    `rot sheets ${s.sheets} + tints = ${s.rotMB.toFixed(1)} MB (built in ${scene.bank.buildMs.toFixed(0)} ms)`,
    `all textures ≈ ${s.texMB.toFixed(1)} MB; RotSprite for every part image would be ≈ ${(allKeys * 2).toFixed(0)} MB more`,
  ].join('\n');
  worst = 0;
  (window as unknown as { __fps: unknown }).__fps = { mode: scene.bank.mode, samples: fps.slice(), stats: s };
  console.log(`[stress] ${numbers.textContent.replace(/\n/g, ' | ')}`);
}

function toggle(): void {
  scene.bank.mode = scene.bank.mode === 'free' ? 'rot32' : 'free';
  if (scene.bank.mode === 'rot32') scene.warmAll();
  fps.length = 0;
}

scene = new MissionScene(match, {
  input: () => ({ move: null, aim: null, fire: false, swap: false, repair: false }),
  onEvents: () => revive(),
  onFrame: (dt) => {
    frames++;
    worst = Math.max(worst, dt * 1000);
  },
  onOver: () => undefined,
}, query.get('rot') === 'rot32' ? 'rot32' : 'free');
scene.follow = cam;
makeGame(document.getElementById('game')!, scene);
setInterval(report, 1000);
document.getElementById('toggle')!.addEventListener('click', toggle);
addEventListener('keydown', (e) => e.key.toLowerCase() === 'r' && toggle());
setTimeout(setReady, 3000);
Object.assign(window, { match, scene, toggle });
