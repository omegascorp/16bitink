import { PAPER, brandDrop, penWobble } from './paper.mjs';

/** The garden notebook's ink and the corn snake's paint box (games/inksnake/src/art/palette.ts, snakes/cornPaint.ts). */
const INK = '#26316a';
const LEAF = '#5f8f4e';
const MEADOW = '#b7cd86';
const GRASS = '#7f9a4a';
const CORN = {
  ground: '#e88e48',
  lit: '#f4bf86',
  deep: '#c8602c',
  shadow: '#6a2a1a',
  saddle: '#b8321f',
  saddleLit: '#dc5a34',
  saddleDeep: '#7e1a13',
  rim: '#22100e',
  iris: '#cc5f26',
  tongue: '#bb2238',
  tongueTip: '#2a0d18',
};

const f = (n) => n.toFixed(1);
const pt = (x, y) => ({ x, y });
const TAU = Math.PI * 2;
/** Where the light comes from: the upper left, as in the game. */
const LIGHT = pt(-0.6, -0.8);

/* ---------- Geometry ---------- */

function cub(p0, c0, c1, p1, n = 16) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return pt(k[0] * p0.x + k[1] * c0.x + k[2] * c1.x + k[3] * p1.x, k[0] * p0.y + k[1] * c0.y + k[2] * c1.y + k[3] * p1.y);
  });
}

/** Unit normal (left of travel) at each point of a polyline. */
function normals(pts) {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt(-(b.y - a.y) / l, (b.x - a.x) / l);
  });
}

/** A seeded 0..1 generator, so the same call paints the same marks. */
function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const path = (pts, close = true) => `M ${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ')}${close ? ' Z' : ''}`;

/* ---------- The coil ---------- */

/** The spiral: its centre, where its first round starts (screen radians), its radius there, how much it opens per radian and how far round it winds. */
const CENTRE = pt(270, 265);
const START = Math.PI / 2 + 0.75;
const R_START = 112;
const GROWTH = 12.4;
const TURNS = 1.5;
/** Where the back of the head rests, in the middle of the coil, and the way it looks (screen radians). */
const NAPE = pt(276, 312);
const LOOK = -Math.PI / 2 + 0.12;
/** Head units (the game's head, facing +x) to tile pixels. */
const K = 2.95;
/** The neck's half-width in head units, as the game's (SNAKE_W / 2 − 1.2). */
const NECK = 10.8;
const BODY_W = 2 * NECK * K;
/** The head is drawn a size up on the neck, so it reads at a glance; its back narrows to meet the neck. */
const KH = 4.5;
const NECK_H = (NECK * K) / KH;

/**
 * The body's spine from the neck to the tail tip: the neck drops from the
 * head, resting in the middle of the tile, and swings into a spiral that
 * winds outwards round it. Resampled every 3 px.
 */
function spine() {
  const spiral = (th) => {
    const ang = START + th;
    const r = R_START + GROWTH * th;
    return pt(CENTRE.x + Math.cos(ang) * r, CENTRE.y + Math.sin(ang) * r);
  };
  const q = spiral(0);
  const q1 = spiral(0.01);
  const tl = Math.hypot(q1.x - q.x, q1.y - q.y);
  const tan = pt((q1.x - q.x) / tl, (q1.y - q.y) / tl);
  const down = pt(-Math.cos(LOOK), -Math.sin(LOOK));
  const lead = cub(NAPE, pt(NAPE.x + down.x * 46, NAPE.y + down.y * 46), pt(q.x - tan.x * 40, q.y - tan.y * 40), q, 60);
  const n = 900;
  const raw = [...lead, ...Array.from({ length: n }, (_, i) => spiral((TURNS * TAU * (i + 1)) / n))];
  const pts = [raw[0]];
  let carry = 0;
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1];
    const b = raw[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let at = 3 - carry;
    while (at <= l) {
      pts.push(pt(a.x + ((b.x - a.x) * at) / l, a.y + ((b.y - a.y) * at) / l));
      at += 3;
    }
    carry = l - (at - 3);
  }
  return pts;
}

/** The body's width at arc length s: the neck, a little thicker through the body, tapering to a fine tail. */
function widthAt(s, total) {
  const swell = BODY_W * (1 + 0.07 * Math.min(1, s / 160));
  const from = total * 0.76;
  if (s <= from) return swell;
  const u = (s - from) / (total - from);
  return 3 + (swell - 3) * (1 - u) ** 0.75;
}

