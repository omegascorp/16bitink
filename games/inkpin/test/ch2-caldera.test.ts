import { describe, expect, it } from 'vitest';
import { CALDERA } from '../src/level/ch2/caldera';
import { LAVA, STEPS_PER_SECOND, STONE, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit, playNoting } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** The armadillo gets Nib: it catches him, or he lands on its spikes. */
const ARMADILLO = ['inked', 'pricked'];

/** The crater's two pools of lava: the vent's (poured into the moulds) and the lake's at the bottom. */
const BOTTOM = 1600;

/** Pulls the pins in order, letting each settle, with Nib kept on his shelf behind the door: the world after. */
const pullAll = (order: readonly string[]): World => {
  const w = new World(CALDERA);
  for (const id of order) {
    w.pull(id);
    for (let s = 0; s < STEPS_PER_SECOND * 25; s++) w.step();
  }
  return w;
};

const count = (w: World, kind: number, test: (x: number, y: number) => boolean): number => {
  const g = w.grains;
  let n = 0;
  for (let i = 0; i < g.count; i++) if (g.kind[i] === kind && test(g.x[i]!, g.y[i]!)) n++;
  return n;
};

describe('The Caldera', () => {
  it('is won by its hint, and takes the bot at least a minute', () => {
    const r = play(CALDERA, CALDERA.solution);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeGreaterThanOrEqual(60);
  });

  it('keeps to the grain budget', () => {
    expect(CALDERA.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  // The signature: the vent fills the three moulds and the rain sets them into a stair of stone; the lake's tank sets the lake.
  it('pours a stone stair, and sets the lake', () => {
    const w = pullAll(['V', 'C', 'W']);
    expect(w.grains.countOf(LAVA)).toBe(0);
    for (const [x0, x1] of [[700, 810], [810, 920], [920, 1030]] as const) {
      expect(count(w, STONE, (x, y) => x > x0 && x < x1 && y < BOTTOM)).toBeGreaterThan(20);
    }
    expect(count(w, STONE, (_x, y) => y > BOTTOM)).toBeGreaterThan(50);
    // The rain that got past the stair waits on the landing and the black ledges, over the armadillo's bank.
    expect(count(w, WATER, (x, y) => x > 1030 && x < 1470 && y < 1320)).toBeGreaterThan(10);
    expect(w.blots[0]!.gone).toBeNull();
  });

  // The one-way route: the ledges Nib walks down fall behind him, and tip the rain on them down the scree onto the armadillo.
  it('drops every ledge behind Nib on the way down, and the rain with them onto the armadillo', () => {
    const w = pullAll(CALDERA.solution);
    expect(w.ledges.every((l) => l.state === 'up')).toBe(true);
    for (const x of [1100, 1420, 1510, 900, 150]) {
      w.command({ kind: 'goto', x });
      for (let s = 0; s < STEPS_PER_SECOND * 8 && !w.finished; s++) w.step();
    }
    expect(w.ledges.map((l) => l.state)).toEqual(['down', 'down']);
    // Both land on the scree, out of the armadillo's reach on the bank below.
    for (const l of w.ledges) expect(l.y).toBeLessThan(1930);
    expect(w.blots[0]!.gone).toBe('washed');
    expect(w.goalMet).toBe(true);
  });

  // Other winning orders: the gold and the lake any time after each other, Nib's door only once the stair is stone.
  it.each([[['V', 'C', 'W', 'N', 'K']], [['W', 'K', 'V', 'C', 'N']]])('is won by %j too', (order) => {
    expect(play(CALDERA, order).status.state).toBe('won');
  });

  // Each tempting wrong order, the pull it goes wrong on, and how it ends (as the audit plays it).
  it.each([
    ["Nib's door first: he drops into the empty mould, and the vent pours on him", ['N', 'V', 'C', 'W', 'K'], 'V', ['burnt']],
    ['the door on the hot moulds', ['V', 'N', 'C', 'W', 'K'], 'N', ['burnt']],
    ['the rain before the vent: the empty moulds drink it, and the armadillo stays dry', ['C', 'V', 'W', 'K', 'N'], 'N', ARMADILLO],
    ['the gold into the hot lake', ['K', 'V', 'C', 'W', 'N'], 'K', ['melted']],
    ['the gold before the lake is set, once the stair is done', ['V', 'C', 'K', 'W', 'N'], 'K', ['melted']],
    ['down the crater before the lake is set: no way back up', ['V', 'C', 'N', 'W', 'K'], 'N', ['burnt']],
  ])('%s: %j', (_name, order, at, causes) => {
    const e = playNoting(CALDERA, order);
    expect(e.at).toBe(at);
    expect(causes).toContain(e.end);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(CALDERA))), 3_600_000);
}, 600_000);
