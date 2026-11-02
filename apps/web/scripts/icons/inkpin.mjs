import { PAPER, brandDrop, penWobble } from './paper.mjs';

/** The ruin notebook's ink and Nib's paint box (games/inkpin/src/art/palette.ts, nib.ts, props.ts). */
const INK = '#26316a';
const FUR = '#9a98a0';
const FUR_LIGHT = '#d8d4cf';
const FUR_DARK = '#4a4752';
const MASK = '#2a2830';
const BANDANA = '#c8402f';
const BANDANA_DARK = '#8e2a20';
const BANDANA_LIT = '#e2715c';
const VEST = '#7d8a4e';
const VEST_DARK = '#4f5a2e';
const LEATHER = '#8a5a34';
const GOLD = '#e2b33c';
const GOLD_DARK = '#a5761c';
const GOLD_LIGHT = '#fbe7a1';
const TEMPLE = '#d9cdb2';
const TEMPLE_DARK = '#a3937a';
const MOSS = '#7f9a52';

const f = (n) => n.toFixed(1);
const pt = (x, y) => ({ x, y });
const TAU = Math.PI * 2;
/** Where the light comes from: the upper left, as in the game. */
const LIGHT = pt(-0.6, -0.8);
/** The wash sits a few pixels off the line, like a print slightly out of register. */
const WASH = 'translate(-6 5)';

/* ---------- Geometry ---------- */

/** A closed (or open) Catmull-Rom curve through the points, as cubic Béziers. */
function smooth(pts, closed = true) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    segs.push(`C ${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`);
  }
  return `M ${f(pts[0].x)} ${f(pts[0].y)} ${segs.join(' ')}${closed ? ' Z' : ''}`;
}

const mirror = (pts, axis = 256) => pts.map((p) => pt(2 * axis - p.x, p.y));
/** A left half running top to bottom, joined to its mirror image into one closed outline. */
const bilateral = (left) => [...left, ...mirror(left).reverse()];

/** A ribbon along a centreline, its half-width given by `w(t)`. */
function ribbon(line, w) {
  const left = [];
  const right = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    const r = w(i / (line.length - 1));
    left.push(pt(p.x + nx * r, p.y + ny * r));
    right.push(pt(p.x - nx * r, p.y - ny * r));
  });
  return [...left, ...right.reverse()];
}

/** A raccoon's head seen from the front: round on top, the cheek fur puffing out in tufts low on both sides. */
function headOutline() {
  const cx = 256;
  const cy = 236;
  const pts = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    // Cheeks: bumps low on each side (screen angles, y down).
    const d1 = Math.atan2(Math.sin(a - 0.55), Math.cos(a - 0.55));
    const d2 = Math.atan2(Math.sin(a - (Math.PI - 0.55)), Math.cos(a - (Math.PI - 0.55)));
    const cheek = Math.exp(-(d1 * d1) / 0.14) + Math.exp(-(d2 * d2) / 0.14);
    const tuft = cheek > 0.25 ? (i % 2 === 0 ? 0.075 : -0.02) * Math.min(1, cheek * 1.4) : 0;
    const chin = Math.sin(a) > 0 ? 1 - 0.1 * Math.sin(a) ** 6 : 1;
    pts.push(pt(cx + Math.cos(a) * 130 * (1 + 0.13 * cheek + tuft), cy + Math.sin(a) * 112 * chin * (1 + 0.07 * cheek + tuft)));
  }
  return pts;
}

/* ---------- Painting ---------- */

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

