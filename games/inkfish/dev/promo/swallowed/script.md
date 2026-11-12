# Long-form #7: "Swallowed Whole Size Comparison… But Every Meal Is Real"

**Status:** scripted and fact-checked 2026-11-12 (separate agent: no '500 lb' grouper weight, no 'belly bigger than its head', pike figure is a pond study's mean, frogfish 'reported' not measured, pelican eel 'crustaceans', the rot-and-float twist as 'scientists think').

A stair-step of fish that swallow meals as big as themselves, measured one way all through: **the meal's length as a share of the eater's**. Goliath grouper + shark (50%+, estimated) → young pike + another pike (66%) → frogfish (100%+, reported) → black swallower + snake mackerel (~450%). Two "checked, not real" stops between the steps: the lionfish's "30× stomach" (unsourced) and the pelican eel (the biggest mouth, the smallest meals). The twist: the champion's meal can kill it, and that's how we find them. Its loop opens in the cold open: a black swallower filmed this summer with a belly bigger than its head.

- **Format:** 1920×1080, 30 fps, not looping. Target about 2:45 (~430 words), the end card holding 5 s after the last word.
- **Voice:** the locked narrator, *Mark – Natural Conversations* (`UgBBYS2sOqTuMpoF3BR0`, `eleven_v4`), directed by "Directing the voice" in `docs/shorts-playbook.md`. One take per block, two takes each.
- **Sound:** the voice; the game's gulps on every swallow; a ruler tick as the counter climbs; a stamp thump on every verdict; a low bed that deepens step by step.
- **Captions:** an `.srt` from the word timings, uploaded as CC.

## Why this shape

- Planned as topic #6 in `docs/longform-playbook.md` ("Swallowed Whole"): our best short format (the narrated swallow) inside our best long-form format (the size-comparison stair-step).
- **One unit, one counter:** "MEAL = N% OF ITS LENGTH", on screen at every step, climbing 50+ → 66 → 100+ → 450. The last step is ×4: the MrBeast jump at the top.
- **"Every meal is real"** is the angle, as in #2, #4 and #6: the genre is full of unsourced claims, so two of them get stamped **NOT MEASURED** on screen.
- **Open loops:** (1) the 2026 fish with the swollen belly, closed at the end; (2) "the champion's meal is four times longer than it is", teased in the cold open, paid off at the swallower.
- **Arguable lines (comment test):** "Pike are the worst siblings." / "We looked. Nobody measured that." Pinned question: *"Which is crazier: a pike eating a pike, or a fish eating a fish 4× its length? 🐟"*

## Packaging

### Title (test 1 against 2)

1. **Swallowed Whole Size Comparison… But Every Meal Is Real**: #2's title shape.
2. **Fish That Swallow Prey Bigger Than Themselves (Size Comparison)**: the search phrase.

### Thumbnails (Test & Compare takes three)

| | Concept | Text |
|---|---|---|
| **A · Split** | Left: the grouper's open mouth with the shark's tail sticking out. Right: the tiny black swallower with its ballooned belly and the mackerel's outline in it. Red divider. | **50%** \| **450%** |
| **B · Balloon** | The swallower alone, huge, belly ballooned and see-through, the coiled mackerel inside, on bright blue. | **4× ITS SIZE** |
| **C · Cannibal** | A pike's jaws round a second pike, two-thirds its size, tail out of the mouth. | none |

## Picture (keep it simple)

One stage for the whole video: bright blue water (a gradient, a few drifting specks, a vignette), and a sandy strip at the bottom with a ruler in inches, centimetres under.

- **Every step:** the eater swims in from the left and stops left of centre, facing right; the meal drifts in from the right. Two length bars under them fill to their lengths (inches and cm). The jaws open, the meal slides in (seen going in at the lips, never poking out the back), the belly swells, a gulp. The counter top-right climbs to "N% OF ITS LENGTH", then a stamp: **MEASURED** or **ESTIMATED**.
- **The camera zooms** so the bigger of the two fills about 70% of the width. The ruler's numbers rescale with it.
- **A ladder strip** along the top collects each step: a small eater icon and its percentage.
- **A name card** bottom-left: "THE GOLIATH GROUPER · ~7 ft · ~500 lb (est.)" (US first, metric under).
- **"Not measured" stops** (lionfish, pelican eel): the fish on the same stage, the claim in a speech-bubble-like card, then a grey **NOT MEASURED** / **MYTH** stamp. No counter.
- **The game card:** bitecomp's InkFish reef card (`bitecomp/gameCard.ts`).
- Every fish is the game's own drawing (`src/art/fish/species/`), opened and swollen by the goliath short's swimmer: grouper, blacktip (reef shark), pike, lionfish, frogfish (the reef `angler`), pelican eel (`gulper`), wrasse, perch, needlefish-shaped snake mackerel, and the swallower's anatomy from `../swallower/anatomy.ts`.

## Script

### 1 · Cold open (0:00–0:28)

> [excited] In July, a robot filmed a tiny black fish… [nervous] over four thousand feet down, with a belly stretched like a BALLOON! [curious] What's in there? Nobody knows. [mischievously] But we know what its kind can swallow… [surprised] a fish four times longer than itself! [dramatically] So today: fish that swallow meals as big as they are. Smallest to biggest. [warmly] And every number is real. If nobody measured it, we'll tell you.

*Moods: thrill → dread → mystery → sly → shock → epic → trust.*

*Frame 1: the swallower in the dark, belly ballooned, its eye in a spotlight, a "1,259 m · 4,130 ft" depth tag. On "Nobody knows", a yellow "?" over the belly. On "four times longer", a long dashed outline unrolls beside it, 4.5× its length. On "Smallest to biggest", the stage lights up blue and the counter appears at 0%.*

Sources: SpeSeas / Schmidt Ocean Institute, R/V *Falkor (too)*, ROV *SuBastian*, July 2026, ~1,259 m off Trinidad and Tobago, belly bulging, contents unknown (Diva Amon; Nautilus, 15 Oct 2026). The 4.5× figure: the 2007 Cayman specimen (block 5).

### 2 · Goliath grouper + the game (0:28–1:02)

> [excited] First: the goliath grouper! [surprised] In 2014, off Florida, fishermen were reeling in a shark about four feet long… and a grouper swallowed it in ONE bite! [sarcastic] Nobody measured the grouper… [chuckles] they were a little busy. [curious] But goliaths grow to about eight feet, so that shark was at least HALF its length. [warmly] Quick one: every fish you're seeing is drawn for a game called InkFish. You start as the smallest fish in the sea and eat your way up. Chapter one is free in your browser, at 16bit.ink!

*Moods: hype → shock → sarcasm → laugh → curious → warm.*

*The grouper swims in, the blacktip on a fishing line from the top, one gulp; the belly swells long. Counter to 50%, ESTIMATED stamp. Name card "~7 ft · ~500 lb (est.)". Then the game card.*

Sources: Bonita Springs, FL, August 2014 (NPR; Time; HuffPost), anglers reeling in a blacktip they guessed at ~4 ft (some outlets say 5 ft); nobody weighed the grouper. Goliaths reach ~8 ft / 2.5 m (FishBase max 250 cm), so the shark was at least half its length.

### 3 · Pike + the lionfish (1:02–1:40)

> [excited] Now the pike: a torpedo with teeth. [surprised] And its favourite big meal? Another pike! [nervous] In a pond study of young pike… [dramatically] the one that got eaten was, on average, TWO-THIRDS the length of the one eating it. [mischievously] Pike are the worst siblings. [curious] And you've probably heard a lionfish's stomach can stretch thirty times its size. [sarcastic] We looked for the measurement. We couldn't find one.

*Moods: hype → shock → dread → grim awe → cheeky → curious → deadpan.*

*A pike in from the left, a smaller pike from the right; jaws round it, the tail out of the mouth for a beat, then in. Counter 50 → 66%, MEASURED. Then the lionfish drifts in, fins spread; a card "STOMACH STRETCHES 30×?" and a grey NOT MEASURED stamp across it.*

Sources: Bry, Basset, Rognon & Bonamy 1992, *Environ. Biol. Fishes* 35:75–84, sibling cannibalism among juvenile pike (30–130 mm) in outdoor rearing ponds: mean prey/cannibal length 66.2%, prey swallowed head first. Lionfish "can expand up to 30 times" (Smithsonian Magazine, no study cited; Live Science repeats it).

### 4 · Frogfish + the pelican eel (1:40–2:12)

> [curious] The frogfish doesn't even chase. It sits… it waits… [excited] and BAM! [surprised] One of the fastest strikes of any animal with a backbone! [dramatically] It can swallow prey as big as ITSELF… even bigger. [chuckles] Its stomach just… stretches. [curious] So the fish with the biggest mouth must eat the biggest meals, right? [sarcastic] The pelican eel? Mostly little crustaceans.

*Moods: patience → hype → shock → awe → laugh → set-up → deadpan.*

*The frogfish sits on the sand; a wrasse longer than it drifts past; a white flash, it's gone; the frogfish's belly balloons round. Counter 66 → 100%+, MEASURED. Then the pelican eel (the game's gulper) opens its huge jaw at a speck: one tiny shrimp. A grey MYTH stamp: "BIGGEST MOUTH ≠ BIGGEST MEAL".*

Sources: Australian Museum (striate anglerfish: one of the fastest feeding actions of any vertebrate; Grobecker & Pietsch 1979, *Science* 205:1161); Fishes of Australia, Antennariidae ("can swallow prey larger than themselves"). Pelican eel: Nielsen et al. 1989, *Acta Zoologica*: mostly small crustaceans.

### 5 · The black swallower (2:12–2:50)

> [dramatically] Which brings us to the champion. The black swallower: usually six to eight inches long. [nervous] In 2007, one was found floating off Grand Cayman, with a snake mackerel inside it… [surprised] thirty-four inches long! [excited] Four and a half times its own length, folded up in its belly! [softly] But here's the twist… scientists think a meal that big can start to rot before it's digested… and the gas floats the fish up. [warmly] That's how many of them have been found. [curious] So that little fish from July? It might be carrying a huge meal… [mischievously] or it might be about to float up. And if you like eating your way up, InkFish is free, at 16bit.ink.

*Moods: epic → dread → shock → hype → hush → wonder → curious → sly → warm.*

*The swallower in the dark, tiny on the ruler; the snake mackerel's outline lies out beside it, 4.5× longer. The jaws open wide, the mackerel slides in and the belly balloons, see-through, the meal's outline folded inside. Counter 100 → 450% (the ruler rescales, the counter shakes). On "rot", the belly greys; on "floats up", the fish drifts belly-up towards light at the top. On "this summer", the cold open's fish again with its "?". End card.*

Sources: 2007, off Grand Cayman, Chiasmodon niger ~19 cm (7.5 in) with an ~86 cm (34 in) snake mackerel, *Gempylus serpens* (Caymanian Compass, 9 Oct 2007, via Wikipedia; identified by Tracey Sutton); the meal decomposing before it's digested, the gas floating the fish to the surface, how many specimens were found (to check).
