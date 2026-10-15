/**
 * Renders the social-page profile picture into the repo's top-level promo/ (git-ignored):
 * `pnpm --filter @16bitink/web social`.
 *
 *   facebook-profile.png  1024x1024, the brand drop on paper, kept inside the circle Facebook crops to
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIZE, brandDrop, paper } from './icons/paper.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'promo');
const PROFILE_SIZE = 1024;

/** The drop is ~384 tall at scale 1; this leaves its splatter clear of the circle's edge. */
const DROP_SCALE = 0.95;
const DROP_HEIGHT = 384 * DROP_SCALE;

function profile() {
  // Its splatter reaches further right than its pixels reach left, so nudge it right to look centred.
  const art = brandDrop({ cx: SIZE / 2 + 9, top: (SIZE - DROP_HEIGHT) / 2, scale: DROP_SCALE });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${paper()}${art}</svg>`;
}

await mkdir(OUT, { recursive: true });
const file = join(OUT, 'facebook-profile.png');
await sharp(Buffer.from(profile()), { density: (72 * PROFILE_SIZE) / SIZE })
  .resize(PROFILE_SIZE, PROFILE_SIZE)
  .flatten()
  .png({ compressionLevel: 9 })
  .toFile(file);
console.log(`wrote ${file}`);
