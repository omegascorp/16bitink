// The InkTanks level lab: `npm run lab -- --level 3 --seeds 10` (see src/sim/lab.ts for every option).
// Loads src/sim/lab.ts through Vite's module runner, no build step.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
try {
  // A bad level layout throws while loading (LevelError lists every problem).
  const { module } = await runnerImport(path.join(pkg, 'src/sim/lab.ts'), { configFile: false, root: pkg, logLevel: 'error' });
  console.log(module.main(args));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
