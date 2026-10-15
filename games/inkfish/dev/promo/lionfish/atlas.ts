import { createRng } from '../../../src/logic/rng';
import { ramp, smooth } from '../short';
import { said } from './story';

/**
 * The sketched map on the card: rough coastlines as [longitude, latitude]
 * rings, the lionfish's home oceans, where it was first found (Florida,
 * 1985), and the red dots of its spread through the western Atlantic, each
 * timed so the dots reach the Carolinas and Brazil as the narrator names them.
 */

export type LonLat = readonly [number, number];

/** Hand-simplified coastlines: enough to read as the world, drawn in ink. */
export const LAND: readonly (readonly LonLat[])[] = [
  // North and Central America
  [[-165, 62], [-160, 70], [-140, 70], [-120, 70], [-100, 72], [-85, 70], [-80, 63], [-94, 59], [-90, 56], [-82, 53], [-78, 58], [-70, 60],
    [-62, 57], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 37], [-75.5, 35.3], [-78, 33.8], [-81, 31.5], [-80.2, 27],
    [-80.4, 25.2], [-81.3, 25.4], [-82.7, 28], [-83.5, 29.8], [-86, 30.4], [-89, 30.2], [-90, 29.2], [-94, 29.6], [-97.3, 27.5], [-97.6, 22],
    [-95.5, 18.6], [-91.5, 18.5], [-90.3, 21], [-87, 21.5], [-88, 16], [-84, 15.8], [-83.5, 11], [-81.5, 9], [-79, 9.5], [-77.3, 8.6],
    [-78.5, 7.2], [-80.5, 7.5], [-85.5, 10], [-87.5, 13], [-91.5, 14], [-96, 15.7], [-105, 19.8], [-106, 23], [-109, 26], [-112.5, 30],
    [-114.5, 31], [-110, 23], [-117, 32.5], [-120.5, 34.5], [-124, 40], [-124, 46], [-123, 49], [-130, 54], [-135, 58], [-140, 60],
    [-150, 60], [-153, 57.5], [-158, 56.5], [-165, 59]],
  // South America
  [[-77.3, 8.6], [-75, 10.7], [-71.5, 12.3], [-68, 10.5], [-62, 10.7], [-60, 8.3], [-57, 6], [-52, 5], [-50, 1.5], [-48, -1], [-44, -2.5],
    [-38.5, -3.7], [-35, -5.5], [-35, -9], [-38.5, -13], [-39.5, -18], [-41, -22], [-44.5, -23.3], [-48.5, -26], [-53, -33.7],
    [-58, -38], [-62, -39], [-65, -45], [-68, -50], [-69, -55], [-73.5, -52], [-75.5, -46], [-73.5, -37], [-71.5, -30], [-70.3, -18],
    [-76, -14], [-81.2, -6], [-80, -2], [-78.8, 1.5], [-77.5, 4], [-77.8, 7]],
  // Greenland
  [[-55, 60], [-43, 60], [-22, 70], [-20, 80], [-40, 83], [-60, 82], [-72, 78], [-58, 75], [-54, 68]],
  // Cuba, Hispaniola, Jamaica, Puerto Rico
  [[-85, 21.9], [-81.5, 23.1], [-77, 22], [-74.2, 20.2], [-77.5, 19.9], [-80, 21.7], [-83.5, 21.8]],
  [[-74.5, 19.8], [-71.5, 19.9], [-68.4, 18.6], [-71.4, 17.8], [-74.4, 18.3]],
  [[-78.3, 18.4], [-76.2, 18.2], [-77, 17.8]],
  [[-67.2, 18.5], [-65.6, 18.4], [-65.7, 18], [-67.2, 18]],
  // Africa
  [[-17, 14.7], [-17, 21], [-13, 27.7], [-9.8, 31.5], [-6, 35.8], [10, 37.2], [11, 33.5], [20, 31], [32, 31.3], [34, 28], [43, 12.5],
    [51, 11.8], [48, 4.5], [40, -4], [40, -15], [35.5, -24], [32.5, -29], [27, -33.8], [19, -34.8], [15, -27], [11.8, -17], [13.2, -6],
    [9, -1], [9.5, 4], [4, 6.3], [-5, 5], [-7.5, 4.4], [-13, 8], [-16.8, 12.5]],
  // Madagascar
  [[44, -25], [47, -25], [50.5, -15.5], [49.3, -12], [44.2, -16.5]],
  // Eurasia
  [[-9.5, 37], [-9, 43], [-2, 43.5], [-1.5, 46], [-4.5, 48.3], [2, 51], [8.5, 54], [10, 57.5], [5.5, 58.5], [5, 62], [15, 68.5], [25, 71],
    [40, 68], [60, 70], [70, 73], [80, 73], [100, 77], [110, 74], [130, 72], [140, 72], [160, 70], [175, 67], [180, 65], [175, 62],
    [163, 60], [160, 54], [156, 51], [156, 57], [143, 59], [135, 55], [141, 52], [135, 43], [129, 40.5], [126.5, 34.5], [126, 37.5],
    [122, 40], [121, 37], [119, 35], [122, 31], [120, 26], [115, 22.5], [108, 21.5], [106, 17], [109, 12], [105, 8.8], [103, 10.5],
    [100.5, 13.5], [99.3, 9], [101, 6.7], [103.5, 1.3], [101, 2.9], [98.3, 8], [98.5, 16], [94.4, 18], [91.5, 22.5], [87, 21.5],
    [80.3, 15.5], [79.8, 10], [77.5, 8], [73.2, 17], [72.6, 21.3], [67, 24.8], [57.5, 25.6], [56.4, 26.9], [50.5, 30], [48, 29.8],
    [51.5, 24.2], [56.2, 26], [59.8, 22.4], [55, 17], [44, 12.7], [39, 21.5], [34, 28], [32.3, 31.2], [35.7, 36], [27.3, 37], [26.3, 40],
    [23.5, 38], [21.5, 36.8], [19.5, 40], [13, 45.5], [12.3, 44.2], [16, 41.5], [16, 38], [12.5, 38], [10.5, 43.5], [3, 43.3], [-0.5, 38.8],
    [-5.6, 36]],
  // Britain and Ireland
  [[-5.7, 50], [1.4, 51.2], [0.3, 53.5], [-2, 55.8], [-5, 58.6], [-6.3, 56.5], [-3, 54.6], [-4.5, 52.5]],
  [[-10, 51.6], [-6, 52.2], [-6, 55.2], [-10, 54.2]],
  // Japan, Sumatra, Java, Borneo, Sulawesi, Philippines, New Guinea, Australia, New Zealand
  [[130.2, 31.3], [135, 33.6], [140, 35], [141.9, 39.5], [141.4, 45.4], [145.5, 43.3], [140, 41.4], [139.8, 37.8], [135.5, 35.5], [131, 34.3]],
  [[95.3, 5.6], [98, 4], [104, -2.5], [106, -5.9], [102.3, -4], [97.5, 1.5]],
  [[105.3, -6.8], [114.4, -7.8], [114.4, -8.7], [106.5, -7.5]],
  [[109, 1.5], [116.5, 6.9], [119.2, 5], [117.9, 1], [116.5, -3.9], [110.2, -3]],
  [[119.5, -5.5], [120.5, 0.8], [125, 1.5], [121.5, -1], [123.4, -5.6]],
  [[117.5, 8.5], [120.5, 18.5], [122.3, 18.4], [124.2, 13], [126.3, 7], [125, 5.8], [122, 7], [121, 12]],
  [[131, -1.4], [137.8, -1.5], [141, -2.6], [147.8, -6.1], [150.5, -10.5], [143, -9], [138, -8.2], [132.5, -4]],
  [[113.5, -22], [114.9, -34], [118, -35], [124, -33.9], [131, -31.5], [135.5, -34.8], [138.5, -35], [140.5, -38], [146.5, -39],
    [150, -37.5], [153.4, -28], [153, -25], [146, -18.8], [142.5, -10.7], [141.5, -13.5], [136.7, -12.2], [136, -15], [130.5, -11.5],
    [126, -14.2], [122, -18], [115, -21]],
  [[172.7, -34.4], [178.5, -37.7], [174.8, -41.3], [173, -39]],
  [[172.7, -40.5], [174.3, -41.7], [171.2, -44.3], [168.5, -46.6], [166.5, -45.8], [170.5, -42]],
];

