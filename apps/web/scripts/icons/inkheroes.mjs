import { brandDrop, penWobble } from './paper.mjs';

/** The Crown's heraldry and the campaign journal's ink (games/inkheroes/src/art/palette.ts, sites/build.ts). */
const INK = '#232a4f';
const BLUE = '#2f55a8';
const BLUE_DEEP = '#1f3a7a';
const GOLD = '#c99a2e';
const GOLD_LIGHT = '#e8c45a';
const STEEL = '#c9ced8';
const STEEL_DARK = '#7d8494';
const LEATHER = '#7a5534';
const RUBY = '#a9302a';

const f = (n) => n.toFixed(1);

/** The sword's line, pommel to tip, behind the shield. */
const POMMEL = { x: 104, y: 470 };
const GUARD = { x: 150, y: 414 };
const TIP = { x: 424, y: 84 };

/** Unit vector along the sword and across it. */
const len = Math.hypot(TIP.x - GUARD.x, TIP.y - GUARD.y);
const along = { x: (TIP.x - GUARD.x) / len, y: (TIP.y - GUARD.y) / len };
const across = { x: -along.y, y: along.x };
const at = (p, a, c) => `${f(p.x + along.x * a + across.x * c)} ${f(p.y + along.y * a + across.y * c)}`;

function sword() {
  const blade = `M ${at(GUARD, 0, -15)} L ${at(GUARD, len - 40, -11)} L ${at(TIP, 0, 0)} L ${at(GUARD, len - 40, 11)} L ${at(GUARD, 0, 15)} Z`;
  const fuller = `M ${at(GUARD, 14, 0)} L ${at(GUARD, len - 70, 0)}`;
  const guard = `M ${at(GUARD, -6, -52)} L ${at(GUARD, 6, -52)} L ${at(GUARD, 6, 52)} L ${at(GUARD, -6, 52)} Z`;
  const gripLen = Math.hypot(GUARD.x - POMMEL.x, GUARD.y - POMMEL.y);
  const grip = `M ${at(GUARD, -6, -10)} L ${at(GUARD, -gripLen + 10, -9)} L ${at(GUARD, -gripLen + 10, 9)} L ${at(GUARD, -6, 10)} Z`;
  const wraps = Array.from({ length: 4 }, (_, i) => `M ${at(GUARD, -16 - i * 12, -10)} L ${at(GUARD, -22 - i * 12, 10)}`).join(' ');
  return `
    <path d="${blade}" fill="${STEEL}" stroke-width="7"/>
    <path d="${fuller}" fill="none" stroke="${STEEL_DARK}" stroke-width="5" opacity="0.8"/>
    <path d="${grip}" fill="${LEATHER}" stroke-width="6"/>
    <path d="${wraps}" fill="none" stroke="${INK}" stroke-width="3" opacity="0.6"/>
    <path d="${guard}" fill="${GOLD}" stroke-width="6"/>
    <circle cx="${f(POMMEL.x)}" cy="${f(POMMEL.y)}" r="17" fill="${GOLD}" stroke-width="6"/>`;
}

const SHIELD = 'M 146 120 C 210 104 302 104 366 120 L 366 268 C 366 350 318 404 256 446 C 194 404 146 350 146 268 Z';

function crown() {
  const body = 'M 192 296 L 180 214 L 222 254 L 256 192 L 290 254 L 332 214 L 320 296 Z';
  const band = 'M 188 292 L 324 292 L 322 326 L 190 326 Z';
  return `
    <path d="${body}" fill="${GOLD_LIGHT}" stroke-width="7"/>
    <path d="M 256 200 L 240 290 M 216 262 L 210 290 M 296 262 L 302 290" fill="none" stroke="${GOLD}" stroke-width="8" opacity="0.8"/>
    <path d="${band}" fill="${GOLD}" stroke-width="7"/>
    <circle cx="180" cy="208" r="11" fill="${GOLD_LIGHT}" stroke-width="6"/>
    <circle cx="256" cy="186" r="12" fill="${GOLD_LIGHT}" stroke-width="6"/>
    <circle cx="332" cy="208" r="11" fill="${GOLD_LIGHT}" stroke-width="6"/>
    <circle cx="224" cy="309" r="8" fill="${RUBY}" stroke-width="4"/>
    <circle cx="256" cy="309" r="9" fill="${BLUE}" stroke-width="4"/>
    <circle cx="288" cy="309" r="8" fill="${RUBY}" stroke-width="4"/>`;
}

/**
 * InkHeroes: the Crown's blue shield with its gold crown, over a knight's
 * sword, in the town's ink and washes. Light from the upper left.
 */
export function inkheroesArt({ maskable = false } = {}) {
  const hatch = Array.from({ length: 16 }, (_, i) => `M ${270 + i * 14} 100 l -60 360`).join(' ');
  return `
    <defs>
      ${penWobble('heroespen', 5, 31)}
      <clipPath id="shield"><path d="${SHIELD}"/></clipPath>
    </defs>
    <ellipse cx="262" cy="458" rx="150" ry="18" fill="${INK}" opacity="0.12"/>
    <g filter="url(#heroespen)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
      ${sword()}
      <path d="${SHIELD}" fill="${BLUE}" stroke="none"/>
      <g clip-path="url(#shield)" stroke="none">
        <rect x="140" y="100" width="116" height="360" fill="#ffffff" opacity="0.13"/>
        <path d="${hatch}" fill="none" stroke="${BLUE_DEEP}" stroke-width="5" opacity="0.45"/>
        <path d="M 160 136 C 214 124 250 122 280 124" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.35"/>
      </g>
      <path d="${SHIELD}" fill="none" stroke="${GOLD}" stroke-width="22"/>
      <path d="${SHIELD}" fill="none" stroke-width="8"/>
      <path d="M 162 136 C 216 122 296 122 350 136 L 350 268 C 350 340 308 388 256 424 C 204 388 162 340 162 268 Z" fill="none" stroke-width="4" opacity="0.7"/>
      ${crown()}
    </g>
    ${maskable ? '' : brandDrop({ cx: 70, top: 26, scale: 0.2, detail: false })}`;
}
