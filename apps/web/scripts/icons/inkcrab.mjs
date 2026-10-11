import { PAPER, brandDrop, penWobble } from './paper.mjs';

/** The game's ballpoint ink and washes (games/inkcrab/src/art/palette.ts, crabArt.ts, shellArt.ts). */
const INK = '#26316a';
const SHELL = '#e0b85e';
const BAND = '#5a3a20';
const CRAB = '#d27a3a';
const CRAB_TIP = '#7a3a1a';
const SAND = '#ecdcb0';

const f = (n) => n.toFixed(1);

/** A spiral from the shell's apex outwards: `turns` whorls growing from `r0` to `r1`, squashed by `squash` vertically. */
function spiral({ cx, cy, r0, r1, turns, start, squash = 0.9 }) {
  const pts = [];
  const end = turns * Math.PI * 2;
  for (let t = 0; t <= end; t += 0.08) {
    const r = r0 + ((r1 - r0) * t) / end;
    pts.push([cx + r * Math.cos(t + start), cy + r * Math.sin(t + start) * squash]);
  }
  return `M ${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ')}`;
}

/** A limb: a thick ink stroke with the crab's colour laid inside it, so it reads as an outlined tube. */
function limb(d, width = 18) {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + 9}"/>
    <path d="${d}" fill="none" stroke="${CRAB}" stroke-width="${width}"/>`;
}

const SHELL_BODY =
  'M 96 292 C 70 214 112 118 214 102 C 314 88 384 160 378 246 C 374 300 346 334 300 346 C 222 366 124 360 96 292 Z';
const APERTURE = 'M 270 262 C 300 238 352 246 368 278 C 382 310 352 350 312 352 C 276 354 252 318 270 262 Z';
const CLAW =
  'M 330 330 C 340 300 378 286 412 296 C 436 302 456 318 462 334 C 446 330 428 332 418 340 C 436 344 452 356 456 372 ' +
  'C 426 384 380 382 352 368 C 334 360 324 346 330 330 Z';

/**
 * A hermit crab peeping out of its snail shell on the sand, claw raised,
 * in the game's blue ballpoint and watercolour washes. The brand drop signs
 * the corner, except on the maskable icon, where a circle mask would cut it.
 */
export function inkcrabArt({ maskable = false } = {}) {
  const wash = 'translate(-6 5)';
  const whorls = spiral({ cx: 214, cy: 214, r0: 6, r1: 118, turns: 2.6, start: -0.6 });
  // Shading under the shell: hatching across its lower half.
  const hatch = [];
  for (let i = 0; i < 22; i++) hatch.push(`M ${70 + i * 16} 372 l 70 -90`);
  const grains = [[70, 446, 4], [120, 462, 3], [178, 450, 3.5], [262, 470, 3], [330, 452, 4], [402, 466, 3], [446, 448, 3.5]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');

  return `
    <defs>
      ${penWobble('crabpen', 6, 17)}
      <clipPath id="shell"><path d="${SHELL_BODY}"/></clipPath>
      <clipPath id="shade"><ellipse cx="236" cy="372" rx="190" ry="96"/></clipPath>
    </defs>
    <g filter="url(#crabpen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <!-- The wash bleeds past the edges, so the maskable icon's shrunken art still meets them. -->
      <path d="M -90 424 C 0 414 60 420 120 412 C 196 428 272 416 272 416 C 352 404 420 426 486 414 C 540 406 580 414 602 410 L 602 602 L -90 602 Z" fill="${SAND}" stroke="none"/>
      <path d="M 28 420 C 120 404 196 428 272 416 C 352 404 420 426 486 414" fill="none" stroke-width="7"/>
      <g fill="${INK}" stroke="none" opacity="0.55">${grains}</g>

      ${limb('M 300 340 L 330 380 L 316 420', 16)}
      ${limb('M 280 344 L 292 388 L 268 422', 16)}
      ${limb('M 326 330 L 372 366 L 372 414', 16)}

      <path d="${SHELL_BODY}" fill="${PAPER}" stroke="none"/>
      <path d="${SHELL_BODY}" fill="${SHELL}" stroke="none" transform="${wash}"/>
      <g clip-path="url(#shell)" fill="none">
        <path d="${whorls}" stroke="${BAND}" stroke-width="20" opacity="0.35" transform="translate(0 12)"/>
        <g clip-path="url(#shade)"><path d="${hatch.join(' ')}" stroke="${BAND}" stroke-width="4" opacity="0.55"/></g>
        <path d="M 150 150 q 50 -40 120 -30" stroke="${PAPER}" stroke-width="11" opacity="0.75"/>
      </g>
      <path d="${whorls}" fill="none" stroke-width="7"/>
      <path d="${SHELL_BODY}" fill="none" stroke-width="11"/>

      <path d="${APERTURE}" fill="${BAND}" fill-opacity="0.85" stroke-width="9"/>

      <path d="M 318 268 C 322 238 330 214 340 196" fill="none" stroke-width="8"/>
      <path d="M 334 270 C 346 244 362 226 380 212" fill="none" stroke-width="8"/>
      <path d="M 348 286 C 392 266 430 230 448 186" fill="none" stroke-width="4"/>
      <path d="M 352 296 C 404 288 448 266 474 236" fill="none" stroke-width="4"/>
      <circle cx="340" cy="190" r="15" fill="${INK}" stroke="none"/>
      <circle cx="382" cy="206" r="15" fill="${INK}" stroke="none"/>
      <circle cx="345" cy="184" r="5" fill="${PAPER}" stroke="none"/>
      <circle cx="387" cy="200" r="5" fill="${PAPER}" stroke="none"/>

      <path d="M 300 300 C 312 280 340 276 356 292 C 366 306 352 330 330 332 C 310 334 294 318 300 300 Z" fill="${CRAB}" stroke-width="8"/>
      <path d="${CLAW}" fill="${CRAB}" stroke="none" transform="${wash}"/>
      <path d="${CLAW}" fill="none" stroke-width="10"/>
      <path d="M 432 300 C 446 306 458 320 462 334 M 446 360 C 452 364 456 368 456 372" fill="none" stroke="${CRAB_TIP}" stroke-width="12"/>
      <g fill="${INK}" stroke="none" opacity="0.7">
        <circle cx="370" cy="318" r="4"/><circle cx="392" cy="312" r="4"/><circle cx="384" cy="336" r="4"/><circle cx="406" cy="330" r="3.5"/>
      </g>
    </g>
    ${maskable ? '' : brandDrop({ cx: 70, top: 26, scale: 0.2, detail: false })}`;
}
