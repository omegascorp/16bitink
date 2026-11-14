import { shapeBounds } from '../logic/geom';
import { groundAt } from '../logic/land';
import { Match } from '../logic/match/match';
import type { LoadedLevel } from '../logic/level/load';
import { STARTER_LOADOUT } from '../logic/parts';

/** One character per this many native px across, and down (a screen is 12 × 9). */
const CW = 80;
const CH = 60;

const GROUND: Readonly<Record<string, string>> = { grass: ' ', grassDry: ' ', dirt: ':', sand: '.', mud: ',', water: '~', bridge: '=' };
const ROLE: Readonly<Record<string, string>> = { guard: 'G', patrol: 'P', wave: 'W', convoy: 'V', hunter: 'H', runner: 'R', turret: 'U' };
const MARK: Readonly<Record<string, string>> = { zone: 'Z', flag: 'F', spot: 'O', exit: 'E', pickup: 'X', artillery: '*' };

export const MAP_LEGEND = [
  'S start   G guard  P patrol  W wave (where it enters)  V convoy  H hunter  R runner  U turret  A ace  B boss  t truck',
  'c crate   T target  C cage  Z hold zone  F flag  O recon spot  E exit  X pick-up / home   - routes and roads',
  '# solid   + flattenable (fence, pine)  " cover (bush, crops)  ~ water  = bridge  : dirt  , mud  . sand',
].join('\n');

/** The level's layout as text, for the lab: ground, structures, routes, then start, enemies, crates and objective marks on top. */
export function asciiMap(level: LoadedLevel): string {
  const m = new Match({ level, seed: 1, player: { loadout: STARTER_LOADOUT } });
  const cols = Math.ceil(m.land.width / CW);
  const rows = Math.ceil(m.land.height / CH);
  const g: string[][] = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => GROUND[groundAt(m.land, (c + 0.5) * CW, (r + 0.5) * CH)] ?? ' '));
  const put = (x: number, y: number, ch: string): void => {
    const c = Math.floor(x / CW);
    const r = Math.floor(y / CH);
    if (r >= 0 && r < rows && c >= 0 && c < cols) g[r]![c] = ch;
  };
  for (const road of Object.values(m.land.def.roads)) {
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1]!;
      const b = road[i]!;
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 40);
      for (let k = 0; k <= n; k++) put(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, '-');
    }
  }
  for (const s of m.structs) {
    const ch = s.def.tag === 'cage' ? 'C' : s.def.tag ? 'T' : s.def.cover ? '"' : s.def.flattenable ? '+' : '#';
    const b = shapeBounds(s.def.shape, s.def.x, s.def.y);
    for (let y = b.y0 + CH / 2; y < b.y1; y += CH) for (let x = b.x0 + CW / 2; x < b.x1; x += CW) put(x, y, ch);
    put(s.def.x, s.def.y, ch);
  }
  for (const k of m.objective.marks()) put(k.x, k.y, MARK[k.kind] ?? '?');
  for (const p of m.pickups) put(p.x, p.y, p.kind === 'proto' ? 'X' : 'c');
  for (const w of level.enemies.filter((e) => e.role === 'wave')) put(w.at.x, w.at.y, 'W');
  for (const t of m.tanks) {
    if (t.isPlayer) continue;
    const b = m.brains.get(t.id);
    put(t.x, t.y, t.role === 'boss' ? 'B' : t.role === 'truck' && !b ? 't' : t.ace ? 'A' : b ? (ROLE[b.role] ?? '?') : '?');
  }
  put(level.start.x, level.start.y, 'S');
  const edge = `+${'-'.repeat(cols)}+`;
  return [edge, ...g.map((r) => `|${r.join('')}|`), edge].join('\n');
}