/** Where lionfish are native: the Indian Ocean and the western and central Pacific (hatched as each is named; land is drawn over it). */
export const INDIAN_RANGE: readonly LonLat[] = [[32, 30], [45, 14], [60, 24], [75, 12], [92, 22], [101, 10], [101, -36], [20, -36], [30, -10]];
export const PACIFIC_RANGE: readonly LonLat[] = [[101, 10], [108, 24], [122, 34], [141, 37], [160, 30], [200, 22], [212, -24], [175, -32], [150, -34], [101, -36]];

export const FLORIDA: LonLat = [-80.1, 25.9];
export const CAROLINAS: LonLat = [-76.5, 34.4];
export const BRAZIL: LonLat = [-35.6, -6.5];

/** Times from the words. */
export const PACIFIC_AT = said('Pacific');
export const INDIAN_AT = said('Indian');
export const SINCE_AT = said('since');
export const YEARS_AT = said('1980s');
export const SPREAD_AT = said('spread');
export const ATLANTIC_AT = said('Atlantic,');
export const CAROLINAS_AT = said('Carolinas');
export const BRAZIL_AT = said('Brazil.');

/** The camera: the whole world, then in on the western Atlantic as the narrator says "spread through the Atlantic". */
export interface View {
  readonly lon: number;
  readonly lat: number;
  /** px per degree. */
  readonly k: number;
}
const WORLD: View = { lon: 28, lat: 12, k: 2.8 };
const ATLANTIC: View = { lon: -63, lat: 13.5, k: 11.2 };
export const ZOOM_FROM = SPREAD_AT - 0.25;
export const ZOOM_TO = ATLANTIC_AT + 0.05;

