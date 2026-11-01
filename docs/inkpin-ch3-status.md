# InkPin Chapter 3 status (handover)

Where the Desert Tomb build stands, so a fresh coordinator session can pick it up. Workflow: [agent-orchestration.md](agent-orchestration.md). Brief for level agents: [inkpin-level-brief.md](inkpin-level-brief.md). Engine reference: [inkpin-level-kit.md](inkpin-level-kit.md).

## Done (Nov 1, 2026)
- Engine: plates, doors, 'sealed', gas, fire bowls, blasts, the rain frog, the Tomb Guardian boss (breath, coffin lid), lab and audit lines (decoys, walk-only, dead ends, ROBUST). Two engine passes; numbers in the kit.
- Levels 21 The Sealed Door, 22 Bad Air, 23 The Blasting Chamber: built by Opus, every curve target passes. They are the worked examples for the rest.
- Harness fix: the bot and the audit wait 2 s for 'sealed' on levels with `seals`.

## Next
1. Levels 24–26 with Sonnet agents, one each, from the brief (3 at a time). If 2 of 3 miss their targets after one review round, switch the rest to Opus.
2. Levels 27–29 the same way.
3. Level 30, the Tomb Guardian, with Opus (boss logic is built: see the kit's boss section).
4. Wrap-up: full suite, tsc, browser check of 21–30, docs rows, then the user's playtest.

## For the user's playtest
- Level 22: the two vent pins (T, U) work in either order; four rounds couldn't make them order-dependent. Merge them if it reads as a decoy.
- Level 22's hint is 15.5 s and level 23's 18 s: short, but all puzzle.
- Level 21: win share is at the 20% limit; V before W still wins.
- Level 23: one order (G,W,X,L,S) times out instead of losing; there is no 'blasted' loss.

## Open engine items
- A gas pool can burn only partly from one spark in a wide dome (kit has the numbers); consider making a lit pool burn whole.
- Water trapped under freshly set stone can churn for 28–55 s and delay 'sealed'.

## What it cost
Design 173k · engine passes 384k + 297k · Sonnet first builds of 21–23 (all missed) ~612k · Opus builds of 21–23 ~987k. About 2.45M tokens for the engine and three levels.
