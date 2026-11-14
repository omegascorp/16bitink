import type { GameHandle, GameHost, GameModule } from '@16bitink/game-sdk';
import { App } from './app/app';
import { injectStyles, loadUiFont } from './ui/style';
import { GAME_VERSION } from './version';

/**
 * InkTanks: pure logic in src/logic (covered by test/), the mission scene in
 * src/scenes/mission, the screens in src/ui, the flow in src/app. Dev pages:
 * dev/index.html (the whole game), dev/mission.html, dev/stress.html and the
 * headless sim (`npm run lab`).
 */
export const GAME_ID = 'inktanks';

/** Mounts InkTanks into `parent`, filling it completely and tracking its size. */
export function mount(parent: HTMLElement, host: GameHost): GameHandle & { readonly app: Promise<App> } {
  injectStyles(parent.ownerDocument);
  let destroyed = false;
  // The pixel font first, so the boot screen's wordmark is drawn in it (it is small: about 14 KB).
  const app = loadUiFont().then(() => {
    if (destroyed) throw new Error('destroyed before it mounted');
    return new App(parent, host);
  });
  app.catch(() => undefined);
  return {
    app,
    destroy: () => {
      destroyed = true;
      void app.then((a) => a.destroy(), () => undefined);
    },
  };
}

const inktanks: GameModule = { mount, version: GAME_VERSION };
export default inktanks;
