import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from '../src/lib/db/connection';
import { Progress } from '../src/lib/db/progressModel';
import { findProgress, writeProgress } from '../src/lib/db/progressRepo';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)('progress repository (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await Progress.syncIndexes();
  });
  beforeEach(async () => {
    await Progress.deleteMany({});
  });
  afterAll(async () => {
    await Progress.deleteMany({});
    await disconnectDb();
  });

  it('creates progress at revision 1 and reads it back', async () => {
    expect(await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":1}', rev: 0 })).toEqual({ ok: true, rev: 1 });
    expect(await findProgress('65f0c0ffee0000000000aa01', 'inkfish')).toEqual({ data: '{"a":1}', rev: 1 });
  });

  it('keeps games and players apart', async () => {
    await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":1}', rev: 0 });
    expect(await findProgress('65f0c0ffee0000000000aa01', 'blot')).toBeNull();
    expect(await findProgress('65f0c0ffee0000000000aa02', 'inkfish')).toBeNull();
  });

  it('bumps the revision on each save based on the latest one', async () => {
    await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":1}', rev: 0 });
    expect(await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":2}', rev: 1 })).toEqual({ ok: true, rev: 2 });
  });

  it('refuses a stale save and returns the newer copy to merge', async () => {
    await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":1}', rev: 0 });
    await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"a":2}', rev: 1 });
    expect(await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"b":1}', rev: 1 })).toEqual({ ok: false, current: { data: '{"a":2}', rev: 2 } });
    expect(await writeProgress('65f0c0ffee0000000000aa01', 'inkfish', { data: '{"b":1}', rev: 0 })).toEqual({ ok: false, current: { data: '{"a":2}', rev: 2 } });
  });
});
