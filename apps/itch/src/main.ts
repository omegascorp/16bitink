import game from 'virtual:itch-game';
import { browserStorage, createItchHost, windowOpenTab } from './host';
import { pageLoading } from './loading';

const edition = __ITCH_EDITION__;
const loading = pageLoading(document.getElementById('loading'));
// The fonts are bundled (index.html's @font-face); the canvas only draws with them once they're loaded.
await Promise.all(edition.fonts.map((font) => document.fonts.load(font).catch(() => undefined)));
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
game.mount(parent, createItchHost({
  slug: edition.slug,
  ...(edition.price ? { price: edition.price } : {}),
  storage: browserStorage(),
  loading,
  openTab: windowOpenTab,
}));
