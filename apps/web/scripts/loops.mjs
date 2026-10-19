/**
 * Turns a screen recording of real play into the silent gameplay loop the
 * home page plays over a game's cover:
 *
 *   pnpm --filter @16bitink/web loops -- inkfish ~/Desktop/inkfish.mov --from 12 --to 24
 *
 * writes public/loops/inkfish.webm and .mp4 (960x540, 24 fps, no sound),
 * then set `loop: true` on the game in src/data/games.ts.
 *
 * The recording is cropped to 16:9 from its centre, so record the game
 * full-window. The last half second fades into the first, so the loop has
 * no visible seam. Keep it short (8–15s): every second is bandwidth.
 * Needs ffmpeg on PATH.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'loops');
const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
/** The seam: this much of the start fades in over the end. */
const FADE = 0.5;

const args = process.argv.slice(2).filter((a) => a !== '--');
const [slug, input] = args;
const seconds = (flag) => {
  const at = args.indexOf(flag);
  if (at < 0) return null;
  const value = Number(args[at + 1]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${flag} takes a time in seconds`);
  return value;
};
if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug) || !input) throw new Error('Usage: loops <game-slug> <recording> [--from s] [--to s]');
if (!existsSync(input)) throw new Error(`No such recording: ${input}`);
const from = seconds('--from') ?? 0;
const to = seconds('--to');
if (to !== null && to - from < FADE * 4) throw new Error(`--to must be at least ${FADE * 4}s after --from`);

function ffmpeg(ffArgs) {
  const run = spawnSync('ffmpeg', ['-v', 'error', '-y', ...ffArgs], { stdio: 'inherit' });
  if (run.error) throw new Error(`ffmpeg failed to start (is it on PATH?): ${run.error.message}`);
  if (run.status !== 0) throw new Error(`ffmpeg exited with ${run.status}`);
}

function probeDuration(file) {
  const run = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const value = Number(run.stdout.trim());
  if (run.status !== 0 || !Number.isFinite(value)) throw new Error(`Could not read the length of ${file}`);
  return value;
}

const length = (to ?? probeDuration(input)) - from;
// Crop the centre to 16:9, scale, then cross-fade the clip's end into its own start.
const filter = [
  `[0:v]fps=${FPS},crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=${WIDTH}:${HEIGHT}:flags=lanczos,setsar=1,split[a][b]`,
  `[b]trim=0:${FADE},setpts=PTS-STARTPTS[head]`,
  `[a]trim=${FADE},setpts=PTS-STARTPTS[body]`,
  `[body][head]xfade=transition=fade:duration=${FADE}:offset=${(length - 2 * FADE).toFixed(3)},format=yuv420p[out]`,
].join(';');
const source = ['-ss', String(from), '-t', length.toFixed(3), '-i', input, '-filter_complex', filter, '-map', '[out]', '-an'];

mkdirSync(OUT, { recursive: true });
const webm = join(OUT, `${slug}.webm`);
const mp4 = join(OUT, `${slug}.mp4`);
ffmpeg([...source, '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', webm]);
ffmpeg([...source, '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-profile:v', 'high', '-movflags', '+faststart', mp4]);
for (const file of [webm, mp4]) console.log(`wrote ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
console.log(`Now set loop: true on ${slug} in src/data/games.ts.`);
