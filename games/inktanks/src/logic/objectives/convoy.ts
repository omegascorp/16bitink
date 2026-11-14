import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import { addTank, TRUCK } from '../match/spawn';
import type { Tank } from '../match/types';
import { angleTo } from '../vec';
import { BASE, dist, nearest, type Objective } from './types';

const STOP = { move: null, aim: null, fire: false, swap: false, repair: false } as const;
/** The truck only drives while you're this close. */
const TRUCK_LEASH = 480;
/** Waves and hunters go for the truck from this close. */
const TRUCK_HUNT = 600;

/** Escort: the supply truck follows its road to the end while you stay near it. Lose it and the mission fails. */
export function escort(m: Match, def: Extract<ObjectiveDef, { kind: 'escort' }>): Objective {
  const road = m.road(def.road);
  const truck = addTank(m, { name: 'Supply truck', clan: 'ink', team: 0, role: 'truck', loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'wheels', mk: 1 } }, at: road[0]!, heading: angleTo(road[0]!, road[1]!) });
  truck.stats = { ...truck.stats, maxHp: def.truckHp, speed: def.speed, radius: TRUCK.radius, armour: TRUCK.armour };
  truck.hp = def.truckHp;
  let roadI = 1;
  let arrived = false;
  const leash = def.leash ?? TRUCK_LEASH;
  const total = road.reduce((s, p, i) => (i ? s + dist(p, road[i - 1]!) : 0), 0);
  const travelled = () => {
    let s = 0;
    for (let i = 1; i < roadI; i++) s += dist(road[i]!, road[i - 1]!);
    return Math.min(total, s + dist(road[roadI - 1] ?? truck, truck));
  };
  return {
    ...BASE,
    kind: 'escort',
    title: 'Bring the supply truck in',
    step: () => undefined,
    status: () => {
      const near = m.player?.alive && dist(m.player, truck) <= leash;
      const text = arrived ? 'The truck is in' : `Truck ${Math.round((travelled() / total) * 100)}%${near ? '' : ': stay close to keep it moving'}`;
      return { text, target: truck.alive ? truck : null, done: arrived, failed: truck.alive ? null : 'the truck was destroyed' };
    },
    playerHint: () => (truck.alive ? { goal: { x: truck.x + Math.cos(truck.heading) * 110, y: truck.y + Math.sin(truck.heading) * 110 }, goalRadius: 120, stay: true, urgent: true } : null),
    foeHint: (t) => (truck.alive && dist(t, truck) < TRUCK_HUNT ? { goal: truck, goalRadius: 200, target: truck.id } : null),
    drive: (t) => {
      if (t.id !== truck.id) return null;
      const next = road[roadI];
      const p = m.player;
      if (!next || arrived || !p?.alive || dist(p, t) > leash) return STOP;
      if (dist(next, t) < 30) {
        roadI++;
        if (roadI >= road.length) arrived = true;
      }
      return { move: { kind: 'point', angle: angleTo(t, next), mag: 1 }, aim: null, fire: false, swap: false, repair: false };
    },
    marks: () => [{ kind: 'exit', x: road[road.length - 1]!.x, y: road[road.length - 1]!.y, r: 90 }],
    truckHpShare: () => Math.max(0, truck.hp) / truck.stats.maxHp,
  };
}

/** The tanks with a role, by their brain. */
export function withRole(m: Match, role: string): Tank[] {
  return m.tanks.filter((t) => m.brains.get(t.id)?.role === role);
}

/** Where a routed tank is heading next. */
function ahead(m: Match, t: Tank, by: number) {
  return { x: t.x + Math.cos(t.heading) * by, y: t.y + Math.sin(t.heading) * by };
}

/** Ambush: stop the convoy before it leaves the map; it follows its road and doesn't wait. */
export function ambush(m: Match, def: Extract<ObjectiveDef, { kind: 'ambush' }>): Objective {
  const may = def.mayEscape ?? 0;
  return {
    ...BASE,
    kind: 'ambush',
    title: 'Stop the convoy before it leaves',
    step: () => undefined,
    status: () => {
      const convoy = withRole(m, 'convoy');
      const killed = convoy.filter((t) => !t.alive && !t.escaped).length;
      const escaped = convoy.filter((t) => t.escaped).length;
      const moving = convoy.filter((t) => t.alive);
      const target = m.player ? nearest(m.player, moving) : null;
      return {
        text: `Convoy stopped ${killed}/${convoy.length}${escaped ? `, ${escaped} got away` : ''}`,
        target,
        done: moving.length === 0 && escaped <= may,
        failed: escaped > may ? 'the convoy got away' : null,
      };
    },
    playerHint: (t) => {
      const moving = withRole(m, 'convoy').filter((x) => x.alive);
      const n = nearest(t, moving);
      return n ? { goal: ahead(m, n, dist(t, n) > 400 ? 220 : 0), goalRadius: 60, target: n.id, urgent: true, run: dist(t, n) > 300 } : null;
    },
  };
}

/** Chase: catch the courier (a runner) before it reaches its base. */
export function chase(m: Match, def: Extract<ObjectiveDef, { kind: 'chase' }>): Objective {
  const base = m.point(def.base);
  const runner = () => withRole(m, 'runner')[0] ?? null;
  return {
    ...BASE,
    kind: 'chase',
    title: 'Catch the courier before it gets home',
    step: () => undefined,
    status: () => {
      const r = runner();
      const away = r?.alive ? Math.round(dist(r, base) / 10) : 0;
      return { text: r?.alive ? `Catch ${r.name}: ${away} m from its base` : 'Courier caught', target: r?.alive ? r : null, done: !!r && !r.alive && !r.escaped, failed: r?.escaped ? 'the courier got away' : null };
    },
    playerHint: (t) => {
      const r = runner();
      return r?.alive ? { goal: ahead(m, r, 160), goalRadius: 40, target: r.id, urgent: true, run: true } : null;
    },
    marks: () => [{ kind: 'exit', x: base.x, y: base.y, r: 90 }],
  };
}
