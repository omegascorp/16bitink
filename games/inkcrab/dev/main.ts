import { mount } from '../src/index';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

// Dev harness: `DEV_UNLOCK=true pnpm dev` (or DEV_UNLOCK=true in apps/web/.env) plays as an owner.
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked: __DEV_UNLOCK__,
  allLevelsOpen: __DEV_ALL_LEVELS__,
  storage: window.localStorage,
  loadContent: async () => {
    throw new Error('InkCrab has no paid content yet');
  },
  onBuy: () => alert('Checkout would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
