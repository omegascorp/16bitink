import { ART_FAMILY, artMk, type HullFamily, type Part } from '../logic/parts';

/**
 * The tank parts' art. Reads src/art/pixel/parts/manifest.json (the parts
 * agent's output) when present, else the density C test parts in
 * dev/detail-test/assets/C/ with Mk I–III mapped to the same image.
 * Frames are 128 × 128, facing north, pivot at the centre.
 */
type Vec = readonly [number, number];

interface PartsManifest {
  readonly size: number;
  readonly unit: number;
  readonly ring: Readonly<Record<string, Vec>>;
  readonly muzzle?: Readonly<Record<string, readonly Vec[]>>;
  readonly frames?: Readonly<Record<string, readonly string[]>>;
  readonly hullSize?: Readonly<Record<string, string>>;
  readonly drives?: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>>;
  readonly stripe: readonly string[];
  readonly icons?: Readonly<Record<string, string>>;
}

const realManifest = import.meta.glob<PartsManifest>('../art/pixel/parts/manifest.json', { eager: true, import: 'default' });
const realPngs = import.meta.glob<string>('../art/pixel/parts/**/*.png', { eager: true, query: '?url', import: 'default' });
const testManifest = import.meta.glob<PartsManifest>('../../dev/detail-test/assets/C/manifest.json', { eager: true, import: 'default' });
const testPngs = import.meta.glob<string>('../../dev/detail-test/assets/C/*.png', { eager: true, query: '?url', import: 'default' });

const fileName = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -4);
const relName = (path: string, root: string): string => path.slice(path.indexOf(root) + root.length, -4);

export interface PartsArt {
  /** 'parts' when the parts agent's art is in, 'test' for the placeholders. */
  readonly source: 'parts' | 'test';
  readonly size: number;
  /** Texture key → URL, for every image a match may need. */
  readonly urls: ReadonlyMap<string, string>;
  hull(p: Part): string;
  drive(p: Part, hull: HullFamily): string;
  /** The rolling frames of a drive key: [still, f1, f2]. */
  frames(driveKey: string): readonly string[];
  turret(p: Part): string;
  stripe(hullKey: string): string | null;
  ring(hullKey: string): Vec;
  muzzles(turretKey: string): readonly Vec[];
  icon(p: Part): string | null;
}

function realArt(m: PartsManifest): PartsArt {
  const urls = new Map<string, string>();
  for (const [path, url] of Object.entries(realPngs)) urls.set(relName(path, 'pixel/parts/'), url);
  return {
    source: 'parts',
    size: m.size,
    urls,
    hull: (p) => `${ART_FAMILY[p.family]}-mk${artMk(p.mk)}`,
    drive: (p, hull) => {
      const fam = ART_FAMILY[p.family];
      const size = m.hullSize?.[ART_FAMILY[hull]] ?? 'L';
      const key = m.drives?.[fam]?.[size]?.[`mk${artMk(p.mk)}`];
      return key && urls.has(key) ? key : `${fam}-mk${artMk(p.mk)}`;
    },
    frames: (k) => m.frames?.[k] ?? [k, `${k}-f1`, `${k}-f2`].filter((f) => urls.has(f)),
    turret: (p) => `${ART_FAMILY[p.family]}-mk${artMk(p.mk)}`,
    stripe: (k) => (m.stripe.includes(k) && urls.has(`${k}-stripe`) ? `${k}-stripe` : null),
    ring: (k) => m.ring[k] ?? [0, 2],
    muzzles: (k) => m.muzzle?.[k] ?? [[0, -30]],
    icon: (p) => urls.get(`icons/${ART_FAMILY[p.family]}`) ?? null,
  };
}

function testArt(m: PartsManifest): PartsArt {
  const urls = new Map<string, string>();
  for (const [path, url] of Object.entries(testPngs)) urls.set(fileName(path), url);
  const fam = (p: Part): string => ART_FAMILY[p.family];
  return {
    source: 'test',
    size: m.size,
    urls,
    hull: fam,
    drive: (p) => fam(p),
    frames: (k) => [k, `${k}-f1`, `${k}-f2`],
    turret: (p) => (p.family === 'cannon' && p.mk >= 3 ? 'turretCannon3' : fam(p)),
    stripe: (k) => (m.stripe.includes(k) ? `${k}-stripe` : null),
    ring: (k) => m.ring[k] ?? [0, 2],
    muzzles: (k) => (k.startsWith('turretCannon') ? [[0, -40]] : k.startsWith('turretRocket') ? [[-7, -14], [7, -14]] : [[-3, -29], [3, -29]]),
    icon: () => null,
  };
}

let cached: PartsArt | null = null;

export function partsArt(): PartsArt {
  if (cached) return cached;
  const real = Object.values(realManifest)[0];
  const test = Object.values(testManifest)[0];
  if (real) cached = realArt(real);
  else if (test) cached = testArt(test);
  else throw new Error('no tank part art found (src/art/pixel/parts or dev/detail-test/assets/C)');
  return cached;
}
