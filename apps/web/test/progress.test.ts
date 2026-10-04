import { describe, expect, it } from 'vitest';
import { MAX_PROGRESS_BYTES, parseProgressWrite, toProgressView } from '../src/lib/progress';

describe('progress writes', () => {
  it('accepts an object and a revision, keeping the object as JSON text', () => {
    expect(parseProgressWrite(JSON.stringify({ data: { levels: { a: 1 } }, rev: 3 }))).toEqual({ data: '{"levels":{"a":1}}', rev: 3 });
  });

  it('rejects anything that is not { object, non-negative integer }', () => {
    for (const body of ['nope', 'null', '[]', '{"data":[],"rev":0}', '{"data":"x","rev":0}', '{"data":{},"rev":-1}', '{"data":{},"rev":1.5}', '{"data":{}}']) {
      expect(parseProgressWrite(body)).toBeNull();
    }
  });

  it('rejects oversized progress', () => {
    const big = JSON.stringify({ data: { blob: 'x'.repeat(MAX_PROGRESS_BYTES) }, rev: 0 });
    expect(parseProgressWrite(big)).toBeNull();
  });

  it('keeps $ and dotted keys as plain text, never as query operators', () => {
    expect(parseProgressWrite('{"data":{"$set":{"a.b":1}},"rev":0}')?.data).toBe('{"$set":{"a.b":1}}');
  });
});

describe('progress view', () => {
  it('is empty at revision 0 when nothing is saved', () => {
    expect(toProgressView(null)).toEqual({ data: null, rev: 0 });
  });

  it('parses the stored text back', () => {
    expect(toProgressView({ data: '{"a":1}', rev: 2 })).toEqual({ data: { a: 1 }, rev: 2 });
  });
});
