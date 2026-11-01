# InkPin Chapter 3 status (handover)

Where the Desert Tomb build stands, so a fresh coordinator session can pick it up. Workflow: [agent-orchestration.md](agent-orchestration.md). Brief for level agents: [inkpin-level-brief.md](inkpin-level-brief.md). Engine reference: [inkpin-level-kit.md](inkpin-level-kit.md).

## Done (Nov 1, 2026)
- Engine: plates, doors, 'sealed', gas, fire bowls, blasts, the rain frog, the Tomb Guardian boss (breath, coffin lid), lab and audit lines (decoys, walk-only, dead ends, ROBUST). Two engine passes; numbers in the kit.
- Levels 21 The Sealed Door, 22 Bad Air, 23 The Blasting Chamber: built by Opus, every curve target passes. They are the worked examples for the rest.
- Harness fix: the bot and the audit wait 2 s for 'sealed' on levels with `seals`.

## Too small (user, Nov 1, 2026)
The user said "the levels are shrinking": levels 21–23 are 620–840 px wide, against Chapter 1's 1600–2200 and Chapter 2's 1300–2100. They need rebuilding at Chapter 2's size with more stages (the kit's rule 6 now sets a floor of ~1300 px wide). The drafts 24–26 and 30 are small too, and are no longer listed in CHAPTER_3 (a draft boss showed as "Level 27" and couldn't be won); they sit in CHAPTER_3_DRAFTS.

## Drafts that miss (Nov 1, 2026)
Built, registered and playable, with their own tests passing, but short of the curve. Each row in docs/inkpin-levels.md says what's missing.
- 24 The Puff Frog (Sonnet, 2 rounds): top lesson 86% (the floor frog inks Nib), stuck 7%, 5 pins.
- 25 The Burial Gold (Sonnet): 3 pins (the gas gate G is pulled six times), no audit run.
- 26 The Weighing Room (Sonnet): 3 pins, the trap T does nothing, no audit run.
- 30 The Tomb Guardian (Opus): 4 pins, every loss 'sealed', 17% stuck. The boss fight itself works (beat, breath, blast, lid).
Why: the design rows chain timed mechanics the engine can't carry reliably (frogs dropping in order, gas metered by a gate, breath drifting to a gap). Levels 21–23 passed once built on the kit's tested patterns.

## Next (waiting on the user)
Recommended: the user playtests 21–23; rows 24–30 are rewritten around the proven patterns (closet plate, sealing door, top-down venting, bowl at a shelf tip, lava step; frogs and the breath as single clear moments, not timing chains); then Opus builds 24–30 (~250–300k each). Then wrap-up: full suite, tsc, browser check, docs rows, the user's playtest.

## For the user's playtest
- Level 27 (The Deep Shaft): top lesson 47% against 45% (an earlier run passed at 45%); otherwise 12 lessons, robust 12/12. S (the shelter's door) has only one job. ~1000 px tall, not 1500: switchback stairs can't be climbed.
- Level 26 (The Weighing Room): passes every target, but every loss is 'sealed' (each with its own visible cause: a door drops, the gas leaks, the bowl goes out). H and W still work in either order.
- Level 24 (The Puff Frog): top lesson 61% against 45%. Pulling Nib's floor S before the frog dome is vented drops him into the gas, the one loss that happens on the pull itself. Every other target passes (win 10%, 6 lessons, late 83%, no dead ends, robust 4/4). Accepted for playtest; a fix needs a second instant loss (e.g. a low frog dome).
- Level 23 (full size): top lesson 47% against 45% after two Opus rounds; the left hall is roomy (gold, an armadillo pen, one tank under a tall empty wall). Accepted for playtest rather than a third round, once the sealed fix clears its one stuck order.
- Level 22: the two vent pins (T, U) work in either order; four rounds couldn't make them order-dependent. Merge them if it reads as a decoy.
- Level 22's hint is 15.5 s and level 23's 18 s: short, but all puzzle.
- Level 21: win share is at the 20% limit; V before W still wins.
- Level 23: one order (G,W,X,L,S) times out instead of losing; there is no 'blasted' loss.

## Engine
Three engine passes done (the last on Nov 1: settling waits for frogs, creeping and burning gas; pin blocking corrected in the kit). Open: water trapped under freshly set stone can churn for 28–55 s and delay 'sealed'.

## What it cost
Design 173k · engine passes 384k + 297k + pass 3 · Sonnet first builds of 21–23 (all missed) ~612k · Opus builds of 21–23 ~987k · drafts 24 (222k), 25 (303k), 26 (371k), 30 (292k). About 4.2M+ tokens so far for the engine, three finished levels and four drafts.
