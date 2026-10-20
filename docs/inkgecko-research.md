# InkGecko: marble shooter research

Ten marble shooters (the Zuma and Luxor family), researched October 2026, and what our game can take from each. The plan is to use **both** shooter styles: some levels play like Zuma (shooter in the middle, aim all round), others like Luxor (shooter slides along the bottom, catch what falls). Facts marked *(unverified)* are from memory, not from a source read during the research.

| # | Game | Shooter | Standout mechanic | Take it? |
|---|---|---|---|---|
| 1 | **Puzz Loop** (Mitchell, 1998 arcade; *Ballistic* in the West) | Cannon, fixed *(unverified: centre)* | The original. Gap rollback: when the two sides of a gap match, the back half rolls back to close it, which can set off more clears. Versus mode in Puzz Loop 2 (2001) | ✅ Rollback is the heart of the genre |
| 2 | **Zuma / Zuma Deluxe** (PopCap, 2003) | Stone frog in the centre, turns 360° | Two balls in hand, swap any time. Gap shots, combos, chain streaks. A bar that stops new balls once full. Ace time | ✅ The core loop, ✅ pivot levels |
| 3 | **Luxor** (MumboJumbo, 2005) | Winged scarab slides along the bottom, fires up | Several short chains instead of one long one, each pushed by a scarab. Power-ups **fall** and must be **caught** by moving the shooter. Bonus for path left unused | ✅ Rail levels, ✅ catch-to-activate, ✅ several chains |
| 4 | **Luxor 2 / Amun Rising** (2006–07) | Same | 13 power-ups (Colour Cloud, Net, Dagger, Lightning Storm). Scorpion eats the first 10 spheres of a chain. Wild ball matches any colour | ✅ A few of these, not 13 |
| 5 | **Luxor 3** (2007) | Same | Upgrade shop paid in Ankh coins; canopic jars to shoot, all jars in a stage unlock a bonus level; Puzzle and Survival modes | ✅ Jars → bonus level; ⚠️ shop only if light |
| 6 | **Luxor: Quest for the Afterlife** (2007) | Same | A route map with branching paths (18 cities, 6 regions); artifact pieces and chests along the way | ⏳ Branching map for later chapters |
| 7 | **Luxor Evolved** (2011) | Same | 21 power-ups; treasure caught fills a meter that opens a secret stage. Losing a life reverses the chain instead of restarting the level | ✅ Reverse-on-miss instead of restart |
| 8 | **Zuma's Revenge!** (PopCap, 2009) | Frog that **moves**: hops between lily pads, or slides on a rail | Boss every ~10 levels (blow a hole through their marble wall, then hit them). Lives removed. Medals per level (clear, score, time) spent on upgrades. Laser, three-way cannon, colour-clear lightning | ✅ Hop levels, ✅ bosses, ✅ no lives, ✅ 3 medals |
| 9 | **Tumblebugs** (Wildsnake, 2005) | Cannon on a rail (top or bottom) | Track sinks **underground** and comes out elsewhere. Letter bugs spell a word for a reward. Fast-forward icon as a trap | ✅ Tunnels, ✅ letter beads; ❌ reversed controls when aiming down |
| 10 | **Sparkle / Sparkle 2** (10tons) | Moves along the bottom on Switch | **Stone balls** that break only when a match happens next to them, and balls wrapped in **chains** that must be freed first. Survival mode | ✅ Stone and chained beads as level blockers |

Also checked:

- **Zuma Blitz** (Facebook, 2010): one-minute score rounds, a weekly friends leaderboard, a "Hot Frog" speed mode. ✅ A 60-second challenge mode.
- **Magnetica** (DS, 2006): Mitchell's own touch-screen remake; reviewers found it ordinary.
- **Orblins** (Mugen Games, due Q4 2026, not out yet): a roguelike deckbuilder where **colour is an action** (red and blue hit, green shields, yellow pays gold) and bosses fire shots you must dodge. ⏳ Idea bank for a later mode, not the base game.
- **Ringer** (2025): a marbles roguelike deckbuilder, not a shooter. Shows the roguelike layer sells.

## Zuma in detail

- A frog idol in the middle of the screen turns to face the pointer and spits balls. The ball in its mouth fires; the next one shows on its back. Right-click swaps them.
- The chain rolls along a fixed track towards a golden skull. A ball in the skull costs a life.
- 3+ touching balls of one colour explode. If the colours on both sides of the gap match, the back section rolls back and joins up, which can explode again.
- The **Zuma bar** fills with score. Once full, no new balls enter; clear what is left to win.
- Bonuses:
  - **Combo:** one shot sets off two or more explosions.
  - **Gap shot:** the ball flies through a gap in the chain before hitting.
  - **Chain:** consecutive shots that each explode.
  - **Coins** appear on the board for a moment; hit them with a ball.
  - **Ace time:** finish under a par time (25 s to 4 min per level).
