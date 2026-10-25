// InkSnake autopilot: the game's own test bot (games/inksnake/test/bot.ts,
// served by the dev server) plays, its input fed straight to the Game
// scene in place of the pointer and keys, so the snake hunts, coils and
// dodges just as it does in the tests.
window.__bot = (() => {
  let botInput = null;
  // The dev server's root is the game's dev/ folder: the test bot is reached by its path, found from the game's own modules.
  function loadBot() {
    const src = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/@fs\/.*\/inksnake\/src\//.test(n));
    if (!src) return void setTimeout(loadBot, 250);
    import(src.replace(/\/src\/.*$/, '/test/bot.ts')).then((m) => (botInput = m.botInput), (err) => console.error('[bot]', err));
  }
  loadBot();
  const scene = () => window.__game?.scene?.getScene('Game');

  /** Has the scene take its input from the bot (again, if the scene was restarted). */
  function drive(s) {
    if (!botInput || s.input2.__bot) return;
    s.input2.read = () => botInput(s.world);
    s.input2.arrived = () => undefined;
    s.input2.__bot = true;
  }

  function toPage(s, x, y) {
    const cam = s.cameras.main;
    const canvas = s.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((x - cam.worldView.x) * cam.zoom * rect.width) / canvas.width,
      y: rect.top + ((y - cam.worldView.y) * cam.zoom * rect.height) / canvas.height,
    };
  }

  return {
    ready() {
      const s = scene();
      const ok = Boolean(botInput && s && s.sys.isActive() && s.world && s.world.state === 'play');
      if (ok) drive(s);
      return ok;
    },
    start(levelId) {
      const g = window.__game;
      for (const sc of g.scene.getScenes(true)) g.scene.stop(sc.sys.settings.key);
      g.scene.start('Game', { levelId });
    },
    status() {
      const w = scene()?.world;
      return w ? { length: Math.round(w.snake.length), score: w.score, lives: w.lives, state: w.state } : null;
    },
    focus() {
      const s = scene();
      return s?.world ? toPage(s, s.world.snake.head.x, s.world.snake.head.y) : null;
    },
    steer() {
      const s = scene();
      if (s?.world) drive(s);
      return null;
    },
  };
})();
