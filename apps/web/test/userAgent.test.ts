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
  facebookIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/530.0.0.47.106;FBBV/812345678;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.6;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/530.0.0.47.106;]',
  instagramIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.38.80 (iPhone15,2; iOS 18_6; en_US; en; scale=3.00; 1179x2556; 812345678)',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.38.80 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; en_US; 812345678)',
  tiktokAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 trill_380000 BytedanceWebview/d8a21c6 musical_ly_38.0.0',
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
    // In-app browsers, where Google sign-in is refused: named apart from the browser they're built on.
    [UA.facebookIphone, 'iOS', 'Facebook app', 'mobile'],
    [UA.facebookAndroid, 'Android', 'Facebook app', 'mobile'],
    [UA.instagramIphone, 'iOS', 'Instagram app', 'mobile'],
    [UA.instagramAndroid, 'Android', 'Instagram app', 'mobile'],
    [UA.tiktokAndroid, 'Android', 'TikTok app', 'mobile'],
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
