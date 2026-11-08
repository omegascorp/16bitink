import { clamp01, smooth } from '../short';
import { sectionStart, said, T } from './timeline';

/**
 * The mood of every sentence (script.md lists them), as a grade on the
 * picture, a move of the camera and a sound: warm and bright for the hype
 * and the relief, cold and pressing in for the dread, rosy and bouncy for
 * the jokes, sly purple for the teasing, a wide teal breath for the wonder,
 * a punch-in with a flash for the shocks, and a still, darkened frame for
 * every verdict.
 */

export type Mood = 'warm' | 'cold' | 'rosy' | 'sly' | 'awe' | 'shock' | 'final' | 'hush';

export interface MoodKey {
  readonly t: number;
  readonly mood: Mood;
}

const s = sectionStart;
const k = (t: number, mood: Mood): MoodKey => ({ t, mood });

/** Each sentence's start and its mood, in order. */
export const MOODS: readonly MoodKey[] = [
  // 0 · thrill → shock → dread → silly → curious → epic → sly
  k(0, 'warm'), k(T.kayakAll, 'shock'), k(said('for a few', s(0)), 'cold'), k(said('and then', s(0)), 'rosy'), k(T.question, 'awe'), k(said("we're going", s(0)), 'awe'), k(said('and only', s(0)), 'sly'),
  // 1 · cosy → teasing → serious → game on
  k(s(1), 'warm'), k(said('with shoulders', s(1)), 'rosy'), k(T.anything, 'cold'), k(T.testIt, 'warm'),
  // 2 · hype → shock → creepy → relief → teasing → final
  k(s(2), 'warm'), k(said('in 2014', s(2)), 'shock'), k(said('and big ones', s(2)), 'cold'), k(said("but there's", s(2)), 'warm'), k(T.skinny, 'rosy'), k(said('verdict', s(2)), 'final'),
  // 3 · thrill → disgust-laugh → sarcasm → wary → final
  k(s(3), 'warm'), k(said('one in the red', s(3)), 'shock'), k(said('they call', s(3)), 'rosy'), k(T.butEven, 'cold'), k(said('verdict', s(3)), 'final'),
  // 4 · menace → dread → fascination → relief → cheeky → final
  k(s(4), 'cold'), k(said('and it has', s(4)), 'cold'), k(said('but watch', s(4)), 'awe'), k(said("it doesn't", s(4)), 'warm'), k(T.honestly, 'sly'), k(said('verdict', s(4)), 'final'),
  // 5 · the game
  k(s(5), 'warm'),
  // 6 · dread → awe → shock → silly → grim → final
  k(s(6), 'cold'), k(said('the saltwater', s(6)), 'awe'), k(said("it can't", s(6)), 'shock'), k(said('it even', s(6)), 'rosy'), k(T.anythingBig - 0.1, 'cold'), k(said('verdict', s(6)), 'final'),
  // 7 · eerie → shock → dark laugh → lonely → sly → final
  k(s(7), 'cold'), k(said('but scientists', s(7)), 'shock'), k(said('a piece', s(7)), 'rosy'), k(said('it lives', s(7)), 'hush'), k(T.mostlyDead, 'sly'), k(said('verdict', s(7)), 'final'),
  // 8 · hype → awe → nervous → silly → gentle → final
  k(s(8), 'warm'), k(said('with a mouth', s(8)), 'awe'), k(T.fit, 'cold'), k(T.itsThroat, 'rosy'), k(said('it eats', s(8)), 'warm'), k(said('verdict', s(8)), 'final'),
  // 9 · return → dread → shock → despair → joy → curious → laugh
  k(s(9), 'awe'), k(said('in 2021', s(9)), 'cold'), k(said('he was inside', s(9)), 'shock'), k(said('he thought', s(9)), 'hush'), k(said('then the whale', s(9)), 'warm'), k(T.humpbackThroat, 'awe'), k(T.close, 'rosy'),
  // 10 · suspense → dread → shock → wonder → hype → sceptical → laugh → hush → warm → cheeky
  k(s(10), 'cold'), k(said('the sperm', s(10)), 'cold'), k(said('and it can', s(10)), 'shock'), k(said('out of', s(10)), 'awe'), k(said('a big male', s(10)), 'warm'),
  k(said('and yes', s(10)), 'sly'), k(said("it's fake", s(10)), 'rosy'), k(T.twist, 'hush'), k(T.notInterested, 'warm'), k(said('it wants', s(10)), 'sly'),
  // 11 · the end
  k(s(11), 'warm'),
];

/** How strongly each mood is on at t: each sentence's mood fades in over 0.5 s as the last one fades out. */
export function gradeAt(t: number): Readonly<Record<Mood, number>> {
  const out: Record<Mood, number> = { warm: 0, cold: 0, rosy: 0, sly: 0, awe: 0, shock: 0, final: 0, hush: 0 };
  let i = 0;
  while (i + 1 < MOODS.length && MOODS[i + 1]!.t <= t) i++;
  const now = MOODS[i]!;
  const u = smooth((t - now.t) / 0.5);
  out[now.mood] += u;
  if (i > 0) out[MOODS[i - 1]!.mood] += 1 - u;
  else out[now.mood] = 1;
  return out;
}

/** The shocks: when each lands. */
export const SHOCKS: readonly number[] = MOODS.filter((m) => m.mood === 'shock').map((m) => m.t);

/** The camera's move from the mood: a punch in on a shock, a slow push in the cold, a slow breath out in the awe. Returns a zoom about the frame's middle, and a shake (px). */
export function moodCamera(t: number): { readonly zoom: number; readonly shakeX: number; readonly shakeY: number } {
  let i = 0;
  while (i + 1 < MOODS.length && MOODS[i + 1]!.t <= t) i++;
  const m = MOODS[i]!;
  const since = t - m.t;
  let zoom = 1;
  if (m.mood === 'cold') zoom += 0.05 * clamp01(since / 4);
  if (m.mood === 'awe') zoom -= 0.03 * clamp01(since / 4) - 0.03;
  let shake = 0;
  for (const at of SHOCKS) {
    const d = t - at;
    if (d < 0 || d > 0.6) continue;
    zoom += 0.07 * Math.exp(-d * 7);
    shake = Math.max(shake, 10 * Math.exp(-d * 8));
  }
  return { zoom, shakeX: shake * Math.sin(t * 71), shakeY: shake * Math.cos(t * 53) };
}
