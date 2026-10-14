import { describe, expect, it } from 'vitest';
import { parseUserAgent } from '../src/lib/userAgent';

const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
  chromeIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  samsungTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Safari/537.36',
  chromebook: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

describe('parseUserAgent', () => {
  it.each([
    [UA.chromeWin, 'Windows', 'Chrome', 'desktop'],
    [UA.edgeWin, 'Windows', 'Edge', 'desktop'],
    [UA.safariMac, 'macOS', 'Safari', 'desktop'],
    [UA.firefoxLinux, 'Linux', 'Firefox', 'desktop'],
    [UA.safariIphone, 'iOS', 'Safari', 'mobile'],
    [UA.chromeIphone, 'iOS', 'Chrome', 'mobile'],
    [UA.chromeAndroid, 'Android', 'Chrome', 'mobile'],
    [UA.samsungTablet, 'Android', 'Samsung Internet', 'tablet'],
    [UA.chromebook, 'ChromeOS', 'Chrome', 'desktop'],
  ])('%s', (ua, os, browser, device) => {
    expect(parseUserAgent(ua)).toEqual({ os, browser, device, bot: false });
  });

  it('counts a "Mac" with a touch screen as an iPad', () => {
    expect(parseUserAgent(UA.safariMac, true)).toMatchObject({ os: 'iPadOS', device: 'tablet' });
  });

  it('flags crawlers and empty agents as bots', () => {
    expect(parseUserAgent(UA.googlebot).bot).toBe(true);
    expect(parseUserAgent('').bot).toBe(true);
  });
});