- Power-up balls (they revert if not cleared in time):
  - **Backwards:** the chain rolls back for a few seconds.
  - **Slow:** the chain slows down.
  - **Accuracy:** faster shots and an aiming line.
  - **Explosion:** clears balls around it.
- Structure: temples of stages, 5–7 levels a stage; the last level of a stage has **two tracks**. Colours rise from 4 (stages 1–3) to 5 (4–6) to 6 (7+). The secret final level ("Space") hides the track.
- 3 lives, plus 1 per 50,000 points. Game over sends you back to the start of the stage.
- Only colours still on the board are dealt to you *(unverified)*. The chain speeds in at the start of a level then slows, and the music and a heartbeat build as it nears the skull *(unverified)*.

**What made it stick:** simple rules with real depth (aim + plan + reflexes), and the occasional lucky colour run that pays a huge chain. One critic called that a lottery; the down side is that a bad run feels unfair. Lives that send you back a stage were the main complaint, and Zuma's Revenge dropped them to praise.

## Luxor in detail

- The shooter slides left and right along the bottom of the screen and fires straight up. You line it up under the target rather than turning to aim.
- Several short chains instead of one long one, each pushed from behind by a scarab, all heading for a pyramid. You can clear one chain at a time, let them merge, or nibble at each.
- Every few matches *(sources differ: every 2nd or 3rd)* a **power-up falls** from the explosion. Catch it with the shooter to use it. Gems (points) and **Ankh coins** (extra lives, later the shop currency) fall too.
  - This is the best idea in the genre after rollback: the screen is your aim **and** your catch zone, so every drop is a choice between staying lined up and running for the prize.
- Power-ups (Amun Rising / Luxor 3):
  - **Fireball:** big blast, good on mixed colours.
  - **Lightning:** a vertical bolt that clears everything in its column.
  - **Colour Bomb:** clears every sphere of one colour.
  - **Wild ball:** matches any colour.
  - **Stop, Slow, Reverse.**
  - **Scorpion:** crawls along the track and eats the first 10 spheres of the chain.
  - **Speed Shot, Colour Sort, Net, Colour Cloud, Match Highlighter, Pyramid Blocker.**
- Bonus at the end for the length of path left before the pyramid.
- Later levels add more colours, **crossing paths** and **tunnels**.
- Luxor 3 adds four difficulties (Easy to Insane, with a score multiplier), 99 adventure levels, and jars that unlock bonus levels. Luxor Evolved makes a lost life **reverse the chain** instead of restarting.
- Complaint: the magic wears off after a few worlds, because levels stop surprising you. Variety per level matters more than more power-ups.

## Zuma vs Luxor at a glance

| | Zuma (pivot) | Luxor (rail) |
|---|---|---|
| Aim | Turn to face; shoot any direction | Move to line up; shoot straight up |
| Track | Spirals and loops around the frog | Snakes across the top, down to the pyramid |
| Chains | One long chain (two on some levels) | Several short chains |
| Power-ups | On the balls; clear the ball to fire it | Fall from matches; catch them |
| Feel | Planning angles, gap shots | Footwork, risk to grab drops |
| Best on | Mouse | Touch, keys, one thumb |

## Lessons

**Worth adapting**

