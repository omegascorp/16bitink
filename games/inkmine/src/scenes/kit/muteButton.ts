import Phaser from 'phaser';
import { getSound } from '../../host';
import { INK_TEXT, MADDER, SERIF } from './type';

/** The ring's radius, and the (bigger) radius a tap counts within, so it's easy to hit on a phone. */
const R = 17;
const HIT = 26;

/** A small inked ring with a glyph in it, struck through in madder while off; a tap toggles it, and it follows the setting however it changes. */
function ringToggle(scene: Phaser.Scene, x: number, y: number, glyph: string, on: () => boolean, toggle: () => void, watch: (sync: (on: boolean) => void) => () => void): Phaser.GameObjects.Container {
  const ink = Phaser.Display.Color.HexStringToColor(INK_TEXT).color;
  const madder = Phaser.Display.Color.HexStringToColor(MADDER).color;
  const ring = scene.add.graphics();
  ring.fillStyle(0xf3ead4, 0.85).fillCircle(0, 0, R);
  ring.lineStyle(1.3, ink, 0.85).strokeCircle(0, 0, R);
  ring.lineStyle(0.6, ink, 0.4).strokeCircle(0, 0, R - 3.5);
  const note = scene.add.text(0, 1, glyph, { fontFamily: SERIF, fontSize: '22px', color: INK_TEXT }).setOrigin(0.5);
  const strike = scene.add.graphics();
  strike.lineStyle(2.4, madder, 0.9).lineBetween(-R * 0.62, R * 0.62, R * 0.62, -R * 0.62);
  const c = scene.add.container(x, y, [ring, note, strike]).setSize(HIT * 2, HIT * 2);
  const sync = (isOn: boolean): void => {
    strike.setVisible(!isOn);
    note.setAlpha(isOn ? 1 : 0.55);
  };
  sync(on());
  c.setInteractive(new Phaser.Geom.Circle(HIT, HIT, HIT), Phaser.Geom.Circle.Contains);
  if (c.input) c.input.cursor = 'pointer';
  c.on('pointerover', () => c.setScale(1.06));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', toggle);
  const unsubscribe = watch(sync);
  c.once(Phaser.GameObjects.Events.DESTROY, unsubscribe);
  return c;
}

/**
 * Sound on or off: a note in the ring, struck through while muted. A tap
 * toggles it, as the M key does anywhere. Nothing is drawn when the game
 * has no sound board.
 */
export function muteButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container | null {
  const sound = getSound(scene);
  if (!sound) return null;
  return ringToggle(scene, x, y, '♪', () => !sound.muted, () => sound.setMuted(!sound.muted), (sync) => sound.onMuteChange((muted) => sync(!muted)));
}

/**
 * The narrator on or off (spec, "Narration"): quotation marks in the ring,
 * struck through while off, when the story shows on cards to read instead.
 */
export function narrationButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container | null {
  const sound = getSound(scene);
  if (!sound) return null;
  return ringToggle(scene, x, y, '\u201C\u201D', () => sound.narration, () => sound.setNarration(!sound.narration), (sync) => sound.onNarrationChange(sync));
}

/**
 * Full screen on or off, as InkFish's corner button: the site asks for it
 * when play starts, and this brings it back after a swipe or Back leaves it.
 * Nothing is drawn where the browser can't (an iPhone, an in-app browser).
 */
export function fullscreenButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container | null {
  // Phaser only checks the method exists; in-app browsers (WebViews) have it but refuse every request.
  if (!scene.scale.fullscreen.available || !document.fullscreenEnabled) return null;
  const toggle = (): void => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    // Not scale.startFullscreen(): it drops the request's promise, so a refusal becomes an uncaught error.
    else (scene.scale.getFullscreenTarget() as HTMLElement).requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
  };
  // Never struck through: the glyph says what a tap does either way.
  return ringToggle(scene, x, y, '⤢', () => true, toggle, () => () => undefined);
}
