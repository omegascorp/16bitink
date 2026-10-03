import { describe, expect, it } from 'vitest';
import { targetZoom } from '../src/scenes/game/camera';

describe('targetZoom', () => {
  it('zooms out as the player grows', () => {
    const small = targetZoom(1280, 760, 3200, 1800, 18, 18);
    const big = targetZoom(1280, 760, 3200, 1800, 48, 18);
    expect(big).toBeLessThan(small);
  });

  it('never shows beyond the world', () => {
    expect(targetZoom(4000, 2400, 3200, 1800, 500, 18)).toBeGreaterThanOrEqual(4000 / 3200);
  });

  it('keeps fish readable on short landscape phones', () => {
    const phone = targetZoom(844, 390, 3200, 1800, 18, 18);
    expect(phone).toBeGreaterThan(1.4);
  });
});
