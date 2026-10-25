// Screenshots a dev page: node dev/tools/shoot.mjs <url> <out.png> [width]
// Uses the system Chrome (as dev/promo/record.mjs does).
import { chromium } from 'playwright-core';

const [url, out, width = '1600'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node dev/tools/shoot.mjs <url> <out.png> [width]');
  process.exit(1);
}
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out, fullPage: true });
  if (errors.length) console.error(errors.join('\n'));
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
