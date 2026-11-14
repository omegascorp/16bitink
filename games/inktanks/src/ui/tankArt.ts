import type { HullFamily, Loadout, Part } from '../logic/parts';
import { partsArt } from '../render/partsArt';

/**
 * A still picture of a tank for the briefing and the workshop: drive, hull
 * and turret from the parts art (facing north, turret on its ring), drawn
 * into a 128 × 128 canvas shown pixelated at a whole scale. The images
 * load once and are shared.
 */
const images = new Map<string, Promise<HTMLImageElement | null>>();

function image(key: string): Promise<HTMLImageElement | null> {
  let p = images.get(key);
  if (!p) {
    const url = partsArt().urls.get(key);
    p = url
      ? new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        })
      : Promise.resolve(null);
    images.set(key, p);
  }
  return p;
}

/** A canvas showing the tank; drawn as soon as its parts' images are in. */
export function tankCanvas(l: Loadout, scale: number): HTMLCanvasElement {
  const art = partsArt();
  const size = art.size;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  c.className = 'tankpic';
  c.style.width = `${size * scale}px`;
  c.style.height = `${size * scale}px`;
  const hullKey = art.hull(l.hull);
  const driveKey = art.frames(art.drive(l.drive, l.hull.family as HullFamily))[0]!;
  const turretKey = art.turret(l.gun);
  const [rx, ry] = art.ring(hullKey);
  void Promise.all([image(driveKey), image(hullKey), image(turretKey)]).then(([d, h, t]) => {
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const put = (img: HTMLImageElement | null, x: number, y: number): void => {
      if (img) g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    };
    // A soft shadow under the tank, to sit it on the panel.
    g.fillStyle = 'rgba(0, 0, 0, 0.28)';
    g.fillRect(size * 0.22 + 4, size * 0.18 - 3, size * 0.56, size * 0.66);
    put(d, size / 2, size / 2);
    put(h, size / 2, size / 2);
    put(t, size / 2 + rx, size / 2 + ry);
  });
  return c;
}

/** A part's icon as HTML (the art's icon, or its family's first letters). */
export function partIcon(p: Part): string {
  const url = partsArt().icon(p);
  const tier = 'I'.repeat(p.mk);
  return `<span class="ic">${url ? `<img src="${url}" alt="">` : p.family.slice(0, 3)}<em>${tier}</em></span>`;
}
