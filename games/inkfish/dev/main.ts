import { mount } from '../src/index';

// Set by vite.config.ts from DEV_UNLOCK when the dev server starts.
declare const __DEV_UNLOCK__: boolean;

// Dev harness: `DEV_UNLOCK=true pnpm dev` plays as an owner with the real paid chapters.
const unlocked = __DEV_UNLOCK__;
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked,
  storage: window.localStorage,
  loadContent: async () => {
    // Mirrors the site: no unlock, no paid content.
    if (!unlocked) throw new Error('Full game not unlocked');
    return (await import('../content/paid')).INKFISH_FULL_CHAPTERS;
  },
  onBuy: () => alert('Checkout would open here'),
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
