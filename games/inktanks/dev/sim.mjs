// The InkTanks headless sim: `pnpm --filter @16bitink/inktanks sim -- --level 3 --runs 20`
// (or `-- --chapter --seeds 3`). Loads src/sim/cli.ts through Vite's module runner, no build step.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'src/sim/cli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
const args = process.argv.slice(2).filter((a) => a !== '--');
console.log(module.main(args));
