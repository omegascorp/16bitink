import { defineConfig, loadEnv } from 'vite';

// DEV_UNLOCK=true plays the game as an owner, the same switch the website uses
// locally; DEV_ALL_LEVELS=true opens every level without playing through. Read
// from the environment, or from the website's local env file (apps/web/.env).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '../../apps/web', 'DEV_'), ...process.env };
  return {
    root: 'dev',
    server: { port: 5178, hmr: process.env.NO_HMR !== 'true' },
    define: {
      __DEV_UNLOCK__: JSON.stringify(env.DEV_UNLOCK === 'true'),
      __DEV_ALL_LEVELS__: JSON.stringify(env.DEV_ALL_LEVELS === 'true'),
    },
  };
});
