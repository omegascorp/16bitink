/**
 * Self-hosts a game's Google Fonts in its itch.io build: the CSS is fetched
 * once at build time, each font file is saved next to the game, and the CSS
 * is inlined with relative URLs. The embed then loads nothing from other
 * hosts, and plays the same if Google Fonts is blocked.
 */

/** Google serves woff2 (rather than ttf) only to browsers it recognises. */
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const FONT_URL = /url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+)\)/g;

export interface FontFile {
  readonly url: string;
  /** Path in the build, e.g. `fonts/caveat-v18-Wnz….woff2`. */
  readonly fileName: string;
}

export interface SelfHostedCss {
  readonly css: string;
  readonly files: readonly FontFile[];
}

/** The Google Fonts css2 address for a catalog query such as `family=Caveat:wght@500;700`. */
export function googleCssUrl(query: string): string {
  return `https://fonts.googleapis.com/css2?${query}&display=block`;
}

/** Points every fonts.gstatic.com URL in `css` at a local `fonts/` file, and lists the files to fetch. */
export function selfHostCss(css: string): SelfHostedCss {
  const files = new Map<string, string>();
  const rewritten = css.replace(FONT_URL, (_match, url: string) => {
    const fileName = files.get(url) ?? `fonts/${new URL(url).pathname.replace(/^\/s\//, '').replaceAll('/', '-')}`;
    files.set(url, fileName);
    return `url(./${fileName})`;
  });
  return { css: rewritten, files: [...files].map(([url, fileName]) => ({ url, fileName })) };
}

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Fetching ${url} failed: HTTP ${res.status}`);
  return res;
}

/** Downloads the CSS and font files for `query`. Throws on any failure, so a build never ships without its fonts. */
export async function downloadFonts(query: string): Promise<SelfHostedCss & { readonly data: ReadonlyMap<string, Uint8Array> }> {
  const css = await (await fetchOk(googleCssUrl(query), { headers: { 'user-agent': BROWSER_UA } })).text();
  const hosted = selfHostCss(css);
  if (hosted.files.length === 0) throw new Error(`Google Fonts returned no font files for "${query}"`);
  const entries = await Promise.all(
    hosted.files.map(async (f) => [f.fileName, new Uint8Array(await (await fetchOk(f.url)).arrayBuffer())] as const),
  );
  return { ...hosted, data: new Map(entries) };
}