1. **Gap rollback and chain reactions** are the genre. Make them loud: a snap, an ink splash, a rising note per link.
2. **Two shooter styles as level types**: pivot (Zuma) and rail (Luxor), plus hop pads (Zuma's Revenge). One rule set, three ways to stand.
3. **Catch-to-activate drops** on rail levels, and on pivot levels the power-up rides on a bead in the chain.
4. **A fill bar that stops new beads**, then a cleanup phase. It gives every level a clear "almost there".
5. **No lives that cost you earlier levels.** A miss reverses the chain (Luxor Evolved); a few misses fail only this level. Fits InkCrab's 3-tries-per-level rule.
6. **Three marks per level**: clear, score, par time (Zuma's Revenge medals, Zuma's ace time).
7. **Blockers that change the puzzle**, not just the speed: stone beads (Sparkle), chained beads (Sparkle), tunnels (Tumblebugs, Luxor), crossing tracks (Luxor), two tracks (Zuma).
8. **A boss every chapter** (Zuma's Revenge): a wall of beads to blast through, then the target.
9. **Small collectibles that open something**: jars → bonus level (Luxor 3), letter beads → word (Tumblebugs).
10. **Few power-ups, each distinct.** Six to eight, introduced one per few levels, beat Luxor Evolved's 21.
11. **Deal only colours still on the board** to cut dead shots, and a swap button.

**Avoid**

- Lives that throw you back a stage (Zuma).
- Reversed controls when the shooter aims down (Tumblebugs): rail levels keep the shooter at the bottom.
- Power-up bloat and look-alike levels (Luxor's "wears off after four worlds").
- A pure clone with nothing new: every review of Luxor, Tumblebugs and Sparkle docks a mark for it. Our new thing has to be visible in the trailer.

## How the mechanics could spread over levels

A first cut, to settle in the design doc. 10 chapters of 10 levels, like InkFish; chapter 1 free.

| Chapter | New shooter or track | New bead or power-up | Boss / special |
|---|---|---|---|
| 1 | Pivot, one track, 3–4 colours | Backwards, Slow | — (teach rollback and gap shots) |
| 2 | **Rail**, falling drops | Fireball (caught) | Level 10: two short chains on a rail |
| 3 | Pivot, **two tracks** | Accuracy line, coins | First boss |
| 4 | Rail, **tunnels** | Stone beads | Jars → bonus level |
| 5 | **Hop pads** (2–3 spots) | Lightning (column) | Boss |
| 6 | Pivot, **crossing tracks** | Chained beads, Wild | 60-second blitz level |
| 7 | Rail, several chains + Scorpion | Colour Bomb | Boss |
| 8 | Mixed: rail top and bottom? *(test first)* | Letter beads | Bonus word |
| 9 | Hidden track (Zuma's "Space") | 6 colours | Boss |
| 10 | Everything | — | Final boss |

Open questions for the design doc:

- **Our own twist.** Candidates: ink that **stains** (an unmatched shot leaves a blot that slows the chain until cleared), beads that **change colour** when the shooter's colour does, or a chain that is a creature with a head.
- Swap on a second button, or tap the shooter on touch?
- Endless survival mode in the full game?

## Name

**InkGecko** (`16bit.ink/gecko`, plus `/geko` for the common misspelling), chosen Oct 21, 2026. The hero is a gecko that works like a chameleon: its skin turns the colour of the marble in its mouth, its curled tail holds the next one, and a tongue flick fires. Rejected: InkChameleon (too long), InkLizard (generic), InkMarbles (no character), InkScarab (too close to Luxor).

## Sources

- Zuma: [Wikipedia](https://en.wikipedia.org/wiki/Zuma_(video_game)), [StrategyWiki bonuses](https://strategywiki.org/wiki/Zuma_Deluxe/Bonuses), [TrueAchievements tips](https://www.trueachievements.com/game/Zuma/walkthrough/2), [Everyday Zuma (wurb.com)](https://www.wurb.com/stack/?p=596)
- Puzz Loop: [Wikipedia](https://en.wikipedia.org/wiki/Puzz_Loop), [Magnetica (GameSpot)](https://www.gamespot.com/reviews/magnetica-review/1900-6152321/)
- Luxor: [Pocket Gamer review](https://www.pocketgamer.com/luxor/review/), [Steam](https://store.steampowered.com/app/15970), [Amun Rising HD (TouchArcade)](https://toucharcade.com/games/luxor-amun-rising-hd), [Luxor 3 (Wikipedia)](https://en.wikipedia.org/wiki/Luxor_3), [Luxor 3 guide (speedrun.com)](https://www.speedrun.com/luxor_3/guides/dopjk), [Luxor 2 (Steam)](https://store.steampowered.com/app/15922), [Quest for the Afterlife (Wikipedia)](https://en.wikipedia.org/wiki/Luxor:_Quest_for_the_Afterlife), [5th Passage (Fanatical)](https://www.fanatical.com/en/game/luxor-5-th-passage), [Luxor Evolved (fandom)](https://luxor-game-series.fandom.com/wiki/Luxor_Evolved?oldid=548), [Luxor Evolved (TouchArcade)](https://toucharcade.com/games/luxor-evolved-full)
- Zuma's Revenge: [Outcyders](https://www.outcyders.net/review/zumas-revenge-review), [Destructoid](https://destructoid.com/review-zumas-revenge), [Windows Central](https://windowscentral.com/zumas-revenge-wp-review), [Pocket Gamer DSi](https://www.pocketgamer.com/game-reviews/zumas-revenge-dsi-review), [Wikipedia](https://en.wikipedia.org/wiki/Zuma%27s_Revenge!)
- Zuma Blitz: [Gamezebo](https://www.gamezebo.com/reviews/zuma-blitz-review/), [MCV](https://www.mcvuk.com/zuma-blitz-hits-facebook/)
- [Tumblebugs (Pocket Gamer)](https://www.pocketgamer.com/tumblebugs/review/); Sparkle: [Pocket Gamer](https://www.pocketgamer.com/sparkle/review/), [Cubed3 (Switch)](https://cubed3.com/review/5147/1/sparkle-unleashed-nintendo-switch.html)
- Newer: [Orblins (Niche Gamer)](https://nichegamer.com/orblins-announced/), [Orblins (Backloggd)](https://backloggd.com/games/orblins/), [Ringer (Steambase)](https://steambase.io/games/ringer/info)
