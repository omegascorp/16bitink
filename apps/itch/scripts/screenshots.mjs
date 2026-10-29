// Takes itch.io screenshot candidates of real play: the game's dev server runs
// unlocked, the site's autopilot (apps/web/scripts/gameplay/bots/<slug>.js)
// plays under the virtual clock (clock.js), and the whole screen (1920×1080),
// HUD included, is saved at a few moments of each preset level.
//   1. cd games/inkfish && DEV_UNLOCK=true DEV_ALL_LEVELS=true pnpm dev
//   2. pnpm --filter @16bitink/itch screenshots inkfish
// Writes dist/screens/<slug>/<level>-<seconds>s.png and a contact sheet; pick 3–5.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const gameplay = join(root, '../web/scripts/gameplay');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 30;
const W = 960;
const H = 540;
// Laid out as the itch.io embed (960×540), where the fish read bigger than on a wide screen; saved at 1920×1080.
const SCALE = 2;

/** Candidates: a frame every 3 s of the first 45 s. */
const EVERY_3S = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45];

/** Per game: its dev server, and the levels to shoot (0-based across every chapter) with the moments to save. */
const PRESETS = {
  inkfish: {
    port: 5174,
    shots: [
      { level: 4, label: 'ch1-school-rush', at: EVERY_3S },
      { level: 8, label: 'ch1-nib-narrows', at: EVERY_3S },
      { level: 34, label: 'ch4-reef', at: EVERY_3S },
      { level: 44, label: 'ch5-wreck', at: EVERY_3S },
      { level: 64, label: 'ch7-twilight', at: EVERY_3S },
    ],
  },
};

const slug = process.argv[2] ?? 'inkfish';
const preset = PRESETS[slug];
if (!preset) throw new Error(`No screenshot preset for "${slug}": add one to PRESETS`);
const only = process.argv[3];
const out = join(root, 'dist', 'screens', slug);
mkdirSync(out, { recursive: true });
const bot = readFileSync(join(gameplay, 'bots', `${slug}.js`), 'utf8');
const url = `http://localhost:${preset.port}/`;

async function openLevel(page, level) {
  await page.addInitScript({ path: join(gameplay, 'clock.js') });
  const res = await page.goto(url, { waitUntil: 'load' }).catch((err) => {
    throw new Error(`Could not open ${url}: start the ${slug} dev server unlocked first (${err.message})`);
  });
  if (!res?.ok()) throw new Error(`${url} answered ${res?.status()}`);
  await page.addScriptTag({ content: bot });
  await page.waitForFunction(() => window.__bot.ready(), null, { timeout: 120_000, polling: 250 });
  await page.evaluate((l) => window.__bot.start(l), level);
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__bot.ready(), null, { timeout: 120_000, polling: 250 });
}

async function applyInput(page, aim, held) {
  if (aim && typeof aim.x === 'number') await page.mouse.move(aim.x, aim.y);
  if (!aim?.keys) return;
  const want = new Set(aim.keys.held ?? []);
  for (const key of [...held]) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
  for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  for (const key of aim.keys.tap ?? []) await page.keyboard.press(key);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal'] });
try {
  for (const shot of preset.shots.filter((s) => !only || s.label === only)) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
    page.on('pageerror', (err) => console.error('[page]', err.message));
    await openLevel(page, shot.level);
    await page.evaluate(() => window.__clock.freeze());
    const held = new Set();
    const last = Math.max(...shot.at) * FPS;
    for (let i = 0; i <= last; i++) {
      await applyInput(page, await page.evaluate((f) => window.__bot.steer(f), i), held);
      await page.evaluate((ms) => window.__clock.step(ms), 1000 / FPS);
      if (i % FPS === 0 && shot.at.includes(i / FPS)) {
        const file = join(out, `${shot.label}-${i / FPS}s.png`);
        await page.screenshot({ path: file });
        console.log(file, JSON.stringify(await page.evaluate(() => window.__bot.status?.() ?? null)));
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
