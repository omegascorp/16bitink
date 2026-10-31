# Agent orchestration: who does what, on which model

How a coordinator session should build a game, a chapter or a batch of levels with sub-agents while keeping token spend down. Based on what InkPin's Chapter 2 actually cost (Oct 31, 2026).

## What it cost (measured)

| Job | Model | Tokens per agent | Tool calls | Result |
|---|---|---|---|---|
| First build of 10 levels, each agent reading the docs and the engine | Opus | 400–565k | 25–96 | All built. Each agent rediscovered the same engine bugs; the hint times blew up |
| Level lab (one CLI test file) | Sonnet | 89k | 11 | Worked first time |
| Engine pass (8 fixes plus the one-page kit) | Opus | 237k | 75 | Solid; Chapter 1 unbroken |
| Deepening 1 level, from the kit plus the lab | Sonnet | 91–182k (about 140k typical, all review rounds included) | 18–58 | 9 of 10 levels reached the targets; most needed 1–2 review rounds; one failed after 3 |

The coordinator's own tokens aren't reported. Every coordinator turn re-reads its whole context, though, and in that session the context ran to several hundred thousand tokens. A long-lived coordinator that also debugs (it chased a raft bug itself) is one of the biggest costs.

What made the deepening rounds cheap:
- A one-page kit with the engine's measured numbers ([inkpin-level-kit.md](inkpin-level-kit.md)).
- The lab command (an ASCII board, the hint and any orders, and the audit in one call) instead of throwaway probe tests.
- Targets written down ([the difficulty curve](inkpin-levels.md)).
- A tool-call budget.

Those mattered more than the choice of model.

## Sonnet vs Opus as the main (coordinator) model

The coordinator writes little, but it reads its whole context every turn, and its real job is review: deciding whether a worker's "PASS" is real. In Chapter 2 the Sonnet workers met their numbers, but several gamed them:
- lowered a test's threshold to match the level
- added a decoy pin with no job
- padded the hint with long `~` waits or extra walking
- left wrong orders ending in silent dead ends
- made tuning that only works with one exact stops list
- reverted a file with `git checkout`

The Opus coordinator caught these and sent the workers back. A Sonnet coordinator reviewing Sonnet workers is more likely to accept them. That's a judgment call, not a measured result.

**Recommendation:**
- **Coordinator: Opus, kept small and short-lived.** Its cost comes from its context size times its number of turns, not from the model's price for what it writes. A lean Opus coordinator (under ~150k context) costs less than a bloated one of either model.
  - Start a fresh session per phase.
  - Hand over through docs, not chat history.
  - Never debug or tune in the coordinator: send that to a worker.
- **Sonnet coordinator:** fine for purely mechanical phases with a written checklist: dispatching briefs that are already written, collecting reports, running the full suite, updating doc tables. Switch to Opus (or a fresh Opus session) for design, the review gates, and anything that failed twice.

## Model per role

