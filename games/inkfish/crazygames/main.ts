import type { LoadingReporter } from '@16bitink/game-sdk';
import { CRAZYGAMES_CHAPTERS } from '../content/crazygames';
import { mount } from '../src/index';
import { createCrazyGamesHost, type CrazyGamesSdk } from './host';

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
  }
}

/** The edition's loading bar (index.html), standing in for the site's. */
function pageLoading(): LoadingReporter {
  const root = document.getElementById('loading');
  const fill = root?.querySelector<HTMLElement>('.fill');
  const label = root?.querySelector<HTMLElement>('.label');
  return {
    progress: (fraction, text) => {
      if (fill) fill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
      if (label && text) label.textContent = text;
    },
    ready: () => {
      root?.classList.add('gone');
      setTimeout(() => root?.remove(), 400);
    },
  };
}

/**
 * The SDK, initialised (which also loads the player's saved data), or null
 * when it can't be used: blocked by an ad blocker, or the build opened
 * outside CrazyGames and localhost.
 */
async function initSdk(): Promise<CrazyGamesSdk | null> {
  const sdk = window.CrazyGames?.SDK;
  if (!sdk) {
    console.warn('[inkfish] CrazyGames SDK missing; saving in this browser only');
    return null;
  }
  try {
    await sdk.init();
  } catch (err) {
    console.warn('[inkfish] CrazyGames SDK failed to start; saving in this browser only', err);
    return null;
  }
  if (sdk.environment === 'disabled') return null;
  sdk.game.loadingStart();
  return sdk;
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const loading = pageLoading();
const [sdk] = await Promise.all([initSdk(), document.fonts.load('32px Caveat').catch(() => undefined)]);
const parent = document.getElementById('game');
if (!parent) throw new Error('#game missing');
mount(parent, createCrazyGamesHost({ sdk, chapters: CRAZYGAMES_CHAPTERS, fallbackStorage: browserStorage(), loading }));
