// Writes the long-form video's captions (YouTube subtitles) from the narration's word timings in words.ts:
//   node dev/promo/descent/saveSrt.mjs   -> promo/longform/1 - fish get weirder the deeper you go.srt
// Lines of up to ~42 characters, broken at punctuation, never on screen for more than 5 s.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../../promo/longform/1 - fish get weirder the deeper you go.srt');
const MAX_CHARS = 42;
const MAX_S = 5;
const GAP_S = 0.9;

const source = await readFile(path.join(here, 'words.ts'), 'utf8');
const words = [...source.matchAll(/w\(("(?:[^"\\]|\\.)*"), ([0-9.]+), ([0-9.]+), \d+\)/g)].map((m) => ({ text: JSON.parse(m[1]), start: Number(m[2]), end: Number(m[3]) }));
if (words.length === 0) throw new Error('No words found in words.ts');

const cues = [];
let line = [];
const textOf = (ws) => ws.map((w) => w.text).join(' ');
const flush = () => {
  if (line.length) cues.push({ start: line[0].start, end: line[line.length - 1].end, text: textOf(line) });
  line = [];
};
for (const w of words) {
  const last = line[line.length - 1];
  if (last && (textOf([...line, w]).length > MAX_CHARS || w.start - last.end > GAP_S || w.end - line[0].start > MAX_S)) flush();
  line.push(w);
  if (/[.?!…]$/.test(w.text) || (/[,:;]$/.test(w.text) && textOf(line).length > 24)) flush();
}
flush();

const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const pad = (n, k = 2) => String(n).padStart(k, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};
const srt = cues.map((c, i) => {
  // Held a beat after the last word, but never over the next line.
  const end = i + 1 < cues.length ? Math.min(c.end + 0.35, cues[i + 1].start - 0.02) : c.end + 0.6;
  return `${i + 1}\n${stamp(c.start)} --> ${stamp(end)}\n${c.text}\n`;
}).join('\n');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, srt);
console.log(`wrote ${path.relative(process.cwd(), out)} (${cues.length} captions)`);
