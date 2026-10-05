import { describe, expect, it } from 'vitest';
import { biteOarfish, OARFISH, OARFISH_START, oarfishSlipping, stepOarfish, type OarfishSense } from '../src/logic/bosses/oarfish';

const sense = (over: Partial<OarfishSense> = {}): OarfishSense => ({ now: 1000, rel: 'hunt', dist: 200, seen: true, ...over });

describe('oarfish: the lash', () => {
  it('quivers when you come close, lashes, swims level, then hangs again', () => {
    const quiver = stepOarfish(OARFISH_START, sense());
    expect(quiver.mode).toBe('quiver');
    const lash = stepOarfish(quiver, sense({ now: quiver.until }));
    expect(lash.mode).toBe('lash');
    const swim = stepOarfish(lash, sense({ now: lash.until }));
    expect(swim.mode).toBe('swim');
    const hang = stepOarfish(swim, sense({ now: swim.until }));
    expect(hang.mode).toBe('hang');
    expect(stepOarfish(hang, sense({ now: swim.until + 1 })).mode).toBe('hang');
    expect(stepOarfish(hang, sense({ now: hang.lashAt })).mode).toBe('quiver');
  });

  it('leaves you be out of reach, hidden, or your size', () => {
    expect(stepOarfish(OARFISH_START, sense({ dist: OARFISH.lashRange + 1 })).mode).toBe('hang');
    expect(stepOarfish(OARFISH_START, sense({ seen: false })).mode).toBe('hang');
    expect(stepOarfish(OARFISH_START, sense({ rel: 'even' })).mode).toBe('hang');
  });
});

describe('oarfish: shedding its tail', () => {
  it('sheds a piece for the first bites and bolts, and the third bite gets it', () => {
    let s = stepOarfish(OARFISH_START, sense({ rel: 'hide' }));
    expect(s.mode).toBe('drift');
    for (let k = 1; k <= OARFISH.maxSheds; k++) {
      const bite = biteOarfish(s, 1000 * k);
      expect(bite.resisted).toBe(true);
      expect(bite.state).toMatchObject({ mode: 'shed', sheds: k });
      expect(oarfishSlipping(bite.state.mode)).toBe(true);
      s = stepOarfish(bite.state, sense({ rel: 'hide', now: bite.state.until }));
      expect(s.mode).toBe('drift');
    }
    expect(biteOarfish(s, 9000).resisted).toBe(false);
  });

  it("can't be bitten again while it's bolting", () => {
    const shed = biteOarfish(stepOarfish(OARFISH_START, sense({ rel: 'hide' })), 1000).state;
    expect(biteOarfish(shed, 1100)).toMatchObject({ resisted: true, state: { sheds: 1 } });
  });
});
