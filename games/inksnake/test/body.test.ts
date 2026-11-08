import { describe, expect, it } from 'vitest';
import { pushOffBody } from '../src/logic/bodyBlock';
import { Snake } from '../src/logic/snake';
import { pt } from '../src/logic/vec';

describe('the body is solid to creatures', () => {
  // Lying straight from (500, 270) back to (200, 270).
  const snake = new Snake('corn', pt(500, 270), 0, 300);
  const edge = snake.width / 2;

  it('pushes a creature on the body out to the side it is on', () => {
    const below = pushOffBody(snake, pt(350, 273), 6);
    expect(below!.p.y).toBeGreaterThanOrEqual(270 + edge + 6 - 0.5);
    const above = pushOffBody(snake, pt(350, 266), 6);
    expect(above!.p.y).toBeLessThanOrEqual(270 - edge - 6 + 0.5);
  });

  it('leaves a creature clear of the body where it is', () => {
    expect(pushOffBody(snake, pt(350, 300), 6)).toBeNull();
  });

  it('leaves the neck open, so the head can reach what it eats', () => {
    expect(pushOffBody(snake, pt(snake.head.x - 4, 271), 6)).toBeNull();
  });
});
