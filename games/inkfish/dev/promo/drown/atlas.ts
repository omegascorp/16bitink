/**
 * The North Atlantic for the "bluefin can swim across an entire ocean" beat:
 * the coasts as rough lon/lat outlines, a plain equirectangular projection
 * onto the map card, and the bluefin's route from off the US east coast to
 * the Strait of Gibraltar (tagged bluefin make this crossing). Pure numbers,
 * so the story and the tests can use them; map.ts inks them.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The map card on screen. */
export const CARD = { x: 40, y: 330, w: 1000, h: 680 } as const;
/** Screen px per degree, and the card's top-left corner in degrees. */
const K = 8.33;
const LON0 = -100;
const LAT0 = 64;

/** A place (degrees east, degrees north) on screen. */
export const project = (lon: number, lat: number): Pt => ({ x: CARD.x + (lon - LON0) * K, y: CARD.y + (LAT0 - lat) * K });

type Coast = readonly (readonly [number, number])[];

/** North and South America, from Hudson Strait down the east coast and round the Gulf, closed off the card to the left. */
const AMERICAS: Coast = [
  [-78, 66], [-64, 60], [-60, 55], [-56, 52], [-53, 47], [-60, 46], [-66, 44], [-70, 42], [-74, 40.5], [-76, 37], [-75.5, 35], [-78, 33.8],
  [-81, 31.5], [-80.5, 28], [-80, 25.3], [-81.8, 26.5], [-82.8, 28], [-84, 30], [-87, 30.3], [-89.5, 29.2], [-94, 29.6], [-97.3, 27.5],
  [-97.6, 24], [-97.5, 21.5], [-96, 19], [-94, 18.2], [-91, 18.6], [-90.5, 21], [-87, 21.5], [-87.5, 18], [-88.5, 16], [-84, 15.8],
  [-83.3, 11], [-81.5, 9], [-79, 9.4], [-77, 8.6], [-75, 10.8], [-71.5, 12.3], [-68, 10.5], [-64, 10.6], [-61, 10], [-57, 6], [-52, 5],
  [-50, 1], [-48, -1], [-44, -2.5], [-39, -3.8], [-35, -5.5], [-35, -9], [-37, -12], [-39, -16], [-39.5, -20], [-110, -20], [-110, 66],
];
const GREENLAND: Coast = [[-56, 68], [-52, 65], [-50, 63], [-44, 59.8], [-41, 62], [-38, 65.5], [-34, 68]];
const CUBA: Coast = [[-85, 21.8], [-82, 23.1], [-77, 22], [-74.2, 20.1], [-77.5, 19.9], [-80, 21.7]];
const ICELAND: Coast = [[-22, 63.9], [-24, 65.5], [-22, 66.4], [-16, 66.5], [-13.5, 65.2], [-15, 64.3], [-18.7, 63.4]];
/** Europe down to Gibraltar and along the Mediterranean, closed off the card to the right. */
const EUROPE: Coast = [
  [5, 66], [5, 62], [5.5, 59], [8, 58], [8.5, 55.5], [8.5, 53.5], [6, 53.4], [4, 51.5], [1.6, 50.9], [-1.5, 49.6], [-4.6, 48.4], [-2, 47],
  [-1.2, 44.5], [-1.8, 43.4], [-8, 43.7], [-9.3, 43], [-8.9, 40], [-9.5, 38.7], [-8.9, 37], [-6.3, 36.8], [-5.6, 36.1], [-5.3, 36.3], [-2, 36.8],
  [0, 38.7], [0.5, 40.5], [3, 41.9], [3.2, 43.2], [6, 43.1], [8.5, 44.4], [10.5, 43], [12.5, 41.5], [15.5, 40], [30, 40], [30, 66],
];
/** Africa from the Mediterranean round its western bulge, closed off the card to the right. */
const AFRICA: Coast = [
  [30, 31], [11, 33], [10.5, 37], [9.5, 37.2], [3, 36.8], [-1, 35.4], [-5.4, 35.9], [-6.8, 34], [-9.6, 30.5], [-9.8, 29], [-13, 27.5],
  [-16.5, 23.5], [-17, 21], [-16.2, 19], [-17.5, 14.7], [-16.7, 12.5], [-15, 11], [-13.2, 9], [-11.5, 6.9], [-7.5, 4.4], [-2, 4.8], [2, 6.3],
  [5, 5.8], [6.5, 4.3], [9.6, 3.8], [9.8, 2], [9.3, -1], [11.5, -4.5], [12.3, -6], [13.4, -9], [13.5, -20], [30, -20],
];
const BRITAIN: Coast = [
  [-5.7, 50], [-3, 50.6], [1.3, 51.2], [1.7, 52.7], [0.2, 53.5], [-0.5, 54.5], [-2, 55.9], [-1.8, 57.5], [-3, 58.6], [-5, 58.6], [-6.2, 57.5],
  [-5.6, 55.5], [-4.8, 54.8], [-3.2, 54.1], [-3, 53.3], [-4.6, 53.2], [-4.2, 52.2], [-5.2, 51.7], [-3.2, 51.4],
];
const IRELAND: Coast = [[-6, 52.1], [-6.2, 53.5], [-5.9, 55.2], [-7.5, 55.3], [-8.5, 54.5], [-10, 54.2], [-9.5, 53.3], [-10.3, 52], [-9.6, 51.5], [-8, 51.8]];

