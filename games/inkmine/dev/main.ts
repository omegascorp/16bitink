import { mount } from '../src/index';

// Dev harness: Graphite's world. There is no paid content yet. `?reset` starts over: a new profile and an undug world.
await document.fonts.load('32px Caveat').catch(() => undefined);
if (new URLSearchParams(location.search).has('reset')) {
  for (const key of Object.keys(window.localStorage)) if (key.startsWith('inkmine.')) window.localStorage.removeItem(key);
}
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
