/** Shared pieces of every 16bit.ink icon: paper, ink colours, the pen wobble and the brand drop. */

export const PAPER = '#f4eddc';
export const INK = '#1b1a1f';
export const BLUE = '#3466c2';
export const BLUE_INK = '#1f3f8a';

/** Icons are drawn on a 512 canvas; the script scales them down. */
export const SIZE = 512;

/** Full-bleed paper with a faint grain, so the tile reads as a sheet, not a flat colour. */
export function paper({ grain = true } = {}) {
  const filter = grain
    ? `<filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
        <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.09 0"/>
      </filter>`
    : '';
  return `<defs>${filter}</defs>
    <rect width="${SIZE}" height="${SIZE}" fill="${PAPER}"/>
    ${grain ? `<rect width="${SIZE}" height="${SIZE}" filter="url(#grain)"/>` : ''}`;
}

/**
 * A filter that nudges everything inside it a few pixels off true, so ruler-straight
 * vector lines wobble like a pen held by hand. Reference it as `filter="url(#<id>)"`.
 */
export function penWobble(id = 'pen', strength = 5, seed = 3) {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${strength}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;
}

/**
 * Half-width of the brand drop at height `y`, for a drop whose tip is at `top`
 * and whose round bulb has radius `r` centred at `cy`.
 */
function dropHalfWidth(y, top, cy, r) {
  if (y <= top || y >= cy + r) return 0;
  if (y >= cy) return Math.sqrt(r * r - (y - cy) ** 2);
  // Shoulders swell from a sharp tip into the bulb.
  const t = (y - top) / (cy - top);
  return r * Math.sin((t * Math.PI) / 2) ** 1.6;
}

const ROWS = 14;

/**
 * The 16bit.ink mark: an ink drop, chunky pixels on the left and a smooth
 * pen-drawn curve with hatching on the right ("16bit" meets "ink").
 * The drop is ~280 × 384 at scale 1, its tip at (`cx`, `top`).
 * `detail: false` drops the hatching, seams and splatter for tiny sizes.
 */
export function brandDrop({ cx = 256, top = 64, scale = 1, detail = true } = {}) {
  const r = 140 * scale;
  const cy = top + 244 * scale;
  const bottom = cy + r;
  const cell = (bottom - top) / ROWS;
  const id = `drop${Math.round(cx)}x${Math.round(top)}`;
  const f = (n) => n.toFixed(1);

  // Smooth right half, traced as a polyline fine enough to look curved.
  const right = [];
  for (let y = top; y <= bottom; y += 2 * scale) right.push([cx + dropHalfWidth(y, top, cy, r), y]);
  right.push([cx, bottom]);
  const trace = `M ${cx} ${top} ${right.map(([x, y]) => `L ${f(x)} ${f(y)}`).join(' ')}`;
  const rightPath = `${trace} Z`;

  // Left half as pixels: each row as wide as the drop at its middle, snapped to the grid.
  const pixels = [];
  for (let i = 0; i < ROWS; i++) {
    const y = top + i * cell;
    const n = Math.max(1, Math.round(dropHalfWidth(y + cell / 2, top, cy, r) / cell));
    pixels.push(`<rect x="${f(cx - n * cell)}" y="${f(y)}" width="${f(n * cell + 1)}" height="${f(cell + 0.6)}"/>`);
  }

  const sw = Math.max(1.5, 11 * scale);
  const detailArt = detail ? dropDetail({ cx, top, cy, r, bottom, cell, id, scale }) : { under: '', over: '', defs: '' };

  return `
    <defs>
      <clipPath id="${id}-l">${pixels.join('')}</clipPath>
      <clipPath id="${id}-r"><path d="${rightPath}"/></clipPath>
      ${penWobble(`${id}-pen`, 6 * scale)}
      ${detailArt.defs}
    </defs>
    <g fill="${INK}">${pixels.join('')}</g>
    ${detailArt.under}
    <g filter="url(#${id}-pen)">
      <path d="${rightPath}" fill="${BLUE}" transform="translate(${3 * scale} ${4 * scale})"/>
      ${detailArt.over}
      <path d="${trace}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>
    </g>`;
}

/** Hatching, pixel seams, a shine and splatter for the brand drop at full size. */
function dropDetail({ cx, top, cy, r, bottom, cell, id, scale }) {
  const hatch = [];
  for (let i = -8; i < 14; i++) hatch.push(`M ${cx + i * 15 * scale} ${bottom + 10} l ${170 * scale} ${-170 * scale}`);
  const seams = [];
  for (let x = cx - cell; x > cx - r - cell; x -= cell) seams.push(`M ${x} ${top} V ${bottom}`);
  for (let y = top + cell; y < bottom; y += cell) seams.push(`M ${cx - r - cell} ${y} H ${cx}`);

  // Pixels breaking off the left side, ink drops flicked off the right.
  const dust = [
    [cx - r - 1.9 * cell, cy - 0.6 * cell, 0.7],
    [cx - r - 1.2 * cell, cy + 2.6 * cell, 0.55],
    [cx - r * 0.75 - 1.4 * cell, top + 3.4 * cell, 0.45],
  ].map(([x, y, s]) => `<rect x="${x}" y="${y}" width="${cell * s}" height="${cell * s}"/>`);
  const drops = [
    [cx + r + 34 * scale, cy - 70 * scale, 15 * scale],
    [cx + r + 18 * scale, cy + 96 * scale, 9 * scale],
    [cx + r * 0.62 + 30 * scale, top + 40 * scale, 7 * scale],
  ].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`);

  return {
    defs: `<clipPath id="${id}-shade"><circle cx="${cx + r * 0.3}" cy="${cy + r * 0.34}" r="${r * 0.92}"/></clipPath>`,
    under: `<g stroke="${PAPER}" stroke-width="${2.4 * scale}" opacity="0.5" clip-path="url(#${id}-l)"><path d="${seams.join(' ')}"/></g>
      <g fill="${INK}">${dust.join('')}</g>`,
    over: `<g clip-path="url(#${id}-r)"><g clip-path="url(#${id}-shade)"><path d="${hatch.join(' ')}" stroke="${BLUE_INK}" stroke-width="${4 * scale}" stroke-linecap="round" opacity="0.8"/></g></g>
      <path d="M ${cx + r * 0.5} ${cy - r * 0.55} q ${r * 0.28} ${r * 0.2} ${r * 0.34} ${r * 0.56}" fill="none" stroke="${PAPER}" stroke-width="${13 * scale}" stroke-linecap="round" opacity="0.9"/>
      <g fill="${INK}">${drops.join('')}</g>`,
  };
}