export function viewAt(t: number): View {
  const u = smooth((t - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM));
  const k = WORLD.k * (ATLANTIC.k / WORLD.k) ** u;
  // The western Atlantic glides from where it sits on the world map to the middle of the card as the camera closes in.
  const from = { x: (ATLANTIC.lon - WORLD.lon) * WORLD.k, y: -(ATLANTIC.lat - WORLD.lat) * WORLD.k };
  const slide = smooth(Math.min(1, u * 1.25));
  return { lon: ATLANTIC.lon - (from.x * (1 - slide)) / k, lat: ATLANTIC.lat + (from.y * (1 - slide)) / k, k };
}

/** The home oceans' hatching and names, as they're said; gone as the camera zooms in. */
const zoomedOut = (t: number): number => 1 - ramp(t, ZOOM_FROM, ZOOM_FROM + 0.35);
export const pacificAt = (t: number): number => ramp(t, PACIFIC_AT - 0.08, PACIFIC_AT + 0.3) * zoomedOut(t);
export const indianAt = (t: number): number => ramp(t, INDIAN_AT - 0.08, INDIAN_AT + 0.3) * zoomedOut(t);
/** The arrow from home to Florida, drawn on "since the 1980s"; it fades as the camera zooms in. */
export const arrowAt = (t: number): number => ramp(t, SINCE_AT - 0.15, YEARS_AT + 0.25);
export const arrowAlpha = (t: number): number => 1 - ramp(t, ZOOM_FROM + 0.2, ZOOM_FROM + 0.6);
/** "1985" at Florida, and the names of the places as they're said. */
export const firstAt = (t: number): number => ramp(t, YEARS_AT - 0.05, YEARS_AT + 0.2) * (1 - ramp(t, ATLANTIC_AT - 0.1, ATLANTIC_AT + 0.25));
export const atlanticAt = (t: number): number => ramp(t, ATLANTIC_AT - 0.05, ATLANTIC_AT + 0.25);
export const carolinasAt = (t: number): number => ramp(t, CAROLINAS_AT - 0.05, CAROLINAS_AT + 0.2);
export const brazilAt = (t: number): number => ramp(t, BRAZIL_AT - 0.05, BRAZIL_AT + 0.2);

// ---------------------------------------------------------------- the spread

/** Even-odd test against one ring. */
function inside(p: LonLat, ring: readonly LonLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const onLand = (p: LonLat): boolean => LAND.some((ring) => inside(p, ring));

/** The invaded waters, as boxes [west, east, south, north]: the US east coast, the Gulf, the Caribbean, the Guianas and north-east Brazil. */
const INVADED: readonly (readonly [number, number, number, number])[] = [
  [-81, -74.5, 26.5, 35.2], [-97, -81, 18.5, 30], [-84, -60, 11, 27.5], [-82, -60, 9, 11], [-62, -50, 4.5, 11], [-51, -40, -2.5, 4], [-40, -34.2, -9.5, -2],
];

export interface Dot {
  readonly at: LonLat;
  /** When it appears. */
  readonly t: number;
}

/**
 * The dots: Florida first, on "1980s"; then from "spread", northwards to
 * reach the Carolinas on "Carolinas", and southwards, by distance, to reach
 * Brazil on "Brazil".
 */
export const DOTS: readonly Dot[] = (() => {
  const rng = createRng(1985);
  const far = Math.hypot(BRAZIL[0] - FLORIDA[0], BRAZIL[1] - FLORIDA[1]);
  const timeOf = (p: LonLat): number => {
    if (p[1] > FLORIDA[1] + 1 && p[0] > -82) return SPREAD_AT + ((p[1] - FLORIDA[1]) / (CAROLINAS[1] - FLORIDA[1])) * (CAROLINAS_AT - SPREAD_AT);
    return SPREAD_AT + Math.min(1, Math.hypot(p[0] - FLORIDA[0], p[1] - FLORIDA[1]) / far) * (BRAZIL_AT - SPREAD_AT);
  };
  const dots: Dot[] = [];
  for (const [w, e, s, n] of INVADED) {
    const count = Math.round((e - w) * (n - s) * 0.16) + 4;
    for (let i = 0; i < count * 3 && dots.length < 400; i++) {
      const p: LonLat = [w + rng() * (e - w), s + rng() * (n - s)];
      if (!onLand(p)) dots.push({ at: p, t: timeOf(p) });
      if (dots.filter((d) => d.at[0] >= w && d.at[0] <= e && d.at[1] >= s && d.at[1] <= n).length >= count) break;
    }
  }
  return [
    { at: FLORIDA, t: YEARS_AT },
    { at: [-64.8, 32.3], t: timeOf([-64.8, 32.3]) },
    { at: CAROLINAS, t: CAROLINAS_AT },
    { at: BRAZIL, t: BRAZIL_AT },
    ...dots,
  ];
})();

/** A dot's size, 0 .. 1, popping in with a little overshoot. */
export function dotAt(d: Dot, t: number): number {
  const u = (t - d.t) / 0.22;
  if (u <= 0) return 0;
  return u < 1 ? smooth(u * 1.6) * (1 + 0.35 * Math.sin(Math.PI * u)) : 1;
}
