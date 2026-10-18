/// <reference types="vite/client" />

/**
 * The narrator's recordings that ship with the game: narration/<line>.mp3,
 * bundled by Vite, each fetched only when its line is first read.
 */
const FILES = import.meta.glob<string>('../../narration/*.mp3', { query: '?url', import: 'default' });

const byLine = new Map<string, () => Promise<string>>(
  Object.entries(FILES).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -'.mp3'.length), load]),
);

/** Whether this line has a recording. */
export const hasNarration = (line: string | undefined): boolean => line !== undefined && byLine.has(line);

/** The URL of this line's recording, or null when it has none. */
export function narrationUrl(line: string | undefined): Promise<string> | null {
  return (line !== undefined && byLine.get(line)?.()) || null;
}

/** Every line with a recording (for the test that checks every line is read). */
export const recordedLines = (): ReadonlySet<string> => new Set(byLine.keys());
