import { describe, expect, it } from 'vitest';
import pause from '@tabler/icons/outline/player-pause.svg?raw';
import { iconPaths } from '../src/scenes/kit/uiIcons';

describe('the buttons\' icons', () => {
  it('take every path of a Tabler icon but its invisible frame', () => {
    const paths = iconPaths(pause);
    expect(paths).toHaveLength(2);
    expect(paths.every((d) => d.startsWith('M'))).toBe(true);
    expect(paths).not.toContain('M0 0h24v24H0z');
  });

  it('find the path data wherever it sits in the tag, and skip a path with none', () => {
    const svg = '<svg><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path fill="none" d="M4 4l16 16" /><path d="M20 4l-16 16"/><path /></svg>';
    expect(iconPaths(svg)).toEqual(['M4 4l16 16', 'M20 4l-16 16']);
  });
});
