# InkGecko: design

A marble shooter in ballpoint pen, built from the research in [inkgecko-research.md](inkgecko-research.md). A gecko spits painted marbles into a line rolling along a garden path towards an old well. Three of a colour pop. Clear the line before it reaches the well.

Started Oct 21, 2026. Fourth game on 16bit.ink.

## Pillars

1. **Rollback is the star.** When a pop leaves a gap and the colours either side match, the front of the line rolls back to close it and can pop again. Every link in the chain gets louder: a snap, an ink splash, a note a step higher.
2. **Two ways to stand.** *Pivot* levels put the gecko in the middle, turning to aim anywhere (Zuma). *Rail* levels put it on a branch along the bottom, running left and right and spitting straight up, catching charms that fall from pops (Luxor). Later: *hop* levels, with two or three stones to jump between (Zuma's Revenge).
3. **The gecko shows the colour.** Its skin turns the colour of the marble in its mouth; the curled tail holds the next one. No other ammo display is needed.
4. **Readable without colour.** Every marble colour also has its own pen pattern (dots, stripes, rings…), so colour-blind players can play.
5. **No lost progress.** A marble in the well costs one of three lives and rolls the whole line back; only losing all three fails the level, and a failed level is just retried.

## Rules

- **Board:** every level is laid out on a 1280 × 720 board, scaled to fit the screen with paper around it.
- **Marbles** are 32 board px across and roll along a track (a smooth curve through the level's control points) from a burrow to the well.
- **The line** is pushed from the burrow at the level's speed. It rushes in at the start of a level until a few marbles are out, then slows to its rolling speed.
- **Shooting:** a shot flies straight until it touches a marble, then joins the line next to it (in front or behind, whichever side it hit). The marbles ahead are pushed forward to make room.
- **Pops:** 3 or more touching marbles of one colour pop. 10 points a marble.
- **Rollback:** if the marbles either side of a gap match, the part in front rolls back (fast) until it meets the rest. If the seam makes 3+, it pops again: a **combo**, each link worth more (×2, ×3…).
- A part of the line with nothing behind it to push it stops where it is, until the pushed part catches up and pushes it on.
- **Streak:** consecutive shots that each pop something add a streak bonus.
- **Gap shot:** a shot that flies through a gap in the line before hitting earns a bonus.
- **The bar** fills with points. Once full, no more marbles come out of the burrow; pop what is left to win.
- **The well:** a marble reaching the well falls in, costs a life, and the whole line rolls back a quarter of the way. Three lives a level.
- **Dealing:** the gecko is only given colours still in the line.
- **Swap:** right-click, Space, or tap the gecko swaps the marble in its mouth with the one on its tail.

### Charms (power-ups)

| Charm | Effect | First seen |
|---|---|---|
| **Reverse** | The line rolls backwards for 3 s | Level 3 |
| **Slow** | The line rolls at half speed for 8 s | Level 2 |
| **Burst** | Pops every marble within 2½ marbles of it | Level 5 |
| **Aim** | A dotted aim line and faster shots for 10 s | Level 7 |

On pivot levels a charm rides on a marble in the line; pop that marble to use it, and it fades after 12 s if you don't. On rail levels every third pop drops a charm, which falls past the gecko: run under it to catch it.

Later chapters: Lightning (clears a column, rail levels), Colour Bomb (clears a colour), Wild marble, stone marbles that break only next to a pop, wrapped marbles, tunnels, crossing tracks, a 60-second blitz level and bosses.

### Ink blots (stars)

One for clearing the level, one for beating its par time, one for losing no lives, as in InkCrab.

## Controls

- **Pivot:** the gecko faces the pointer; click or tap to spit. On touch, a tap aims and spits in one go.
- **Rail:** the gecko follows the pointer along the branch (or A/D and the arrow keys); click or tap to spit. A tap away from the gecko runs it there first, then spits.
- **Swap:** right-click, Space or S, or tap the gecko.
- **Pause:** Esc, P or the ❚❚ button. **Sound:** M or ♪.

## Chapter 1: The Garden (free)

| # | Name | Gecko | Track | Colours | New |
|---|---|---|---|---|---|
| 1 | First Pebbles | pivot | a wide open spiral | 3 | Spitting, pops (tutorial) |
| 2 | Moss Steps | pivot | an S round the gecko | 3 | Slow charm |
| 3 | Snail Trail | pivot | a long spiral | 4 | Reverse charm, rollback |
| 4 | The Branch | **rail** | a zigzag down the page | 4 | Rail, catching charms |
| 5 | Fern Corner | pivot | a loop and a hook | 4 | Burst charm |
| 6 | Two Paths | pivot | **two tracks** | 4 | Two lines at once |
| 7 | Rain Barrel | rail | a long zigzag | 4 | Aim charm |
| 8 | The Old Wall | pivot | a tight spiral | 5 | Five colours |
| 9 | Twin Drains | rail | **two tracks** down each side | 5 | Two lines on a rail |
| 10 | The Well | pivot | double spiral, fast | 5 | The chapter's final test |

Chapters 2–10 are the paid full game, served by the server as level data like InkCrab's beaches.

## Art

Same ballpoint notebook as InkCrab: blue ink lines, watercolour washes, paper. The board is seen from above.

- **The gecko:** top-down, splayed toes, round eyes on top of the head. Pen lines are one texture; the skin wash is a second, white texture tinted to the marble's colour.
- **Marbles:** a wash of colour, a pen contour, a glint, and the colour's pattern. They turn as they roll.
- **Track:** a groove worn into paving stones, drawn once per level. The burrow is a dark hole at the start; the well is a ring of stones at the end, washed red as the line nears it.
- **Pops:** ink splashes in the marble's colour.

## Sound

Synthesized like InkCrab's: a tongue *thwip* to spit, a click as a marble joins, a pop that rises a step with each combo link, a whoosh for rollback, a ticking heartbeat when the line nears the well, a splash in the well, and chimes for charms, wins and losses.
