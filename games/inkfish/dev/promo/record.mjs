// Records the promo loop (dev/promo.html) to MP4, frame by frame, so every
// frame is exact whatever the machine's speed.
//
//   pnpm --filter @16bitink/inkfish promo                    -> every variant below, as promo/<name>.mp4
//   pnpm --filter @16bitink/inkfish promo -- --loops 2       -> the loop played twice in each file
//   pnpm --filter @16bitink/inkfish promo -- --only bigger   -> just the variants whose name contains "bigger"
//
// Needs ffmpeg on PATH and Google Chrome installed (driven by playwright-core).
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const FPS = 30;
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const outDir = path.join(pkg, 'promo');

const args = process.argv.slice(2);
const loopsAt = args.indexOf('--loops');
const loops = loopsAt >= 0 ? Number(args[loopsAt + 1]) : 1;
if (!Number.isInteger(loops) || loops < 1) throw new Error('--loops takes a whole number from 1');
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args[onlyAt + 1] : null;
if (onlyAt >= 0 && !only) throw new Error('--only takes part of a variant name');

/**
 * What gets recorded. `start` is where in the loop the file begins (seconds):
 * the ad cuts open on a bite; the viral cuts open on the calm little inkling
 * and end on it eating the shark, the twist, just as the video loops.
 * The other shorts (dev/promo/bigger, dev/promo/depth, dev/promo/birds) open on their hook.
 */
const VIRAL_START = 1.5;
const VARIANTS = [
  { name: 'inkfish-loop', query: '', start: 0 },
  { name: 'inkfish-loop-captions', query: '&captions', start: 0 },
  { name: 'inkfish-viral-never-ends', query: '&hook=the food chain never ends', start: VIRAL_START },
  { name: 'inkfish-viral-shark', query: '&hook=wait for the shark…', start: VIRAL_START },
  { name: 'inkfish-viral-loop', query: '&hook=try to find where it loops', start: VIRAL_START },
  { name: 'inkfish-bigger-fish', query: '&short=bigger', start: 0 },
  { name: 'inkfish-how-deep', query: '&short=depth', start: 0 },
  { name: 'inkfish-fish-eat-birds', query: '&short=birds', start: 0 },
];
const chosen = only ? VARIANTS.filter((v) => v.name.includes(only)) : VARIANTS;
if (chosen.length === 0) throw new Error(`No variant name contains "${only}": ${VARIANTS.map((v) => v.name).join(', ')}`);

/** Starts a process fed through stdin. `write` waits for the pipe to drain, and fails instead of hanging if the process dies. */
function run(cmd, cmdArgs) {
  const child = spawn(cmd, cmdArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
  // A dead pipe is reported through `done`; don't let EPIPE crash the process first.
  child.stdin.on('error', () => undefined);
  done.catch(() => undefined);
  const write = async (chunk) => {
    if (child.stdin.write(chunk)) return;
    await Promise.race([new Promise((r) => child.stdin.once('drain', r)), done]);
    if (child.exitCode !== null) await done;
  };
  return { write, end: () => child.stdin.end(), kill: () => child.kill('SIGKILL'), done };
}

/** Resolves when the page has set up window.promo; rejects at once on a page error. */
function promoReady(page) {
  let onError;
  const failed = new Promise((_, reject) => {
    onError = (e) => reject(new Error(`promo page failed: ${e.message}`));
    page.on('pageerror', onError);
  });
  const ready = page.waitForFunction(() => window.promo !== undefined, null, { timeout: 120_000 });
  return Promise.race([ready, failed]).finally(() => page.off('pageerror', onError));
}

async function record(page, base, variant) {
  await page.goto(`${base}/promo.html?record${variant.query.replace(/ /g, '+')}`);
  await promoReady(page);
  const loopSeconds = await page.evaluate(() => window.promo.loopSeconds);
  const frames = Math.round(loopSeconds * FPS);
  if (Math.abs(frames - loopSeconds * FPS) > 1e-6) throw new Error(`Loop of ${loopSeconds}s is not a whole number of frames at ${FPS} fps`);

  const tmp = path.join(outDir, `.${variant.name}`);
  await mkdir(tmp, { recursive: true });
  const out = path.join(outDir, `${variant.name}.mp4`);
  let ffmpeg;
  try {
    const wav = path.join(tmp, 'audio.wav');
    await writeFile(wav, Buffer.from(await page.evaluate((start) => window.promo.audioBase64(start), variant.start), 'base64'));
    ffmpeg = run('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-stream_loop', String(loops - 1), '-i', wav,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      out,
    ]);
    for (let loop = 0; loop < loops; loop++) {
      for (let i = 0; i < frames; i++) {
        const png = await page.evaluate((s) => {
          window.promo.draw(s);
          return document.getElementById('promo').toDataURL('image/png').split(',')[1];
        }, (variant.start + i / FPS) % loopSeconds);
        await ffmpeg.write(Buffer.from(png, 'base64'));
        if (i % FPS === 0) process.stdout.write(`\r${variant.name}: ${loop * frames + i}/${loops * frames} frames`);
      }
    }
    ffmpeg.end();
    await ffmpeg.done;
  } catch (error) {
    ffmpeg?.kill();
    await rm(out, { force: true });
    throw error;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  process.stdout.write(`\r${variant.name}: wrote ${path.relative(process.cwd(), out)}\n`);
}

await mkdir(outDir, { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  for (const variant of chosen) await record(page, base, variant);
} finally {
  await browser.close();
  await server.close();
}
