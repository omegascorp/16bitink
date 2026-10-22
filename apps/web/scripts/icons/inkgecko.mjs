import { PAPER, brandDrop, penWobble } from './paper.mjs';

/** The garden notebook's ink and washes (games/inkgecko/src/art/palette.ts, marbleArt.ts, logic/colours.ts). */
const INK = '#26316a';
const LEAF = '#5f8f4e';
const MOSS = '#8fae6a';
const STONE = '#c9c0ad';
const STONE_DARK = '#8f8676';
/** The gecko wears the colour of the marble in its mouth: yellow, so its skin is the yellow wash. */
const SKIN = '#f2c230';
const SKIN_DEEP = '#b5851a';
const SPOT = '#8f5e0c';
const EYE = '#d9a441';
const MARBLES = {
  yellow: { wash: '#f2c230', pattern: '#8f5e0c' },
  red: { wash: '#d9493c', pattern: '#7d1d18' },
};

const f = (n) => n.toFixed(1);
const pt = (x, y) => ({ x, y });
const TAU = Math.PI * 2;

/* ---------- Geometry, in the game's gecko units (facing up, head at −y; games/inkgecko/src/art/geckoArt.ts) ---------- */

function cub(p0, c0, c1, p1, n = 16) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return pt(k[0] * p0.x + k[1] * c0.x + k[2] * c1.x + k[3] * p1.x, k[0] * p0.y + k[1] * c0.y + k[2] * c1.y + k[3] * p1.y);
  });
}

const quad = (a, c, b, n = 12) => cub(a, pt(a.x + (2 / 3) * (c.x - a.x), a.y + (2 / 3) * (c.y - a.y)), pt(b.x + (2 / 3) * (c.x - b.x), b.y + (2 / 3) * (c.y - b.y)), b, n);

const oval = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => pt(cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry));

/** Unit normal (left of travel) at each point of a polyline. */
function normals(pts) {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt(-(b.y - a.y) / l, (b.x - a.x) / l);
  });
}

/** Both edges of a band of full width w(u) along a spine, and its closed outline. */
function ribbon(spine, w) {
  const n = normals(spine);
  const half = (i) => w(i / (spine.length - 1)) / 2;
  const top = spine.map((p, i) => pt(p.x + n[i].x * half(i), p.y + n[i].y * half(i)));
  const bot = spine.map((p, i) => pt(p.x - n[i].x * half(i), p.y - n[i].y * half(i)));
  return { top, bot, shape: [...top, ...[...bot].reverse()] };
}

/** A ribbon with round caps at both ends. */
function roundTube(spine, w) {
  const { top, bot } = ribbon(spine, w);
  const cap = (c, from, to) => {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    let a1 = Math.atan2(to.y - c.y, to.x - c.x);
    const r = Math.hypot(from.x - c.x, from.y - c.y);
    while (a1 > a0) a1 -= TAU;
    return Array.from({ length: 9 }, (_, i) => {
      const a = a0 + ((a1 - a0) * (i + 1)) / 10;
      return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
  };
  const n = spine.length - 1;
  return [...top, ...cap(spine[n], top[n], bot[n]), ...[...bot].reverse(), ...cap(spine[0], bot[0], top[0])];
}

const mirror = (pts) => pts.map((p) => pt(-p.x, p.y));
const bilateral = (right) => [...right, ...mirror(right).reverse().slice(1, -1)];

/** Smoothstep between keyed widths along arc length. */
function keyed(keys, s) {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [s1, w1] = keys[i];
    const [s0, w0] = keys[i - 1];
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return w0 + (w1 - w0) * t * t * (3 - 2 * t);
    }
  }
  return keys[keys.length - 1][1];
}

/** Where the marbles sit: one held at the snout tip, the next cradled in the curl of the tail. */
const MOUTH = pt(0, -63);
const CRADLE = pt(18, 50);
const MOUTH_R = 15;
const CRADLE_R = 12.8;

