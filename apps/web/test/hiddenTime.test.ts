import { describe, expect, it, vi } from 'vitest';
import { createHiddenTime, visibleMs } from '../src/lib/client/hiddenTime';
import { createStallTimer } from '../src/lib/client/stallTimer';
import { classifyMountFailure } from '../src/lib/client/mountFailure';

describe('createHiddenTime', () => {
  it('adds up the hidden spans, including one still going on', () => {
    let t = 0;
    const h = createHiddenTime(() => t, () => false);
    h.begin();
    t = 1000; h.set(true);
    t = 4000; h.set(false);
    t = 5000; h.set(true);
    t = 5500;
    expect(h.total()).toBe(3500);
    expect(visibleMs(6000, h.total())).toBe(2500);
  });

  it('restarts on begin and never goes below zero', () => {
    let t = 0;
    const h = createHiddenTime(() => t, () => false);
    t = 10; h.set(true); t = 20; h.set(false);
    h.begin();
    expect(h.total()).toBe(0);
    expect(visibleMs(100, 500)).toBe(0);
  });
});

describe('createStallTimer', () => {
  it('fires after the quiet time, but not while hidden', () => {
    vi.useFakeTimers();
    let hidden = false;
    const onStall = vi.fn();
    const s = createStallTimer(1000, onStall, () => hidden);
    s.kick();
    vi.advanceTimersByTime(900);
    hidden = true; s.setHidden(true);
    vi.advanceTimersByTime(60_000);
    expect(onStall).not.toHaveBeenCalled();
    hidden = false; s.setHidden(false);
    vi.advanceTimersByTime(999);
    expect(onStall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStall).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does nothing before kick or after stop', () => {
    vi.useFakeTimers();
    const onStall = vi.fn();
    const s = createStallTimer(1000, onStall, () => false);
    s.setHidden(false);
    s.kick();
    s.stop();
    vi.advanceTimersByTime(5000);
    expect(onStall).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('classifyMountFailure', () => {
  it('reloads the page when WebGL works again but Phaser cached its failure', () => {
    expect(classifyMountFailure('Cannot create WebGL context, aborting.', true)).toBe('reload');
  });

  it('gives up when WebGL is gone or the shaders fail', () => {
    expect(classifyMountFailure('Cannot create WebGL context', false)).toBe('unsupported');
    expect(classifyMountFailure('Shader failed: link', true)).toBe('unsupported');
  });

  it('retries in place for other errors', () => {
    expect(classifyMountFailure('The object is in an invalid state.', true)).toBe('retry');
  });
});
