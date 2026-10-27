import { mount } from '../src/index';

// Dev harness for the one-level prototype.
await document.fonts.load('32px Caveat').catch(() => undefined);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
const handle = mount(parent);
// Exposed for automated smoke tests only.
(window as unknown as { __game: unknown }).__game = handle.phaser;
