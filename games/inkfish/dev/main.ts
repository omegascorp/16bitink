import { mount } from '../src/index';

// Dev harness: ?unlocked=1 simulates an owner by serving the real paid chapters.
const unlocked = new URLSearchParams(location.search).has('unlocked');
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked,
  storage: window.localStorage,
  loadContent: async () => (await import('../content/paid')).INKFISH_FULL_CHAPTERS,
  onBuy: () => alert('Checkout would open here'),
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
