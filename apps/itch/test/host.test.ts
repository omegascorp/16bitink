import { describe, expect, it, vi } from 'vitest';
import { catalogUrl, createItchHost, gamePageUrl } from '../src/host';

describe('itch.io host', () => {
  it('is never unlocked and never serves paid content', async () => {
    const host = createItchHost({ slug: 'inkfish', openTab: vi.fn() });
    expect(host.unlocked).toBe(false);
    await expect(host.loadContent()).rejects.toThrow('16bit.ink');
  });

  it('sends the offer to the game page on 16bit.ink, tagged as itch traffic', () => {
    const openTab = vi.fn();
    createItchHost({ slug: 'inkmine', openTab }).onBuy('free_end');
    expect(openTab).toHaveBeenCalledWith('https://16bit.ink/games/inkmine?via=itch');
  });

  it('sends the exit button to the catalog', () => {
    const openTab = vi.fn();
    createItchHost({ slug: 'inkfish', openTab }).onExit();
    expect(openTab).toHaveBeenCalledWith(catalogUrl());
    expect(catalogUrl()).toBe('https://16bit.ink/?via=itch');
  });

  it('offers no sign-in, which needs the site', () => {
    const host = createItchHost({ slug: 'inkfish', openTab: vi.fn() });
    expect(host.onSignIn).toBeUndefined();
    expect(host.signedIn).toBeUndefined();
    expect(host.progress).toBeUndefined();
  });

  it('passes the price, storage and loading bar through', () => {
    const storage = { getItem: () => null, setItem: () => undefined };
    const loading = { progress: () => undefined, ready: () => undefined };
    const host = createItchHost({ slug: 'inkfish', price: '$4.99', storage, loading, openTab: vi.fn() });
    expect(host.price).toBe('$4.99');
    expect(host.storage).toBe(storage);
    expect(host.loading).toBe(loading);
  });

  it('keeps the slug safe in the URL', () => {
    expect(gamePageUrl('a b')).toBe('https://16bit.ink/games/a%20b?via=itch');
  });
});