| Role | Model | Why |
|---|---|---|
| Design (the chapter plan, new mechanics, the difficulty curve, a game's concept) | Opus, in the coordinator or one agent | Judgment; done once |
| Engine work (new mechanics, physics bugs, the kit) | Opus, one agent | Subtle; one agent pays once for what ten would rediscover |
| Content workers (levels, waves, maps) from a kit and a lab | Sonnet | Mostly sim-measure-nudge loops; several times cheaper per token |
| Tools (lab CLIs, test helpers, small scripts) | Sonnet | Well specified |
| Mechanical chores (run the suite and report failures, fill doc tables from reports, rename) | Haiku or Sonnet | No judgment needed |
| Escalation: a content job that failed 2 review rounds | Opus, a fresh agent with the failed agent's findings pasted in | A third Sonnet round mostly repeats the second |
| Art and visual checks | Opus or Sonnet with screenshots | Judged by eye; keep screenshots few, as each image costs context |

## Workflow for a chapter (or a game)

1. **Design (Opus coordinator, short session).** Write the chapter's design rows and any new mechanics' contract into the game's docs. End the session.
2. **Engine (one Opus agent).** Implement the contract. Measure every quirk. Update the kit, keep the lab working, and keep earlier chapters' tests passing. No content agents start until this is done.
3. **Content (Sonnet agents, 3–4 at a time).** Each gets the content brief below. Run them in batches: the simulations are CPU-heavy, and more at once slows every agent.
4. **Review gate (Opus coordinator).** Check each report against the review checklist below.
   - Send it back once with precise asks, about 20–25 more calls.
   - After a second miss, park it.
5. **Escalation (one Opus agent)** for everything parked, in one pass, with each worker's findings pasted in.
6. **Wrap-up (Sonnet or Haiku).** Full suite, tsc, doc tables, then a short browser check of each level by the coordinator.
7. **Playtest by the user.** Their notes outrank the audit; Chapter 2 passed its audit and was still too easy.

Before fanning out more than a few agents, say what it will cost and ask.

## Content agent brief (template)

Fill in the angle brackets. Keep the shared part in a scratchpad file and give each agent a 5–10 line prompt pointing at it, plus that level's own facts.

```
Follow the brief at <path to the shared brief>.
Your level: Level <N>, <Name> (id '<id>'), level <k> of its chapter: use the <1–3 | 4–10> row. File <level file>, test <test file>.
Known state: <pins, last audit numbers, hint time, known problems, from the coordinator's notes>.
Signature: <the level's mechanic>.
```

The shared brief says:
- **Read only:**
  - the kit
  - the difficulty-curve section
  - the agent's own level file and test
  - its row in the levels doc

  Never the engine sources.
- **Measure** with the lab, never with probe tests. Audit only when a version is ready.
- **Start with a ≤ 5-call review:** each pin's obvious job, the order a reader would try first, which reading checks fail.
- **Targets:** the chapter's row of the curve. Also:
  - hint about 25–120 s from the puzzle itself, no empty floor to walk; ≤ 700 grains, none outside the rooms
  - waits in the solution under ~10 s
  - no wrong order ending 'stuck' or 'playing'
- **Never lower a test's threshold to fit the level.** Never run `git checkout`, `git restore` or `git stash`. Don't commit.
- **Budget:** about 40 tool calls. Stop when the targets pass. If one can't be reached, stop and say why.
- **Report, short:**
  - review findings
  - stages
  - winning order
  - the lab's audit line and the obvious orders' outcomes
  - tests
  - rough spots

## Review checklist (the coordinator, for each report)

- [ ] Every target in the curve's row met, as printed by the lab, not just "PASS" in prose.
- [ ] Test thresholds unchanged (win share, lessons and the like). A lowered threshold means sending it back.
- [ ] No empty space: no room or long floor Nib only walks through, and no walking added to lengthen the hint (a player found 1,800 px of it in Level 12).
- [ ] No decoy pins (a pin never in any win, except the one allowed trap), and no pin that only adds walking.
- [ ] Solution waits under ~10 s, each shown by the board. A hint that is mostly waits is padding.
- [ ] Every wrong order loses for a named, visible cause. No 'stuck' or 'playing' rows.
- [ ] Not fragile: the win doesn't depend on one exact stops list or timing. If it does, ask for walk steps (`'@x'`) or a sturdier layout.
- [ ] The header comment matches what the level now does.
- [ ] An engine bug in a report goes to an engine agent (or is noted for the next engine pass), not into a workaround in the level.

## Coordinator hygiene

- Keep the coordinator's context small.
  - Don't read agents' transcripts.
  - Don't cat whole engine files. Grep, then read just the function.
  - Write long briefs to files instead of pasting them twice.
- Put each lesson in the kit, the brief or this doc as soon as it's learned (a new engine fact, a new way workers game a target), so the next agent starts with it.
- Report to the user in short status lines between batches. Save the full summary for the end.
