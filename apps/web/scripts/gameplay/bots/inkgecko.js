// InkGecko autopilot, for pivot levels: aim at a marble of the loaded colour
// that already has a neighbour of that colour (a sure pop), leading it by
// how far the line rolls while the shot flies, and spit every few frames.
// Swaps when only the tail marble has a pop to make.
window.__bot = (() => {
  const scene = () => window.__game?.scene?.getScene('Game');
  /** Frames between spits: a steady, unhurried player. */
  const EVERY = 13;
  /** Board px a second a shot flies (near enough for leading). */
  const SHOT_SPEED = 1150;
  let lastShot = -Infinity;
  let shots = 0;
  let aim = null;

  function toPage(s, x, y) {
    const cam = s.cameras.main;
    const canvas = s.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((x - cam.worldView.x) * cam.zoom * rect.width) / canvas.width,
      y: rect.top + ((y - cam.worldView.y) * cam.zoom * rect.height) / canvas.height,
    };
  }

  /** Marbles out on the path and in sight, with their neighbours. */
  function candidates(b) {
    const out = [];
    for (const line of b.lines) {
      line.marbles.forEach((m, k) => {
        if (m.s > 60 && m.s < line.path.length - 40) out.push({ line, m, p: b.marbleAt(line, m), prev: line.marbles[k - 1], next: line.marbles[k + 1] });
      });
    }
    return out;
  }

  const pairs = (c, colour) => c.m.colour === colour && (c.prev?.colour === colour || c.next?.colour === colour);

  /** The best target for `colour`: a pair nearest the well first, else a lone match nearest the well. */
  function pick(cands, colour) {
    const byDanger = (a, z) => z.m.s / z.line.path.length - a.m.s / a.line.path.length;
    return [...cands].filter((c) => pairs(c, colour)).sort(byDanger)[0] ?? [...cands].filter((c) => c.m.colour === colour).sort(byDanger)[0] ?? null;
  }

  return {
    ready() {
      const s = scene();
      return Boolean(s && s.sys.isActive() && s.board && s.board.state === 'play');
    },
    start(levelId) {
      const g = window.__game;
      for (const sc of g.scene.getScenes(true)) g.scene.stop(sc.sys.settings.key);
      g.scene.start('Game', { levelId });
    },
    status() {
      const b = scene()?.board;
      return b ? { shots, score: b.score, goal: b.level.goal, lives: b.lives, state: b.state } : null;
    },
    steer(frame) {
      const s = scene();
      const b = s?.board;
      if (!b || b.state !== 'play') return aim;
      const cands = candidates(b);
      const target = pick(cands, b.loaded);
      const tap = [];
      if (frame - lastShot >= EVERY) {
        if ((!target || !pairs(target, b.loaded)) && cands.some((c) => pairs(c, b.next))) {
          tap.push('Space');
          lastShot = frame - EVERY + 4;
        } else if (target) {
          const from = b.mouth();
          const t = Math.hypot(target.p.x - from.x, target.p.y - from.y) / SHOT_SPEED;
          const lead = b.marbleAt(target.line, { ...target.m, s: target.m.s + b.level.speed * t });
          aim = toPage(s, lead.x, lead.y);
          tap.push('Enter');
          lastShot = frame;
          shots++;
        }
      } else if (target) {
        // Turn towards the next target between spits, so the gecko looks alive.
        aim = toPage(s, target.p.x, target.p.y);
      }
      return aim ? { ...aim, keys: { held: [], tap } } : { keys: { held: [], tap } };
    },
  };
})();
