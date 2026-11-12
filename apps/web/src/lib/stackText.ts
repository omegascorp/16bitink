/** Longest stack kept with an error report. */
export const MAX_STACK = 600;

/**
 * An error's stack as the stats keep it: query strings and fragments dropped from URLs
 * (they could carry anything), the repeated message line removed, cut to MAX_STACK.
 * Undefined when there is nothing left.
 */
export function cleanStack(stack: unknown, message = ''): string | undefined {
  if (typeof stack !== 'string') return undefined;
  const headerless = message && stack.startsWith(message) ? stack.slice(message.length) : stack;
  const text = headerless
    .replace(/([?#])[^\s)'":]*/g, '')
    .replace(/^[\s:]+/, '')
    .trim()
    .slice(0, MAX_STACK);
  return text || undefined;
}

/** The first `count` lines of a stack, for a compact report. */
export function firstFrames(stack: string | null | undefined, count = 2): string | null {
  if (!stack) return null;
  const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, count).join(' | ') || null;
}
