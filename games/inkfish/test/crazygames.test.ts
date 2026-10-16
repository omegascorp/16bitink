import type { KeyValueStore } from '@16bitink/game-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRAZYGAMES_CHAPTERS } from '../content/crazygames';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { createCrazyGamesHost, type CrazyGamesSdk } from '../crazygames/host';
import { REG, visibleZones } from '../src/host';
import { allLevels } from '../src/levels/chapters';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { parseChapters } from '../src/levels/validate';
import { ZONE_INFO } from '../src/levels/zones';
import { parseSave, SAVE_KEY } from '../src/logic/save';
import { computeMapLayout } from '../src/scenes/map/layout';

function memoryStore(): KeyValueStore & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) };
}

type Settings = { readonly muteAudio?: boolean };

function fakeSdk(muteAudio = false) {
  const listeners = new Set<(s: Settings) => void>();
  const data = memoryStore();
  const game = {
    settings: { muteAudio } as Settings,
    addSettingsChangeListener: (l: (s: Settings) => void) => void listeners.add(l),
    removeSettingsChangeListener: (l: (s: Settings) => void) => void listeners.delete(l),
    loadingStart: vi.fn(), loadingStop: vi.fn(), gameplayStart: vi.fn(), gameplayStop: vi.fn(),
  };
  const sdk: CrazyGamesSdk = { init: () => Promise.resolve(), environment: 'crazygames', data, game };
  const setMute = (muted: boolean): void => {
    game.settings = { muteAudio: muted };
    for (const l of listeners) l(game.settings);
  };
  return { sdk, data, game, listeners, setMute };
}

const registry = (host: object, chapters: readonly object[]) => ({
  registry: { get: (key: string) => (key === REG.host ? host : key === REG.chapters ? chapters : undefined) },
});

describe('CrazyGames edition content', () => {
  it('is chapters 2–4, so the game ends on level 40', () => {
    expect(CRAZYGAMES_CHAPTERS.map((c) => c.id)).toEqual([2, 3, 4]);
    const levels = allLevels([DEMO_CHAPTER, ...CRAZYGAMES_CHAPTERS]);
    expect(levels).toHaveLength(40);
    expect(levels.at(-1)!.chapter).toBe(4);
  });

  it('passes the game\'s own content validation', () => {
    expect(parseChapters(CRAZYGAMES_CHAPTERS)).toHaveLength(3);
  });

  it('plays the same levels as the site, so saves mean the same thing', () => {
    expect(JSON.stringify(CRAZYGAMES_CHAPTERS)).toBe(JSON.stringify(INKFISH_FULL_CHAPTERS.slice(0, 3)));
  });
});

describe('CrazyGames host', () => {
  afterEach(() => vi.restoreAllMocks());

  it('owns its content and has no store or links out', async () => {
    const host = createCrazyGamesHost({ sdk: fakeSdk().sdk, chapters: CRAZYGAMES_CHAPTERS });
    expect(host.unlocked).toBe(true);
    expect(host.portal).toBe(true);
    expect(host.onSignIn).toBeUndefined();
    expect(host.progress).toBeUndefined();
    expect(host.price).toBeUndefined();
    expect(await host.loadContent()).toBe(CRAZYGAMES_CHAPTERS);
  });

  it('saves through the Data module, not the browser', () => {
    const { sdk, data } = fakeSdk();
    const local = memoryStore();
    const host = createCrazyGamesHost({ sdk, chapters: CRAZYGAMES_CHAPTERS, fallbackStorage: local });
    const save = JSON.stringify({ version: 1, levels: { 'first-doodle': { bestScore: 9, blots: 2 } }, seen: [] });
    host.storage!.setItem(SAVE_KEY, save);
    expect(data.items.get(SAVE_KEY)).toBe(save);
    expect(local.items.size).toBe(0);
    expect(parseSave(host.storage!.getItem(SAVE_KEY)).levels['first-doodle']).toEqual({ bestScore: 9, blots: 2 });
  });

  it('keeps playing when the Data module refuses a save', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sdk } = fakeSdk();
    const broken: CrazyGamesSdk = { ...sdk, data: { getItem: () => { throw new Error('dataModuleDisabled'); }, setItem: () => { throw new Error('dataLimitExcedeed'); } } };
    const host = createCrazyGamesHost({ sdk: broken, chapters: CRAZYGAMES_CHAPTERS });
    expect(() => host.storage!.setItem(SAVE_KEY, '{}')).not.toThrow();
    expect(host.storage!.getItem(SAVE_KEY)).toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the browser when the SDK is unavailable', () => {
    const local = memoryStore();
    const host = createCrazyGamesHost({ sdk: null, chapters: CRAZYGAMES_CHAPTERS, fallbackStorage: local });
    host.storage!.setItem(SAVE_KEY, '{}');
    expect(local.items.get(SAVE_KEY)).toBe('{}');
    expect(host.audio).toBeUndefined();
    expect(host.track).toBeUndefined();
  });

  it('follows the portal\'s mute setting until unsubscribed', () => {
    const { sdk, listeners, setMute } = fakeSdk(true);
    const audio = createCrazyGamesHost({ sdk, chapters: CRAZYGAMES_CHAPTERS }).audio!;
    expect(audio.muted).toBe(true);
    const seen: boolean[] = [];
    const off = audio.onChange((m) => seen.push(m));
    setMute(false);
    expect(audio.muted).toBe(false);
    setMute(true);
    expect(seen).toEqual([false, true]);
    off();
    expect(listeners.size).toBe(0);
  });

  it('reports loading done once, and levels as gameplay', () => {
    const { sdk, game } = fakeSdk();
    const own = { progress: vi.fn(), ready: vi.fn() };
    const host = createCrazyGamesHost({ sdk, chapters: CRAZYGAMES_CHAPTERS, loading: own });
    host.loading!.progress(0.5, 'drawing');
    expect(own.progress).toHaveBeenCalledWith(0.5, 'drawing');
    host.loading!.ready();
    host.loading!.ready();
    expect(game.loadingStop).toHaveBeenCalledTimes(1);
    expect(own.ready).toHaveBeenCalledTimes(1);
    host.track!({ type: 'level_start', level: 'first-doodle', n: 1 });
    expect(game.gameplayStart).toHaveBeenCalledTimes(1);
    host.track!({ type: 'level_end', level: 'first-doodle', n: 1, result: 'win', seconds: 30 });
    expect(game.gameplayStop).toHaveBeenCalledTimes(1);
  });
});

describe('visible zones', () => {
  it('on the site, shows the whole ocean, owned or not', () => {
    expect(visibleZones(registry({ portal: false }, [DEMO_CHAPTER]))).toEqual(ZONE_INFO);
  });

  it('on a portal, ends the map with the last chapter it was given', () => {
    const zones = visibleZones(registry({ portal: true }, [DEMO_CHAPTER, ...CRAZYGAMES_CHAPTERS]));
    expect(zones.map((z) => z.id)).toEqual([1, 2, 3, 4]);
    const owned = [DEMO_CHAPTER, ...CRAZYGAMES_CHAPTERS];
    const layout = computeMapLayout(owned.map((c) => ({ info: c, levelIds: c.levels.map((l) => l.id), locked: false })));
    expect(layout.nodes).toHaveLength(40);
    expect(layout.zones.at(-1)!.chapter.info.zone).toBe('reef');
  });
});
