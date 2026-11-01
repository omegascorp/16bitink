# Build one InkPin level (brief for level agents)

The shared brief every level agent follows. Written for Chapter 3 (the Desert Tomb); for another chapter, swap the chapter name, the files' `ch3` and the targets row. Worked examples: levels 21–23 (src/level/ch3/sealedDoor.ts, badAir.ts, blastingChamber.ts), built by Opus and passing every target.

Repo /Users/omegascorp/Projects/16bitink, game in games/inkpin, branch feat/inkpin. Don't commit or change git state; never run `git checkout`, `git restore` or `git stash` (other agents build other levels in the same tree at the same time). To undo, rewrite your own file. Touch only your level file, your test, your level's line in src/level/index.ts, and your row in docs/inkpin-levels.md.

**Read only:**
- docs/inkpin-level-kit.md: the engine, numbers, rules, lab, and the Chapter 3 section (plates, doors, 'sealed', gas, fire, blasts, frogs).
- docs/inkpin-levels.md: "## The difficulty curve" (chapter 3 uses chapter 2's row) and your level's row in "## 3. The Desert Tomb" (your design: build it).
- Levels 21–23 and their tests (src/level/ch3/, test/ch3-*.test.ts): the worked examples of plates, doors, 'sealed', gas, fire bowls and blasts. Copy their shape and header comments.
Don't read engine sources. If the kit is wrong or missing something, measure it with the lab and say so in your report; never work around an engine bug inside the level.

**Lab, not probe tests:** `cd games/inkpin && LAB=<id> [ORDERS="A,B|B,A"] [BOARD=1] [STEPS=1] [AUDIT=1] npx vitest run test/lab --silent=false --testTimeout=3600000`. A play costs ~4 s CPU, an audit minutes: audit only a version you think is ready.

**Register** your level in `CHAPTER_3` in src/level/index.ts at its place in the chapter (21 first … 30 last). Other agents edit the same list: re-read the file right before your edit and change only your own line.

**Targets** (your place in the chapter = number − 20):
| Place | Pins | Win share | Lessons | Top lesson | Late losses | Stuck/playing |
|---|---|---|---|---|---|---|
| 1–3 (21–23) | 5–6 | ≤ 20% | ≥ 4 | ≤ 45% | ≥ 50% | 0 |
| 4–10 (24–30) | 6–7 | ≤ 10% | ≥ 5 | ≤ 45% | ≥ 50% | 0 |
Also: the four reading checks (the lab prints the obvious orders: both must lose); the hint wins in about 25–120 s, with its time from the puzzle; ≤ 700 grains, none starting outside the rooms; 3–5 stages; every lab check the engine pass added (decoy pins, walking share, fragile wins) passes.

**Hard rules (the Chapter 2 review sent work back for each):**
- Never lower a threshold in a test to fit the level.
- No decoy pins: every pin is in the win and matters to the order, except at most one tempting trap that the design names.
- No padding: no `~` wait over ~10 s, no walks or stops added for time.
- No empty space: every room and stretch of floor has a job (a pin, liquid, gas, guard, coin, plate or route choice). Players notice floor they only walk.
- Every wrong order loses for a visible, funny cause; none ends 'stuck' or 'playing'.
- Not fragile: the win survives the lab's shifted-timing replay; script walks with `'@x'` steps.
- Leave a few coins of slack in `coinsNeeded`.
- Characters are animals (guards need `animal`); collectibles are treats (gold, rubies), never gross; Nib is "he".

**Build in this order:** board and fills → the hint wins → the obvious orders lose → the audit → the tests. Follow the design row; if a part can't work, change the least you can and say why.

**Test** test/ch3-<id>.test.ts: the hint wins (and `seconds < 120`); the grain budget; one `it.each` row per tempting wrong order with its cause; gates win at both ends of their window. Run `npx vitest run test/ch3-<id> test/chapter3` and `npx tsc --noEmit -p .`.

**Docs:** update your row in docs/inkpin-levels.md's Chapter 3 table to what you built (that row only).

**Budget: about 45 tool calls.** Stop when the targets pass. If one can't be reached, stop and say why.

**Report, short:** stages (3–6 lines), winning order, the lab's audit line and the obvious orders' outcomes, tests, kit errors found, rough spots.