/** The temple wall behind Nib: sandstone blocks in courses, lit by the pin's glow, moss in the joints. */
function wall() {
  const WALL = 'M -100 214 C -10 196 64 130 110 66 C 140 24 158 -30 176 -100 L 612 -100 L 612 612 L -100 612 Z';
  const joints = [];
  const blocks = [];
  for (let row = 0; row < 9; row++) {
    const y = -26 + row * 66;
    joints.push(`M -100 ${y} L 612 ${y + (row % 2 ? 4 : -3)}`);
    const off = (row % 2) * 70;
    for (let x = -120 + off; x < 620; x += 140) {
      joints.push(`M ${x} ${y} l ${row % 3 === 0 ? 3 : -2} 66`);
      if ((row * 7 + x) % 3 === 0) blocks.push(`<rect x="${x + 6}" y="${y + 6}" width="128" height="54" rx="8"/>`);
    }
  }
  const moss = [[470, 106], [26, 404], [486, 470], [150, 488]]
    .map(([x, y]) => `M ${x - 16} ${y} q 6 -14 16 -12 q 8 -10 18 0 q 10 -2 12 12`).join(' ');
  return `
    <path d="${WALL}" fill="${TEMPLE}" stroke="none"/>
    <clipPath id="wall"><path d="${WALL}"/></clipPath>
    <g clip-path="url(#wall)" stroke="none">
      <g fill="${TEMPLE_DARK}" opacity="0.18">${blocks.join('')}</g>
      <circle cx="300" cy="300" r="250" fill="url(#glow)"/>
      <path d="${hatching(24, 0.6)}" stroke="${TEMPLE_DARK}" stroke-width="3" fill="none" opacity="0.18"/>
      <path d="${joints.join(' ')}" stroke="${TEMPLE_DARK}" stroke-width="5" fill="none" opacity="0.55"/>
    </g>
    <path d="M -40 202 C -10 196 64 130 110 66 C 140 24 150 -10 160 -50" fill="none" stroke="${TEMPLE_DARK}" stroke-width="5" opacity="0.8"/>
    <path d="${moss}" fill="${MOSS}" fill-opacity="0.55" stroke="${MOSS}" stroke-width="4"/>`;
}

/** Shoulders in the olive field vest, the pale chest fur, and the pack strap across it with its gold buckle. */
function shoulders() {
  const BODY = smooth([pt(20, 600), pt(40, 452), pt(96, 392), pt(176, 360), pt(256, 352), pt(336, 360), pt(416, 392), pt(472, 452), pt(492, 600)]);
  const LEFT = smooth([pt(20, 600), pt(40, 452), pt(96, 392), pt(176, 362), pt(206, 410), pt(214, 480), pt(200, 600)]);
  const RIGHT = smooth(mirror([pt(20, 600), pt(40, 452), pt(96, 392), pt(176, 362), pt(206, 410), pt(214, 480), pt(200, 600)]));
  const STRAP = smooth(ribbon([pt(338, 364), pt(300, 420), pt(250, 480), pt(196, 560), pt(170, 600)], () => 17), true);
  return {
    defs: `<clipPath id="body"><path d="${BODY}"/></clipPath>${crescentMask('bodyshade', BODY, 30)}`,
    art: `
      <path d="${BODY}" fill="${INK}" stroke="none" opacity="0.2" transform="translate(12 10)"/>
      <path d="${BODY}" fill="${PAPER}" stroke="none"/>
      <g clip-path="url(#body)" stroke="none">
        <path d="${BODY}" fill="${FUR_LIGHT}" transform="${WASH}"/>
        <ellipse cx="256" cy="372" rx="60" ry="26" fill="${FUR}" opacity="0.5"/>
        <path d="${LEFT}" fill="${VEST}" transform="${WASH}"/>
        <path d="${RIGHT}" fill="${VEST}" transform="${WASH}"/>
        <path d="${STRAP}" fill="${LEATHER}" transform="${WASH}"/>
        <path d="${BODY}" fill="${VEST_DARK}" opacity="0.45" mask="url(#bodyshade)"/>
        <path d="${hatching(12)}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.35" mask="url(#bodyshade)"/>
        <path d="M 96 430 q 40 -20 70 -40 M 416 430 q -40 -20 -70 -40" stroke="${VEST_DARK}" stroke-width="4" fill="none" opacity="0.5"/>
        <path d="M 230 400 l 4 10 M 270 402 l -3 10 M 244 430 l 3 10 M 282 438 l -2 9" stroke="${FUR}" stroke-width="3.5" fill="none" opacity="0.8"/>
      </g>
      <path d="${LEFT}" fill="none" stroke-width="7"/>
      <path d="${RIGHT}" fill="none" stroke-width="7"/>
      <path d="${STRAP}" fill="none" stroke-width="6"/>
      <rect x="230" y="464" width="40" height="34" rx="6" fill="${GOLD}" stroke-width="6" transform="rotate(-40 250 481)"/>
      <rect x="241" y="474" width="18" height="14" rx="3" fill="${GOLD_DARK}" stroke="none" transform="rotate(-40 250 481)"/>
      <path d="${BODY}" fill="none" stroke-width="10"/>`,
  };
}

