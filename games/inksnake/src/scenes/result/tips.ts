/** A tip for the card after a loss, worded for a mouse or a touch screen. */
export interface Tip {
  readonly mouse: string;
  readonly touch: string;
}

/** Gentle, useful things to know: one shows after each loss, in turn. */
export const TIPS: readonly Tip[] = [
  { mouse: 'Click or Space to strike: a quick lunge that catches mice before they bolt.', touch: 'Tap to strike: a quick lunge that catches mice before they bolt.' },
  { mouse: 'Turn wide: your head can\'t cross your own body.', touch: 'Turn wide: your head can\'t cross your own body.' },
  { mouse: 'Too big to swallow? Circle round it: when the loop closes you squeeze it.', touch: 'Too big to swallow? Circle round it: when the loop closes you squeeze it.' },
  { mouse: 'A coil round two at once scores them both, with a bonus.', touch: 'A coil round two at once scores them both, with a bonus.' },
  { mouse: 'Mice can\'t see you under the leaves: wait there and strike as they pass.', touch: 'Mice can\'t see you under the leaves: wait there and strike as they pass.' },
  { mouse: 'Strike at a crow and it flaps off for a while.', touch: 'Strike at a crow and it flaps off for a while.' },
  { mouse: 'Arrow keys or WASD steer too.', touch: 'Steer with the stick, bottom left: your thumb won\'t hide the snake.' },
];

/** The `turn`-th tip in rotation, worded for touch or mouse. */
export function pickTip(turn: number, touch: boolean): string {
  const tip = TIPS[((Math.floor(turn) % TIPS.length) + TIPS.length) % TIPS.length]!;
  return touch ? tip.touch : tip.mouse;
}

/** A few kind words for how far the goal got (0..1) before a loss. */
export function closeness(progress: number): string {
  if (progress >= 0.85) return 'So close!';
  if (progress >= 0.5) return 'Over halfway there';
  if (progress >= 0.2) return 'A good start';
  return 'It takes a few goes';
}
