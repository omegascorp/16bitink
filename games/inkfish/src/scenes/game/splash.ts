import Phaser from 'phaser';

const INK = 0x1b1a1f;
const WATER = 0x2c4f86;
const SPLASH_MS = 650;
const GRAVITY = 900;

/**
 * An ink splash where something breaks the surface: a crown of droplets
 * thrown up and falling back, and ripples spreading along the water line.
 * Bigger fish, bigger splash.
 */
export function splash(scene: Phaser.Scene, x: number, y: number, size: number, rng: () => number): void {
  const g = scene.add.graphics().setDepth(19);
  const scale = Math.max(0.6, size / 40);
  const drops = Array.from({ length: 9 + Math.round(scale * 4) }, () => {
    const angle = -Math.PI / 2 + (rng() - 0.5) * 2.1;
    const speed = (180 + rng() * 260) * Math.sqrt(scale);
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: (1.2 + rng() * 2.2) * Math.sqrt(scale), dx: (rng() - 0.5) * size };
  });
  scene.tweens.addCounter({
    from: 0, to: 1, duration: SPLASH_MS,
    onUpdate: (tw) => {
      const u = tw.getValue() ?? 0;
      const t = (u * SPLASH_MS) / 1000;
      const fade = 1 - u;
      g.clear();
      for (const d of drops) {
        const dy = d.vy * t + (GRAVITY * t * t) / 2;
        // Droplets disappear back into the water.
        if (dy > 4) continue;
        g.fillStyle(WATER, 0.55 * fade).fillCircle(x + d.dx + d.vx * t, y + dy, d.r);
        g.lineStyle(0.8, INK, 0.7 * fade).strokeCircle(x + d.dx + d.vx * t, y + dy, d.r);
      }
      // Ripples: flat rings widening on the surface, seen from the side.
      for (let i = 0; i < 2; i++) {
        const w = (size * 0.8 + u * 90 * scale) * (1 + i * 0.6);
        g.lineStyle(1.2, INK, 0.6 * fade * (1 - i * 0.4)).strokeEllipse(x, y + 2, w * 2, w * 0.22);
      }
    },
    onComplete: () => g.destroy(),
  });
}
