// Builds the itch.io edition of each game named on the command line ("all" for
// every playable game) and zips it as dist/<slug>-itch.zip, ready to upload:
//   pnpm --filter @16bitink/itch build inkfish
//   pnpm --filter @16bitink/itch build all
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ALL = ['inkfish', 'inkcrab', 'inkmine', 'inkgecko', 'inksnake'];
// itch.io's limits for an HTML5 zip, extracted.
const MAX_FILES = 1000;
const MAX_BYTES = 500 * 1024 * 1024;

const args = process.argv.slice(2);
const slugs = args.length === 0 ? ['inkfish'] : args.includes('all') ? ALL : args;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

for (const slug of slugs) {
  console.log(`\n▶ ${slug}`);
  execFileSync('pnpm', ['exec', 'vite', 'build'], { cwd: root, stdio: 'inherit', env: { ...process.env, ITCH_GAME: slug } });
  const out = join(root, 'dist', slug);
  if (!existsSync(join(out, 'index.html'))) throw new Error(`${slug}: no index.html at the root of ${out}`);
  const files = walk(out);
  const bytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
  if (files.length > MAX_FILES || bytes > MAX_BYTES) throw new Error(`${slug}: ${files.length} files, ${bytes} bytes is over itch.io's limits`);
  const zip = join(root, 'dist', `${slug}-itch.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', zip, '.'], { cwd: out, stdio: 'inherit' });
  console.log(`✔ ${zip} (${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB unzipped, ${(statSync(zip).size / 1024 / 1024).toFixed(1)} MB zipped)`);
}