/** Neck, trunk and tail along one spine: down the back, then the tail curls right around the cradle. */
function trunk() {
  const back = Array.from({ length: 24 }, (_, i) => pt(0, -28 + i * 2));
  const drop = cub(pt(0, 18), pt(0, 30), pt(-1, 40), pt(-0.6, 47), 10).slice(1);
  const end = drop[drop.length - 1];
  const start = Math.atan2(end.y - CRADLE.y, end.x - CRADLE.x);
  const curl = Array.from({ length: 34 }, (_, i) => {
    const t = (i + 1) / 34;
    const ang = start - TAU * 0.8 * t;
    const r = 19.6 - 3.4 * t;
    return pt(CRADLE.x + Math.cos(ang) * r, CRADLE.y + Math.sin(ang) * r);
  });
  const spine = [...back, ...drop, ...curl];
  const arc = [0];
  for (let i = 1; i < spine.length; i++) arc.push(arc[i - 1] + Math.hypot(spine[i].x - spine[i - 1].x, spine[i].y - spine[i - 1].y));
  const total = arc[arc.length - 1];
  const keys = [[0, 16], [6, 18], [14, 26], [28, 29], [38, 26], [46, 18.5], [52, 14.5]];
  const widths = arc.map((s) => (s > 52 ? 3 + 11.5 * (1 - (s - 52) / (total - 52)) ** 0.8 : keyed(keys, s)));
  const band = ribbon(spine, (u) => widths[Math.round(u * (spine.length - 1))]);
  return { ...band, spine, tailFrom: back.length };
}

/** A broad, rounded head, widest at the cheeks, the snout blunt. */
const HEAD = bilateral([
  ...cub(pt(0, -21), pt(7.5, -21.5), pt(14, -24), pt(16.5, -29), 6),
  ...cub(pt(16.5, -29), pt(19.5, -33), pt(20, -38), pt(18.8, -43), 6).slice(1),
  ...cub(pt(18.8, -43), pt(17.2, -49), pt(14, -54), pt(9.4, -56.6), 6).slice(1),
  ...cub(pt(9.4, -56.6), pt(6.2, -58.2), pt(3, -58.6), pt(0, -58.6), 5).slice(1),
]);

/** A leg bent at the elbow, ending in a palm and splayed toes with round sticky pads. */
function leg(root, elbow, wrist, toeMid, fan, lens, thick, side) {
  const ctl = pt(2 * elbow.x - (root.x + wrist.x) / 2, 2 * elbow.y - (root.y + wrist.y) / 2);
  const spine = quad(root, ctl, wrist, 14);
  const limb = roundTube(spine, (u) => thick * (1 - 0.4 * u));
  const toes = lens.map((len, i) => {
    const k = i / (lens.length - 1) - 0.5;
    const ang = side < 0 ? Math.PI - (toeMid + k * fan) : toeMid + k * fan;
    const tip = pt(wrist.x + Math.cos(ang) * len, wrist.y + Math.sin(ang) * len);
    return { line: [wrist, tip], tip, ang };
  });
  return { limb, toes, wrist };
}

function legs() {
  const out = [];
  for (const side of [1, -1]) {
    out.push(leg(pt(7 * side, -14), pt(22 * side, -10), pt(28 * side, -26), -0.95, 2.0, [8, 10, 11, 10, 8], 10.4, side));
    out.push(leg(pt(7 * side, 10), pt(23 * side, 6), pt(29.5 * side, 20), 0.95, 2.2, [8, 10.5, 11.5, 10.5, 8.5], 11.4, side));
  }
  return out;
}

/* ---------- Placing the gecko on the tile ---------- */

/** Gecko units to tile pixels: scaled, turned so the head points up and to the right, and centred. */
const S = 2.95;
const TURN = (28 * Math.PI) / 180;
const ORIGIN = pt(6, -4);
const AT = pt(262, 256);

function place(p) {
  const x = (p.x - ORIGIN.x) * S;
  const y = (p.y - ORIGIN.y) * S;
  return pt(AT.x + x * Math.cos(TURN) - y * Math.sin(TURN), AT.y + x * Math.sin(TURN) + y * Math.cos(TURN));
}

const d = (pts, close = true) => `M ${pts.map(place).map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ')}${close ? ' Z' : ''}`;

