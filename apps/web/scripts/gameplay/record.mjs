/**
 * Records real play of a game for the home page's cover loop: the game runs
 * in Chrome under a virtual clock (clock.js), a small autopilot plays it
 * (bots/<slug>.js), and every frame is captured exactly 1/30 s apart, so
 * the video is smooth however slow the capture runs. Only the game world is
 * filmed: the HUD and other scenes are hidden, and the shot is a crop that
 * follows the player.
 *
 *   1. Start the game's dev server, unlocked so later levels load:
 *        cd games/inkfish && DEV_UNLOCK=true DEV_ALL_LEVELS=true pnpm dev
 *   2. pnpm --filter @16bitink/web gameplay -- inkfish [--url http://localhost:5174/]
 *
 * Writes promo/<slug>-gameplay.mp4 (the whole take) and promo/<slug>-gameplay.png
 * (one frame a second, to pick the best stretch), then cuts --from/--to into
 * public/loops/ with scripts/loops.mjs. Runs differ (levels are seeded by the
 * clock), so check the contact sheet and re-cut with loops.mjs if the preset
 * window isn't the best part. Flags override the preset: --level --zoom
 * --skip --seconds --from --to --url.
 *
 * Needs Google Chrome and ffmpeg. playwright-core comes from a game package.
 */
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PROMO = join(ROOT, 'promo');
const FPS = 30;
const W = 1280;
const H = 720;

/**
 * What each loop was recorded with (Oct 2026). `level`: a level index or id
 * to jump to (null: where a new player starts); `zoom`: how much closer than
 * the game's own view; `skip`: seconds played before filming starts.
 */
const PRESETS = {
  // The reef chapter, like the cover: paid, so the dev server must be unlocked.
  inkfish: { port: 5174, level: 30, zoom: 1.5, skip: 6, seconds: 20, from: 4, to: 12 },
  // Mangrove Margins' first level, like the cover.
  inkcrab: { port: 5175, level: 'knee-deep', zoom: 2, skip: 4, seconds: 16, from: 2, to: 11 },
  // Graphite, the free first world, from the lander.
  inkmine: { port: 5176, level: null, zoom: 1.5, skip: 1, seconds: 16, from: 0.5, to: 8.5 },
};

const args = process.argv.slice(2).filter((a) => a !== '--');
const slug = args[0];
const preset = PRESETS[slug];
if (!preset) throw new Error(`Usage: gameplay <${Object.keys(PRESETS).join('|')}> [--url …] [--level …] [--zoom n] [--skip s] [--seconds s] [--from s] [--to s]`);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const number = (name, fallback) => {
  const raw = option(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} takes a number`);
  return value;
};
const levelRaw = option('--level');
const level = levelRaw === undefined ? preset.level : Number.isNaN(Number(levelRaw)) ? levelRaw : Number(levelRaw);
const zoom = number('--zoom', preset.zoom);
const skip = number('--skip', preset.skip);
const seconds = number('--seconds', preset.seconds);
const from = number('--from', preset.from);
const to = number('--to', preset.to);
const url = option('--url') ?? `http://localhost:${preset.port}/`;
if (zoom < 1) throw new Error('--zoom must be at least 1');
if (to > seconds) throw new Error('--to must be within --seconds');

const { chromium } = createRequire(join(ROOT, 'games', slug, 'package.json'))('playwright-core');

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (result.error) throw new Error(`${cmd} failed to start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${cmd} exited with ${result.status}`);
}

/** Starts the game, jumps to the level and hides everything but the game world. */
async function openGame(page) {
  await page.addInitScript({ path: join(HERE, 'clock.js') });
  const response = await page.goto(url, { waitUntil: 'load' }).catch((err) => {
    throw new Error(`Could not open ${url}: is the ${slug} dev server running? (${err.message})`);
  });
  if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
  await page.addScriptTag({ content: await readFile(join(HERE, 'bots', `${slug}.js`), 'utf8') });
  await page.waitForFunction(() => window.__bot.ready(), null, { timeout: 120_000, polling: 250 });
  if (level !== null) {
    await page.evaluate((l) => window.__bot.start(l), level);
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => window.__bot.ready(), null, { timeout: 120_000, polling: 250 });
  }
  await page.evaluate(() => {
    for (const scene of window.__game.scene.getScenes(true)) if (scene.sys.settings.key !== 'Game') scene.sys.setVisible(false);
  });
}

/** Plays the bot's input for this frame: a pointer to steer by, keys held down, keys tapped. */
async function applyInput(page, aim, held) {
  if (aim && typeof aim.x === 'number') await page.mouse.move(aim.x, aim.y);
  if (!aim?.keys) return;
  const want = new Set(aim.keys.held ?? []);
  for (const key of [...held]) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
  for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  for (const key of aim.keys.tap ?? []) await page.keyboard.press(key);
}

const frames = await mkdtemp(join(tmpdir(), `${slug}-frames-`));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: zoom });
  page.on('pageerror', (err) => console.error('[page]', err.message));
  await openGame(page);
  await page.evaluate(() => window.__clock.freeze());

  const size = { width: W / zoom, height: H / zoom };
  const held = new Set();
  let cx = W / 2;
  let cy = H / 2;
  const total = Math.round(seconds * FPS);
  for (let i = -Math.round(skip * FPS); i < total; i++) {
    await applyInput(page, await page.evaluate((f) => window.__bot.steer(f), i), held);
    await page.evaluate((ms) => window.__clock.step(ms), 1000 / FPS);
    const focus = zoom > 1 ? await page.evaluate(() => window.__bot.focus?.() ?? null) : null;
    if (focus) {
      // Snap during the run-up, then ease after the player so the shot doesn't jitter.
      const ease = i < 0 ? 1 : 0.12;
      cx += (focus.x - cx) * ease;
      cy += (focus.y - cy) * ease;
    }
    if (i < 0) continue;
    const clip = {
      x: Math.min(Math.max(cx - size.width / 2, 0), W - size.width),
      y: Math.min(Math.max(cy - size.height / 2, 0), H - size.height),
      ...size,
    };
    await page.screenshot({ path: join(frames, `f${String(i).padStart(5, '0')}.png`), clip });
    if (i % (FPS * 2) === 0) console.log(`${slug}: ${i / FPS}s of ${seconds}s`, JSON.stringify(await page.evaluate(() => window.__bot.status?.() ?? null)));
  }
} finally {
  await browser.close();
}

const master = join(PROMO, `${slug}-gameplay.mp4`);
const sheet = join(PROMO, `${slug}-gameplay.png`);
const input = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, 'f%05d.png')];
run('ffmpeg', [...input, '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', master]);
run('ffmpeg', [...input, '-vf', `select='not(mod(n\\,${FPS}))',scale=256:-1,tile=4x${Math.ceil(seconds / 4)}`, '-frames:v', '1', sheet]);
await rm(frames, { recursive: true, force: true });
console.log(`wrote ${master}\nwrote ${sheet} (one frame a second, left to right)`);
run('node', [join(HERE, '..', 'loops.mjs'), slug, master, '--from', String(from), '--to', String(to)]);
