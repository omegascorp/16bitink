import { mount } from '../src/index';

// Set by vite.config.ts from DEV_UNLOCK when the dev server starts.
declare const __DEV_UNLOCK__: boolean;

// Dev harness: `DEV_UNLOCK=true pnpm dev` plays as an owner (Mycel loads). `?reset` starts over: a new profile and undug worlds.
await Promise.all(['32px Caveat', '32px "EB Garamond"', '600 32px "EB Garamond"', 'italic 32px "EB Garamond"'].map((f) => document.fonts.load(f).catch(() => undefined)));
if (new URLSearchParams(location.search).has('reset')) {
  for (const key of Object.keys(window.localStorage)) if (key.startsWith('inkmine.')) window.localStorage.removeItem(key);
}
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked: __DEV_UNLOCK__,
  storage: window.localStorage,
  // As the website serves it to owners: JSON over the wire.
  loadContent: async () => JSON.parse(JSON.stringify((await import('../content/paid')).INKMINE_PAID_PLANETS)) as unknown,
  onBuy: () => alert('Checkout would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
