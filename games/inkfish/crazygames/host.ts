import type { GameEvent, GameHost, KeyValueStore, LoadingReporter, PlatformAudio } from '@16bitink/game-sdk';
import type { Chapter } from '../src/levels/types';

/** The parts of the CrazyGames HTML5 SDK (v3) this edition uses. */
export interface CrazyGamesSdk {
  init(): Promise<void>;
  /** 'crazygames' on the portal, 'local' on localhost, 'disabled' anywhere else. */
  readonly environment?: string;
  readonly data: KeyValueStore;
  readonly game: {
    readonly settings: { readonly muteAudio?: boolean };
    addSettingsChangeListener(listener: (settings: { readonly muteAudio?: boolean }) => void): void;
    removeSettingsChangeListener(listener: (settings: { readonly muteAudio?: boolean }) => void): void;
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
}

export interface CrazyGamesHostOptions {
  /** The SDK after `init()`, or null when it failed to load (e.g. blocked): the game then plays on `fallbackStorage`. */
  readonly sdk: CrazyGamesSdk | null;
  /** Chapters 2–4, bundled with this edition. */
  readonly chapters: readonly Chapter[];
  /** Where saves go without the SDK (the browser's localStorage, when allowed). */
  readonly fallbackStorage?: KeyValueStore;
  /** The edition's own loading bar, lifted when the game calls `ready()`. */
  readonly loading?: LoadingReporter;
}

/**
 * InkFish on CrazyGames: the 40-level edition, complete as delivered. Saves
 * go through the SDK's Data module (it follows a signed-in CrazyGames player
 * between devices and falls back to the browser for guests), the portal's
 * mute setting silences the game, and loading and play are reported to it.
 */
export function createCrazyGamesHost({ sdk, chapters, fallbackStorage, loading }: CrazyGamesHostOptions): GameHost {
  return {
    unlocked: true,
    portal: true,
    loadContent: () => Promise.resolve(chapters),
    // Nothing to buy and nowhere to go: a portal build has no store and no links out.
    onBuy: () => undefined,
    onExit: () => undefined,
    storage: sdk ? safeStore(sdk.data) : fallbackStorage,
    audio: sdk ? sdkAudio(sdk) : undefined,
    loading: sdkLoading(sdk, loading),
    track: sdk ? (event) => reportGameplay(sdk, event) : undefined,
  };
}

/** The Data module, with its errors (over the 1 MB limit, module disabled) logged instead of thrown. */
function safeStore(data: KeyValueStore): KeyValueStore {
  return {
    getItem: (key) => {
      try {
        return data.getItem(key);
      } catch (err) {
        console.warn('[inkfish] could not read CrazyGames data', err);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        data.setItem(key, value);
      } catch (err) {
        console.warn('[inkfish] could not save to CrazyGames data', err);
      }
    },
  };
}

function sdkAudio(sdk: CrazyGamesSdk): PlatformAudio {
  return {
    get muted() {
      return sdk.game.settings.muteAudio === true;
    },
    onChange(listener) {
      const onSettings = (settings: { readonly muteAudio?: boolean }): void => listener(settings.muteAudio === true);
      sdk.game.addSettingsChangeListener(onSettings);
      return () => sdk.game.removeSettingsChangeListener(onSettings);
    },
  };
}

/** Reports the end of loading to the portal along with lifting the edition's own loading bar. */
function sdkLoading(sdk: CrazyGamesSdk | null, own: LoadingReporter | undefined): LoadingReporter {
  let done = false;
  return {
    progress: (fraction, label) => own?.progress(fraction, label),
    failed: (reason) => own?.failed?.(reason),
    ready: () => {
      if (done) return;
      done = true;
      own?.ready();
      sdk?.game.loadingStop();
    },
  };
}

/** A level is gameplay; the map, results and guide between levels are not. */
function reportGameplay(sdk: CrazyGamesSdk, event: GameEvent): void {
  if (event.type === 'level_start') sdk.game.gameplayStart();
  else sdk.game.gameplayStop();
}
