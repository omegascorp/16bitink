import Phaser from 'phaser';
import { BLUE_HEX, PAPER } from '../../art/palette';
import type { LevelDef } from '../../level/types';
import type { BlotReason } from '../../logic/resultCard';
import { createRng } from '../../logic/rng';
import { HAND_FONT, inkButton, inkText } from '../ui';

const SOFT_INK = '#4a463e';
/** When the blots start splatting onto the card, ms after the screen opens. */
const BLOTS_AT = 1300;
const BLOT_GAP_MS = 260;
const BLOT_R = 28;

export interface CardButtons {
  /** The big button: next level after a win, try again after a loss. */
  readonly primary: { readonly label: string; readonly go: () => void };
  readonly secondary: readonly { readonly label: string; readonly go: () => void }[];
}

/** An ink blot, splatted: a lumpy drop and a few flecks; unearned, just a faint ring. */
function blot(scene: Phaser.Scene, x: number, y: number, earned: boolean, seed: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  if (!earned) {
    g.lineStyle(2.2, BLUE_HEX, 0.4).strokeCircle(0, 0, BLOT_R);
    return g;
  }
  const rng = createRng(seed);
  const n = 40;
  const waves = [3, 5, 7].map((k) => ({ k, p: rng() * Math.PI * 2, a: 0.05 + rng() * 0.05 }));
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = BLOT_R * (1 + waves.reduce((s, w) => s + Math.sin(a * w.k + w.p) * w.a, 0));
    return new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  });
  g.fillStyle(BLUE_HEX, 0.88).fillPoints(pts, true);
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    const d = BLOT_R * (1.25 + rng() * 0.35);
    g.fillCircle(Math.cos(a) * d, Math.sin(a) * d, 2 + rng() * 3);
  }
  return g;
}

/** The three blots, splatting in one after another, each labelled with what earns it. */
function blotRow(scene: Phaser.Scene, top: number, w: number, reasons: readonly BlotReason[]): Phaser.GameObjects.GameObject[] {
  const gap = Math.min(140, (w - 40) / reasons.length);
  return reasons.flatMap((r, i) => {
    const x = (i - (reasons.length - 1) / 2) * gap;
    const g = blot(scene, x, top, r.earned, 17 + i * 13).setScale(0);
    const delay = BLOTS_AT + i * BLOT_GAP_MS;
    scene.tweens.add({ targets: g, scale: 1, delay, duration: r.earned ? 340 : 220, ease: r.earned ? 'Back.Out' : 'Quad.Out' });
    const label = scene.add.text(x, top + BLOT_R + 24, r.label, { fontFamily: HAND_FONT, fontSize: '19px', color: r.earned ? '#1b1a1f' : SOFT_INK, align: 'center', wordWrap: { width: gap - 8 } })
      .setOrigin(0.5).setAlpha(0);
    scene.tweens.add({ targets: label, alpha: r.earned ? 1 : 0.7, delay, duration: 260 });
    return [g, label];
  });
}

/** The big button and the small ones under it, at the card's foot. */
function buttonRows(scene: Phaser.Scene, w: number, h: number, b: CardButtons): Phaser.GameObjects.GameObject[] {
  const foot = h / 2;
  const primary = inkButton(scene, 0, foot - 118, b.primary.label, b.primary.go, { width: w - 80, height: 62, size: 32, fill: BLUE_HEX, color: PAPER });
  const n = b.secondary.length;
  const bw = Math.min(200, (w - 60) / n - 12);
  const small = b.secondary.map((s, i) => inkButton(scene, (i - (n - 1) / 2) * (bw + 16), foot - 48, s.label, s.go, { width: bw, height: 46, size: 24 }));
  return [primary, ...small];
}

/** After a win: the blots and why, then a look at the next level. */
export function winParts(scene: Phaser.Scene, w: number, h: number, reasons: readonly BlotReason[], next: { readonly number: number; readonly def: LevelDef; readonly goal: number } | undefined, buttons: CardButtons): Phaser.GameObjects.GameObject[] {
  const top = -h / 2;
  const parts: Phaser.GameObjects.GameObject[] = [inkText(scene, 0, top + 44, 'Ink blots', 34), ...blotRow(scene, top + 116, w, reasons)];
  if (next) {
    parts.push(
      scene.add.text(0, top + 222, `Next · Level ${next.number}`, { fontFamily: HAND_FONT, fontSize: '20px', color: SOFT_INK }).setOrigin(0.5),
      inkText(scene, 0, top + 254, `${next.def.name}: grow to size ${next.goal}`, 28),
      scene.add.text(0, top + 292, next.def.hint, { fontFamily: HAND_FONT, fontSize: '21px', color: SOFT_INK, align: 'center', wordWrap: { width: w - 70 } }).setOrigin(0.5, 0),
    );
  }
  return [...parts, ...buttonRows(scene, w, h, buttons)];
}

/** After running out of lives: a tip for next time and the way back in. */
export function loseParts(scene: Phaser.Scene, w: number, h: number, tip: string, def: LevelDef, goal: number, buttons: CardButtons): Phaser.GameObjects.GameObject[] {
  const top = -h / 2;
  return [
    inkText(scene, 0, top + 50, 'Tip for next time', 34),
    scene.add.text(0, top + 92, tip, { fontFamily: HAND_FONT, fontSize: '26px', color: '#1b1a1f', align: 'center', lineSpacing: 4, wordWrap: { width: w - 70 } }).setOrigin(0.5, 0),
    scene.add.text(0, top + 222, 'This level', { fontFamily: HAND_FONT, fontSize: '20px', color: SOFT_INK }).setOrigin(0.5),
    inkText(scene, 0, top + 254, `${def.name}: grow to size ${goal}`, 28),
    scene.add.text(0, top + 290, def.hint, { fontFamily: HAND_FONT, fontSize: '21px', color: SOFT_INK, align: 'center', wordWrap: { width: w - 70 } }).setOrigin(0.5, 0),
    ...buttonRows(scene, w, h, buttons),
  ];
}
