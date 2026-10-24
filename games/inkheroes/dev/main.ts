import { mount } from '../src/index';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

// Dev harness: `DEV_UNLOCK=true pnpm dev` (or DEV_UNLOCK=true in apps/web/.env) plays as an owner.
await Promise.all(['700 32px Cinzel', '32px "EB Garamond"', '600 32px "EB Garamond"'].map((f) => document.fonts.load(f))).catch(() => undefined);
if (new URLSearchParams(location.search).has('reset')) {
  for (const k of Object.keys(localStorage)) if (k.startsWith('inkheroes')) localStorage.removeItem(k);
}
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked: __DEV_UNLOCK__,
  allLevelsOpen: __DEV_ALL_LEVELS__,
  storage: window.localStorage,
  loadContent: async () => JSON.parse(JSON.stringify((await import('../content/paid')).INKHEROES_PAID_MAPS)) as unknown,
  onBuy: () => alert('Checkout would open here'),
  onSignIn: () => alert('Google sign-in would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
