import { writeFileSync } from 'node:fs';
import { chromium } from '/Users/omegascorp/Projects/16bitink/games/inkheroes/node_modules/playwright-core/index.mjs';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
p.on('pageerror', (e) => console.error('pageerror', e.message));
await p.goto(url); const data = await p.evaluate(() => window.make());
writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); await b.close();
