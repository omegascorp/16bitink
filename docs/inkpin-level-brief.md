# Build one InkPin level (brief for level agents)

The shared brief every level agent follows. Written for Chapter 3 (the Desert Tomb); for another chapter, swap the chapter name, the files' `ch3` and the targets row. Worked examples: levels 21–23 (src/level/ch3/sealedDoor.ts, badAir.ts, blastingChamber.ts), built by Opus and passing every target.

Repo /Users/omegascorp/Projects/16bitink, game in games/inkpin, branch feat/inkpin. Don't commit or change git state; never run `git checkout`, `git restore` or `git stash` (other agents build other levels in the same tree at the same time). To undo, rewrite your own file. Touch only your level file, your test, your level's line in src/level/index.ts, and your row in docs/inkpin-levels.md.

**Read only:**
- docs/inkpin-level-kit.md: the engine, numbers, rules, lab, and the Chapter 3 section (plates, doors, 'sealed', gas, fire, blasts, frogs).
- docs/inkpin-levels.md: "## The difficulty curve" (chapter 3 uses chapter 2's row) and your level's row in "## 3. The Desert Tomb" (your design: build it).
- Levels 21–23 and their tests (src/level/ch3/, test/ch3-*.test.ts): the worked examples of plates, doors, 'sealed', gas, fire bowls and blasts. Copy their shape and header comments.
Don't read engine sources. If the kit is wrong or missing something, measure it with the lab and say so in your report; never work around an engine bug inside the level.

**Lab, not probe tests:** `cd games/inkpin && LAB=<id> [ORDERS="A,B|B,A"] [BOARD=1] [STEPS=1] [AUDIT=1] npx vitest run test/lab --silent=false --testTimeout=3600000`. A play costs ~4 s CPU, an audit minutes: audit only a version you think is ready.

**Register** your level in src/level/index.ts: in `CHAPTER_3` at its place (21 first … 30 last) **only once every target passes**; until then it stays in `CHAPTER_3_DRAFTS`, which the game doesn't list (an unfinished draft once showed up as the wrong level number and couldn't be won). Other agents edit the same file: re-read it right before your edit and change only your own entry.

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
- **Board size like Chapters 1–2:** view ≥ ~1300 px wide (or ≥ ~1000 tall for a tall level). Never shrink the board to make tuning easier, and never pad it to reach the width: a long empty channel or corridor counts as empty space (level 23's 800-px aqueduct was sent back); the user noticed Chapter 3's first boards shrinking to 620–840 px.
- No empty space: every room and stretch of floor has a job (a pin, liquid, gas, guard, coin, plate or route choice). Players notice floor they only walk.
- **Plates and doors in full view:** no pin, bar or wall lying over a plate's tile or a door's boss (level 21's plate hid under pin G and read as nothing). Leave the groove between a plate and its doors a clear route through open wall.
- **Readable at a glance:** a player who has never seen the level must be able to tell what each piece does from the board alone (the user couldn't read level 21's plate and doors). Give a new mechanic's first level a plain `tip`; keep links (plate → its doors) visible; check your board in the browser once, with one screenshot: `http://localhost:5203/dev/?level=N` for a listed level, `http://localhost:5203/dev/?draft=<id>` for one still in the drafts.
- Every wrong order loses for a visible, funny cause; none ends 'stuck' or 'playing'.
- Not fragile: the win survives the lab's shifted-timing replay; script walks with `'@x'` steps.
- Leave a few coins of slack in `coinsNeeded`.
- Characters are animals (guards need `animal`); collectibles are treats (gold, rubies), never gross; Nib is "he".

**Build in this order:** board and fills → the hint wins → the obvious orders lose → the audit → the tests. Follow the design row; if a part can't work, change the least you can and say why.

**Test** test/ch3-<id>.test.ts: the hint wins (and `seconds < 120`); the grain budget; one `it.each` row per tempting wrong order with its cause; gates win at both ends of their window. Run `npx vitest run test/ch3-<id> test/chapter3` and `npx tsc --noEmit -p .`.

**Docs:** update your row in docs/inkpin-levels.md's Chapter 3 table to what you built (that row only).

**Budget: about 45 tool calls.** Stop when the targets pass. If one can't be reached, stop and say why.

**Report, short:** stages (3–6 lines), winning order, the lab's audit line and the obvious orders' outcomes, tests, kit errors found, rough spots.
