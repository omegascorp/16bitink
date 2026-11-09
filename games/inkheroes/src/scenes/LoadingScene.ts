import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { loadUiFont } from './battle/pixelFont';
import { loadLoadingArt, PixelLoading } from './pixelLoading';
import { pixelUiCamera } from './pixelScreen';

/** Share of the bar a scene's art fills; the rest is laying the scene out once it is in. */
const ART_SHARE = 0.85;

/**
 * The pixel loading screen over a scene that is loading what it needs to
 * show itself (the map its ground and sites, a battle its fighters' poses
 * and terrain): the boot screen's country, wordmark, bar and rider. Its
 * own art and font are loaded at boot, so it shows at once (or as soon as
 * they are in, when a scene runs without the boot).
 */
export class LoadingScene extends Phaser.Scene {
  private screen: PixelLoading | null = null;
  private text = '';
  private shown = 0;

  constructor() {
    super('Loading');
  }

  create(data: { text: string }): void {
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.text = data.text;
    this.shown = 0;
    const fit = pixelUiCamera(this, (size) => {
      if (this.screen) this.draw(size);
    });
    void Promise.all([loadUiFont(), loadLoadingArt(this)])
      .then(() => {
        if (this.sys.isActive()) this.draw(fit());
      })
      .catch((e: unknown) => console.warn('loading screen art failed to load', e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.screen?.destroy();
      this.screen = null;
    });
  }

  private draw(size: { w: number; h: number }): void {
    const drift = this.screen?.drift;
    this.screen?.destroy();
    this.screen = new PixelLoading(this, size, this.text, drift);
    this.screen.setProgress(this.shown);
  }

  update(_t: number, delta: number): void {
    this.screen?.update(delta);
  }

  setProgress(f: number, text?: string): void {
    this.shown = Math.max(this.shown, f);
    if (text) this.text = text;
    this.screen?.setProgress(f, text);
  }
}

/** The loading screen over `scene` while it loads; its bar follows the scene's loader. */
export interface LoadingCover {
  /** The art is in: the bar moves on to laying the scene out, named `text`; resolves once that has been drawn. */
  laying(text: string): Promise<void>;
  /** How far laying the scene out has got (0..1): the rest of the bar. */
  layingProgress(f: number): void;
  /** The scene is ready: the screen goes. */
  close(): void;
}

/** Puts the loading screen over `scene`, named `text`, its bar filling as the scene's loader does. */
export function coverWhileLoading(scene: Phaser.Scene, text: string): LoadingCover {
  const plugin = scene.scene;
  // A scene run on its own (the battle sandbox) has no loading screen: it just loads.
  if (!plugin.get('Loading')) return { laying: () => Promise.resolve(), layingProgress: () => undefined, close: () => undefined };
  plugin.launch('Loading', { text });
  plugin.bringToTop('Loading');
  const cover = (): LoadingScene | null => {
    const s = plugin.get('Loading') as LoadingScene;
    return s.sys.isActive() ? s : null;
  };
  const onProgress = (f: number): void => cover()?.setProgress(f * ART_SHARE);
  scene.load.on(Phaser.Loader.Events.PROGRESS, onProgress);
  const stopListening = (): void => {
    scene.load.off(Phaser.Loader.Events.PROGRESS, onProgress);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stopListening);
  return {
    laying: (next) => {
      stopListening();
      cover()?.setProgress(ART_SHARE, next);
      // Two frames: one for the bar to be drawn, one before the heavy layout starts.
      return new Promise((resolve) => scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => scene.game.events.once(Phaser.Core.Events.POST_RENDER, () => resolve())));
    },
    layingProgress: (f) => cover()?.setProgress(ART_SHARE + Math.min(1, Math.max(0, f)) * (1 - ART_SHARE)),
    close: () => {
      stopListening();
      cover()?.setProgress(1);
      plugin.stop('Loading');
    },
  };
}