/* ---------- Painting ---------- */

/** The wash sits a few pixels off the line, like a print slightly out of register. */
const WASH = 'translate(-5 5)';

/** A part's own mask: the shape, less a copy of it shifted toward the light, leaving the shadow side. */
function crescentMask(id, shape, k) {
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="712" height="712">
    <path d="${shape}" fill="#fff"/>
    <path d="${shape}" fill="#000" transform="translate(${f(-k * 0.6)} ${f(-k * 0.8)})"/>
  </mask>`;
}

/** Diagonal hatching across the whole tile, to be cut down by a mask or clip. */
function hatching(step, angle = 1) {
  const lines = [];
  for (let x = -520; x < 620; x += step) lines.push(`M ${x} 600 l ${f(640 * angle)} -640`);
  return lines.join(' ');
}

/** A painted marble: paper, its wash pooled darker at the rim, its colour's pen pattern, a glint, the contour. */
function marble(id, c, r, colour, pattern) {
  const { wash, pattern: deep } = MARBLES[colour];
  const p = place(c);
  const R = r * S;
  return `
    <clipPath id="${id}"><circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}"/></clipPath>
    <radialGradient id="${id}-rim" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}" gradientUnits="userSpaceOnUse">
      <stop offset="0.45" stop-color="${wash}" stop-opacity="0"/>
      <stop offset="1" stop-color="${deep}" stop-opacity="0.55"/>
    </radialGradient>
    <circle cx="${f(p.x + 6)}" cy="${f(p.y + 9)}" r="${f(R)}" fill="${INK}" stroke="none" opacity="0.2"/>
    <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}" fill="${PAPER}" stroke="none"/>
    <g clip-path="url(#${id})" stroke="none">
      <circle cx="${f(p.x - 4)}" cy="${f(p.y + 4)}" r="${f(R)}" fill="${wash}"/>
      <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}" fill="url(#${id}-rim)"/>
      <g fill="${deep}" stroke="${deep}" opacity="0.92">${pattern(p, R)}</g>
      <path d="${hatching(12)}" stroke="${deep}" stroke-width="3" opacity="0.4" transform="translate(${f(R * 0.75)} ${f(R * 0.9)})" mask="url(#${id}-dark)"/>
    </g>
    <mask id="${id}-dark" maskUnits="userSpaceOnUse" x="-100" y="-100" width="712" height="712">
      <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}" fill="#fff"/>
      <circle cx="${f(p.x - R * 0.3)}" cy="${f(p.y - R * 0.4)}" r="${f(R)}" fill="#000"/>
    </mask>
    <path d="M ${f(p.x - R * 0.68)} ${f(p.y - R * 0.05)} A ${f(R * 0.7)} ${f(R * 0.7)} 0 0 1 ${f(p.x - R * 0.12)} ${f(p.y - R * 0.68)}" fill="none" stroke="${PAPER}" stroke-width="${f(R * 0.16)}" opacity="0.9"/>
    <circle cx="${f(p.x - R * 0.42)}" cy="${f(p.y - R * 0.48)}" r="${f(R * 0.11)}" fill="${PAPER}" stroke="none"/>
    <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(R)}" fill="none" stroke-width="9"/>`;
}

/** Yellow: two broad bands bowed like lines of latitude. */
const bands = (p, R) =>
  [-0.4, 0.22]
    .map((o) => `<path d="M ${f(p.x - R * 1.1)} ${f(p.y + R * (o - 0.06))} Q ${f(p.x)} ${f(p.y + R * (o + 0.34))} ${f(p.x + R * 1.1)} ${f(p.y + R * (o - 0.18))}" fill="none" stroke-width="${f(R * 0.2)}"/>`)
    .join('');

/** Red: polka dots in a loose cluster. */
const dots = (p, R) =>
  [[-0.3, -0.38, 0.2], [0.3, -0.18, 0.16], [-0.14, 0.3, 0.18], [0.48, 0.4, 0.13], [-0.64, 0.1, 0.12]]
    .map(([x, y, r]) => `<circle cx="${f(p.x + x * R)}" cy="${f(p.y + y * R)}" r="${f(r * R)}" stroke="none"/>`)
    .join('');

