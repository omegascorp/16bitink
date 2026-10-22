import Phaser from 'phaser';
import { BLUE } from '../../art/palette';
import { getSound } from '../../host';
import type { LevelDef } from '../../level/types';
import type { ResultData } from '../ResultScene';
import { clock, inkText } from '../ui';
import { BLOT_R, stamp, UI_RES, UI_TEX } from '../uiPaint';

const SOFT_INK = '#4a463e';
/** When the first blot stamps down, and the beat between blots, ms. */
const BLOTS_AT = 420;
const BLOT_BEAT = 340;
const COUNT_MS = 900;

/** Where the win card's pieces go, relative to its top. */
export const WIN = { title: 66, level: 114, blots: 176, why: 224, rule: 252, stats: 296, caption: 330, peek: 376 } as const;

/**
 * A cleared level's card body: the ink blots stamping down one by one,
 * why they were earned, then the score counting up beside the time,
 * best combo and streak, with a red "New best!" stamp when it was the
 * fastest yet.
 */
export function winContent(scene: Phaser.Scene, card: Phaser.GameObjects.Container, data: ResultData, level: LevelDef, top: number, titleX: number): void {
  card.add(inkText(scene, titleX, top + WIN.title, 'Cleared!', 62, BLUE));
  blots(scene, card, data.blots, titleX, top + WIN.blots);
  const why = ['cleared', data.time <= level.par ? `under ${clock(level.par)}` : `par ${clock(level.par)}`, data.livesLost === 0 ? 'no lives lost' : `${data.livesLost} ${data.livesLost === 1 ? 'life' : 'lives'} lost`];
  card.add(inkText(scene, titleX, top + WIN.why, why.join('  ·  '), 20, SOFT_INK));
  card.add(rule(scene, top + WIN.rule));
  const counted = Math.min(data.blots, 3);
  const statsAt = BLOTS_AT + counted * BLOT_BEAT + 120;
  const best = data.previousBest !== undefined && data.time < data.previousBest;
  const cols = [-195, -65, 65, 195];
  const score = stat(scene, card, cols[0]!, top, '0', 'points');
  const timeCaption = data.previousBest !== undefined && !best ? `time · best ${clock(data.previousBest)}` : 'time';
  stat(scene, card, cols[1]!, top, clock(data.time), timeCaption);
  stat(scene, card, cols[2]!, top, data.bestCombo > 0 ? `×${data.bestCombo + 1}` : '–', 'best combo');
  stat(scene, card, cols[3]!, top, data.bestStreak > 0 ? `${data.bestStreak}` : '–', 'best streak');
  scene.tweens.addCounter({
    from: 0, to: data.score, duration: COUNT_MS, delay: statsAt, ease: 'Quad.Out',
    onUpdate: (t) => score.setText(`${Math.round(t.getValue() ?? 0)}`),
    onComplete: () => score.setText(`${data.score}`),
  });
  if (best) {
    const s = stamp(scene, cols[1]! + 44, top + WIN.stats - 42, 'New best!', 88, 30).setAlpha(0).setAngle(-14);
    card.add(s);
    scene.tweens.add({
      targets: s, alpha: 1, scale: { from: 2.2 / UI_RES, to: 1 / UI_RES }, duration: 200, delay: statsAt + COUNT_MS * 0.6, ease: 'Quad.In',
      onStart: () => getSound(scene)?.play('thud'),
    });
  }
}

/** Three blot slots, the earned ones stamped in one at a time, rising in pitch. */
function blots(scene: Phaser.Scene, card: Phaser.GameObjects.Container, earned: number, cx: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * (BLOT_R * 2.9);
    card.add(scene.add.image(x, y, UI_TEX.blotSlot).setScale(1 / UI_RES));
    if (i >= earned) continue;
    const blot = scene.add.image(x, y, UI_TEX.blot(i)).setScale(2 / UI_RES).setAlpha(0).setAngle(i * 47);
    card.add(blot);
    scene.tweens.add({
      targets: blot, alpha: 1, scale: 1 / UI_RES, duration: 170, delay: BLOTS_AT + i * BLOT_BEAT, ease: 'Quad.In',
      onStart: () => getSound(scene)?.play('pop', { pitch: 1 + i * 0.14 }),
      onComplete: () => scene.tweens.add({ targets: blot, scale: { from: 0.9 / UI_RES, to: 1 / UI_RES }, duration: 160, ease: 'Back.Out' }),
    });
  }
}

/** A big hand-lettered number with a small caption under it; returns the number. */
function stat(scene: Phaser.Scene, card: Phaser.GameObjects.Container, x: number, top: number, value: string, caption: string): Phaser.GameObjects.Text {
  const t = inkText(scene, x, top + WIN.stats, value, 38, BLUE);
  card.add([t, inkText(scene, x, top + WIN.caption, caption, 18, SOFT_INK)]);
  return t;
}

/** A faint dotted pencil rule across the card. */
export function rule(scene: Phaser.Scene, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  for (let x = -220; x <= 220; x += 7) g.fillStyle(0x26316a, 0.22 * (1 - Math.abs(x) / 260)).fillCircle(x, y + Math.sin(x / 40) * 0.8, 1.1);
  return g;
}