/** Every landmass as a closed outline on screen. */
export const LANDS: readonly (readonly Pt[])[] = [AMERICAS, GREENLAND, CUBA, ICELAND, EUROPE, AFRICA, BRITAIN, IRELAND].map((c) =>
  c.map(([lon, lat]) => project(lon, lat)),
);

/** Where the continents' names are written. */
export const PLACE_LABELS: readonly { readonly text: string; readonly at: Pt }[] = [
  { text: 'Americas', at: project(-84, 48) },
  { text: 'Europe', at: project(7, 51) },
  { text: 'Africa', at: project(3, 16) },
];
/** "Atlantic Ocean", in the open sea under the route. */
export const OCEAN_LABEL = project(-42, 24);

/** The crossing: off the Carolinas, up round the Gulf Stream's arc, and in at Gibraltar. */
const WAYPOINTS: readonly Pt[] = ([
  [-74, 33], [-64, 38.5], [-50, 42.5], [-36, 43], [-22, 40.5], [-11, 37.4], [-3.5, 36.4],
] as const).map(([lon, lat]) => project(lon, lat));

/** A Catmull-Rom point between waypoints i and i + 1 (`s` 0 .. 1), the ends held. */
function catmull(i: number, s: number): Pt {
  const p = (k: number): Pt => WAYPOINTS[Math.max(0, Math.min(WAYPOINTS.length - 1, k))]!;
  const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
  const s2 = s * s;
  const s3 = s2 * s;
  const at = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
  return { x: at(p0.x, p1.x, p2.x, p3.x), y: at(p0.y, p1.y, p2.y, p3.y) };
}

/** The route sampled finely, with the distance along it at each sample. */
const SAMPLES: readonly { readonly p: Pt; readonly d: number }[] = (() => {
  const pts: Pt[] = [];
  for (let i = 0; i < WAYPOINTS.length - 1; i++) for (let k = 0; k < 40; k++) pts.push(catmull(i, k / 40));
  pts.push(WAYPOINTS[WAYPOINTS.length - 1]!);
  let d = 0;
  return pts.map((p, i) => {
    if (i > 0) d += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y);
    return { p, d };
  });
})();
export const ROUTE_LEN = SAMPLES[SAMPLES.length - 1]!.d;

/** The point `u` (0 .. 1) of the way along the route by distance, and the route's heading there (radians, screen y down). */
export function routeAt(u: number): { readonly x: number; readonly y: number; readonly heading: number } {
  const want = Math.max(0, Math.min(1, u)) * ROUTE_LEN;
  let i = 1;
  while (i < SAMPLES.length - 1 && SAMPLES[i]!.d < want) i++;
  const a = SAMPLES[i - 1]!;
  const b = SAMPLES[i]!;
  const k = b.d > a.d ? (want - a.d) / (b.d - a.d) : 0;
  return { x: a.p.x + (b.p.x - a.p.x) * k, y: a.p.y + (b.p.y - a.p.y) * k, heading: Math.atan2(b.p.y - a.p.y, b.p.x - a.p.x) };
}
