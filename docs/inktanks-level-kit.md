# InkTanks: level kit

For content agents building and tuning levels. The design is in `docs/inktanks-design.md`; this page is how to write a level and check it. Code: `games/inktanks`. Everything below was measured on the engine as of Nov 14.

## The loop

1. Edit a layout in `src/content/ch1/levels/levelNN.ts` (one file per level, listed in `levels/index.ts`).
2. `npm run lab -- --map N` to see it, then `npm run lab -- --level N --seeds 10` to play it.
3. Aim for: pass 7–9 of 10, time 3–5 min, main medal ≥ 70%, each bonus 20–70%. Change the layout, not the engine.
4. Before you finish: `npm run lab -- --chapter --seeds 3` (no-grind must PASS on all seeds), `npx tsc --noEmit -p .` and `npx vitest run`.

A bad layout fails at load time with a `LevelError` that lists every problem (unknown point, road, kind or tag, a place off the map or in water, a routed role without a route, a bad tank).

## Lab commands (run from `games/inktanks`)

| Command | What it prints |
|---|---|
| `npm run lab -- --map 3` | The ASCII map and legend only |
| `npm run lab -- --level 3` | Map, one line per seed (10 seeds), the summary line |
| `npm run lab -- --level 3 --seeds 30 --seed 100` | More seeds, other seeds |
| `npm run lab -- --level 3 --no-map` | Skip the map |
| `npm run lab -- --level 3 --tank cannon2/medium1/halftracks1 --kits 2` | Another player tank / kits |
| `npm run lab -- --all --seeds 10` | One summary line per level |
| `npm run lab -- --chapter --seeds 3` | The whole-chapter run and the no-grind check |

The player's seat is a bot ("a decent casual player"). Its default tank per level is `TYPICAL_TANK` in `src/sim/lab.ts`: what the chapter run has fitted by then (L1–2 `machinegun1/light1/wheels1`; L3–5 `cannon1/medium1/halftracks1`; L6–10 `cannon1/medium1/wheels2`), with 1 kit on L1–2 and 2 after. Re-measure with `--chapter` after big changes.

A seed line: `seed 3  PASS  2:31  medals xx.  kills 4  intel 18  hp 45%  foes left 0/5  alarm yes  end: objective`. `medals` is main, bonus 1, bonus 2. `end` is `objective`, `destroyed`, `time` or the objective's fail (`the truck was destroyed`, `a crew was lost`, `the convoy got away`, `the courier got away`).

Map legend: `S` start, `G` guard, `P` patrol, `W` wave (entry point), `V` convoy, `H` hunter, `R` runner, `U` turret, `A` ace, `B` boss, `t` truck, `c` crate, `T` target, `C` cage, `Z` hold zone, `F` flag, `O` recon spot, `E` exit, `X` pick-up/home, `-` roads, `#` solid, `+` flattenable, `"` cover, `~` water, `=` bridge, `:` dirt, `,` mud, `.` sand. One character is 80 × 60 px; a screen is 12 × 9.

## The layout format (worked example)

```ts
import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_EARLY, path, row, TANK } from './kit';

export const LEVEL_01: LevelDef = {
  id: 'ch1-01', number: 1, name: 'First Tracks', type: 'assault',
  briefing: 'Four Boar scouts are poking round the old farm. Knock them out.',
  teaches: 'Drive, aim, shoot, swap a part, intel',
  map: {
    cols: 3, rows: 2, base: 'grass',                     // screens of 960 × 540; 2×2 to 4×4
    terrain: [path('dirt', [at(0.2, 1.6), at(2.8, 0.5)], 70), blob('water', 520, 360, 110)],  // later patches paint over earlier
    structures: [{ kind: 'barn', x: 1900, y: 300 }, ...row('fence', 1000, 760, 4, 60), ...each('oak', [[120, 120], [300, 90]])],
    points: { yard: { x: 1950, y: 420 }, crops: { x: 1250, y: 350 } },
    roads: { pond: [{ x: 300, y: 600 }, { x: 680, y: 600 }, { x: 680, y: 160 }, { x: 300, y: 160 }] },
  },
  start: { x: 200, y: 900 }, startHeading: -0.3,         // a point name or {x, y}; radians, 0 = east
  enemies: [
    { role: 'patrol', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 300, y: 160 }, route: 'pond', hpMult: 0.6 },
    { role: 'guard', clan: 'boars', tank: 'cannon1/light1/wheels1', at: 'crops', hpMult: 0.4 },
  ],
  crates: [{ at: { x: 520, y: 700 }, content: { family: 'cannon', mk: 1 } }, { at: { x: 1250, y: 980 }, content: 'kit' }, { at: { x: 2750, y: 420 } }],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'swaps', n: 1 }, { kind: 'noKit' }],
  timeLimit: undefined,                                   // seconds; the level fails when it runs out
  loot: LOOT_EARLY,                                       // for crates without content
};
```