function body() {
  const pts = spine();
  const step = 3;
  const total = step * (pts.length - 1);
  const ns = normals(pts);
  const ws = pts.map((_, i) => widthAt(i * step, total));
  /** The point at arc length s, pushed v across the body (v > 0 to the left of travel). */
  const along = (s, v = 0) => {
    const x = Math.max(0, Math.min(pts.length - 1.001, s / step));
    const i = Math.floor(x);
    const t = x - i;
    const p = pt(pts[i].x + (pts[i + 1].x - pts[i].x) * t, pts[i].y + (pts[i + 1].y - pts[i].y) * t);
    const nx = ns[i].x + (ns[i + 1].x - ns[i].x) * t;
    const ny = ns[i].y + (ns[i + 1].y - ns[i].y) * t;
    return pt(p.x + nx * v, p.y + ny * v);
  };
  const wAt = (s) => widthAt(Math.max(0, Math.min(total, s)), total);
  const left = pts.map((p, i) => pt(p.x + ns[i].x * ws[i] / 2, p.y + ns[i].y * ws[i] / 2));
  const right = pts.map((p, i) => pt(p.x - ns[i].x * ws[i] / 2, p.y - ns[i].y * ws[i] / 2));
  return { pts, ns, total, along, wAt, left, right, shape: [...left, ...[...right].reverse()] };
}

/**
 * A blotch on the body, bent with it: a squarish oval (a superellipse) of
 * half-length `a` along the body and half-width `h` across it, centred at arc
 * length s and offset v, its edge wobbling a little from its own seed.
 */
function blotch(b, s, v, a, h, seed, { pow = 2.2, rough = 0.12, n = 36 } = {}) {
  const r = rng(seed);
  const ph = [r() * TAU, r() * TAU, r() * TAU];
  const e = 2 / pow;
  return Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * TAU;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const k = 1 + rough * (0.5 * Math.sin(2 * ang + ph[0]) + 0.3 * Math.sin(3 * ang + ph[1]) + 0.2 * Math.sin(5 * ang + ph[2]));
    return b.along(s + Math.sign(c) * Math.abs(c) ** e * a * k, v + Math.sign(sn) * Math.abs(sn) ** e * h * k);
  });
}

/* ---------- The head, in the game's head units (facing +x; snakes/cornHead.ts) ---------- */

const SNOUT = 20.2;
const UPPER = [
  pt(-15, -NECK_H),
  ...cub(pt(-15, -NECK_H), pt(-10.5, -NECK_H - 0.1), pt(-9.5, -13.6), pt(-4.5, -13.8), 8).slice(1),
  ...cub(pt(-4.5, -13.8), pt(1, -14), pt(6.5, -12.9), pt(10.5, -10.6), 8).slice(1),
  ...cub(pt(10.5, -10.6), pt(14.2, -8.6), pt(17.2, -6.8), pt(18.9, -4.4), 8).slice(1),
  ...cub(pt(18.9, -4.4), pt(20, -2.9), pt(SNOUT, -1.4), pt(SNOUT, 0), 5).slice(1),
];
const flip = (pts) => pts.map((p) => pt(p.x, -p.y));
const bilateral = (upper) => [...upper, ...flip(upper).reverse().slice(1)];
const HEAD = bilateral(UPPER);

/** The spear-point on the crown, its two arms running back down the neck. */
const SPEAR = bilateral([
  ...cub(pt(6.4, 0), pt(3, -2), pt(-3, -4.3), pt(-10, -5.4), 8),
  pt(-18, -6),
  pt(-27, -6.2),
  pt(-33, -6),
  ...cub(pt(-35, -5.2), pt(-35.4, -3.8), pt(-35, -2.8), pt(-33, -2.7), 4),
  pt(-27, -2.6),
  pt(-21, -2.3),
  ...cub(pt(-15, -2), pt(-12, -1.6), pt(-10.4, -0.6), pt(-10, 0), 4),
]);

/** The bar across the brow, in front of the spear's point. */
function brow() {
  const sp = cub(pt(8.2, -12.4), pt(10.6, -7), pt(10.8, 7), pt(8.2, 12.4), 16);
  const ns = normals(sp);
  const w = (i) => (3.4 + 0.8 * Math.sin((Math.PI * i) / (sp.length - 1))) / 2;
  return [...sp.map((p, i) => pt(p.x + ns[i].x * w(i), p.y + ns[i].y * w(i))), ...sp.map((p, i) => pt(p.x - ns[i].x * w(i), p.y - ns[i].y * w(i))).reverse()];
}

