import { mount } from '../src/index';

// Dev harness: the prototype test beach, no paid content yet.
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked: false,
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