- **Coordinates** are world px from the top-left. `at(sx, sy)` takes screens. Grounds: grass, grassDry, dirt, sand, mud, water, bridge.
- **Tanks** are `gun+Mk/hull+Mk/drive+Mk`. Chapter 1 families: machinegun, cannon, rockets; light, medium, heavy; wheels, halftracks, tracks. `TANK` in `kit.ts` has common ones.
- **Enemy knobs:** `role`, `clan` (boars, weasels, crows), `tank`, `at`, `route`, `when` (waves), `leash`, `sight`, `name`, `ace`, `hpMult`, `speedMult`, `kits` (default 0: it fights to the end; 1 lets it back off and repair), `truck` (no gun, drawn as a truck).
- **Intel drives unlocks.** Every wreck gives intel on all its parts (2 per Mk I part). Unlock costs 3, so two kills of a family unlock it. Levels 1–2 must field Cannon, Medium and Half-tracks; Rockets and Tracks must appear by level 5, or the no-grind check fails.
- **Structure kinds** are in `src/content/ch1/kinds.ts` (placeholders replaced by the world art's footprints where the art exists): farmhouse, barn, houseA, houseB, shed, wallBrick(V), wallStone(V), fence(V), oak, pine, bush, crops, rockA/B/C, bridgeRail(V), fuelBarrels, radarMast, hangar, fortWall(V), fortGate, fortTower, wagon, cage. `kit.ts` has `row`, `each`, `bridge`, `farmyard`.

## Roles

| Role | Does | Knobs |
|---|---|---|
| guard | Sits at its post. Fights what it sees within its leash (320 px from the post), then goes back. | `leash`, `sight` |
| patrol | Drives its road back and forth; fights what it sees. | `route`, `sight` |
| wave | Arrives at `at` when `when` comes (seconds, `'alarm'`, or `'stage'`), heads for the objective (hold zone, truck, flags) or you. | `when` |
| convoy | Follows its road to the end and leaves the map (no wreck). Only shoots back, for 4 s after a hit. | `route`, `truck`, `speedMult` |
| hunter | Always knows where you are and comes for you. | |
| runner | Like a convoy (flees down its road), for Chase. | `route`, `speedMult` |
| turret | Never moves; fights in range. | `sight` |

**Spotting:** an unalerted bot spots you within its sight (guard 340, patrol 380, turret 400, others 440 px); alerted or fighting, 440. Bushes and crops hide a tank that hasn't fired for 2 s, unless it's within 100 px.

**The alarm:** a guard, patrol or turret that sees you (or anything of yours) or is hit by you calls every guard and patrol within **420 px** of itself to that spot for 25 s. Called bots that then see you call again, so alarms chain through a camp: post guards more than 420 px apart to make "one at a time" possible. The first alarm releases `when: 'alarm'` waves and spoils the `noAlarm` bonus.

**Stage:** `when: 'stage'` waves arrive when the objective's turn comes: Salvage on the pick-up, Rescue on the first broken cage.

## Objectives

| Kind | Params | Done | Fails |
|---|---|---|---|
| assault | – | every enemy tank destroyed (timed waves still to come count) | – |
| raid | `tag`, `label`, `need?` | `need` tagged structures broken (default all) | – |
| escort | `road`, `truckHp`, `speed`, `leash?` | truck reaches the road's end; it only drives with you within 480 px | truck destroyed |
| hold | `zone`, `radius`, `seconds` | `seconds` in the zone in all | – |
| ace | an enemy with `ace: true` | the ace destroyed; its intel is taken at once | – |
| rescue | `tag` (cages), `home`, `crewHp?` | every crew within 130 px of home | a crew lost |
| ambush | `mayEscape?` (default 0) | every convoy tank stopped | more than `mayEscape` got away |
| salvage | `at`, `pickup` | carry the prototype within 90 px of the pick-up | – |
| breakout | `exit`, `radius?`, `artillery?` + `timeLimit` | reach the exit | the timer |
| recon | `spots`, `radius?` (150), `dwell?` (2 s) | `dwell` s unseen near each spot | – (being seen raises the alarm) |
| capture | `flags`, `radius?` (140), `capture?` (6 s), `holdAll?` (5 s) | all flags yours at once for `holdAll` | – |
| chase | `base` + one `runner` | runner destroyed | runner reaches its road's end |
| fortress | `boss` (name, hp, road, speed, turrets) | boss hull destroyed (shielded to 25% damage while turrets stand) | – |

Always: your tank destroyed fails; `timeLimit` out fails; a hard cap of 10 min ends any run.

Freed crews ride at 120 px/s, 200 HP, follow in a line, and stay down while an enemy is within 380 px of them. Enemies don't aim at crews; misses and splash still hit them. Carrying the prototype slows you to 80% and tells every guard and patrol where you are every 1.5 s. Artillery marks a spot ahead of you every `every` s and lands after `warn` s; it leads by 60% of your travel, so a moving tank outruns it and a stopped one is hit.

**Bonus kinds:** `kills n`, `noKit`, `time under` (s), `noAlarm`, `truckHp min` (share), `heavyWithRockets`, `swaps n`, `intel n`.

## Measured numbers

- **Screen** 960 × 540 native px; nav/ground cell 40 px.
- **Speeds** (open ground, px/s): MG Light Wheels 209, Cannon Light Wheels 190, Cannon Medium Half-tracks 128, Cannon Medium Wheels II 203, Rockets Medium Tracks 95, Cannon Heavy Tracks 91. Sand −30% for Wheels, mud −20% except Tracks.
- **HP** (×2.5 scale): Light Wheels 300, Medium Wheels 500, Medium Half-tracks 700, Medium Tracks 950, Heavy Tracks 1520.
- **Time to kill at 100% hits** (attacker gun → target hull/drive):

| Gun | Light/Wheels | Light/Half-tr. | Medium/Half-tr. | Medium/Wheels II | Medium/Tracks | Heavy/Tracks |
|---|---|---|---|---|---|---|
| MG I | 6.2 s | 17.5 s | 39 s | 19 s | 96 s | 154 s |
| MG II | 4.7 s | 12.1 s | 33 s | 16 s | 80 s | 128 s |
| Cannon I | 8.9 s | 12.5 s | 23 s | 17 s | 36 s | 70 s |
| Cannon II | 7.3 s | 10.3 s | 19 s | 13 s | 29 s | 54 s |
| Rockets I | 20 s | 17 s | 32 s | 43 s | 36 s | 68 s |

  Real fights hit 60–75% at close range, so add about a third. Use `hpMult` to make "scouts" (0.4–0.6) rather than new parts.
- **Chapter 1 bots:** aim error 0.28 rad, decide every 0.5 s, hold fire on 35% of decisions. The player stand-in: 0.14 rad, 0.28 s, never holds.

## Engine quirks (measured)

- **World-art footprints are much smaller than the old placeholders.** Walls are 64 px long and 4–14 px thick (brickWall, stoneWall, fortWall 63 × 14, fence 64 × 3), the fort gate 116 × 20, a wagon 84 × 24, an oak trunk 9 × 7 (canopies don't block). Lay walls **60 px apart** for a solid line; 120 apart leaves tank-sized gaps.
- A **closed breakable gate** blocks the sim player's path: its bot doesn't know to shoot a gate open. Leave gateways open or tag the gate as a raid target.
- **Terrain order matters:** a road painted after a river turns the bridge into dirt over water (still crossable). Paint roads first, then water, then bridge decks.
- **Machineguns barely scratch armour 7+** (the damage floor is a third): an MG starter can't kill a Medium hull in a fair fight. Give level 1–2 a Cannon crate, and keep Medium enemies there at hpMult ≤ 0.4.
- Short levels: the stand-in drives straight to the objective, so a level is as long as its fights. Hold is about the hold time plus the drive; Escort is the road length over the truck speed. Breakout needs a doubling-back route (level 9) to last.
- The chapter run's workshop may fit Wheels II over Half-tracks (more speed, less HP), which makes level 10 harder than with Half-tracks.
