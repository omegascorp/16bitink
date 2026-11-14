/**
 * The pickups' own art (PixelLab, top-down, 64 px): intel blueprints, the
 * repair kit and the salvage prototype. The mission scene draws them in the
 * world, and the HUD reuses the kit for its kit slots.
 */
const urls = import.meta.glob<string>('../art/pixel/world/pickups/*.png', { eager: true, query: '?url', import: 'default' });

export type PickupArt = 'intel' | 'kit' | 'proto';

export const pickupKey = (name: PickupArt): string => `pickup:${name}`;

export function pickupUrl(name: PickupArt): string | null {
  return Object.entries(urls).find(([p]) => p.endsWith(`/${name}.png`))?.[1] ?? null;
}

export function preloadPickups(scene: Phaser.Scene): void {
  for (const name of ['intel', 'kit', 'proto'] as const) {
    const url = pickupUrl(name);
    if (url) scene.load.image(pickupKey(name), url);
  }
}
