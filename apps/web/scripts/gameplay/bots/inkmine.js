// InkMine autopilot: walk to the nearest shallow ore, drill down to it,
// and after a couple of finds fly back up to the surface on the jetpack.
window.__bot = (() => {
  const AIR = 0;
  const scene = () => window.__game?.scene?.getScene('Game');
  let phase = 'go';
  let found = 0;
  let lastOre = null;
  let stuck = 0;
  let last = null;

  function toPage(s, wx, wy) {
    const cam = s.cameras.main;
    const gx = (wx - cam.worldView.x) * cam.zoom + cam.x;
    const gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    const rect = s.sys.game.canvas.getBoundingClientRect();
    return { x: rect.left + (gx * rect.width) / s.scale.width, y: rect.top + (gy * rect.height) / s.scale.height };
  }

  const at = (t, c, r) => r * t.width + c;
  function surfaceRow(t, c) {
    for (let r = 0; r < t.height; r++) if (t.tiles[at(t, c, r)] !== AIR) return r;
    return t.height;
  }

  function nearestOre(t, col, row) {
    let best = null;
    let bestScore = Infinity;
    for (let c = Math.max(0, col - 24); c < Math.min(t.width, col + 25); c++) {
      const top = surfaceRow(t, c);
      for (let r = top; r < Math.min(t.height, top + 4); r++) {
        if (t.content[at(t, c, r)] === 0 || t.tiles[at(t, c, r)] === AIR) continue;
        const score = Math.abs(c - col) + Math.max(0, r - row) * 1.5 + (r - top) * 0.5;
        if (score < bestScore) { bestScore = score; best = { c, r }; }
      }
    }
    return best;
  }

  return {
    ready() {
      const s = scene();
      return Boolean(s && s.sys.isActive() && s.mine?.player);
    },
    focus() {
      const s = scene();
      const p = s?.mine?.player;
      if (!p) return null;
      const page = toPage(s, p.x + p.w / 2, p.y + p.h / 2);
      return { x: page.x, y: page.y - 40 };
    },
    status() {
      const m = scene()?.mine;
      return m ? { phase, found, x: Math.round(m.player.x), y: Math.round(m.player.y) } : null;
    },
    steer() {
      const s = scene();
      const m = s?.mine;
      if (!m?.player) return null;
      const t = m.terrain;
      const tile = m.tile;
      const p = m.player;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const col = Math.floor(cx / tile);
      const row = Math.floor(cy / tile);
      const top = surfaceRow(t, col);
      const held = [];

      const moved = last ? Math.hypot(p.x - last.x, p.y - last.y) : 1;
      last = { x: p.x, y: p.y };

      if (phase === 'up') {
        held.push('Space');
        if (row < top - 1 || (p.onGround && row <= top)) phase = 'go';
        return { keys: { held, tap: [] } };
      }

      // A find: the ore we were after is gone.
      if (lastOre && t.content[at(t, lastOre.c, lastOre.r)] === 0) {
        found++;
        lastOre = null;

      }
      const ore = nearestOre(t, col, row);
      lastOre = ore;
      if (!ore) { held.push('ArrowRight'); return { keys: { held, tap: [] } }; }

      if (ore.c !== col) held.push(ore.c > col ? 'ArrowRight' : 'ArrowLeft');
      else if (ore.r > row) held.push('ArrowDown');
      else if (ore.r < row) held.push('ArrowUp');

      stuck = moved < 0.2 ? stuck + 1 : 0;
      // Walking into a ledge too tall to step: hop it.
      if (stuck > 25 && ore.c !== col && ore.r <= row) { held.push('Space'); if (stuck > 45) stuck = 0; }
      return { keys: { held, tap: [] } };
    },
  };
})();
