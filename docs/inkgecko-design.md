# InkGecko: design

A marble shooter in ballpoint pen, built from the research in [inkgecko-research.md](inkgecko-research.md). A gecko spits painted marbles into a line rolling along a garden path towards an old well. Three of a colour pop. Clear the line before it reaches the well.

Started Oct 21, 2026. Fourth game on 16bit.ink.

## Pillars

1. **Rollback is the star.** When a pop leaves a gap and the colours either side match, the front of the line rolls back to close it and can pop again. Every link in the chain gets louder: a snap, an ink splash, a note a step higher.
2. **Two ways to stand.** *Pivot* levels put the gecko in the middle, turning to aim anywhere (Zuma). *Rail* levels put it on a branch along the bottom, running left and right and spitting straight up, catching charms that fall from pops (Luxor). *Hop* levels (from chapter 2) put it on two or three lily pads to jump between, turning to aim on each (Zuma's Revenge).
3. **The gecko shows the colour.** Its skin turns the colour of the marble in its mouth; the curled tail holds the next one. No other ammo display is needed.
4. **Readable without colour.** Every marble colour also has its own pen pattern (dots, stripes, rings…), so colour-blind players can play.
5. **No lost progress.** A marble in the well costs one of three lives and rolls the whole line back; only losing all three fails the level, and a failed level is just retried.

## Rules

- **Board:** every level is laid out on a 1280 × 720 board, scaled to fit the screen; past its edges the board goes on mirrored, fading towards paper, so the ground reaches the screen's edges whatever its shape.
- **Marbles** are 32 board px across and roll along a track (a smooth curve through the level's control points) from a burrow to the well.
- **The line** is pushed from the burrow at the level's speed. It rushes in at the start of a level until a few marbles are out, then slows to its rolling speed.
- **Always something to shoot:** while the burrow is open, the line keeps at least 6 marbles' length out of it. Reverse stops there, and a line popped down to less rushes out to there again.
- **Shooting:** a shot flies straight until it touches a marble, then joins the line next to it (in front or behind, whichever side it hit). The marbles ahead are pushed forward to make room.
- **Pops:** 3 or more touching marbles of one colour pop. 10 points a marble.
- **Rollback:** if the marbles either side of a gap match, the part in front rolls back (fast) until it meets the rest. If the seam makes 3+, it pops again: a **combo**, each link worth more (×2, ×3…).
- A part of the line with nothing behind it to push it stops where it is, until the pushed part catches up and pushes it on. Once the burrows are shut and their part is gone, the leftovers keep rolling from the back (so nothing can stop for good under a tunnel).
- **Streak:** consecutive shots that each pop something add a streak bonus.
- **Gap shot:** a shot that flies through a gap in the line before hitting earns a bonus.
- **The bar** fills with points. Once full, no more marbles come out of the burrow; pop what is left to win.
- **The well:** a marble reaching the well falls in, costs a life, and the whole line rolls back a quarter of the way. Three lives a level.
- **Dealing:** the gecko is only given colours still in the line.
- **Swap:** right-click, Space, or tap the gecko swaps the marble in its mouth with the one on its tail.

### Charms (power-ups)

| Charm | Effect | First seen |
|---|---|---|
| **Reverse** | The line rolls backwards for 3 s, but never closer than 6 marbles to the burrow | Level 3 |
| **Slow** | The line rolls at half speed for 8 s | Level 2 |
| **Burst** | Pops every marble within 2½ marbles of it | Level 5 |
| **Aim** | A dotted aim line and faster shots for 10 s | Level 7 |
| **Dragonfly** | The next spit is a dragonfly that flies through the whole board, popping every marble it touches; the gecko keeps its marble | Level 13 |
| **Ink Pot** | Pops every marble of one colour, on every line (the colour of the marble it rode on, or the gecko's) | Level 23 |
| **Geode** | The next spit is a crystal that joins the line as the colour of whatever it hits; the gecko keeps its marble | Level 43 |
| **Hedgehog** | A hedgehog trundles up the line nearest its well from the well, eating the front 10 marbles | Level 53 |
| **Rain** | A shower pops every open marble in a column down the whole board (tunnels keep theirs dry) | Level 63 |
| **Lantern** | Night levels: the whole garden is lit for 12 s | Level 93 |

On pivot levels a charm rides on a marble in the line; pop that marble to use it, and it fades after 12 s if you don't. On rail levels every fourth pop drops a charm, which falls past the gecko: run under it to catch it. Slow and Reverse stall the line, so they only turn up once a line is a third (Slow) or half (Reverse) of the way to its well, where they rescue rather than drag; and the same charm never comes twice in a row while the level has another.

## Twists, goals and bosses

So that every level brings something, each level that doesn't teach a chapter's new thing has its own **twist**, and the last level of every chapter is a **boss**. No twist comes twice in a chapter (test/levels.test.ts checks), and a level's card names its twist. The rules live in `logic/twists.ts`, `logic/goal.ts` and `logic/boss.ts`; the words for cards, hints and loss tips in `level/twistText.ts`.

**Twists** (level fields):

| Twist | Field | What happens |
|---|---|---|
| Wind | `wind` | Gusts (3.5 s, then 2.5 s calm, from the other side each time) bend shots sideways; streaks blow across and the tag shows "wind →". |
| Surge | `surge` | Every so often the lines shudder (camera shake), then lurch on at 3.2× for 1.4 s. |
| Tide | `tide` | Every so often the lines draw back by themselves for 1.6 s. |
| Late burrow | track `opensAt` | A line's burrow stays shut, a stone lid over it, until the bar is that full. |
| Two paces | track `pace` | Lines roll at different speeds. |
| No swapping | `noSwap` | The marble on the tail can't be swapped. |
| A colour joins | `colourAt` | The level's last colour only comes out once the bar is that full. |
| Leaves | `leaves` | Big autumn leaves drift across the board; a shot that hits one stops dead. |
| The gecko paces | `wander` | Pivot levels: the gecko walks a figure of eight through its spot as it aims. |
| Restless pads | `restless` | Hop levels: a pad tips the gecko onto the next after so many seconds (a ring runs out round it, "hop!" before it goes). |
| Charms galore | `charmy` | Charms come twice as often. |
| One life | `lives: 1` | One marble in the well and the level is lost. |

**Goals** (`mode`): *hold out* (the bar fills with time; points don't matter), *blitz* (fill the bar with points before the clock runs out, or the level is lost "Out of time…"), *gold* (golden marbles come out among the rest, a couple spare; only popping them fills the bar). The tag under the level's name shows the clock or the gold count.

**Bosses** (`boss`, the tenth level of each chapter): beating the boss fills the bar and shuts the burrows; points don't. Each one tests its chapter's new thing, and only this level's boss is painted (src/art/bosses/, one file each, all poses facing +x).

| Chapter | Boss | Habits | Hurt by |
|---|---|---|---|
| Garden | The Mole | Comes up in one of its molehills for 2.6 s, shoving the nearest line on as it does, then dives | Any hit while it's up (it dives at once) |
| Pond | The Bullfrog | Sits on one of its lily pads, croaks (swallowing shots and spitting them into a line), then leaps to another | Hits while it sits quietly; out of reach mid-leap |
| Greenhouse | The Great Snail | Crawls a round across the glasshouse floor | Any hit, but after each it hides in its shell for 2.4 s |
| Orchard | The Magpie | Perches on posts, flies between them; landing, drops a bud into the nearest line | Hits while perched |
| Rockery | The Old Tortoise | Walks at the head of a line; every 9 s it turns the two marbles behind it to stone | Pops among the marbles touching it (a combo pop twice); shots bounce off its shell |
| Allotment | The Scarecrow | Stands and turns; its two sleeves sweep round and stop shots; hit, it spins faster | Hits on its hat, between the sleeves |
| Wild Meadow | The Great Chameleon | Walks a round, changing colour every 4 s | Only marbles of its colour (or a Geode) |
| Old Barn | The Barn Cat | Prowls the beam along the top wall | Only shots banked off a wall; straight ones it swats back |
| Ruins | The Stone Lion | Lies on its plinth; every 10 s it roars and every line is shoved on | Only shots that glanced off a column |
| Night Garden | The Owl | Perches on posts, flies between them; landing, it hoots and every light shrinks for 4 s | Hits while perched; in the dark only its eyes show |

Balance: the headless bot (a scratch script, as before) beats every level, bosses included, banking and glancing shots for the cat and the lion; boss levels take it 30–70 s, so humans should find them a proper fight. A human playtest of the bosses and the wind levels is still due.

Buds never pop at once, whether a match or a charm picks them: they blossom first. A stone breaks when a marble beside it pops, and so does any stone touching a breaking one; stones left alone after the burrows shut crumble away. When a level is lost, what's left of the lines pours into the wells, faster and faster, before the result card (as in Zuma).

### Ink blots (stars)

One for clearing the level, one for beating its par time, one for losing no lives, as in InkCrab.

## Controls

- **Pivot:** the gecko faces the pointer; click or tap to spit. On touch, a tap aims and spits in one go.
- **Rail:** the gecko follows the pointer along the branch (or A/D and the arrow keys); click or tap to spit. A tap away from the gecko runs it there first, then spits.
- **Hop:** click or tap another lily pad, or Q / E. A hop takes about a third of a second; the gecko can't spit mid-air.
- **Swap:** right-click, Space or S, or tap the gecko.
- **Phones held upright:** the board (seen from above) turns a quarter so it fills the screen instead of a strip of it; floating words stay upright.
- **Pause:** Esc, P or the ❚❚ button. **Sound:** M or ♪.

## Chapter 1: The Garden (free)

| # | Name | Gecko | Track | Colours | New | Twist |
|---|---|---|---|---|---|---|
| 1 | First Pebbles | pivot | a wide open spiral | 3 | Spitting, pops (tutorial) |  |
| 2 | Moss Steps | pivot | an S round the gecko | 3 | Slow charm | Pop 5 golden marbles |
| 3 | Snail Trail | pivot | a long spiral | 4 | Reverse charm, rollback |  |
| 4 | The Branch | **rail** | a zigzag down the page | 4 | Rail, catching charms |  |
| 5 | Fern Corner | pivot | a loop and a hook | 4 | Burst charm | Hold out for 70 seconds |
| 6 | Two Paths | pivot | **two tracks** | 4 | Two lines at once | A late burrow |
| 7 | Rain Barrel | rail | a long zigzag | 4 | Aim charm | Leaves drift across |
| 8 | The Old Wall | pivot | a tight spiral | 5 | Five colours | The lines lurch on now and then |
| 9 | Twin Drains | rail | **two tracks** down each side | 5 | Two lines on a rail | Lines at different speeds |
| 10 | Mole Hill | pivot (low) | three rows across the top, molehills below | 5 | **Boss** | Boss: the Mole pops up from its molehills |

Chapters 2–10 are the paid full game, served by the server as level data like InkCrab's beaches.

## Chapter 2: The Pond (full game)

New: **lily pads** to hop between, **tunnels** (stretches of track under a mossy log or a turf footbridge, where marbles can't be hit and shots fly over), and the **Dragonfly** charm. The ground is a damp flagstone terrace with the pond lapping round it.

| # | Name | Gecko | Track | Colours | New | Twist |
|---|---|---|---|---|---|---|
| 11 | Still Water | pivot | a spiral dipping under a log | 4 | Tunnels |  |
| 12 | Lily Pads | **hop**, 2 pads | a wide loop round both pads | 4 | Hopping |  |
| 13 | Dragonfly | pivot | a long spiral | 4 | Dragonfly charm |  |
| 14 | Reed Bank | rail | a zigzag through two tunnels | 4 | Tunnels on a rail | Leaves drift across |
| 15 | Stepping Stones | hop, 3 pads | a loop with a tunnel | 5 | Three pads | Pads tip you off |
| 16 | Two Streams | pivot | two half-spirals, each under a log | 4 | Two lines with tunnels | The lines draw back now and then |
| 17 | Kingcups | rail | two zigzags with tunnels | 5 | | Fill the bar in 165 seconds |
| 18 | The Footbridge | hop, 2 pads | a loop with two tunnels | 5 | | Pop 6 golden marbles |
| 19 | The Weir | rail | a long, fast zigzag | 5 | | Gusts bend your shots |
| 20 | The Bullfrog | hop, 2 pads (low) | three rows across the top, the frog's pads below | 5 | **Boss** | Boss: the Bullfrog leaps from pad to pad |

## Chapter 3: The Greenhouse (full game)

New: **crossing tracks**. Where two lines (or one line and itself) cross, the earlier pass runs through a tunnel and the later one rolls over it on a raised deck; marbles in the tunnel are hidden, the ones on top can be hit (`level/cross.ts` finds the crossings and places both). The **Ink Pot** charm. Ground: an old glasshouse floor with the glazing bars' shadows.

| # | Name | Gecko | Track | Colours | New | Twist |
|---|---|---|---|---|---|---|
| 21 | Potting Bench | rail | a figure of eight | 4 | Crossings |  |
| 22 | Seed Trays | pivot (low) | an eight above the gecko | 4 | | No swapping |
| 23 | Ink Pot | pivot | a long spiral | 5 | Ink Pot charm |  |
| 24 | Cold Frames | rail | two lines crossing in an X | 4 | Two lines crossing | The lines lurch on now and then |
| 25 | The Vine | hop, 2 | an eight above the pads | 5 | | Hold out for 80 seconds |
| 26 | Tomato Rows | pivot | a U and an arch, crossing | 4 | | A colour joins halfway |
| 27 | Watering Can | rail | two upright eights | 5 | | Charms galore |
| 28 | Glass Maze | pivot (low) | two lines crossing | 5 | | The gecko paces |
| 29 | Hot Bed | hop, 3 | a wide eight | 5 | | One life |
| 30 | The Palm House | pivot (low) | a wide eight across the top; the snail's round below | 5 | **Boss** | Boss: the Great Snail crawls the glasshouse |

## Chapter 4: The Orchard (full game)

New: **windfalls** (apples, pears, plums) roll across the grass every 10 s or so; spit one for 100 points and a free charm. **Buds**: some marbles come out closed in a bud; in a match they blossom instead of popping, and pop with the next match. The gecko hops between tree stumps.

| # | Name | Gecko | Colours | Buds | New | Twist |
|---|---|---|---|---|---|---|
| 31 | Windfalls | pivot | 4 | – | Windfalls |  |
| 32 | Blossom | pivot | 4 | 15% | Buds |  |
| 33 | The Ladder | rail | 4 | 10% | | Gusts bend your shots |
| 34 | Stumps | hop, 2 | 5 | 12% | | Pop 6 golden marbles |
| 35 | Apple Rows | pivot, a row of trees above and below | 4 | 12% | | A late burrow |
| 36 | The Pear Tree | rail, an eight | 5 | 15% | | Hold out for 85 seconds |
| 37 | Plum Alley | hop, 3 | 5 | 18% | | Pads tip you off |
| 38 | The Cider Press | pivot, a rounded square | 5 | 20% | | Leaves drift across |
| 39 | Harvest | rail, two bands across | 5 | 15% | | Lines at different speeds |
| 40 | The Old Pear | rail, an eight; posts below | 5 | 15% | **Boss** | Boss: the Magpie drops buds into the lines |

## Chapter 5: The Rockery (full game)

New: **stones** in the line match nothing and break when a pop happens right beside them; they also stop a gap rolling back. The **Geode** charm. The gecko hops between stepping stones; tunnels are stone slabs.

| # | Name | Gecko | Colours | Stones | New | Twist |
|---|---|---|---|---|---|---|
| 41 | Gravel Path | pivot | 4 | 8% | Stones |  |
| 42 | Stepping Stones | hop, 2 | 4 | 10% | | The lines lurch on now and then |
| 43 | The Geode | pivot | 5 | 10% | Geode charm |  |
| 44 | Scree | rail, tunnels | 5 | 12% | | Pop 6 golden marbles |
| 45 | Alpine Cushions | hop, 3, an eight | 5 | 12% | | No swapping |
| 46 | The Rill | pivot, one wide loop | 5 | 14% | | The gecko paces |
| 47 | Boulder Run | rail, an eight | 5 | 15% | | Fill the bar in 175 seconds |
| 48 | Saxifrage | hop, 3 | 5 | 16% | | A colour joins halfway |
| 49 | The Cairn | rail, long and fast | 5 | 18% | | Leaves drift across |
| 50 | The Summit | pivot, one long spiral | 5 | 10% | **Boss** | Boss: the Old Tortoise leads a line |

## Chapter 6: The Allotment (full game)

New: **twined pairs**, two neighbouring marbles tied with garden twine that pop together (either one popping takes the other with it), and the **Hedgehog** charm. Tracks run squared off like the beds; the gecko hops between upturned buckets; tunnels are fleece cloches.

| # | Name | Gecko | Colours | Twine | New | Twist |
|---|---|---|---|---|---|---|
| 51 | Bean Rows | pivot, square spiral | 4 | 12% | Twine |  |
| 52 | Seed Drills | rail, wavering rows | 4 | 14% | | The lines draw back now and then |
| 53 | The Hedgehog | pivot | 5 | 12% | Hedgehog charm |  |
| 54 | Water Butts | hop, 2 | 5 | 15% | | Hold out for 85 seconds |
| 55 | Runner Beans | pivot, 2 lines | 5 | 15% | | Lines at different speeds |
| 56 | The Shed | rail, an eight | 5 | 16% | | Gusts bend your shots |
| 57 | Onion Bed | hop, 3 | 5 | 18% | | Pop 7 golden marbles |
| 58 | Marrow Patch | pivot (low), rows | 5 | 16% | + buds | Charms galore |
| 59 | Compost Heaps | rail, 2 lines | 5 | 20% | | A late burrow |
| 60 | The Scarecrow | hop, 3 (low), three drills across the top | 5 | 18% | **Boss** | Boss: the Scarecrow's sleeves stop shots |

## Chapter 7: The Wild Meadow (full game)

New: **chameleon marbles**, which all take the next colour together every 4 s (a shimmering ring warns of the turn), and the **Rain** charm. Tracks meander and curl into loop-the-loops through the long grass; the gecko hops between millstones; tunnels are grassy banks with stone culverts.

| # | Name | Gecko | Colours | Chameleons | New | Twist |
|---|---|---|---|---|---|---|
| 61 | Long Grass | pivot (low), rows | 4 | 8% | Chameleons |  |
| 62 | Poppies | rail, a lasso of loops | 4 | 10% | | Leaves drift across |
| 63 | Rain Cloud | pivot | 5 | 10% | Rain charm |  |
| 64 | The Stile | hop, 2, rows | 5 | 12% | | Pads tip you off |
| 65 | Cornflowers | pivot, 2 lines | 5 | 12% | | A late burrow |
| 66 | Butterflies | rail, a lasso | 5 | 13% | | Pop 7 golden marbles |
| 67 | Mown Circle | hop, 3 | 5 | 14% | | Gusts bend your shots |
| 68 | Cow Parsley | pivot (low), a lasso | 5 | 14% | + twine | No swapping |
| 69 | Skylark | rail, long and fast | 5 | 15% | | Fill the bar in 180 seconds |
| 70 | Midsummer | pivot (low), three rows across the top | 5 | 12% | **Boss** | Boss: the Great Chameleon changes colour |

## Chapter 8: The Old Barn (full game)

New: **bank shots**: shots bounce off the barn's timber walls (left, right and top; the bottom, the open doors, lets them out), up to three times, and a faint aim line shows the bounce. A **sixth colour** from level 73. The gecko hops between hay bales; tunnels run under rows of bales.

| # | Name | Gecko | Colours | New | Twist |
|---|---|---|---|---|---|
| 71 | Hayloft | pivot, square spiral | 5 | Bank shots |  |
| 72 | Cart Shed | rail | 5 | | The lines lurch on now and then |
| 73 | Milk Churns | pivot | 6 | Six colours |  |
| 74 | Hay Bales | hop, 2 | 6 | + stones | Charms galore |
| 75 | Threshing Floor | pivot, one line round the top, side and bottom | 6 | | The gecko paces |
| 76 | The Ladder | rail | 6 | + twine | Hold out for 90 seconds |
| 77 | Swallows' Nest | hop, 3, an eight | 6 | + chameleons | Pop 7 golden marbles |
| 78 | Lantern Light | pivot (low), rows | 6 | + buds | The lines draw back now and then |
| 79 | Grain Sacks | rail, 2 lines | 6 | + stones | One life |
| 80 | The Barn Cat | pivot (high), three rows across the floor below | 6 | **Boss** | Boss: the Barn Cat swats shots back |

## Chapter 9: The Ruins (full game)

New: **broken columns** stand on the board and shots glance off them (mirrored about the column's surface, up to four times): in the way, or a way round the line. The gecko hops between fallen column drums; tunnels run under collapsed arches.

| # | Name | Gecko | Colours | Columns | Twist |
|---|---|---|---|---|---|
| 81 | Broken Columns | pivot | 5 | 2 (teaches them) |  |
| 82 | Fallen Arch | rail | 5 | 2 | Gusts bend your shots |
| 83 | Mosaic Floor | pivot | 6 | 4 | The lines lurch on now and then |
| 84 | The Chapel | hop, 2 | 6 | 1 | Pads tip you off |
| 85 | Cloister | pivot, 2 lines | 6 | 2 | A late burrow |
| 86 | Ivy Walk | rail, a lasso | 6 | 2 | Leaves drift across |
| 87 | Bell Tower | hop, 3, an eight | 6 | 2 | Fill the bar in 185 seconds |
| 88 | The Old Font | pivot (low) | 6 | 2 | Pop 7 golden marbles |
| 89 | Fallen Statue | rail, 2 lines | 6 | 1 | Lines at different speeds |
| 90 | The Folly | pivot (low), a line down each side | 6 | 2, **Boss** | Boss: the Stone Lion wakes |

## Chapter 10: The Night Garden (full game, the last)

New: **night**: a dark layer over the board with soft pools of light round the gecko, the lanterns by the wells, the burrows, shots in flight and pops, and patches of moonlight drifting over; marbles in the dark show only faintly. The **Lantern** charm lights the whole garden for 12 s. The chapter brings back a little of everything.

| # | Name | Gecko | Colours | New | Twist |
|---|---|---|---|---|---|
| 91 | Moonrise | pivot | 5 | Night |  |
| 92 | Night Stocks | rail | 5 | | Charms galore |
| 93 | Lantern Light | pivot, square spiral | 6 | Lantern charm |  |
| 94 | Moon Bridge | hop, 2, a lasso | 6 | | Pop 6 golden marbles |
| 95 | Box Hedges | pivot, a squared spiral | 6 | | Hold out for 85 seconds |
| 96 | Moonflowers | rail, an eight | 6 | + chameleons | The lines lurch on now and then |
| 97 | The Moon Pool | hop, 3 | 6 | + twine | No swapping |
| 98 | Night Scented | pivot (low), a lasso | 6 | | The gecko paces |
| 99 | Midnight | rail, one long zigzag | 6 | + stones | Gusts bend your shots |
| 100 | The Last Lantern | hop, 2 (low), a line down each side | 6 | **Boss**, the last | Boss: the Owl in the dark |

Balance: a headless bot (perfect sight, slow and wobbly aim) plays every level; middle levels of a chapter should not be harder than its final test, and new chapters sit near chapter 4–5's rates. Night levels are eased beyond that, since the bot sees in the dark.

## The map

A vertical scroll: the estate's garden plan seen from above, which the gecko climbs from the garden by the house (chapter 1) to the night garden (chapter 10). All ten chapters are painted (`BUILT_CHAPTERS` = 10); a chapter not built yet would be a pencil draft. A worn stone groove winds up through every chapter with a pocket for each level, a marble in it once reachable; each chapter has a gate and a name board at its foot. Chapters not built yet are pencil drafts; the full game's chapters are painted but locked until bought.

- The gecko waits on the path below the level it's up to; after a win it walks up to the next one and the view follows.
- Tapping a level opens its card: a picture of the board, how the gecko plays it, what's new in it, its blots and best time against par, and Play.
- Drag, the mouse wheel, the arrow keys or Page Up / Down move along it; Enter plays the gecko's level; a "Gecko" button brings the view back.

## Art

Same ballpoint notebook as InkCrab: blue ink lines, watercolour washes, paper. The board is seen from above.

- **The gecko:** top-down, splayed toes, round eyes on top of the head. Pen lines are one texture; the skin wash is a second, white texture tinted to the marble's colour.
- **Marbles:** a wash of colour, a pen contour, a glint, and the colour's pattern. They turn as they roll.
- **Track:** a groove worn into paving stones, drawn once per level. The burrow is a dark hole at the start; the well is a ring of stones at the end, washed red as the line nears it.
- **Pops:** ink splashes in the marble's colour.

## Sound

Synthesized like InkCrab's: a tongue *thwip* to spit, a click as a marble joins, a pop that rises a step with each combo link, a whoosh for rollback, a ticking heartbeat when the line nears the well, a splash in the well, and chimes for charms, wins and losses. Also a springy hop and a plop on landing, a dragonfly's fluttering zip, and a rattle as the line pours out at the start.

Under the effects: the line's rolling rumble (loud while it rushes out, quiet as it creeps, still when it stops) and a bed for the place: wind in the leaves with birdsong in the garden and on the map; frogs and drips by the pond.
