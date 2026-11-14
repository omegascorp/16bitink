import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import type { Pt } from '../vec';
import type { Brain } from './brain';
import { canSee, canSeeOpen, enemies, HEAR, VISION } from './perception';

/**
 * Alert states (design doc, Tactics §1), shown over each enemy:
 *   calm: drives its route or sits at its post, sees its role's sight in a 140° cone round the turret;
 *   ? suspicious: heard a shot within 300 px or glimpsed you; stops, turns to the spot and checks it for 2 s;
 *   ! alert: fights, sees all round (VISION), raises the alarm; calms back to ? after 8 s without seeing anyone.
 * Spotting from ? needs you still in sight CONFIRM s after the glimpse, so you
 * can duck back. Hit, or called by the alarm: alert at once. Waves, hunters
 * and boss turrets are always alert. Sight is checked once per decision.
 */
export type Aware = 'calm' | 'suspicious' | 'alert';

export const AWARE = {
  /** The calm and suspicious eyes: 140° round the turret. */
  cone: (140 * Math.PI) / 180,
  /** A suspicious bot checks the spot this long, then calms down. */
  suspect: 2,
  /** Still seen this long after the glimpse: spotted. */
  confirm: 0.6,
  /** An alert bot that sees nobody this long goes back to suspicious (checking where it last saw you). */
  forget: 8,
} as const;

/** Roles that never calm down. */
export function alwaysAlert(b: Pick<Brain, 'role'>, t: Pick<Tank, 'role'>): boolean {
  return b.role === 'wave' || b.role === 'hunter' || b.role === 'player' || t.role === 'bossTurret' || t.role === 'boss';
}

function setAware(m: Match, b: Brain, state: Aware, spot: Pt | null): void {
  if (b.aware !== state) b.awareSince = m.t;
  b.aware = state;
  if (spot) b.awareSpot = { x: spot.x, y: spot.y };
  if (state === 'alert') b.alertUntil = m.t + AWARE.forget;
}

/** Hit, or called by the alarm: alert now (the ambush bonus is spent on the hit that does it). */
export function makeAlert(m: Match, b: Brain, at: Pt | null): void {
  setAware(m, b, 'alert', at);
}

/** Who a bot can see right now, with its awareness's range and cone. */
export function botSees(m: Match, b: Brain, t: Tank, o: Tank): boolean {
  if (b.role === 'player') return canSeeOpen(m, t, o, VISION);
  const range = b.aware === 'calm' ? b.sight : VISION;
  return canSee(m, t, o, range, b.aware === 'alert' ? null : AWARE.cone);
}

/** A player-side shot fired within HEAR since the last decision, or null. */
function heardShot(m: Match, b: Brain, t: Tank): Tank | null {
  const window = b.diff.reaction * 1.25 + 0.05;
  for (const o of m.tanks) {
    if (!o.alive || o.team === t.team || m.t - o.firedAt > window) continue;
    if ((o.x - t.x) ** 2 + (o.y - t.y) ** 2 <= HEAR * HEAR) return o;
  }
  return null;
}

/**
 * One decision's senses: updates the bot's alert state and returns the
 * enemies it may fight (only an alert bot fights; a suspicious one looks).
 * Counts m.tactics.spotted when the player is spotted.
 */
export function sense(m: Match, b: Brain, t: Tank): Tank[] {
  const candidates = enemies(m, t).filter((o) => (o.role !== 'bossTurret' || b.role === 'player') && o.role !== 'crew');
  if (b.role === 'player') return candidates.filter((o) => canSeeOpen(m, t, o, VISION));
  const attacked = m.t - t.lastHitAt < 1;
  const called = b.alert !== null && m.t < b.alert.until;
  if (alwaysAlert(b, t) || attacked || called) setAware(m, b, 'alert', null);
  const seen = candidates.filter((o) => botSees(m, b, t, o));
  const first = seen[0];
  if (first) {
    b.lastSeen = { x: first.x, y: first.y, t: m.t, id: first.id };
    const sawPlayer = m.player !== null && seen.includes(m.player);
    if (b.aware === 'calm') setAware(m, b, 'suspicious', first);
    else if (b.aware === 'suspicious' && m.t - b.awareSince >= AWARE.confirm) {
      setAware(m, b, 'alert', first);
      if (sawPlayer) m.tactics.spotted++;
    } else if (b.aware === 'suspicious') b.awareSpot = { x: first.x, y: first.y };
    else b.alertUntil = m.t + AWARE.forget;
  } else {
    const heard = b.aware === 'alert' ? null : heardShot(m, b, t);
    if (heard) setAware(m, b, 'suspicious', heard);
    if (heard && b.aware === 'suspicious') b.awareSince = m.t;
    else if (b.aware === 'suspicious' && m.t - b.awareSince > AWARE.suspect) setAware(m, b, 'calm', null);
    else if (b.aware === 'alert' && m.t > b.alertUntil) setAware(m, b, 'suspicious', b.lastSeen);
  }
  return b.aware === 'alert' ? seen : [];
}
