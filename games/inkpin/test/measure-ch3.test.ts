import { describe, expect, it } from 'vitest';
import { COIN, GAS, STEPS_PER_SECOND, WATER } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { count, FLOOR, run, stepsUntil, stepsWhile, T, tombRoom, vent } from './tomb-room';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };
const sec = (n: number): string => (n / STEPS_PER_SECOND).toFixed(2);
const out: string[] = [];
const say = (s: string): void => {
  out.push(s);
  console.log(s);
};

/** Measures for the kit (MEASURE=1 npx vitest run test/measure-ch3 --silent=false). */
describe.skipIf(!process.env.MEASURE)('chapter 3 measures', { timeout: 600_000 }, () => {
  it('plates: pours onto a 100-px plate, open floor and pit', () => {
    for (const pit of [false, true]) {
      for (const n of [25, 40, 60]) {
        const walls = pit ? [{ ax: 342, ay: 840, bx: 342, by: 900, t: T }, { ax: 458, ay: 840, bx: 458, by: 900, t: T }] : [];
        const level = tombRoom({
          walls: [...tombRoom({}).walls, ...walls, { ax: 360, ay: 520, bx: 360, by: 600, t: T }, { ax: 440, ay: 520, bx: 440, by: 600, t: T }],
          pins: [{ id: 'P', ax: 340, ay: 608, bx: 460, by: 608, t: 7 }],
          fills: [{ kind: WATER, x0: 360, x1: 440, y1: 600, count: n }],
          plates: [{ id: 'A', x0: pit ? 350 : 350, x1: pit ? 450 : 450, y: FLOOR }],
        });
        const w = new World(level);
        w.pull('P');
        let first = -1;
        let down = -1;
        let maxW = 0;
        for (let s = 1; s < 600; s++) {
          w.step();
          if (first < 0 && w.plates[0]!.weight > 0) first = s;
          if (down < 0 && w.events.some((e) => e.type === 'plateDown')) down = s;
          maxW = Math.max(maxW, w.plates[0]!.weight);
        }
        say(`plate ${pit ? 'pit' : 'open'} ${n} water dropped ~280 px: weight after 5 s ${w.plates[0]!.weight} (max ${maxW}), first grain ${sec(first)} s, down ${down < 0 ? 'never' : `${sec(down - first)} s after first grain`}, down now ${w.plates[0]!.down}`);
      }
    }
  });

  it('plates: a leaking pit (40 water over a 30-px grate)', () => {
    for (const [N, GRATE] of [[40, 30], [60, 30], [80, 30], [60, 12], [80, 12]] as const) {
    const level = tombRoom({
      walls: [...tombRoom({}).walls, { ax: 342, ay: 840, bx: 342, by: 900, t: T }, { ax: 458, ay: 840, bx: 458, by: 900, t: T }, { ax: 360, ay: 520, bx: 360, by: 600, t: T }, { ax: 440, ay: 520, bx: 440, by: 600, t: T }],
      pins: [{ id: 'P', ax: 340, ay: 608, bx: 460, by: 608, t: 7 }],
      fills: [{ kind: WATER, x0: 360, x1: 440, y1: 600, count: N }],
      plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }],
      drains: [{ x0: 400 - GRATE / 2, x1: 400 + GRATE / 2, y0: 884, y1: 905 }],
    });
    const w = new World(level);
    w.pull('P');
    const down = stepsUntil(w, 'plateDown', 600);
    const up = stepsUntil(w, 'plateUp', 3000);
    say(`leaking pit: ${N} water, ${GRATE}-px grate (box 884..905): down ${down < 0 ? 'never' : `at ${sec(down)} s`}, up again ${up < 0 ? 'never' : `${sec(up)} s after going down`}`);
    }
  });

  it('plates: a boulder at walking speed into a 100-px pit; a raft aground', () => {
    const level = tombRoom({
      walls: [...tombRoom({}).walls, { ax: 342, ay: 840, bx: 342, by: 900, t: T }, { ax: 458, ay: 840, bx: 458, by: 900, t: T }, { ax: 40, ay: 832, bx: 334, by: 832, t: T }],
      boulders: [{ x: 200, y: 800 }],
      plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }],
    });
    const w = new World(level);
    w.boulders[0]!.vx = 0.95;
    run(w, 900);
    const b = w.boulders[0]!;
    say(`boulder rolled at 0.95 px/step off a ledge into a 100-px pit: stops at x ${b.x.toFixed(0)} (pit 350..450), weight ${w.plates[0]!.weight}, down ${w.plates[0]!.down}`);
    for (const coins of [0, 20]) {
      const r = new World(tombRoom({ rafts: [{ x: 400, y: FLOOR - 14 }], plates: [{ id: 'A', x0: 350, x1: 450, y: FLOOR }], fills: coins ? [{ kind: COIN, x0: 370, x1: 430, y1: FLOOR - 28, count: coins }] : [] }));
      run(r, 360);
      say(`raft aground on the plate with ${coins} coins on deck: weight ${r.plates[0]!.weight}`);
    }
  });

  it('doors: open and shut times; a tank through a door Nib holds open', () => {
    for (const len of [60, 80, 120]) {
      const level = tombRoom({
        plates: [{ id: 'A', x0: 50, x1: 110, y: FLOOR }],
        doors: [{ id: 'D', ax: 400, ay: FLOOR + 8 - len, bx: 400, by: FLOOR + 8, t: 8, plate: 'A' }],
      });
      const w = new World(level);
      const open0 = w.doors[0]!.open;
      w.command({ kind: 'goto', x: 200 });
      const up = stepsUntil(w, 'plateUp', 400);
      const shut = stepsUntil(w, 'doorShut', 400);
      w.command({ kind: 'goto', x: 80 });
      const down = stepsUntil(w, 'plateDown', 400);
      const open = stepsWhile(w, () => w.doors[0]!.open >= w.doors[0]!.len, 400);
      say(`door ${len} px (open at start: ${open0 === len}): plate up ${sec(up)} s after Nib leaves, shuts ${sec(shut)} s later; opens fully ${sec(open)} s after plate down (${down >= 0})`);
    }
    for (const hold of [0.5, 1]) {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 480, ay: 560, bx: 480, by: 800, t: T }, { ax: 300, ay: 560, bx: 300, by: 900, t: T }],
        fills: [{ kind: WATER, x0: 300, x1: 480, y1: FLOOR, count: 240 }],
        plates: [{ id: 'A', x0: 50, x1: 150, y: FLOOR }],
        doors: [{ id: 'D', ax: 480, ay: 800, bx: 480, by: FLOOR + 8, t: 8, plate: 'A' }],
        nib: { x: 200, y: FLOOR - 24 },
      });
      const w = new World(level);
      w.command({ kind: 'goto', x: 100 });
      stepsUntil(w, 'plateDown', 400);
      run(w, Math.round(hold * STEPS_PER_SECOND));
      w.command({ kind: 'goto', x: 220 });
      const t0 = w.steps;
      stepsUntil(w, 'doorShut', 600);
      run(w, 120);
      say(`240 water in a 180-px tank behind a 100-px door; Nib on the plate ${hold} s (door shut ${sec(w.steps - 120 - t0)} s after he left): ${count(w, WATER, (x) => x > 490)} grains passed`);
    }
  });

  it('gas: rise speed, through water, venting, a dome spilling, Nib under a lip', () => {
    {
      const w = new World(tombRoom({ walls: [...tombRoom({}).walls, { ax: 300, ay: 800, bx: 500, by: 800, t: T }], fills: [{ kind: GAS, x0: 340, x1: 460, y1: 808, count: 30 }], pins: [] }));
      // The gas sits under a shelf at 800; let it out by moving it: measure free rise from 790 up.
      const g = w.grains;
      for (let i = 0; i < g.count; i++) g.y[i] = g.y[i]! - 30;
      const ys: number[] = [];
      for (let s = 0; s < 360; s++) {
        w.step();
        let sum = 0;
        let n = 0;
        for (let i = 0; i < g.count; i++) if (g.kind[i] === GAS) (sum += g.y[i]!), n++;
        ys.push(sum / n);
      }
      const v = (ys[59]! - ys[179]!) / 120;
      say(`gas free rise: ${(v * STEPS_PER_SECOND).toFixed(0)} px/s between 0.5 and 1.5 s (mean y ${ys[0]!.toFixed(0)} → ${ys[359]!.toFixed(0)} in 3 s)`);
    }
    {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 300, ay: 450, bx: 300, by: 900, t: T }, { ax: 400, ay: 450, bx: 400, by: 900, t: T }],
        pins: [{ id: 'P', ax: 290, ay: 800, bx: 410, by: 800, t: 7 }],
        fills: [{ kind: WATER, x0: 300, x1: 400, y1: 792, count: 100 }, { kind: GAS, x0: 300, x1: 400, y1: 808, count: 30 }],
      });
      const w = new World(level);
      let top = 999;
      for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === WATER) top = Math.min(top, w.grains.y[i]!);
      w.pull('P');
      const t = stepsWhile(w, () => {
        let surface = 999;
        for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === WATER) surface = Math.min(surface, w.grains.y[i]!);
        return w.steps > 30 && count(w, GAS, (_, y) => y > surface) === 0;
      }, 1200);
      say(`gas through a 100-wide water column ${(792 - top).toFixed(0)} px deep: every grain above the water's surface in ${sec(t)} s`);
    }
    {
      const v = vent(500);
      const level = tombRoom({ walls: [...tombRoom({}).walls, ...v.walls], pins: [v.pin], drains: [v.drain], fills: [{ kind: GAS, x0: 250, x1: 550, y1: 508, count: 100 }] });
      const w = new World(level);
      let deepest = 0;
      for (let i = 0; i < w.grains.count; i++) deepest = Math.max(deepest, w.grains.y[i]!);
      w.pull('V');
      const half = stepsWhile(w, () => count(w, GAS) <= 50, 3000);
      const all = stepsWhile(w, () => count(w, GAS) <= 2, 6000);
      say(`100 gas under a 300-px ceiling (settled ${(deepest - 500).toFixed(0)} px deep, lips 50 px): 40-px vent takes half in ${sec(half)} s, all but 2 in ${sec(half + all)} s`);
    }
    for (const n of [150, 250, 350, 450]) {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 200, ay: 700, bx: 200, by: 900, t: T }, { ax: 600, ay: 700, bx: 600, by: 900, t: T }, { ax: 320, ay: 760, bx: 480, by: 760, t: T }, { ax: 320, ay: 760, bx: 320, by: 840, t: T }, { ax: 480, ay: 760, bx: 480, by: 840, t: T },
          { ax: 210, ay: 500, bx: 210, by: 640, t: T }, { ax: 590, ay: 500, bx: 590, by: 640, t: T }],
        pins: [{ id: 'W', ax: 200, ay: 648, bx: 600, by: 648, t: 7 }],
        fills: [{ kind: GAS, x0: 320, x1: 480, y1: 768, count: 60 }, { kind: WATER, x0: 210, x1: 590, y1: 640, count: n }],
      });
      const w = new World(level);
      w.pull('W');
      run(w, 900);
      let surface = 999;
      for (let i = 0; i < w.grains.count; i++) if (w.grains.kind[i] === WATER && (w.grains.x[i]! < 310 || w.grains.x[i]! > 490)) surface = Math.min(surface, w.grains.y[i]!);
      say(`(water outside the dome rests at y ${surface.toFixed(0)}; lip 840) dome 160 px wide, lip 80 px below its roof, 60 gas, in a 400-px basin whose floor is 52 px under the lip: ${n} water poured in → ${count(w, GAS, (x, y) => !(x > 320 && x < 480 && y > 760 && y < 840))} gas out of the dome`);
    }
    for (const lip of [800, 820, 840]) {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 320, ay: lip - 80, bx: 480, by: lip - 80, t: T }, { ax: 320, ay: lip - 80, bx: 320, by: lip, t: T }, { ax: 480, ay: lip - 80, bx: 480, by: lip, t: T }],
        fills: [{ kind: GAS, x0: 320, x1: 480, y1: lip - 72, count: 60 }],
      });
      const w = new World(level);
      let deepest = 0;
      for (let i = 0; i < w.grains.count; i++) deepest = Math.max(deepest, w.grains.y[i]!);
      w.command({ kind: 'goto', x: 700 });
      run(w, 900);
      const s = w.status;
      say(`Nib walks under a resting dome (60 gas, lowest grain ${(deepest).toFixed(0)}; lip at ${lip}, Nib's head at ${FLOOR - 48}, lip-to-head ${FLOOR - 48 - lip} px): ${s.state === 'lost' ? `${s.cause} at x ${w.nib.x.toFixed(0)}` : `fine, at x ${w.nib.x.toFixed(0)}`}`);
    }
  });

  it('gas: under a sleeping coin heap, under a raft, settling', () => {
    {
      const level = tombRoom({
        pins: [{ id: 'P', ax: 280, ay: 800, bx: 520, by: 800, t: 7 }],
        walls: [...tombRoom({}).walls, { ax: 300, ay: 700, bx: 300, by: 900, t: T }, { ax: 500, ay: 700, bx: 500, by: 900, t: T }],
        fills: [{ kind: COIN, x0: 300, x1: 500, y1: 792, count: 80 }, { kind: GAS, x0: 300, x1: 500, y1: 808, count: 40 }],
      });
      const w = new World(level);
      w.pull('P');
      const t = stepsWhile(w, () => count(w, GAS, (_, y) => y > 700) === 0, 1200);
      say(`80 coins dropped onto 40 gas in a 200-px pit: the gas is all out above the pit in ${t < 0 ? 'never (10 s)' : `${sec(t)} s`}; coins asleep ${w.grains.set.slice(0, w.grains.count).reduce((n, v, i) => n + (w.grains.kind[i] === COIN && v ? 1 : 0), 0)}`);
    }
    {
      const v = vent(500);
      const level = tombRoom({ walls: [...tombRoom({}).walls, ...v.walls], pins: [v.pin], drains: [v.drain], fills: [{ kind: GAS, x0: 250, x1: 550, y1: 508, count: 100 }] });
      const w = new World(level);
      const t = stepsWhile(w, () => w.settled, 1200);
      say(`a resting gas dome (100 gas) counts as settled after ${sec(t)} s of play`);
    }
    {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 200, ay: 600, bx: 200, by: 900, t: T }, { ax: 600, ay: 600, bx: 600, by: 900, t: T }],
        pins: [{ id: 'P', ax: 190, ay: 860, bx: 610, by: 860, t: 7 }],
        fills: [{ kind: GAS, x0: 200, x1: 600, y1: 868, count: 30 }, { kind: WATER, x0: 200, x1: 600, y1: 852, count: 200 }],
        rafts: [{ x: 400, y: 790 }],
      });
      const w = new World(level);
      w.pull('P');
      run(w, 600);
      const under = count(w, GAS, (x, y) => Math.abs(x - w.boulders[0]!.x) < 40 && y > w.boulders[0]!.y && y < w.boulders[0]!.y + 40);
      say(`30 gas rising through a pool under a raft: after 5 s ${under} under the raft, ${count(w, GAS, (_, y) => y < 700)} above the pool, raft moved ${(w.boulders[0]!.x - 400).toFixed(0)} px`);
    }
  });

  it('fire: burn-out, blast reach, dousing', () => {
    {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 320, ay: 500, bx: 480, by: 500, t: T }, { ax: 320, ay: 500, bx: 320, by: 640, t: T }, { ax: 480, ay: 500, bx: 480, by: 640, t: T }],
        fills: [{ kind: GAS, x0: 320, x1: 480, y1: 508, count: 120 }],
      });
      const w = new World(level);
      const g = w.grains;
      let low = 0;
      for (let i = 1; i < g.count; i++) if (g.y[i]! > g.y[low]!) low = i;
      g.burn[low] = 1;
      const t = stepsWhile(w, () => count(w, GAS) === 0, 600);
      say(`120 gas in a 160-px dome lit at its lowest grain: all burnt in ${sec(t)} s (${t} steps)`);
    }
    for (const gap of [36, 40, 44, 48, 52, 60, 64, 68]) {
      // A single burning grain at (400, 600); a cracked bar `gap` px to its right; Nib `gap` px below (grain to Nib's centre).
      const level = tombRoom({ walls: [...tombRoom({}).walls, { ax: 400 + gap, ay: 500, bx: 400 + gap, by: 700, t: T }], bars: [4], cracked: [4], nib: { x: 400, y: FLOOR - 24 } });
      const w = new World(level);
      w.grains.add(GAS, 400, 600);
      w.grains.burn[w.grains.count - 1] = 1;
      w.nib.y = 600 + gap;
      // Hold Nib in the air for the measure.
      for (let s = 0; s < 10; s++) {
        w.nib.vy = 0;
        w.nib.y = 600 + gap;
        w.grains.x[w.grains.count - 1] = 400;
        w.grains.y[w.grains.count - 1] = 600;
        w.step();
      }
      say(`blast from one grain: bar centre line ${gap} px away ${w.broken[4] ? 'BROKEN' : 'stands'}; Nib's centre ${gap} px away ${w.status.state === 'lost' ? w.status.cause : 'fine'}`);
    }
    for (const n of [3, 10]) {
      const level = tombRoom({
        walls: [...tombRoom({}).walls, { ax: 380, ay: 560, bx: 380, by: 640, t: T }, { ax: 420, ay: 560, bx: 420, by: 640, t: T }],
        pins: [{ id: 'P', ax: 370, ay: 648, bx: 430, by: 648, t: 7 }],
        fills: [{ kind: WATER, x0: 380, x1: 420, y1: 640, count: n }],
        braziers: [{ x: 400, y: FLOOR }],
      });
      const w = new World(level);
      w.pull('P');
      const t = stepsUntil(w, 'doused', 600);
      say(`${n} water dropped from 650 onto a bowl at floor 892 (flame at ${FLOOR - 34}, ~210 px below): doused ${t < 0 ? 'never' : `in ${sec(t)} s`}, ${count(w, WATER)} water left`);
    }
  });

  it('frog: rise, vent-to-drop, drift, wash in a pool', () => {
    {
      const level = tombRoom({ walls: [...tombRoom({}).walls, { ax: 300, ay: 300, bx: 300, by: 600, t: T }, { ax: 420, ay: 300, bx: 420, by: 600, t: T }], fills: [{ kind: GAS, x0: 300, x1: 420, y1: 308, count: 220 }], blots: [{ x: 360, y: 520, animal: 'frog' }] });
      const w = new World(level);
      const f = w.blots[0]!;
      const y0 = f.y;
      const puff = stepsUntil(w, 'frogPuff', 60);
      run(w, 60);
      say(`frog in a 120-wide gas column: puffs ${puff} steps in, rises ${(y0 - f.y).toFixed(0)} px in the next 0.5 s (${(((y0 - f.y) / 60) * STEPS_PER_SECOND).toFixed(0)} px/s); rests at y ${(run(w, 240), f.y).toFixed(0)} (ceiling 308)`);
    }
    {
      const v = vent(650, 250, 550, 50);
      const level = tombRoom({
        walls: [...tombRoom({}).walls, ...v.walls],
        pins: [v.pin],
        drains: [v.drain],
        fills: [{ kind: GAS, x0: 250, x1: 550, y1: 658, count: 120 }, { kind: WATER, x0: 250, x1: 550, y1: FLOOR, count: 150 }],
        blots: [{ x: 300, y: 680, animal: 'frog' }],
      });
      const w = new World(level);
      const f = w.blots[0]!;
      run(w, 120);
      const puffed = f.puffed;
      const x0 = f.x;
      w.pull('V');
      const drop = stepsUntil(w, 'frogDrop', 3000);
      const dx = f.x;
      const y = f.y;
      const washed = stepsUntil(w, 'washed', 1200);
      say(`frog puffed ${puffed} in a 120-gas dome over a pool: drops ${sec(drop)} s after the 40-px vent opens (drifted ${(dx - x0).toFixed(0)} px while it waited), falls from y ${y.toFixed(0)} → washed ${washed < 0 ? 'never' : `${sec(washed)} s after the drop`} (landed ${(f.x - dx).toFixed(0)} px from where it dropped)`);
    }
  });

  it('prints', () => {
    expect(out.length).toBeGreaterThan(0);
  });
});