/** A skin part: paper under, the yellow wash off-register, its shadow side hatched, the outline over it. */
function skin(shape, id, width, k = 9) {
  return {
    defs: crescentMask(id, shape, k),
    fill: `<path d="${shape}" fill="${PAPER}" stroke="none"/>
      <path d="${shape}" fill="${SKIN}" stroke="${SKIN_DEEP}" stroke-width="3" stroke-opacity="0.45" transform="${WASH}"/>
      <path d="${shape}" fill="${SKIN_DEEP}" stroke="none" opacity="0.55" mask="url(#${id})"/>
      <path d="${hatching(11)}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.4" mask="url(#${id})"/>`,
    line: `<path d="${shape}" fill="none" stroke-width="${width}"/>`,
  };
}

/** The moss lawn, a flagstone for the gecko to bask on and stepping stones running off the tile. */
function garden() {
  const LAWN = 'M -90 150 C 10 176 70 120 150 132 C 230 144 270 92 350 70 C 420 50 470 -10 602 -40 L 602 602 L -90 602 Z';
  const stones = [
    'M 170 196 C 220 160 340 150 392 190 C 436 226 430 318 376 352 C 316 388 196 384 150 336 C 112 296 122 230 170 196 Z',
    'M 6 400 C 50 372 130 380 150 418 C 168 456 134 494 78 500 C 30 504 -20 486 -26 452 C -30 428 -16 412 6 400 Z',
    'M 410 420 C 446 396 520 400 540 432 C 556 464 530 504 482 512 C 438 518 396 498 390 468 C 386 446 392 432 410 420 Z',
  ];
  // Darker blooms in the moss, where the wash pooled as it dried.
  const blooms = [[60, 250, 54, 30], [430, 250, 50, 36], [250, 470, 70, 30], [470, 110, 40, 22], [140, 170, 34, 16]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
  const tufts = [[44, 300], [476, 160], [300, 488], [100, 196], [488, 318], [210, 500]]
    .map(([x, y]) => `M ${x - 12} ${y} q 4 -14 0 -26 M ${x} ${y} q 0 -18 6 -32 M ${x + 12} ${y} q 0 -12 10 -22`).join(' ');
  const pebbles = [[340, 440, 7], [40, 352, 6], [452, 372, 5], [206, 150, 5]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.4}" ry="${r}"/>`).join('');
  // Clover in the moss: three round leaves around a point.
  const clover = [[454, 210, 0.2], [70, 304, -0.4]].map(([x, y, a]) => [0, 1, 2].map((i) => {
    const ang = a + (i * TAU) / 3;
    return `<circle cx="${f(x + Math.cos(ang) * 10)}" cy="${f(y + Math.sin(ang) * 10)}" r="10"/>`;
  }).join('')).join('');
  return {
    defs: `<clipPath id="lawn"><path d="${LAWN}"/></clipPath>
      ${stones.map((st, i) => crescentMask(`stone${i}`, st, 34)).join('')}`,
    art: `
      <path d="${LAWN}" fill="${MOSS}" stroke="none" opacity="0.9"/>
      <g clip-path="url(#lawn)" stroke="none">
        <g fill="${LEAF}" opacity="0.28">${blooms}</g>
        <path d="${hatching(26, 0.55)}" stroke="${LEAF}" stroke-width="3" fill="none" opacity="0.2"/>
      </g>
      <path d="M -40 162 C 10 176 70 120 150 132 C 230 144 270 92 350 70 C 420 50 470 -10 560 -32" fill="none" stroke="${LEAF}" stroke-width="5" opacity="0.8"/>
      ${stones.map((st, i) => `
        <path d="${st}" fill="${INK}" stroke="none" opacity="0.16" transform="translate(6 10)"/>
        <path d="${st}" fill="${PAPER}" stroke="none"/>
        <path d="${st}" fill="${STONE}" stroke="none" transform="${WASH}"/>
        <path d="${st}" fill="${STONE_DARK}" stroke="none" opacity="0.3" mask="url(#stone${i})"/>
        <path d="${hatching(12)}" stroke="${STONE_DARK}" stroke-width="3" fill="none" opacity="0.6" mask="url(#stone${i})"/>
        <path d="${st}" fill="none" stroke-width="6"/>`).join('')}
      <path d="M 196 232 q 30 -14 62 -10 M 324 344 q 26 -4 40 -20" fill="none" stroke="${STONE_DARK}" stroke-width="4" opacity="0.7"/>
      <path d="${tufts}" fill="none" stroke="${LEAF}" stroke-width="5"/>
      <g fill="${LEAF}" stroke-width="3.5">${clover}</g>
      <g fill="${STONE}" stroke-width="3.5">${pebbles}</g>`,
  };
}

/**
 * The gecko of InkGecko basking on a stepping stone in the garden, seen from
 * above: a yellow marble held in its mouth (its skin tinted to match, as in the
 * game) and a red one cradled in the curl of its tail, in the game's blue
 * ballpoint and watercolour washes. The brand drop signs the corner, except on
 * the maskable icon, where a circle mask would cut it.
 */
export function inkgeckoArt({ maskable = false } = {}) {
  const body = trunk();
  const limbs = legs();
  const ground = garden();

  const parts = [];
  limbs.forEach((l, i) => parts.push({ id: `leg${i}`, shape: d(l.limb), width: 8, k: 6 }));
  const trunkPart = skin(d(body.shape), 'trunkshade', 10, 12);
  const headPart = skin(d(HEAD), 'headshade', 10, 10);
  const legParts = parts.map((p) => ({ ...p, ...skin(p.shape, p.id, p.width, p.k) }));

  // Toes: a short ink stroke with a round sticky pad at the end.
  const toes = limbs.flatMap((l) => l.toes);
  const toeLines = toes.map((t) => d(t.line, false)).join(' ');
  const pads = toes.map((t) => {
    const c = place(t.tip);
    return `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(2.8 * S)}"/>`;
  }).join('');

  // Spots in pairs down the back and bands across the tail.
  const spots = [];
  for (let i = 5; i < body.tailFrom; i += 4) {
    const p = body.spine[i];
    for (const s of [-1, 1]) spots.push(oval(p.x + s * 5.5, p.y + (s > 0 ? 1 : -1), 2.4, 2, 12));
  }
  for (const [x, y, r] of [[0, -33, 2.8], [-7, -28, 1.8], [7, -28, 1.8], [0, -47, 2]]) spots.push(oval(x, y, r * 1.2, r, 12));
  const tailBands = [];
  for (let i = body.tailFrom + 4; i < body.spine.length - 6; i += 5) tailBands.push(d([body.top[i], body.bot[i]], false));
  // A fine grain of scales: tiny pen arcs scattered over the back and head.
  let seed = 9071;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grain = (x0, x1, y0, y1, n) => Array.from({ length: n }, () => {
    const c = place(pt(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)));
    return `M ${f(c.x - 3.5)} ${f(c.y)} q 3.5 3.5 7 0`;
  }).join(' ');
  const scaleMarks = grain(-15, 15, -24, 46, 70) + ' ' + grain(-20, 20, -58, -20, 34);
  const beads = [];
  for (let i = 3; i < body.tailFrom; i += 3) {
    const c = place(body.spine[i]);
    beads.push(`<circle cx="${f(c.x)}" cy="${f(c.y)}" r="2.6"/>`);
  }

  // Eyes bulge past the cheeks: lid, paper eyeball, amber iris, a big pupil and a glint.
  const eyes = [1, -1].map((s) => {
    const lid = d(oval(14.4 * s, -38, 7.6, 7.8));
    const ball = place(pt(14.4 * s, -38));
    const iris = place(pt(14.4 * s - 0.4 * s, -39));
    const pupil = place(pt(14.4 * s - 0.6 * s, -39.6));
    const glintAt = place(pt(14.4 * s - 1.8, -41.6));
    return `<path d="${lid}" fill="${SKIN}" stroke="none"/>
      <circle cx="${f(ball.x)}" cy="${f(ball.y)}" r="${f(6.1 * S)}" fill="${PAPER}" stroke="none"/>
      <circle cx="${f(iris.x)}" cy="${f(iris.y)}" r="${f(4.9 * S)}" fill="${EYE}" stroke="none" opacity="0.75"/>
      <circle cx="${f(pupil.x)}" cy="${f(pupil.y)}" r="${f(3.6 * S)}" fill="${INK}" stroke="none"/>
      <circle cx="${f(glintAt.x)}" cy="${f(glintAt.y)}" r="${f(1.3 * S)}" fill="${PAPER}" stroke="none"/>
      <circle cx="${f(ball.x)}" cy="${f(ball.y)}" r="${f(6.1 * S)}" fill="none" stroke-width="5"/>
      <path d="${lid}" fill="none" stroke-width="8"/>`;
  }).join('');

  // A smile back from the held marble, nostrils, ear openings.
  const face = [1, -1].map((s) => `
    <path d="${d(cub(pt(s * 9.5, -55.5), pt(s * 13, -52.5), pt(s * 14.2, -49), pt(s * 13, -46), 8), false)}" fill="none" stroke-width="6"/>
    <path d="${d(oval(s * 14.4, -27, 1.3, 2, 10))}" fill="${INK}" stroke="none" opacity="0.6"/>`).join('');

  // The gecko's soft shadow on the stone.
  const shadow = [...limbs.map((l) => d(l.limb)), d(body.shape), d(HEAD)].join(' ');

  return `
    <defs>
      ${penWobble('geckopen', 5, 29)}
      ${ground.defs}
      ${trunkPart.defs}${headPart.defs}${legParts.map((p) => p.defs).join('')}
      <clipPath id="trunkclip"><path d="${d(body.shape)}"/></clipPath>
      <clipPath id="headclip"><path d="${d(HEAD)}"/></clipPath>
    </defs>
    <g filter="url(#geckopen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <!-- The lawn bleeds past the edges, so the maskable icon's shrunken art still meets them. -->
      ${ground.art}
      <path d="${shadow}" fill="${INK}" stroke="none" opacity="0.18" transform="translate(9 12)"/>

      <path d="${toeLines}" fill="none" stroke-width="13"/>
      <path d="${toeLines}" fill="none" stroke="${SKIN}" stroke-width="5"/>
      <g fill="${SKIN}" stroke-width="5">${pads}</g>
      ${legParts.map((p) => p.fill).join('')}
      ${legParts.map((p) => p.line).join('')}

      ${marble('tailmarble', CRADLE, CRADLE_R, 'red', dots)}
      ${trunkPart.fill}
      <g clip-path="url(#trunkclip)" stroke="none">
        <g fill="${SPOT}" opacity="0.5">${spots.slice(0, -4).map((s) => `<path d="${d(s)}"/>`).join('')}</g>
        <path d="${tailBands.join(' ')}" fill="none" stroke="${SPOT}" stroke-width="7" opacity="0.4"/>
        <g fill="${INK}" opacity="0.45">${beads.join('')}</g>
        <path d="${scaleMarks}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.3"/>
      </g>
      <path d="${d([pt(-5, -18), pt(-6.2, -6), pt(-5.6, 6), pt(-3.4, 16)], false)}" fill="none" stroke="${PAPER}" stroke-width="7" opacity="0.75"/>
      ${trunkPart.line}

      ${headPart.fill}
      <g clip-path="url(#headclip)" stroke="none">
        <g fill="${SPOT}" opacity="0.5">${spots.slice(-4).map((s) => `<path d="${d(s)}"/>`).join('')}</g>
        <path d="${scaleMarks}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.25"/>
      </g>
      <path d="${d(cub(pt(-10, -25), pt(-6, -23), pt(-2, -23.2), pt(1, -23.6), 6), false)}" fill="none" stroke="${PAPER}" stroke-width="6" opacity="0.7"/>
      ${headPart.line}
      ${face}
      ${eyes}

      ${marble('mouthmarble', MOUTH, MOUTH_R, 'yellow', bands)}
    </g>
    ${maskable ? '' : brandDrop({ cx: 70, top: 26, scale: 0.2, detail: false })}`;
}
