import type { BotRole } from '../level/types';
import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import type { Pt } from '../vec';
import { makeAlert } from './awareness';
import { ALARM_RADIUS, ALERT_TIME } from './difficulty';

/** Roles that raise the alarm when they see you or are hit: posted and patrolling troops. */
export const RAISES_ALARM: ReadonlySet<BotRole | 'player'> = new Set<BotRole | 'player'>(['guard', 'patrol', 'turret']);
/** Roles that answer it. */
const ANSWERS: ReadonlySet<BotRole | 'player'> = new Set<BotRole | 'player'>(['guard', 'patrol']);

export interface AlarmState {
  /** When it first went off (null: never; the "never set off the alarm" bonus). */
  firstAt: number | null;
  count: number;
}

/**
 * A guard that's hit or sees you calls the guards and patrols near it
 * (within ALARM_RADIUS of the caller) to where you are. Each called bot
 * hunts that spot for ALERT_TIME, and raises the alarm itself if it sees
 * you there, so a careless fight can pull in the whole camp.
 */
export function raiseAlarm(m: Match, from: Tank, at: Pt): void {
  const a = m.alarm;
  const fresh = a.firstAt === null;
  let called = 0;
  for (const [id, b] of m.brains) {
    if (!ANSWERS.has(b.role)) continue;
    const t = m.tank(id);
    if (!t?.alive || t.team !== from.team) continue;
    if ((t.x - from.x) ** 2 + (t.y - from.y) ** 2 > ALARM_RADIUS * ALARM_RADIUS) continue;
    const renew = !b.alert || m.t > b.alert.until - ALERT_TIME + 3;
    if (!renew) continue;
    b.alert = { x: at.x, y: at.y, until: m.t + ALERT_TIME };
    makeAlert(m, b, at);
    called++;
  }
  if (fresh) a.firstAt = m.t;
  if (fresh || called > 1) {
    a.count++;
    m.emit({ kind: 'alarm', x: from.x, y: from.y, by: from.id });
  }
}
