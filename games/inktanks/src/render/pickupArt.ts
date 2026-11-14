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
  preloadBlueprints(scene);
}

/** One blueprint icon per part family (bp-<family>.png); a family without one falls back to the generic sheet. */
export const bpKey = (family: string): string => `pickup:bp-${family}`;

export function bpUrl(family: string): string | null {
  return Object.entries(urls).find(([p]) => p.endsWith(`/bp-${family}.png`))?.[1] ?? pickupUrl('intel');
}

/** Loads every bp-*.png in the pickups folder. */
export function preloadBlueprints(scene: Phaser.Scene): void {
  for (const path of Object.keys(urls)) {
    const m = /\/bp-([a-z]+)\.png$/.exec(path);
    if (m) scene.load.image(bpKey(m[1]!), urls[path]!);
  }
}

/** The texture key for a blueprint pickup's family, or the generic one. */
export const bpTexture = (scene: Phaser.Scene, family: string | undefined): string => (family && scene.textures.exists(bpKey(family)) ? bpKey(family) : pickupKey('intel'));
