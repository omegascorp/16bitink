import type { KeyValueStore } from '@16bitink/game-sdk';
import { mount } from '../src/index';
import { SAVE_KEY, SAVE_VERSION } from '../src/logic/save';
import { newProgress, type Progress } from '../src/logic/workshop';
import { qnum, query, setReady } from './boot';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

/**
 * The whole game, as the website mounts it. `DEV_UNLOCK=true npm run dev`
 * plays as an owner. For snapshots (dev/snap.mjs "index.html?screen=…"):
 *   ?screen=menu|map|briefing|workshop|results|mission   which screen to open
 *   ?level=N        the level for briefing, results and mission
 *   ?save=mid       a mid-chapter save (levels 1–4 passed, intel, Corporal) in memory, not localStorage
 *   ?xp=N           with save=mid: the rank XP (e.g. 380, so results show a promotion)
 */
function midSave(): Progress {
  const p = newProgress();
  return {
    ...p,
    xp: qnum('xp', 620),
    intel: { cannon: 9, medium: 4, halftracks: 6, machinegun: 5, rockets: 2, wheels: 3 },
    intelTotal: { cannon: 12, medium: 7, halftracks: 9, machinegun: 5, rockets: 2, wheels: 3 },
    unlocked: [...p.unlocked, 'cannon', 'medium'],
    mk: { ...p.mk, cannon: 1, medium: 1 },
    research: { cannon: { damage: 1 } },
    medals: { 1: [true, true, false], 2: [true, true, true], 3: [true, false, false], 4: [true, false, true] },
    loadout: { gun: { family: 'cannon', mk: 1 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
  };
}

function memoryStore(seed: string | null): KeyValueStore {
  const m = new Map<string, string>();
  if (seed) m.set(SAVE_KEY, seed);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const preset = query.get('save');
const storage = preset === 'mid' ? memoryStore(JSON.stringify({ v: SAVE_VERSION, progress: midSave(), sound: true })) : preset === 'new' ? memoryStore(null) : window.localStorage;
const parent = document.getElementById('game')!;
const handle = mount(parent, {
  unlocked: __DEV_UNLOCK__,
  allLevelsOpen: __DEV_ALL_LEVELS__,
  storage,
  // As the website serves it to owners: JSON over the wire.
  loadContent: async () => JSON.parse(JSON.stringify((await import('../content/paid')).INKTANKS_PAID_LEVELS)) as unknown,
  onBuy: () => alert('Checkout would open here'),
  onSignIn: () => alert('Sign-in would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
const app = await handle.app;
await app.ready;
const level = qnum('level', 1);
const screen = query.get('screen') ?? 'menu';
if (screen === 'map') app.map();
else if (screen === 'briefing') app.open(level);
else if (screen === 'workshop') app.workshop(() => app.map(), 'Map');
else if (screen === 'results') app.devResults(level);
else if (screen === 'mission') app.devPlay(level);
(window as unknown as { __app: unknown }).__app = app;
setTimeout(setReady, screen === 'mission' ? 1000 + qnum('demo', 3) * 1000 : 900);
