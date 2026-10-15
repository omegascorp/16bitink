/** Coarse facts from a User-Agent header: enough to count visits, not to fingerprint anyone. */
export interface Agent {
  readonly os: string;
  readonly browser: string;
  readonly device: 'desktop' | 'mobile' | 'tablet';
  /** Crawlers, link previews and headless browsers: not counted as visitors. */
  readonly bot: boolean;
}

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|curl|wget|python-|node-fetch|axios/i;

/** First match wins, so more specific names come before the engines they are built on. */
const OS: readonly (readonly [RegExp, string])[] = [
  [/iPad/, 'iPadOS'],
  [/iPhone|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Windows/, 'Windows'],
  [/Macintosh|Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/YaBrowser\//, 'Yandex'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/CriOS\/|Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const pick = (ua: string, table: readonly (readonly [RegExp, string])[]): string => table.find(([re]) => re.test(ua))?.[1] ?? 'Other';

/**
 * `touch` comes from the page: iPads ask for desktop sites and send a Mac
 * User-Agent, so a "Mac" with a touch screen is counted as an iPad.
 */
export function parseUserAgent(ua: string, touch = false): Agent {
  const bot = ua.length === 0 || BOT.test(ua);
  const named = pick(ua, OS);
  const os = named === 'macOS' && touch ? 'iPadOS' : named;
  const device = os === 'iPadOS' || (os === 'Android' && !/Mobile/.test(ua)) ? 'tablet' : /Mobi|iPhone|iPod|Android/.test(ua) ? 'mobile' : 'desktop';
  return { os, browser: pick(ua, BROWSERS), device, bot };
}
