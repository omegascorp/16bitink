import Phaser from 'phaser';

/** Device px per native px: the native view stays about 540 px tall (density C), 2 on a 1080p screen. */
export function gameSize(): { width: number; height: number; zoom: number } {
  const dpr = devicePixelRatio || 1;
  const scale = Math.max(1, Math.round((innerHeight * dpr) / 540));
  return { width: Math.ceil((innerWidth * dpr) / scale), height: Math.ceil((innerHeight * dpr) / scale), zoom: scale / dpr };
}

export function makeGame(parent: HTMLElement, scene: Phaser.Scene): Phaser.Game {
  const s = gameSize();
  return new Phaser.Game({
    type: Phaser.WEBGL, parent, width: s.width, height: s.height, backgroundColor: '#1b1a16', pixelArt: true, roundPixels: true, antialias: false,
    scale: { mode: Phaser.Scale.NONE, zoom: s.zoom }, audio: { noAudio: true }, banner: false, scene: [scene],
  });
}

export const query = new URLSearchParams(location.search);
export const qnum = (k: string, d: number): number => (query.has(k) && Number.isFinite(Number(query.get(k))) ? Number(query.get(k)) : d);
export function setReady(): void {
  (window as unknown as { __ready: boolean }).__ready = true;
}
