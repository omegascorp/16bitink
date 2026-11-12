import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Short } from '../short';
import { createSea } from '../swallowyou/sea';
import { H, planOf, W } from './layout';
import { drawSwallow } from './scene';
import { prepareSprites, STEP_ORDER, type StepId } from './species';

/**
 * A preview page for the swallowed-whole video's swallows
 * (`?video=swallowed-kit`): each step's swallow on a loop of 6 s, one after
 * the other; `&only=pike` plays one.
 */

export async function createSwallowedKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  prepareSprites();
  const ids = only ? STEP_ORDER.filter((s) => s === only) : STEP_ORDER;
  if (ids.length === 0) throw new Error(`No step "${only}": use one of ${STEP_ORDER.join(', ')}`);
  const sea = createSea();
  const LOOP = 6;
  const plans = new Map(ids.map((id: StepId) => [id, planOf(id, { enter: 0, gulp: 2.4, gulpS: id === 'swallower' ? 2.2 : 1.3, until: LOOP })]));
  const draw = (seconds: number): void => {
    const id = ids[Math.floor(seconds / LOOP) % ids.length]!;
    const t = seconds % LOOP;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    sea.draw(ctx, id === 'swallower' ? 'deep' : 'tropic', seconds);
    drawSwallow(ctx, plans.get(id)!, t, Math.floor(seconds * 6) % BOIL_FRAMES);
    ctx.restore();
  };
  return { loopSeconds: LOOP * ids.length, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