/** The stripe from behind each eye back to the corner of the jaw. */
function eyeStripe(s) {
  const sp = cub(pt(-0.6, 11.4 * s), pt(-3.5, 12.4 * s), pt(-7, 13 * s), pt(-12, 12.4 * s), 12);
  const ns = normals(sp);
  const w = (i) => (2.8 - 1.4 * (i / (sp.length - 1))) / 2;
  return [...sp.map((p, i) => pt(p.x + ns[i].x * w(i), p.y + ns[i].y * w(i))), ...sp.map((p, i) => pt(p.x - ns[i].x * w(i), p.y - ns[i].y * w(i))).reverse()];
}

/** The crown's plates in fine line (upper half; mirrored). */
const PLATES = [
  cub(pt(19.2, -2.8), pt(17.8, -2.2), pt(17.4, -0.8), pt(17.4, 0), 4),
  [pt(17.4, 0), pt(14.6, 0)],
  cub(pt(14.6, 0), pt(15.2, -2.2), pt(16, -3.8), pt(17.6, -5.6), 4),
  [pt(14.6, 0), pt(11.8, 0)],
  cub(pt(1, -3.6), pt(-1, -6.4), pt(-3, -8.6), pt(-4, -9.4), 5),
  cub(pt(-4, -9.4), pt(-9.4, -9.2), pt(-13.4, -6.4), pt(-14.4, -1), 6),
];

/** The forked tongue, flicked out of the snout: the stem, then the two tines. */
const TONGUE = cub(pt(17, 0), pt(23, -0.9), pt(28, 1.1), pt(32, 0.2), 12);
const TINES = [1, -1].map((s) => cub(pt(31.6, 0.2), pt(34, 0.4 + s * 0.6), pt(36.2, s * 2.4), pt(38.6, s * 4), 8));

/* ---------- Painting ---------- */

/** The wash sits a few pixels off the line, like a print slightly out of register. */
const WASH = 'translate(-5 5)';

