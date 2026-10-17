import Phaser from 'phaser';
import { getSound } from '../../host';
import { INK_TEXT, MADDER, SERIF } from './type';

/** The ring's radius, and the (bigger) radius a tap counts within, so it's easy to hit on a phone. */
const R = 17;
const HIT = 26;

/**
 * Sound on or off: a small inked ring with a note in it, struck through in
 * madder while muted. A tap toggles it, as the M key does anywhere; it
 * follows the setting however it changes. Nothing is drawn when the game
 * has no sound board.
 */
export function muteButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container | null {
  const sound = getSound(scene);
  if (!sound) return null;
  const ink = Phaser.Display.Color.HexStringToColor(INK_TEXT).color;
  const madder = Phaser.Display.Color.HexStringToColor(MADDER).color;
  const ring = scene.add.graphics();
  ring.fillStyle(0xf3ead4, 0.85).fillCircle(0, 0, R);
  ring.lineStyle(1.3, ink, 0.85).strokeCircle(0, 0, R);
  ring.lineStyle(0.6, ink, 0.4).strokeCircle(0, 0, R - 3.5);
  const note = scene.add.text(0, 1, '♪', { fontFamily: SERIF, fontSize: '22px', color: INK_TEXT }).setOrigin(0.5);
  const strike = scene.add.graphics();
  strike.lineStyle(2.4, madder, 0.9).lineBetween(-R * 0.62, R * 0.62, R * 0.62, -R * 0.62);
  const c = scene.add.container(x, y, [ring, note, strike]).setSize(HIT * 2, HIT * 2);
  const sync = (muted: boolean): void => {
    strike.setVisible(muted);
    note.setAlpha(muted ? 0.55 : 1);
  };
  sync(sound.muted);
  c.setInteractive(new Phaser.Geom.Circle(HIT, HIT, HIT), Phaser.Geom.Circle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  c.on('pointerover', () => c.setScale(1.06));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => sound.setMuted(!sound.muted));
  const unsubscribe = sound.onMuteChange(sync);
  c.once(Phaser.GameObjects.Events.DESTROY, unsubscribe);
  return c;
}
