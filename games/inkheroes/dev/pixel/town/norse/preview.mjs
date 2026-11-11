// Dumps the Norse city's layout (every building built) as JSON for preview.py:
//   node dev/pixel/town/norse/preview.mjs <out.json>   (run from games/inkheroes)
// The engine does not take 'norse' as a town people yet, so no running screen shows it; this reads the real layout code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
try {
  const stage = await server.ssrLoadModule('/@fs' + pkg + '/src/scenes/town/townStage.ts');
  const walls = await server.ssrLoadModule('/@fs' + pkg + '/src/scenes/town/townWalls.ts');
  const kitMod = await server.ssrLoadModule('/@fs' + pkg + '/src/scenes/town/townKit.ts');
  const b = await server.ssrLoadModule('/@fs' + pkg + '/src/logic/buildings.ts');
  const kit = kitMod.townKit('norse');
  const ids = [...b.BUILDING_IDS, 'meadHall'];
  const pieces = stage.stagePieces(ids, 'norse').map((p) => ({ art: p.art, building: p.building, x: p.spot.x, y: p.spot.y, flip: !!p.spot.flip, w: kit.art[p.art].w, h: kit.art[p.art].h }));
  const trees = stage.cityTrees(stage.emptyPlots([], 'norse').map((e) => e.plot), 7, 'norse').filter((t) => t.piece).map((t) => ({ art: t.piece, x: t.x, y: t.y, w: kit.art[t.piece].w, h: kit.art[t.piece].h }));
  const w = walls.wallPieces();
  fs.writeFileSync(process.argv[2], JSON.stringify({ pieces, trees, walls: w, stage: stage.STAGE, city: stage.CITY, origin: stage.CITY_ORIGIN, missing: [...new Set(pieces.map((p) => p.art))].filter((a) => kit.art[a] === kitMod.townKit('crown').art[a]) }));
} finally {
  await server.close();
}
