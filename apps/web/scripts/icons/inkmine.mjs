import { PAPER, brandDrop, penWobble } from './paper.mjs';

/** The game's ink and washes (games/inkmine/src/art/palette.ts, skyArt.ts, landerArt.ts). */
const INK = '#1f2a55';
const NIGHT = '#2b3366';
const GROUND = '#9a9790';
const GROUND_DARK = '#6d6a66';
const SEPIA = '#e2cfa6';
const BAND = '#b89766';
const CAN = '#e4dfd1';
const FOIL = '#d8b04c';
const ORE = '#f2e35a';

/**
 * The lander on the grey moon's rim under the ringed giant, in the game's
 * blue ballpoint and washes: the night sky as a wash in the top half, the
 * planet with its rings, the tin-can lander on its spindly legs, and a
 * shaft drilled down to a highlighter-marked vein. The brand drop signs
 * the corner, except on the maskable icon, where a circle mask would cut it.
 */
export function inkmineArt({ maskable = false } = {}) {
  // The ring's two halves, drawn level and turned together: the far half behind the planet, the near half over it.
  const far = 'M 238 150 A 118 28 0 0 1 474 150';
  const near = 'M 474 150 A 118 28 0 0 1 238 150';
  const tilt = 'rotate(-16 356 150)';
  const hatch = [];
  for (let i = 0; i < 26; i++) hatch.push(`M ${-60 + i * 26} 512 l 70 -150`);
  const stars = [[60, 60, 4], [120, 120, 3], [210, 50, 3.5], [250, 170, 2.5], [470, 70, 3], [40, 200, 2.5], [180, 230, 2]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `
    <defs>
      ${penWobble('minepen', 6, 23)}
      <clipPath id="ground"><path d="M -90 330 C 40 300 140 318 256 312 C 360 306 440 296 602 320 L 602 602 L -90 602 Z"/></clipPath>
      <clipPath id="planet"><circle cx="356" cy="150" r="74"/></clipPath>
    </defs>
    <!-- The night wash bleeds past the edges, so the maskable icon's shrunken art still meets them. -->
    <rect x="-90" y="-90" width="692" height="440" fill="${NIGHT}" opacity="0.92"/>
    <g fill="${PAPER}" stroke="none" opacity="0.9">${stars}</g>
    <g filter="url(#minepen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      <g transform="${tilt}"><path d="${far}" fill="none" stroke="${SEPIA}" stroke-width="14" opacity="0.75"/><path d="${far}" fill="none" stroke-width="4" opacity="0.7"/></g>
      <circle cx="356" cy="150" r="74" fill="${SEPIA}" stroke="none"/>
      <g clip-path="url(#planet)" fill="none">
        <path d="M 270 120 C 320 110 380 104 440 112" stroke="${BAND}" stroke-width="14" opacity="0.7"/>
        <path d="M 272 160 C 330 150 390 146 444 152" stroke="${BAND}" stroke-width="10" opacity="0.6"/>
        <path d="M 300 214 L 440 90" stroke="${INK}" stroke-width="60" opacity="0.18"/>
      </g>
      <circle cx="356" cy="150" r="74" fill="none" stroke-width="8"/>
      <g transform="${tilt}"><path d="${near}" fill="none" stroke="${SEPIA}" stroke-width="14"/><path d="${near}" fill="none" stroke-width="5"/></g>

      <path d="M -90 330 C 40 300 140 318 256 312 C 360 306 440 296 602 320 L 602 602 L -90 602 Z" fill="${GROUND}" stroke="none"/>
      <g clip-path="url(#ground)" fill="none">
        <path d="${hatch.join(' ')}" stroke="${GROUND_DARK}" stroke-width="4" opacity="0.5"/>
        <path d="M 330 312 L 330 420 L 380 420 L 380 470" stroke="${PAPER}" stroke-width="30" opacity="0.9"/>
        <path d="M 330 312 L 330 420 L 380 420 L 380 470" stroke="${INK}" stroke-width="4" opacity="0.6"/>
      </g>
      <path d="M 28 318 C 140 318 256 312 256 312 C 360 306 440 296 486 304" fill="none" stroke-width="8"/>
      <path d="M 404 470 C 420 456 446 458 458 472 C 448 488 420 490 404 470 Z" fill="${ORE}" stroke-width="6"/>
      <path d="M 120 400 C 126 392 138 394 140 402 C 134 410 122 410 120 400 Z" fill="${ORE}" stroke-width="5"/>

      <path d="M 142 312 L 112 330 M 230 312 L 258 330 M 160 300 L 150 330 M 214 300 L 222 330" fill="none" stroke-width="7"/>
      <path d="M 128 282 L 244 282 L 236 304 L 136 304 Z" fill="${FOIL}" stroke-width="7"/>
      <path d="M 140 282 L 142 200 C 144 160 230 160 232 200 L 232 282 Z" fill="${CAN}" stroke-width="8"/>
      <circle cx="186" cy="222" r="18" fill="#f5c45a" stroke-width="7"/>
      <path d="M 210 252 L 228 252 L 228 282 L 210 282 Z" fill="${GROUND_DARK}" stroke-width="5"/>
      <path d="M 186 166 L 186 132 M 186 132 L 214 140 L 186 148" fill="none" stroke-width="5"/>
      <path d="M 172 168 C 168 150 156 142 146 146" fill="none" stroke-width="5"/>
      <path d="M 134 140 C 144 132 158 136 160 148 C 150 154 138 152 134 140 Z" fill="#d9dce2" stroke-width="5"/>
    </g>
    ${maskable ? '' : brandDrop({ cx: 70, top: 26, scale: 0.2, detail: false })}`;
}
