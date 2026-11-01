import { TOMB_SAMPLER } from '../src/level/ch3/sampler';
import { CHAPTER_3_DRAFTS } from '../src/level';
import { mount } from '../src/index';

// Dev harness: every level open; ?level=3 starts on level 3.
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const asked = Number(new URLSearchParams(window.location.search).get('level'));
// ?sample=tomb opens Chapter 3's engine sampler (plates, a door, gas, a frog, fire bowls, a cracked wall).
// ?draft=<id> opens a level that isn't listed yet (Chapter 3's drafts), so agents can check its board by eye.
const params = new URLSearchParams(window.location.search);
const draft = CHAPTER_3_DRAFTS.find((l) => l.id === params.get('draft'));
const sample = draft ?? (params.get('sample') === 'tomb' ? TOMB_SAMPLER : undefined);
const handle = mount(parent, { unlockAll: true, level: asked >= 1 ? asked - 1 : undefined, sample });
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
