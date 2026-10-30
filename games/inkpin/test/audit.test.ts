import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/level';
import { audit } from './audit';

/**
 * The puzzle audit, off by default (it plays dozens of orders per level):
 *   AUDIT=all pnpm test audit        every level
 *   AUDIT=guard,well pnpm test audit  some levels
 * It prints each level's win share and the lessons its losses teach.
 */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

const which = process.env.AUDIT;
const levels = which === undefined ? [] : LEVELS.filter((l) => which === 'all' || which.split(',').includes(l.id));

describe.skipIf(levels.length === 0)('puzzle audit', () => {
  it.each(levels.map((l) => [l.id, l] as const))('%s', (_id, level) => {
    const a = audit(level);
    console.log(`AUDIT ${JSON.stringify(a)}`);
    expect(a.tried).toBeGreaterThan(0);
  });
}, 3_600_000);
