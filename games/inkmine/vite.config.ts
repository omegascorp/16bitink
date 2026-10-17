import { defineConfig, loadEnv } from 'vite';

// DEV_UNLOCK=true plays the game as an owner (the full game's planets load,
// as the website serves them to owners), the same switch InkCrab and the
// website use locally. Read from the environment, or from the website's
// local env file (apps/web/.env). There's no URL flag for it.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '../../apps/web', 'DEV_'), ...process.env };
  return {
    root: 'dev',
    server: { port: 5176 },
    define: {
      __DEV_UNLOCK__: JSON.stringify(env.DEV_UNLOCK === 'true'),
    },
  };
});
