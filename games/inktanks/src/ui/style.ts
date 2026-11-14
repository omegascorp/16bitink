import arkPixelUrl from '../art/pixel/ui/ark-pixel-12.woff2?url';
import { HUD_CSS } from './hudCss';
import { SCREENS_CSS } from './screensCss';

/**
 * The UI font is Ark Pixel 12 (OFL, src/art/pixel/ui/ark-pixel-OFL.txt), as
 * InkHeroes' pixel UI, used at whole multiples of 12 px so its strokes land
 * on pixels. Styles go in one <style> per document.
 */
export const UI_FONT = 'ArkPixel12';
const STYLE_ID = 'inktanks-style';

export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = HUD_CSS + SCREENS_CSS;
  doc.head.appendChild(s);
}

let fontReady: Promise<void> | null = null;

/** Loads the font once. Never rejects: text falls back to monospace if it can't load. */
export function loadUiFont(): Promise<void> {
  fontReady ??= (async () => {
    try {
      const face = new FontFace(UI_FONT, `url(${arkPixelUrl}) format('woff2')`);
      await face.load();
      document.fonts.add(face);
    } catch (e) {
      console.warn('[inktanks] the pixel font did not load', e);
    }
  })();
  return fontReady;
}
