import Phaser from 'phaser';
import type { Tab } from '../../logic/tech';
import { FADED, heading, INK_TEXT } from '../kit/type';

const NAMES: Readonly<Record<Tab, string>> = { suit: 'Suit', ship: 'Lander', starship: 'Starship' };
const SIZE = 22;
const GAP = 34;

/**
 * The tab strip, as No Man's Sky's: the tab names in spaced capitals, the
 * one showing in ink with a double rule under it, the others faded, with a
 * hairline between each. Laid out leftwards from `right`, centred on `y`.
 * Returns its width.
 */
export function drawTabs(scene: Phaser.Scene, right: number, y: number, tabs: readonly Tab[], current: Tab, onPick: (t: Tab) => void): number {
  const texts = tabs.map((t) => heading(scene, 0, y, NAMES[t], SIZE, t === current ? INK_TEXT : FADED).setOrigin(0, 0.5));
  const width = texts.reduce((w, t) => w + t.width, 0) + GAP * (texts.length - 1);
  const g = scene.add.graphics();
  const ink = Phaser.Display.Color.HexStringToColor(INK_TEXT).color;
  let x = right - width;
  texts.forEach((t, i) => {
    const tab = tabs[i]!;
    t.setX(x);
    if (tab === current) {
      g.lineStyle(1.6, ink, 0.9).lineBetween(x, y + 18, x + t.width - SIZE * 0.16, y + 18);
      g.lineStyle(0.7, ink, 0.6).lineBetween(x, y + 22, x + t.width - SIZE * 0.16, y + 22);
    } else {
      t.setInteractive({ useHandCursor: true }).on('pointerup', () => onPick(tab));
      t.on('pointerover', () => t.setColor(INK_TEXT));
      t.on('pointerout', () => t.setColor(FADED));
    }
    if (i > 0) g.lineStyle(0.8, ink, 0.45).lineBetween(x - GAP / 2, y - 12, x - GAP / 2, y + 12);
    x += t.width + GAP;
  });
  return width;
}