/** A part's own mask: the shape, less a copy of it shifted toward the light, leaving the shadow side. */
function crescentMask(id, shape, k) {
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="712" height="712">
    <path d="${shape}" fill="#fff"/>
    <path d="${shape}" fill="#000" transform="translate(${f(LIGHT.x * k)} ${f(LIGHT.y * k)})"/>
  </mask>`;
}

/** Diagonal hatching across the whole tile, to be cut down by a mask or clip. */
function hatching(step, angle = 1) {
  const lines = [];
  for (let x = -520; x < 620; x += step) lines.push(`M ${x} 600 l ${f(640 * angle)} -640`);
  return lines.join(' ');
}

let blotchId = 0;

/** A red blotch with a black rim: the red laid in, pooled darker at its edge, a warmer heart toward the light, the rim inked. */
function saddlePaint(shape, rim) {
  const d = path(shape);
  const id = `blotch${blotchId++}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="${CORN.saddle}" stroke="none"/>
    <g clip-path="url(#${id})">
      <path d="${d}" fill="none" stroke="${CORN.saddleDeep}" stroke-width="${f(rim * 3)}" opacity="0.45"/>
      <path d="${d}" fill="${CORN.saddleLit}" opacity="0.6" transform="translate(${f(LIGHT.x * rim * 1.6)} ${f(LIGHT.y * rim * 1.6)})"/>
    </g>
    <path d="${d}" fill="none" stroke="${CORN.rim}" stroke-width="${f(rim)}" opacity="0.92"/>`;
}

/** The meadow the snake lies coiled in: a green wash bleeding off the tile, darker blooms, tufts and a few flowers. */
function meadow() {
  const FIELD = 'M -100 150 C -20 130 60 70 120 40 C 180 10 220 -40 260 -100 L 612 -100 L 612 612 L -100 612 Z';
  const blooms = [[70, 300, 60, 34], [440, 120, 56, 30], [450, 460, 66, 34], [120, 470, 60, 26], [270, 40, 40, 16]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
  const tufts = [[30, 250], [482, 60], [496, 250], [470, 500], [30, 480], [250, 500], [330, 20], [140, 30]]
    .map(([x, y]) => `M ${x - 12} ${y} q 4 -14 0 -26 M ${x} ${y} q 0 -18 6 -32 M ${x + 12} ${y} q 0 -12 10 -22`).join(' ');
  const flower = (x, y, r, petal, heart) => {
    const petals = Array.from({ length: 5 }, (_, i) => {
      const a = (i * TAU) / 5 - 0.3;
      return `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="${f(r * 0.78)}"/>`;
    }).join('');
    return `<g fill="${petal}" stroke-width="3">${petals}</g><circle cx="${x}" cy="${y}" r="${f(r * 0.55)}" fill="${heart}" stroke-width="2.5"/>`;
  };
  return `
    <path d="${FIELD}" fill="${MEADOW}" stroke="none"/>
    <clipPath id="field"><path d="${FIELD}"/></clipPath>
    <g clip-path="url(#field)" stroke="none">
      <g fill="${LEAF}" opacity="0.22">${blooms}</g>
      <path d="${hatching(26, 0.55)}" stroke="${LEAF}" stroke-width="3" fill="none" opacity="0.16"/>
    </g>
    <path d="M -40 138 C -20 130 60 70 120 40 C 180 10 220 -40 240 -70" fill="none" stroke="${LEAF}" stroke-width="5" opacity="0.7"/>
    <path d="${tufts}" fill="none" stroke="${GRASS}" stroke-width="5"/>
    ${flower(488, 150, 8, '#f2c230', '#b5851a')}
    ${flower(36, 380, 7, PAPER, '#f2c230')}
    ${flower(400, 494, 7, PAPER, '#f2c230')}
    ${flower(190, 494, 6, '#f2c230', '#b5851a')}`;
}

/** The saddles down the back and the smaller blotches peeping over both flanks. */
function markings(b) {
  const saddles = [];
  const flanks = [];
  let s = 118;
  let i = 0;
  while (s < b.total - 16) {
    const w = b.wAt(s);
    const r = rng(500 + i * 37);
    saddles.push({ shape: blotch(b, s, (r() - 0.5) * 0.04 * w, 0.34 * w, 0.41 * w, 900 + i, { n: 40, pow: 2.8 }), w });
    const g = s + 0.55 * w;
    const wg = b.wAt(g);
    if (g < b.total - 30) {
      for (const side of [1, -1]) flanks.push({ shape: blotch(b, g + (r() - 0.5) * 4, side * 0.47 * wg, 0.16 * wg, 0.11 * wg, 1300 + i * 2 + side, { n: 24 }), w: wg });
    }
    s += 1.16 * w + 3;
    i++;
  }
  return { saddles, flanks };
}

/** Fine pen arcs for the scales, row on row, each bowed toward the tail. */
function scaleMarks(b) {
  const marks = [];
  for (let s = 40; s < b.total - 40; s += 9) {
    const w = b.wAt(s);
    if (w < 16) break;
    for (const v of [-0.33, -0.17, 0, 0.17, 0.33]) {
      const off = (Math.round(s / 9) % 2) * 4.5;
      const a = b.along(s + off, v * w - 0.06 * w);
      const c = b.along(s + off + 5, v * w);
      const e = b.along(s + off, v * w + 0.06 * w);
      marks.push(`M ${f(a.x)} ${f(a.y)} Q ${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}`);
    }
  }
  return marks.join(' ');
}

/** The line of the glossy band high on each coil, on the side turned to the light. */
function glossLine(b, from, to) {
  const out = [];
  for (let s = from; s < to; s += 4) {
    const n = b.ns[Math.min(b.ns.length - 1, Math.round(s / 3))];
    const lit = Math.max(-1, Math.min(1, (n.x * LIGHT.x + n.y * LIGHT.y) * 1.8));
    out.push(b.along(s, lit * 0.25 * b.wAt(s)));
  }
  return out;
}

/** A soft lit band down the coil, fading out before the tail. */
function gloss(b) {
  return { band: path(glossLine(b, 44, b.total * 0.86), false) };
}

/**
 * The corn snake of InkSnake coiled in the meadow, seen from above: orange
 * ground, big rust-red saddles rimmed in black down its back, its head
 * resting in the middle of the coil with the red spear-point on the crown,
 * round eyes and the forked tongue out, in the game's blue ballpoint and
 * watercolour washes. The brand drop signs the corner, except on the
 * maskable icon, where a circle mask would cut it.
 */
export function inksnakeArt({ maskable = false } = {}) {
  blotchId = 0;
  const b = body();
  const bodyD = path(b.shape);

  // The head's frame: pointing back along the spine from the neck, set forward so the neck joins under it.
  const fwd = pt(Math.cos(LOOK), Math.sin(LOOK));
  const side = pt(-fwd.y, fwd.x);
  const origin = pt(b.pts[0].x + fwd.x * 10 * KH, b.pts[0].y + fwd.y * 10 * KH);
  const H = (p) => pt(origin.x + (fwd.x * p.x + side.x * p.y) * KH, origin.y + (fwd.y * p.x + side.y * p.y) * KH);
  const hd = (pts, close = true) => path(pts.map(H), close);
  const headD = hd(HEAD);
  const headLine = hd(HEAD, false);
  // The neck under the head: the body's first few px, pulled forward into the head so no seam shows.
  const neckD = path([H(pt(-15, -NECK_H)), H(pt(-2, -NECK_H)), H(pt(-2, NECK_H)), H(pt(-15, NECK_H)), b.right[0], b.left[0]]);

  const { saddles, flanks } = markings(b);
  const spearD = hd(SPEAR);

  // Eyes bulging from the sides: dark socket, amber-red iris, a round pupil looking out, a glint.
  const eyes = [1, -1].map((s) => {
    const c = H(pt(4, 10.6 * s));
    const R = 4.7 * KH;
    const pupil = H(pt(4.6, 11.3 * s));
    const glint = pt(c.x + LIGHT.x * R * 0.45, c.y + LIGHT.y * R * 0.45);
    return `<circle cx="${f(c.x + 4)}" cy="${f(c.y + 5)}" r="${f(R)}" fill="${INK}" stroke="none" opacity="0.3"/>
      <circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(R)}" fill="url(#iris)" stroke="none"/>
      <circle cx="${f(pupil.x)}" cy="${f(pupil.y)}" r="${f(R * 0.56)}" fill="#140a0c" stroke="none"/>
      <circle cx="${f(glint.x)}" cy="${f(glint.y)}" r="${f(R * 0.26)}" fill="${PAPER}" stroke="none"/>
      <circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(R)}" fill="none" stroke-width="6"/>`;
  }).join('');
  const nostrils = [1, -1].map((s) => {
    const n = H(pt(17, 3.6 * s));
    return `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="3.4" fill="${INK}" stroke="none"/>`;
  }).join('');
  const plates = PLATES.flatMap((pl) => [hd(pl, false), hd(flip(pl), false)]).join(' ');

  const tongueStem = hd(TONGUE, false);
  const tines = TINES.map((t) => hd(t, false)).join(' ');
  const tip = H(pt(38, 0));
  const fork = H(pt(31, 0));

  // The coil's soft shadow on the grass.
  const shadow = bodyD;
  const inner = b.wAt(0);
  // The coil's contour starts behind the head, where the head's own takes over.
  const from = Math.ceil((5 * KH) / 3) + 1;
  const contour = path([...b.left.slice(from), ...b.right.slice(from).reverse()], false);
  const nape0 = H(pt(-6, 0));
  const nape1 = H(pt(-14, 0));
  const shine = gloss(b);

  return `
    <defs>
      ${penWobble('snakepen', 5, 41)}
      ${crescentMask('bodyshade', bodyD, 15)}
      ${crescentMask('headshade', headD, 13)}
      <clipPath id="bodyclip"><path d="${bodyD}"/><path d="${neckD}"/></clipPath>
      <clipPath id="headclip"><path d="${headD}"/></clipPath>
      <!-- The back of the head dissolves into the neck under it, so the join never shows (as the game's fadeNeck). -->
      <linearGradient id="napefade" gradientUnits="userSpaceOnUse" x1="${f(nape0.x)}" y1="${f(nape0.y)}" x2="${f(nape1.x)}" y2="${f(nape1.y)}">
        <stop offset="0" stop-color="#fff"/>
        <stop offset="1" stop-color="#000"/>
      </linearGradient>
      <mask id="nape" maskUnits="userSpaceOnUse" x="-100" y="-100" width="712" height="712">
        <rect x="-100" y="-100" width="712" height="712" fill="url(#napefade)"/>
      </mask>
      <radialGradient id="iris" cx="0.36" cy="0.32" r="0.75">
        <stop offset="0" stop-color="#f0a050"/>
        <stop offset="0.5" stop-color="${CORN.iris}"/>
        <stop offset="1" stop-color="#4a1a10"/>
      </radialGradient>
      <linearGradient id="fork" gradientUnits="userSpaceOnUse" x1="${f(fork.x)}" y1="${f(fork.y)}" x2="${f(tip.x)}" y2="${f(tip.y)}">
        <stop offset="0" stop-color="${CORN.tongue}"/>
        <stop offset="1" stop-color="${CORN.tongueTip}"/>
      </linearGradient>
    </defs>
    <g filter="url(#snakepen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <!-- The meadow bleeds past the edges, so the maskable icon's shrunken art still meets them. -->
      ${meadow()}
      <path d="${shadow}" fill="${INK}" stroke="none" opacity="0.2" transform="translate(10 13)"/>

      <!-- The coil: paper, the orange wash off-register, saddles, shade, scales, gloss, the contour. -->
      <path d="${bodyD}" fill="${PAPER}" stroke="none"/>
      <path d="${neckD}" fill="${PAPER}" stroke="none"/>
      <g clip-path="url(#bodyclip)" stroke="none">
        <path d="${bodyD}" fill="${CORN.ground}" stroke="${CORN.deep}" stroke-width="4" stroke-opacity="0.4" transform="${WASH}"/>
        <path d="${neckD}" fill="${CORN.ground}" transform="${WASH}"/>
        ${flanks.map((fl) => saddlePaint(fl.shape, 4)).join('')}
        ${saddles.map((sd) => saddlePaint(sd.shape, Math.max(3, sd.w * 0.09))).join('')}
        ${saddlePaint(SPEAR.map(H), 5)}
        <path d="${bodyD}" fill="${CORN.shadow}" opacity="0.42" mask="url(#bodyshade)"/>
        <path d="${hatching(11)}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.4" mask="url(#bodyshade)"/>
        <path d="${scaleMarks(b)}" fill="none" stroke="${CORN.shadow}" stroke-width="1.8" opacity="0.32"/>
      </g>
      <path d="${shine.band}" fill="none" stroke="${PAPER}" stroke-width="${f(inner * 0.22)}" opacity="0.22"/>
      <path d="${shine.band}" fill="none" stroke="${PAPER}" stroke-width="${f(inner * 0.07)}" opacity="0.32"/>
      <path d="${contour}" fill="none" stroke-width="10"/>

      <!-- The tongue flicks out from under the snout. -->
      <path d="${tongueStem}" fill="none" stroke-width="${f(1.6 * KH + 4)}"/>
      <path d="${tines}" fill="none" stroke-width="${f(1.1 * KH + 4)}"/>
      <path d="${tines}" fill="none" stroke="url(#fork)" stroke-width="${f(1.1 * KH)}"/>
      <path d="${tongueStem}" fill="none" stroke="${CORN.tongue}" stroke-width="${f(1.6 * KH)}"/>

      <!-- The head, resting in the middle of the coil. -->
      <g mask="url(#nape)">
      <path d="${headD}" fill="${INK}" stroke="none" opacity="0.22" transform="translate(10 14)"/>
      <path d="${headD}" fill="${PAPER}" stroke="none"/>
      <g clip-path="url(#headclip)" stroke="none">
        <path d="${headD}" fill="${CORN.ground}" transform="${WASH}"/>
        <path d="${headD}" fill="${CORN.lit}" opacity="0.35" transform="${WASH}"/>
        <circle cx="${f(H(pt(4, -2)).x)}" cy="${f(H(pt(4, -2)).y)}" r="${f(10 * KH)}" fill="${CORN.lit}" opacity="0.4"/>
        <circle cx="${f(H(pt(15, 0)).x)}" cy="${f(H(pt(15, 0)).y)}" r="${f(5 * KH)}" fill="${CORN.lit}" opacity="0.55"/>
        ${saddlePaint(SPEAR.map(H), 5)}
        ${[1, -1].map((s) => saddlePaint(eyeStripe(s).map(H), 4.5)).join('')}
        ${saddlePaint(brow().map(H), 4.5)}
        <path d="${headD}" fill="${CORN.shadow}" opacity="0.36" mask="url(#headshade)"/>
        <path d="${hatching(11)}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.36" mask="url(#headshade)"/>
        <path d="${plates}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>
      </g>
      </g>
      <path d="${headLine}" fill="none" stroke-width="12"/>
      ${nostrils}
      ${eyes}
    </g>
    ${maskable ? '' : brandDrop({ cx: 66, top: 22, scale: 0.2, detail: false })}`;
}
