import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A hash of the game's source, defined as __INKFISH_BUILD__ by the builds that
 * bundle the game (this package's Vite config, the site's Astro config). The
 * art cache (src/art/artCache.ts) keeps saved drawings only for the same hash,
 * so any code change means they are drawn afresh.
 */
export function inkfishBuildId() {
  const root = fileURLToPath(new URL('./src', import.meta.url));
  const hash = createHash('sha256');
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        hash.update(path.slice(root.length));
        hash.update(readFileSync(path));
      }
    }
  };
  walk(root);
  return hash.digest('hex').slice(0, 16);
}
