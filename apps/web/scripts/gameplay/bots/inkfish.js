// InkFish autopilot: hunt the nearest smaller fish, swerve away from bigger ones.
window.__bot = (() => {
  const EDIBLE = 0.9;
  const DANGER = 1.1;
  const scene = () => window.__game?.scene?.getScene('Game');
  let wanderAngle = 0;

  /** World point -> page (CSS) point, through the camera and the canvas scaling. */
  function toPage(s, wx, wy) {
    const cam = s.cameras.main;
    const gx = (wx - cam.worldView.x) * cam.zoom + cam.x;
    const gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    const canvas = s.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (gx * rect.width) / s.scale.width, y: rect.top + (gy * rect.height) / s.scale.height };
  }

  return {
    ready() {
      const s = scene();
      return Boolean(s && s.sys.isActive() && s.player?.sprite && Array.isArray(s.fish) && s.fish.length > 0);
    },
    /** Jumps to a level (0-based across every chapter). */
    start(levelIndex) {
      scene().scene.restart({ levelIndex });
    },
    /** Where the player is on the page, for the crop to follow. */
    focus() {
      const s = scene();
      if (!s?.player?.sprite) return null;
      // Frame the fish in the upper part, the reef under it.
      const at = toPage(s, s.player.sprite.x, s.player.sprite.y);
      return { x: at.x, y: at.y + 110 };
    },
    status() {
      const s = scene();
      return s?.player ? { size: Math.round(s.player.size), fish: s.fish.length, lives: s.lives, score: s.score } : null;
    },
    steer(frame) {
      const s = scene();
      if (!s?.player?.sprite) return null;
      const p = s.player.sprite;
      const ps = s.player.size;
      // Stay down by the seabed, where the coral and the other fish are.
      const floor = (x) => (s.seabed?.floorAt ? s.seabed.floorAt(x) : p.y + 300);
      // Hiding places (seagrass, coral): a fish inside fades out behind a ring, so keep above their tops.
      const patches = (s.covers ?? []).map((c) => c.patch);
      const coverTop = (x) => {
        let top = Infinity;
        for (const c of patches) if (Math.abs(x - c.x) < c.half + 50) top = Math.min(top, floor(x) - c.height);
        return top;
      };
      const ceiling = (x) => coverTop(x) - 45 - ps;
      const cruise = (x) => Math.min(floor(x) - 150 - ps * 2, ceiling(x) - 20);
      let fx = 0, fy = 0, best = null, bestScore = Infinity;
      for (const f of s.fish) {
        if (f.state === 'dead' || f.state === 'hooked' || !f.sprite?.active) continue;
        const dx = f.sprite.x - p.x, dy = f.sprite.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (f.size > ps * DANGER) {
          const reach = 140 + f.size * 4;
          if (d < reach) { const w = ((reach - d) / reach) * 2.5; fx -= (dx / d) * w; fy -= (dy / d) * w; }
        } else if (f.size < ps * EDIBLE && f.sprite.y > cruise(f.sprite.x) - 170) {
          // Prefer close, and a bit bigger meals.
          // Down in the coral we'd hide (and vanish from the shot): skip those.
          const lowInCoral = f.sprite.y > Math.min(floor(f.sprite.x) - 110, ceiling(f.sprite.x)) ? 400 : 0;
          const score = d - f.size * 2 + Math.max(0, cruise(f.sprite.x) - 140 - f.sprite.y) * 1.5 + lowInCoral;
          if (score < bestScore) { bestScore = score; best = { dx, dy, d }; }
        }
      }
      let vx = fx, vy = fy;
      if (best) { vx += best.dx / best.d; vy += best.dy / best.d; }
      if (!best && fx === 0 && fy === 0) {
        wanderAngle += 0.01;
        const dir = Math.cos(wanderAngle) >= 0 ? 1 : -1;
        vx = dir; vy = (cruise(p.x + dir * 200) - p.y) / 200;
      } else if (best && fx === 0 && fy === 0 && best.d > 260) {
        // Far prey: get there along the floor.
        vy += Math.max(-0.6, Math.min(0.6, (cruise(p.x) - p.y) / 300));
      }
      if (s.player.hidden) vy -= 2.5;
      // About to dip into a patch ahead: pull up.
      const ahead = p.x + Math.sign(vx || 1) * 60;
      if (p.y > ceiling(ahead) - 10) vy = Math.min(vy, -1.2);
      const len = Math.hypot(vx, vy) || 1;
      const lead = best && fx === 0 && fy === 0 ? Math.min(best.d, 220) : 220;
      return toPage(s, p.x + (vx / len) * lead, p.y + (vy / len) * lead);
    },
  };
})();
