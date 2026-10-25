// Scratch config for recording: no hot reload, no file watching, so edits elsewhere never reload the page mid-take.
import base from './vite.config';
export default async (env: { mode: string; command: 'serve' | 'build' }) => {
  const c = typeof base === 'function' ? await base(env as never) : base;
  return { ...c, server: { port: 5199, hmr: false, watch: null } };
};
