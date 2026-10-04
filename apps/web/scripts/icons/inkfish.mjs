import { BLUE, BLUE_INK, PAPER, brandDrop, penWobble } from './paper.mjs';

const WASH_DEEP = '#2a4d9e';
const FIN = '#7fa3e0';

const BODY =
  'M 414 258 C 412 192 340 142 262 144 C 206 146 172 184 152 230 C 147 248 147 268 152 286 ' +
  'C 172 330 208 366 266 368 C 342 370 414 326 414 258 Z';
const TAIL = 'M 160 236 C 128 194 92 166 64 172 C 48 212 46 304 62 344 C 90 350 128 322 160 282 Z';
const DORSAL = 'M 206 164 C 214 118 250 90 296 94 C 312 110 320 132 322 150 C 290 142 246 146 206 164 Z';
const ANAL = 'M 204 344 C 196 370 204 394 222 404 C 238 390 252 372 254 362 C 236 360 218 354 204 344 Z';
const PECTORAL = 'M 300 270 C 280 274 254 290 240 310 C 266 316 290 304 302 290 Z';

/** Lines fanning across a fin, from `from` to each of `targets`. */
function rays(from, targets) {
  return targets.map(([x, y]) => `M ${from[0]} ${from[1]} L ${x} ${y}`).join(' ');
}

/** A fin: pale wash slightly off-register, ink rays, then the outline. */
function fin(shape, rayPaths, washShift, width = 10) {
  return `<path d="${shape}" fill="${FIN}" stroke="none" transform="${washShift}"/>
    <path d="${rayPaths}" fill="none" stroke-width="4" opacity="0.65"/>
    <path d="${shape}" fill="none" stroke-width="${width}"/>`;
}

/**
 * The player fish of Inkfish, swimming right, bubbles rising from its mouth.
 * The brand drop signs the corner, except on the maskable icon, where a circle mask would cut it.
 */
export function inkfishArt({ maskable = false } = {}) {
  // The wash sits a few pixels off the outline, like a print slightly out of register.
  const washShift = 'translate(-6 5)';

  // Scales as a loose diamond net over the middle of the body.
  const net = [];
  for (let i = -4; i < 9; i++) {
    net.push(`M ${170 + i * 30} 150 l 150 220`);
    net.push(`M ${170 + i * 30} 370 l 150 -220`);
  }
  // Belly shading: hatching along the underside.
  const belly = [];
  for (let i = 0; i < 18; i++) belly.push(`M ${160 + i * 15} 374 l 60 -70`);

  return `
    <defs>
      ${penWobble('fishpen', 6, 11)}
      <clipPath id="body"><path d="${BODY}"/></clipPath>
      <clipPath id="belly"><ellipse cx="290" cy="392" rx="176" ry="100"/></clipPath>
      <clipPath id="flank"><ellipse cx="238" cy="252" rx="74" ry="78"/></clipPath>
    </defs>
    <g filter="url(#fishpen)" stroke="${BLUE_INK}" stroke-linejoin="round" stroke-linecap="round">
      ${fin(TAIL, rays([152, 259], [[76, 184], [64, 220], [58, 258], [62, 298], [74, 336]]), washShift)}
      ${fin(DORSAL, rays([262, 148], [[226, 130], [254, 104], [286, 98], [310, 122]]), washShift)}
      ${fin(ANAL, rays([226, 356], [[210, 384], [224, 396], [240, 380]]), washShift, 8)}

      <path d="${BODY}" fill="${PAPER}" stroke="none"/>
      <path d="${BODY}" fill="${BLUE}" stroke="none" transform="${washShift}"/>
      <g clip-path="url(#body)" fill="none">
        <g clip-path="url(#flank)"><path d="${net.join(' ')}" stroke="${BLUE_INK}" stroke-width="3.5" opacity="0.5"/></g>
        <g clip-path="url(#belly)"><path d="${belly.join(' ')}" stroke="${WASH_DEEP}" stroke-width="5"/></g>
        <path d="M 226 180 q 56 -26 118 -6" stroke="${PAPER}" stroke-width="10" opacity="0.7"/>
      </g>
      <path d="M 316 164 C 298 208 298 300 320 350" fill="none" stroke-width="6"/>
      <path d="${BODY}" fill="none" stroke-width="11"/>

      <path d="${PECTORAL}" fill="${FIN}" fill-opacity="0.85" stroke-width="6"/>
      <path d="M 298 278 L 262 300 M 300 286 L 272 306" fill="none" stroke-width="3" opacity="0.6"/>

      <circle cx="356" cy="224" r="35" fill="${PAPER}" stroke-width="8"/>
      <circle cx="367" cy="226" r="18" fill="${BLUE_INK}" stroke="none"/>
      <circle cx="373" cy="218" r="6.5" fill="${PAPER}" stroke="none"/>
      <path d="M 414 262 C 404 262 394 270 392 282" fill="none" stroke-width="7"/>

      <circle cx="442" cy="240" r="13" fill="${PAPER}" stroke-width="6"/>
      <circle cx="462" cy="194" r="8" fill="${PAPER}" stroke-width="5"/>
    </g>
    ${maskable ? '' : brandDrop({ cx: 450, top: 392, scale: 0.2, detail: false })}`;
}
