import { isDrivable, regionCentre, type OpenLand } from '../../logic/land';
import type { Pt } from '../../logic/vec';
import { regionRects, type LandMap } from './landMap';

/**
 * The drop map: the open land as a painted map. A new region shows where it
 * opened: the map starts close on it under paper, the paper lifts, the map
 * pulls back to the whole land, then you tap where to land.
 * `auto` skips waiting for the tap (screenshots, the stress page).
 */
const UNVEIL_MS = 1400;
const PULL_MS = 900;

export function runDropMap(root: HTMLElement, land: OpenLand, lm: LandMap, title: string, auto: Pt | null): Promise<Pt> {
  const map = lm.canvas;
  root.innerHTML = `<div class="dropmap"><div class="frame"><canvas></canvas><div class="pin"></div></div><div class="caption"><b></b><span></span></div></div>`;
  const wrap = root.querySelector('.dropmap') as HTMLElement;
  const frame = root.querySelector('.frame') as HTMLElement;
  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const pin = root.querySelector('.pin') as HTMLElement;
  (root.querySelector('.caption b') as HTMLElement).textContent = title;
  const hint = root.querySelector('.caption span') as HTMLElement;
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext('2d')!;
  const fit = Math.min((innerWidth * 0.92) / map.width, (innerHeight * 0.8) / map.height);
  canvas.style.width = `${map.width * fit}px`;
  canvas.style.height = `${map.height * fit}px`;
  const region = land.region;
  const rects = region ? regionRects(region, lm) : [];
  const mid = { x: lm.x0 + lm.w / 2, y: lm.y0 + lm.h / 2 };
  const focus = region ? regionCentre(region) : mid;
  const zoom = region ? Math.min(2.5, Math.max(1, (land.area / region.cells.length) ** 0.5)) : 1;
  const draw = (paper: number): void => {
    ctx.drawImage(map, 0, 0);
    if (paper <= 0) return;
    ctx.fillStyle = `rgba(217, 204, 170, ${paper})`;
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w + 1, r.h + 1);
  };
  const setView = (z: number, at: Pt): void => {
    const dx = (map.width / 2 - (at.x - lm.x0) * lm.scale) * fit * z;
    const dy = (map.height / 2 - (at.y - lm.y0) * lm.scale) * fit * z;
    frame.style.transform = `translate(${dx}px, ${dy}px) scale(${z})`;
  };
  return new Promise((resolve) => {
    const t0 = performance.now();
    hint.textContent = region ? `New ground: ${region.name}` : '';
    const tick = (): void => {
      const t = performance.now() - t0;
      const lift = Math.min(1, t / UNVEIL_MS);
      draw(1 - lift);
      const pull = Math.min(1, Math.max(0, (t - UNVEIL_MS) / PULL_MS));
      const e = pull * pull * (3 - 2 * pull);
      setView(zoom + (1 - zoom) * e, { x: focus.x + (mid.x - focus.x) * e, y: focus.y + (mid.y - focus.y) * e });
      if (pull < 1) requestAnimationFrame(tick);
      else ready();
    };
    const ready = (): void => {
      hint.textContent = 'Tap where to land';
      if (auto) return finish(auto);
      canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        const p = { x: lm.x0 + ((e.clientX - r.left) / r.width) * lm.w, y: lm.y0 + ((e.clientY - r.top) / r.height) * lm.h };
        if (!isDrivable(land, p.x, p.y)) {
          hint.textContent = 'Pick open, dry ground';
          return;
        }
        pin.style.left = `${e.clientX - r.left}px`;
        pin.style.top = `${e.clientY - r.top}px`;
        pin.style.display = 'block';
        setTimeout(() => finish(p), 350);
      });
    };
    const finish = (p: Pt): void => {
      wrap.classList.add('gone');
      setTimeout(() => {
        root.innerHTML = '';
        resolve(p);
      }, 300);
    };
    requestAnimationFrame(tick);
  });
}
