import { mount } from '../src/index';

// Dev harness: Graphite's landing sites. There is no paid content yet. `?reset` starts a new profile.
await document.fonts.load('32px Caveat').catch(() => undefined);
if (new URLSearchParams(location.search).has('reset')) window.localStorage.removeItem('inkmine.profile.v1');
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent, {
  unlocked: false,
  storage: window.localStorage,
  loadContent: () => Promise.reject(new Error('InkMine has no paid content yet')),
  onBuy: () => alert('Checkout would open here'),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
