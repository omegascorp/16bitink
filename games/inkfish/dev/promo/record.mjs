// Records the promo loop (dev/promo.html) to MP4, frame by frame, so every
// frame is exact whatever the machine's speed.
//
//   pnpm --filter @16bitink/inkfish promo                    -> every variant below, as promo/<name>.mp4
//   pnpm --filter @16bitink/inkfish promo -- --loops 2       -> the loop played twice in each file
//   pnpm --filter @16bitink/inkfish promo -- --only bigger   -> just the variants whose name contains "bigger"
//   pnpm --filter @16bitink/inkfish promo -- --only long --from 95 --to 130
//                                                            -> part of a video, as promo/<name>-95-130.mp4 (a preview)
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
// The repo's top-level promo/, shared by every game and the site.
const outDir = path.resolve(pkg, '../../promo');

const args = process.argv.slice(2);
const loopsAt = args.indexOf('--loops');
const loops = loopsAt >= 0 ? Number(args[loopsAt + 1]) : 1;
if (!Number.isInteger(loops) || loops < 1) throw new Error('--loops takes a whole number from 1');
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args[onlyAt + 1] : null;
if (onlyAt >= 0 && !only) throw new Error('--only takes part of a variant name');
const secondsArg = (flag) => {
  const at = args.indexOf(flag);
  if (at < 0) return null;
  const value = Number(args[at + 1]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${flag} takes a time in seconds`);
  return value;
};
const from = secondsArg('--from');
const to = secondsArg('--to');
if (from !== null && to !== null && to <= from) throw new Error('--to must come after --from');

/**
 * What gets recorded. `start` is where in the loop the file begins (seconds):
 * the ad cuts open on a bite; the viral cuts open on the calm little inkling
 * and end on it eating the shark, the twist, just as the video loops.
 * The other shorts (one folder each in dev/promo) open on their hook.
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
  { name: 'inkfish-anglerfish-light', query: '&short=light', start: 0 },
  { name: 'inkfish-anglerfish-mates', query: '&short=mates', start: 0 },
  { name: 'inkfish-blobfish', query: '&short=blobfish', start: 0 },
  { name: 'inkfish-greenland-shark', query: '&short=greenland', start: 0 },
  { name: 'inkfish-barreleye', query: '&short=barreleye', start: 0 },
  { name: 'inkfish-oarfish', query: '&short=oarfish', start: 0 },
  { name: 'inkfish-coelacanth', query: '&short=coelacanth', start: 0 },
  { name: 'inkfish-fangtooth', query: '&short=fangtooth', start: 0 },
  { name: 'inkfish-clownfish', query: '&short=clownfish', start: 0 },
  { name: 'inkfish-parrotfish', query: '&short=parrotfish', start: 0 },
  { name: 'inkfish-faceless-cusk', query: '&short=cusk', start: 0 },
  { name: 'inkfish-pufferfish', query: '&short=puffer', start: 0 },
  { name: 'inkfish-gulper-eel', query: '&short=gulper', start: 0 },
  { name: 'inkfish-flying-fish', query: '&short=flyingfish', start: 0 },
  { name: 'inkfish-blackdragon', query: '&short=blackdragon', start: 0 },
  { name: 'inkfish-remember-this-perch', query: '&short=revenge', start: 0 },
  { name: 'inkfish-spat-me-out', query: '&short=spat', start: 0 },
  { name: 'inkfish-ink-escape', query: '&short=inkcloud', start: 0 },
  { name: 'inkfish-free-food', query: '&short=bait', start: 0 },
  { name: 'inkfish-ink-frenzy', query: '&short=frenzy', start: 0 },
  { name: 'inkfish-how-did-that-fit', query: '&short=gape', start: 0 },
  { name: 'inkfish-fly-too-low', query: '&short=leap', start: 0 },
  { name: 'inkfish-cleaner-wrasse', query: '&short=wrasse', start: 0 },
  { name: 'inkfish-bluefin-tuna', query: '&short=tuna', start: 0 },
  { name: 'inkfish-pipefish', query: '&short=pipefish', start: 0 },
  { name: 'inkfish-lionfish', query: '&short=lionfish', start: 0 },
  { name: 'inkfish-moray-jaws', query: '&short=moray', start: 0 },
  { name: 'inkfish-tripodfish', query: '&short=tripod', start: 0 },
  { name: 'inkfish-sharks-trees', query: '&short=trees', start: 0 },
  // Long-form (16:9, not looping): recorded once from 0 to the end, its sound brought up to YouTube's -14 LUFS.
  // Only with --only (it takes ~25 minutes): a plain `pnpm promo` re-records the shorts.
  { name: 'inkfish-long-descent', page: 'longform.html', query: '&video=descent', start: 0, audioFilter: 'loudnorm=I=-14:TP=-1.5:LRA=11', onlyByName: true },
];
const chosen = only ? VARIANTS.filter((v) => v.name.includes(only)) : VARIANTS.filter((v) => !v.onlyByName);
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
  const ready = page.waitForFunction(() => typeof window.promo?.draw === 'function', null, { timeout: 120_000 });
  return Promise.race([ready, failed]).finally(() => page.off('pageerror', onError));
}

async function record(page, base, variant) {
  await page.goto(`${base}/${variant.page ?? 'promo.html'}?record${variant.query.replace(/ /g, '+')}`);
  await promoReady(page);
  const loopSeconds = await page.evaluate(() => window.promo.loopSeconds);
  const frames = Math.round(loopSeconds * FPS);
  if (Math.abs(frames - loopSeconds * FPS) > 1e-6) throw new Error(`Loop of ${loopSeconds}s is not a whole number of frames at ${FPS} fps`);
  // A part of the video (--from/--to), for previews: whole frames, inside the video.
  const first = from === null ? 0 : Math.min(frames, Math.round(from * FPS));
  const last = to === null ? frames : Math.min(frames, Math.round(to * FPS));
  if (last <= first) throw new Error(`--from/--to leave no frames: the video is ${loopSeconds}s long`);
  const part = first > 0 || last < frames;
  if (part && loops > 1) throw new Error('--from/--to record part of one pass: leave out --loops');

  const tmp = path.join(outDir, `.${variant.name}`);
  await mkdir(tmp, { recursive: true });
  const out = path.join(outDir, part ? `${variant.name}-${+(first / FPS).toFixed(2)}-${+(last / FPS).toFixed(2)}.mp4` : `${variant.name}.mp4`);
  let ffmpeg;
  try {
    const wav = path.join(tmp, 'audio.wav');
    await writeFile(wav, Buffer.from(await page.evaluate((start) => window.promo.audioBase64(start), variant.start), 'base64'));
    ffmpeg = run('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(part ? ['-ss', String(first / FPS)] : []),
      '-stream_loop', String(loops - 1), '-i', wav,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      // loudnorm works at 192 kHz inside: bring it back to 48 kHz for AAC.
      ...(variant.audioFilter ? ['-af', variant.audioFilter, '-ar', '48000'] : []),
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      out,
    ]);
    const count = last - first;
    for (let loop = 0; loop < loops; loop++) {
      for (let i = first; i < last; i++) {
        const png = await page.evaluate((s) => {
          window.promo.draw(s);
          return document.getElementById('promo').toDataURL('image/png').split(',')[1];
        }, (variant.start + i / FPS) % loopSeconds);
        await ffmpeg.write(Buffer.from(png, 'base64'));
        if (i % FPS === 0) process.stdout.write(`\r${variant.name}: ${loop * count + i - first}/${loops * count} frames`);
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
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
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
