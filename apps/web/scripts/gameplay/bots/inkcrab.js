// InkCrab autopilot: walk to the nearest food, dig down to buried food, hop when stuck,
// and move house into the next shell up once grown into the current one.
window.__bot = (() => {
  const scene = () => window.__game?.scene?.getScene('Game');
  let stuck = 0;
  let lastX = null;
  let digTick = 0;
  let wander = 1;
  let frameNo = 0;
  let skipUntil = 0;

  function toPage(s, wx, wy) {
    const cam = s.cameras.main;
    const gx = (wx - cam.worldView.x) * cam.zoom + cam.x;
    const gy = (wy - cam.worldView.y) * cam.zoom + cam.y;
    const rect = s.sys.game.canvas.getBoundingClientRect();
    return { x: rect.left + (gx * rect.width) / s.scale.width, y: rect.top + (gy * rect.height) / s.scale.height };
  }

  const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

  function pickTarget(beach, crab) {
    const me = centre(crab.body);
    const size = crab.growth.size;
    const shellSize = crab.shell?.size ?? 0;
    const wantsShell = size >= shellSize;
    let best = null;
    let bestScore = Infinity;
    for (const item of beach.items.values()) {
      const at = centre(item);
      const d = Math.hypot(at.x - me.x, (at.y - me.y) * 1.6);
      let score;
      // Out in the open only: digging after buried food takes the shot underground.
      if (item.kind.type === 'food' && !item.buried && at.y < me.y + 60) score = d;
      else if (item.kind.type === 'shell' && wantsShell && item.kind.shell.size === shellSize + 1) score = d - 200;
      else continue;
      if (score < bestScore) { bestScore = score; best = { item, at }; }
    }
    return best;
  }

  return {
    ready() {
      const s = scene();
      return Boolean(s && s.sys.isActive() && s.beach?.crab?.body);
    },
    start(levelId) {
      scene().scene.restart({ levelId });
    },
    focus() {
      const s = scene();
      if (!s?.beach?.crab) return null;
      const me = centre(s.beach.crab.body);
      const at = toPage(s, me.x, me.y);
      return { x: at.x, y: at.y - 30 };
    },
    status() {
      const c = scene()?.beach?.crab;
      return c ? { size: c.growth.size, meter: c.growth.meter, shell: c.shell?.size ?? null, x: Math.round(c.body.x), y: Math.round(c.body.y) } : null;
    },
    steer() {
      const s = scene();
      const beach = s?.beach;
      const crab = beach?.crab;
      if (!crab?.body) return null;
      const me = centre(crab.body);
      const tile = beach.tileSize;
      frameNo++;
      // Just turned round from something we couldn't get past: wander a while first.
      const target = frameNo < skipUntil ? null : pickTarget(beach, crab);
      const held = [];
      const tap = [];
      const dx = target ? target.at.x - me.x : wander * 200;
      const dy = target ? target.at.y - me.y : 0;
      if (Math.abs(dx) > tile * 0.4) held.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');

      // Not moving while trying to: a ledge or a wall of sand. Hop, then dig through.
      const moved = lastX === null ? 1 : Math.abs(crab.body.x - lastX);
      lastX = crab.body.x;
      stuck = held.length && moved < 0.3 ? stuck + 1 : 0;
      if (stuck === 6 && crab.body.onGround) tap.push('Space');
      if (stuck === 16 && crab.body.onGround) tap.push('Space');
      if (stuck > 30) { stuck = 0; wander = -wander; skipUntil = frameNo + 90; }

      if (target) {
        const above = dy < -tile * 1.5 && Math.abs(dx) < tile * 2;
        if (above && crab.body.onGround && digTick++ % 20 === 0) tap.push('Space');
        const touching = Math.abs(dx) < tile && Math.abs(dy) < tile * 1.2;
        if (touching && target.item.kind.type === 'shell') tap.push('e');
      }
      return { keys: { held, tap } };
    },
  };
})();
