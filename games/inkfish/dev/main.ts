import { bootInkfish } from '../src/index';

// Dev harness: ?unlocked=1 simulates an owner by serving the demo again as "chapter 2".
const unlocked = new URLSearchParams(location.search).has('unlocked');
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const game = bootInkfish(parent, {
  unlocked,
  storage: window.localStorage,
  loadFullChapters: async () => {
    const { DEMO_CHAPTER } = await import('../src/levels/demo');
    return [{ ...DEMO_CHAPTER, id: 2, name: 'Dev Copy', levels: DEMO_CHAPTER.levels.map((l) => ({ ...l, id: `dev-${l.id}`, chapter: 2 })) }];
  },
  onBuy: () => alert('Checkout would open here'),
  onExit: () => alert('Exit to catalog'),
});
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = game;