/** The golden pin Nib has just pulled, held up in a dark raccoon paw: a ring at the pulling end, a pointed shaft. */
function pin() {
  const ring = pt(418, 350);
  const dir = (() => {
    const v = pt(-118, 150);
    const l = Math.hypot(v.x, v.y);
    return pt(v.x / l, v.y / l);
  })();
  const n = pt(-dir.y, dir.x);
  const P = (s, v) => pt(ring.x + dir.x * s + n.x * v, ring.y + dir.y * s + n.y * v);
  const half = 15;
  const len = 178;
  const shaft = [P(26, -half), P(len - half, -half), P(len, 0), P(len - half, half), P(26, half)];
  const shaftD = `M ${shaft.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ')} Z`;
  const lit = [P(30, -half * 0.7), P(len - half * 1.6, -half * 0.7), P(len - half * 1.6, -half * 0.2), P(30, -half * 0.2)];
  const litD = `M ${lit.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L ')} Z`;
  // The arm comes up from below the tile's edge; the paw's fingers wrap over the shaft.
  const grip = P(92, 0);
  const ARM = smooth(ribbon([pt(500, 620), pt(470, 520), pt(436, 460), pt(grip.x + 10, grip.y + 18)], (t) => 30 - 4 * t), true);
  const PAW = '#3a3842';
  const palm = pt(grip.x - n.x * 18 - dir.x * 4, grip.y - n.y * 18 - dir.y * 4);
  const fingers = [-1.5, -0.5, 0.5, 1.5].map((k) => {
    const a = pt(grip.x + dir.x * k * 14 - n.x * 12, grip.y + dir.y * k * 14 - n.y * 12);
    const b = pt(grip.x + dir.x * k * 13 + n.x * (9 - Math.abs(k) * 2), grip.y + dir.y * k * 13 + n.y * (9 - Math.abs(k) * 2));
    return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`;
  }).join(' ');
  const sparks = [[466, 290, 14], [482, 392, 8]]
    .map(([x, y, r]) => `M ${x - r} ${y} L ${x + r} ${y} M ${x} ${y - r} L ${x} ${y + r}`).join(' ');
  return {
    defs: crescentMask('armshade', ARM, 22),
    art: `
    <path d="${ARM}" fill="${PAPER}" stroke="none"/>
    <path d="${ARM}" fill="${FUR}" stroke="none" transform="${WASH}"/>
    <path d="${ARM}" fill="${FUR_DARK}" opacity="0.4" stroke="none" mask="url(#armshade)"/>
    <path d="${ARM}" fill="none" stroke-width="9"/>
    <circle cx="${ring.x}" cy="${ring.y}" r="70" fill="url(#pinglow)" stroke="none"/>
    <ellipse cx="${f(palm.x)}" cy="${f(palm.y)}" rx="27" ry="22" fill="${PAW}" stroke-width="8" transform="rotate(${f((Math.atan2(dir.y, dir.x) * 180) / Math.PI)} ${f(palm.x)} ${f(palm.y)})"/>
    <path d="${shaftD}" fill="${INK}" stroke="none" opacity="0.22" transform="translate(10 12)"/>
    <path d="${shaftD}" fill="url(#gold)" stroke="none"/>
    <path d="${litD}" fill="${GOLD_LIGHT}" stroke="none" opacity="0.85"/>
    <path d="${shaftD}" fill="none" stroke-width="7"/>
    <circle cx="${ring.x}" cy="${ring.y}" r="31" fill="none" stroke="${INK}" stroke-width="30"/>
    <circle cx="${ring.x}" cy="${ring.y}" r="31" fill="none" stroke="${GOLD}" stroke-width="18"/>
    <path d="M ${ring.x - 30} ${ring.y - 6} A 30 30 0 0 1 ${ring.x + 6} ${ring.y - 30}" fill="none" stroke="${GOLD_LIGHT}" stroke-width="6"/>
    <path d="M ${ring.x + 30} ${ring.y + 6} A 30 30 0 0 1 ${ring.x - 6} ${ring.y + 30}" fill="none" stroke="${GOLD_DARK}" stroke-width="6" opacity="0.8"/>
    <path d="${fingers}" fill="none" stroke-width="20"/>
    <path d="${fingers}" fill="none" stroke="${PAW}" stroke-width="11"/>
    <path d="${fingers}" fill="none" stroke="${FUR}" stroke-width="3" opacity="0.6" transform="translate(-2 -3)"/>
    <path d="${sparks}" fill="none" stroke="${GOLD_DARK}" stroke-width="5"/>`,
  };
}

/** The red explorer's headband: across the brow, knotted over the left ear, two tails flying out behind. */
function headband() {
  const upper = [pt(100, 186), pt(170, 146), pt(256, 128), pt(342, 146), pt(412, 186)];
  const lower = [pt(412, 226), pt(342, 186), pt(256, 168), pt(170, 186), pt(100, 226)];
  const BAND = smooth([...upper, ...lower]);
  const knot = pt(124, 196);
  /** A tail streaming from the knot, rippling as it flies, cut in a swallowtail at the end. */
  const tail = (end, mid, w0, w1, wave) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      const x = u * u * knot.x + 2 * u * t * mid.x + t * t * end.x;
      const y = u * u * knot.y + 2 * u * t * mid.y + t * t * end.y;
      const dx = 2 * u * (mid.x - knot.x) + 2 * t * (end.x - mid.x);
      const dy = 2 * u * (mid.y - knot.y) + 2 * t * (end.y - mid.y);
      const l = Math.hypot(dx, dy) || 1;
      const k = wave * Math.sin(t * Math.PI * 1.6) * t;
      pts.push(pt(x - (dy / l) * k, y + (dx / l) * k));
    }
    const outline = ribbon(pts, (t) => w0 + (w1 - w0) * t);
    const tip = pts[pts.length - 1];
    const back = pts[pts.length - 3];
    const notch = pt(tip.x + (back.x - tip.x) * 0.6, tip.y + (back.y - tip.y) * 0.6);
    const half = outline.length / 2;
    return smooth([...outline.slice(0, half), notch, ...outline.slice(half)]);
  };
  const TAILS = [tail(pt(52, 122), pt(86, 194), 16, 14, 10), tail(pt(54, 272), pt(72, 212), 15, 12, -8)];
  const folds = 'M 150 160 q 6 14 2 30 M 210 140 q 4 14 0 30 M 304 140 q -2 14 2 30 M 362 158 q -4 14 0 30';
  return {
    band: BAND,
    art: `
      ${TAILS.map((d) => `<path d="${d}" fill="${PAPER}" stroke="none"/><path d="${d}" fill="${BANDANA}" stroke="none" transform="${WASH}"/>
        <path d="${d}" fill="${BANDANA_DARK}" stroke="none" opacity="0.35" transform="translate(4 6)"/>
        <path d="${d}" fill="none" stroke-width="8"/>`).join('')}
      <g clip-path="url(#headclip)">
        <path d="${BAND}" fill="${PAPER}" stroke="none"/>
        <path d="${BAND}" fill="${BANDANA}" stroke="none" transform="${WASH}"/>
        <path d="M 110 186 Q 256 104 402 186" fill="none" stroke="${BANDANA_LIT}" stroke-width="10" opacity="0.7"/>
        <path d="${BAND}" fill="${BANDANA_DARK}" opacity="0.5" stroke="none" mask="url(#bandshade)"/>
        <path d="${folds}" fill="none" stroke="${BANDANA_DARK}" stroke-width="4" opacity="0.6"/>
        <path d="${BAND}" fill="none" stroke-width="8"/>
      </g>
      <ellipse cx="${knot.x}" cy="${knot.y}" rx="24" ry="20" fill="${BANDANA}" stroke-width="8"/>
      <path d="M ${knot.x - 10} ${knot.y - 8} q 8 6 2 16" fill="none" stroke="${BANDANA_DARK}" stroke-width="4"/>`,
  };
}

/** The face: ears, the head with its white cheeks and brow, the bandit mask, the eyes, the snout. */
function head() {
  const outline = headOutline();
  const HEAD = smooth(outline);
  const ear = [pt(150, 176), pt(126, 120), pt(130, 78), pt(160, 64), pt(196, 84), pt(230, 130)];
  const inner = [pt(162, 156), pt(146, 116), pt(150, 92), pt(166, 84), pt(190, 102), pt(210, 136)];
  const EARS = [smooth(ear), smooth(mirror(ear))];
  const INNER = [smooth(inner), smooth(mirror(inner))];
  const MASK_D = smooth(bilateral([pt(256, 226), pt(234, 214), pt(200, 207), pt(164, 213), pt(136, 236), pt(118, 268), pt(114, 296), pt(138, 292), pt(170, 282), pt(204, 280), pt(230, 266), pt(246, 250)]));
  const MUZZLE = smooth(bilateral([pt(256, 222), pt(244, 236), pt(234, 260), pt(210, 286), pt(198, 314), pt(214, 340), pt(256, 352)]));
  const BROWS = [smooth([pt(160, 196), pt(196, 182), pt(232, 190), pt(222, 202), pt(176, 204)]), smooth(mirror([pt(160, 196), pt(196, 182), pt(232, 190), pt(222, 202), pt(176, 204)]))];
  const CHEEKS = [smooth([pt(120, 270), pt(170, 290), pt(212, 300), pt(206, 344), pt(150, 344), pt(104, 310)]), smooth(mirror([pt(120, 270), pt(170, 290), pt(212, 300), pt(206, 344), pt(150, 344), pt(104, 310)]))];
  const NOSE = smooth([pt(228, 276), pt(256, 270), pt(284, 276), pt(272, 296), pt(256, 304), pt(240, 296)]);
  const eyes = [pt(196, 244), pt(316, 244)].map((c) => `
    <ellipse cx="${c.x}" cy="${c.y}" rx="23" ry="25" fill="${PAPER}" stroke="none"/>
    <circle cx="${c.x + 5}" cy="${c.y + 1}" r="15" fill="#141418" stroke="none"/>
    <circle cx="${c.x - 1}" cy="${c.y - 6}" r="6" fill="#fff" stroke="none"/>
    <circle cx="${c.x + 10}" cy="${c.y + 8}" r="2.6" fill="#fff" stroke="none" opacity="0.8"/>
    <ellipse cx="${c.x}" cy="${c.y}" rx="23" ry="25" fill="none" stroke-width="5"/>`).join('');
  // Fur: short pen strokes along the crown and down the cheeks.
  const fur = [];
  for (let i = 0; i < outline.length; i += 2) {
    const p = outline[i];
    const a = Math.atan2(p.y - 236, p.x - 256);
    if (Math.sin(a) > 0.86) continue;
    const r = 22;
    const s = pt(p.x - Math.cos(a) * r, p.y - Math.sin(a) * r);
    fur.push(`M ${f(s.x)} ${f(s.y)} l ${f(Math.cos(a + 0.5) * 12)} ${f(Math.sin(a + 0.5) * 12)}`);
  }
  return {
    outline: HEAD,
    defs: `<clipPath id="headclip"><path d="${HEAD}"/></clipPath><clipPath id="maskclip"><path d="${MASK_D}" transform="${WASH}"/></clipPath>${crescentMask('headshade', HEAD, 34)}`,
    art: `
      ${EARS.map((d, i) => `<path d="${d}" fill="${PAPER}" stroke="none"/><path d="${d}" fill="${FUR}" stroke="none" transform="${WASH}"/>
        <path d="${INNER[i]}" fill="${FUR_DARK}" stroke="none"/>
        <path d="${INNER[i]}" fill="none" stroke="${FUR_LIGHT}" stroke-width="7" opacity="0.8"/>
        <path d="${d}" fill="none" stroke-width="9"/>`).join('')}
      <path d="${HEAD}" fill="${INK}" stroke="none" opacity="0.22" transform="translate(12 12)"/>
      <path d="${HEAD}" fill="${PAPER}" stroke="none"/>
      <g clip-path="url(#headclip)" stroke="none">
        <path d="${HEAD}" fill="${FUR}" transform="${WASH}"/>
        <circle cx="200" cy="180" r="80" fill="${FUR_LIGHT}" opacity="0.35"/>
        ${CHEEKS.map((d) => `<path d="${d}" fill="${FUR_LIGHT}" transform="${WASH}"/>`).join('')}
        ${BROWS.map((d) => `<path d="${d}" fill="${FUR_LIGHT}"/>`).join('')}
        <path d="M 248 120 L 264 120 L 262 214 L 250 214 Z" fill="${FUR_DARK}" opacity="0.7"/>
        <path d="${MASK_D}" fill="${FUR_DARK}" transform="${WASH}"/>
        <g clip-path="url(#maskclip)">${[196, 316].map((x) => `<ellipse cx="${x}" cy="248" rx="46" ry="38" fill="${MASK}" transform="${WASH}"/>`).join('')}</g>
        <path d="${MUZZLE}" fill="${FUR_LIGHT}" transform="${WASH}"/>
        <path d="${HEAD}" fill="${FUR_DARK}" opacity="0.3" mask="url(#headshade)"/>
        <path d="${hatching(12)}" stroke="${INK}" stroke-width="2.6" fill="none" opacity="0.24" mask="url(#headshade)"/>
        <circle cx="420" cy="350" r="110" fill="url(#pinglow)" opacity="0.55"/>
        <path d="${fur.join(' ')}" fill="none" stroke="${FUR_DARK}" stroke-width="3.2" opacity="0.55" stroke-linecap="round"/>
      </g>
      <path d="${MASK_D}" fill="none" stroke-width="3" opacity="0.45"/>
      <path d="${MUZZLE}" fill="none" stroke-width="5" opacity="0.6"/>
      ${eyes}
      <path d="${NOSE}" fill="#1a1a22" stroke-width="6"/>
      <ellipse cx="246" cy="279" rx="9" ry="5" fill="#fff" stroke="none" opacity="0.6"/>
      <path d="M 210 300 q -36 -6 -62 4 M 212 312 q -34 4 -56 18 M 302 300 q 36 -6 62 4 M 300 312 q 34 4 56 18" fill="none" stroke-width="2.4" opacity="0.6"/>
      <path d="M 256 304 L 256 318 M 226 314 Q 240 332 256 318 Q 272 332 286 314" fill="none" stroke-width="6"/>
      <path d="${HEAD}" fill="none" stroke-width="11"/>`,
  };
}

/**
 * Nib, InkPin's raccoon ruin explorer, head and shoulders against a temple
 * wall: grey fur, the dark bandit mask, the red headband with its tails
 * flying, the olive vest and pack strap, and a golden pin just pulled, held
 * up in one paw, in the game's blue ballpoint and watercolour washes. The
 * brand drop signs the corner, except on the maskable icon, where a circle
 * mask would cut it.
 */
export function inkpinArt({ maskable = false } = {}) {
  const body = shoulders();
  const face = head();
  const band = headband();
  const gold = pin();
  return `
    <defs>
      ${penWobble('pinpen', 5, 29)}
      ${body.defs}
      ${face.defs}
      ${gold.defs}
      ${crescentMask('bandshade', band.band, 12)}
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${GOLD_LIGHT}" stop-opacity="0.75"/>
        <stop offset="1" stop-color="${GOLD_LIGHT}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="pinglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${GOLD_LIGHT}" stop-opacity="0.9"/>
        <stop offset="1" stop-color="${GOLD_LIGHT}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${GOLD_LIGHT}"/>
        <stop offset="0.4" stop-color="${GOLD}"/>
        <stop offset="1" stop-color="${GOLD_DARK}"/>
      </linearGradient>
    </defs>
    <g filter="url(#pinpen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <!-- The wall bleeds past the edges, so the maskable icon's shrunken art still meets them. -->
      ${wall()}
      ${body.art}
      <g transform="rotate(-4 256 350)">
        ${face.art}
        ${band.art}
      </g>
      ${gold.art}
    </g>
    ${maskable ? '' : brandDrop({ cx: 66, top: 22, scale: 0.2, detail: false })}`;
}
