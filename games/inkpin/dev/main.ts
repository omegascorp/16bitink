import { TOMB_SAMPLER } from '../src/level/ch3/sampler';
import { ALL_CHAPTERS, CHAPTER_3_DRAFTS } from '../src/level/paid';
import { mount } from '../src/index';

// Dev harness: every level open, the paid chapters installed straight from src/level/paid.ts (dev code isn't shipped); ?level=3 starts on level 3.
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const asked = Number(new URLSearchParams(window.location.search).get('level'));
// ?sample=tomb opens Chapter 3's engine sampler (plates, a door, gas, a frog, fire bowls, a cracked wall).
// ?draft=<id> opens a level that isn't listed yet (Chapter 3's drafts), so agents can check its board by eye.
const params = new URLSearchParams(window.location.search);
const draft = CHAPTER_3_DRAFTS.find((l) => l.id === params.get('draft'));
const sample = draft ?? (params.get('sample') === 'tomb' ? TOMB_SAMPLER : undefined);
// ?free=1 plays as a player who hasn't bought the game: Chapter 1 only, Chapters 2–3 locked on the map.
const free = params.get('free') === '1';
// A stub host, as the other games' dev pages build it: open like an owner, storage in this browser.
const handle = mount(parent, {
  unlocked: !free,
  price: '$4.99',
  allLevelsOpen: true,
  storage: window.localStorage,
  loadContent: () => Promise.reject(new Error('No paid content in the dev harness')),
  onBuy: () => alert('Checkout would open here'),
  onExit: () => alert('Exit to catalog'),
}, { level: asked >= 1 ? asked - 1 : undefined, sample, paid: free ? undefined : ALL_CHAPTERS.slice(1) });
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
