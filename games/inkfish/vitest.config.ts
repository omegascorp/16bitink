import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: { include: ['src/logic/**', 'src/levels/**', 'src/scenes/game/camera.ts'] },
  },
});
