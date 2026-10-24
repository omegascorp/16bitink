# Long-form #2: "Fish eat fish size comparison… but every animal is real"

**Status:** made 2026-10-24 (4:34). The files are in `promo/longform/` (`upload.md` has the title, description, chapters and tags). Re-record with `pnpm --filter @16bitink/inkfish promo -- --only long-foodchain` (about 11 minutes); the captions come from `node dev/promo/foodchain/saveSrt.mjs` and the thumbnails from `pnpm --filter @16bitink/inkfish thumbnail foodchain`. The new drawings are on `longform.html?video=foodchain-kit` (`&only=orca` for one).

**Code:** `timeline.ts` reads every beat off `words.ts`; `climb.ts` is the chain engine (each mouth reaches its prey on its gulp time, and the camera zooms in log space); `chains.ts` holds the cold open's and the climb's timings; `view.ts` draws a chain with its schools; `field.ts` the clouds of food each hero eats through; `scene.ts` the climb's sections with their rings and cut-ins; `open.ts` the cold open; `giants.ts` sections 9–10; `hud.ts` the weight tag, step card, ruler and pyramid; `inserts.ts` the game card, stopwatch, coast, piano, magnifier, surface and end card; `art/` the new animals.

A narrated climb up the ocean's food chain, one bite at a time. It starts at a diatom (0.05 mm), which is eaten by a copepod, which is eaten by an anchovy, then a mackerel, then a bluefin tuna, then an orca. Then it explains why the chain stops there, and ends on the twist that the biggest animals in the sea eat at the bottom of the chain. Every animal is drawn in InkFish's pen and ink.

- **Format:** 1920×1080, 30 fps, not looping. Target about 5:00 (~760 words), with the end card holding 5 s after the last word.
- **Voice:** the locked narrator, *Mark – Natural Conversations* (`UgBBYS2sOqTuMpoF3BR0`, `eleven_v4`), directed by the rules in "Directing the voice" in `docs/shorts-playbook.md`. Narrated one section per take, so any line can be redone on its own.
- **Sound:** the voice, a bed that warms and swells as the animals get bigger, gulp and bite effects from the game, a counter tick-up on each weight, and a low drone under the blue whale.
- **Captions:** an `.srt` built from the word timings and uploaded as CC (not burned in).

## Why this shape

- **It's MrBeast's "$1 vs $X" format with animals.** His *$1 vs $500,000 Plane Ticket* (607M), *$1 vs $1,000,000,000 Yacht* (580M) and *$1 vs $1,000,000 Hotel Room* (483M) do this: name both ends in the title, preview the top, start at the bottom, put the number on screen at every step, and give the low steps little time and the top steps a lot. Our "price tag" is the **weight**: it climbs from a ten-millionth of a gram to 150 tonnes, so every step has a number to shout ("a quarter of a MILLION times heavier!").
- **The "Fish Eat Fish" genre is big and still growing,** and nearly all of it is fiction. Zoom Life's *Fish eat Fish | Comparison* has 8.8M views in 2 years. In the last year, MetaVine Labs got 1.6M, Exard got 1.2M (3 months) and 2.3M, PlayWise got 1.4M, and Axtro got 0.7M (5 months). Almost every one ends on a made-up monster (Bloop, Sea Eater, El Gran Maja). Ours stays real and ends on a true twist.
- **"There's always a bigger fish" is a meme everyone knows,** and it's how InkFish plays. It's the spoken hook and the alternative title.
- **"Why" beats "what"** (`docs/longform-playbook.md`). The video answers one question the whole way up: why does the chain stop, and why are the biggest animals at the bottom? The answer is the 10% rule. Each step keeps about a tenth of the food, so the top runs out, and the giants get big by eating low. Like MrBeast's long explanations, it sits in the back half, once viewers are invested.
- **Crazy progression in the first minute:** the diatom and copepod, the least exciting animals, get ~35 s together, and the anchovy school arrives by ~1:00.
- **Re-engagement at ~3:00:** the orcas that hunt great whites ("the shark from Jaws is about to become a side dish") land at about 2:45, right after the game mention.
- **Open loops** are planted in the first 30 s and closed at the end. Loop 1: the biggest animal ever eats something the size of a paperclip, and something less than half its size hunts it. Loop 2: "a hundred percent", planted at step 1, which pays off as the reason the chain stops. Loop 3: "you don't have to eat the step right below you", planted at the mackerel, which pays off with the giants.
- **An abrupt ending:** the last line, then one sentence for the game, then the end card.
- **Rage-bait line** (from the 2026-10-18 rule: arguable, cheeky, never a false fact): "An orca isn't a fish. Bigger fish, not a fish. We'll allow it." Pin a pick-a-side question: *"Does an orca count as a 'bigger fish'? 🐋 or 🐟"*.

## Packaging

### Title (test the first two against each other)

1. **Fish Eat Fish Size Comparison… But Every Animal Is Real**: the two search terms that carry the genre ("Fish Eat Fish": Zoom Life 8.8M; "Size Comparison": *Sea Monsters Size Comparison* 53M, *Fish Size Comparison* 9.8M), plus what sets ours apart from the fiction that fills it.
2. **There's Always a Bigger Fish… Until There Isn't**: the meme plus an open loop, the same shape as #1's "…Until They Can't" (4.3% CTR).
3. *Ocean Food Chain Size Comparison: Who Eats Who*: plainer, more search-shaped.

Rejected (2026-10-24): "1 mm vs 30 m" (the eye reads 1 vs 30 before the units) and "0.0001 g vs 150,000,000 g" (the user found no popular video with grams in the title; the ones that work say "200 lb", "1,000 lbs"). Studio's Test & Compare can test titles as well as thumbnails; run 1 against 2.

### Thumbnail: four variants (Test & Compare takes three; drop the weakest at 160×90)

These follow the rules in `docs/longform-playbook.md`: saturated blue with warm fish, a giant mouth cropped by the frame, big eyes, 0–3 words in white or yellow with a fat black outline.

| | Concept | Why it should work |
|---|---|---|
| **A · Split** | Left third: a copepod with one big red eye, alone on pale green water. Right two-thirds: the blue whale's open mouth and ballooned throat, cropped by the frame, deep blue. A hard red divider; under each side its weight in pounds ("0.0000002 lb" / "330,000 lb"). | MrBeast's "$1 vs $X" thumbnail: only the two ends, nothing in between. Matches title 1. |
| **B · Nesting mouths** | The bluefin's open mouth fills the right half, red inside, cropped by the frame. Inside it, a mackerel with its mouth open; inside that, an anchovy; inside that, a copepod. Text: **"UNTIL…"** | Our best picture (a giant mouth mid-gulp, like both breakout shorts) four times over. Matches title 2. |
| **C · Wrong way** | The blue whale's open mouth, cropped. Small fish climb a staircase on the left; a fat red arrow points from the whale DOWN to a tiny krill. Text: **"WRONG WAY?"** | The twist as a curiosity gap. |
| **D · Side dish** | An orca's face close up. Below and small, a great white with a big worried eye looks up at it. Text: **"LUNCH"** | A role reversal with a known villain (Jaws). No blood. |

## Picture

**One continuous zoom out.** The camera starts inside a drop of sunlit water and pulls back every time something bigger eats. It's the self-similar food-chain zoom from `../chain.ts`, stretched across six real steps and slowed to the narration. The water goes from sunlit green-blue (plankton) to deep open-ocean blue (tuna, orca).

Overlays (hand-drawn, Caveat font, like the game's map):

- **The weight tag: the hero number, our "$1… $500,000".** Big, bottom centre, **in pounds** (for the US audience), with grams in small type under it; one unit for the whole video, so the digits pile up like MrBeast's dollars. At each step it counts up from the last animal's weight to the new one with a tick sound, then the jump pops beside it ("×250,000!"). The steps: diatom 0.0000000002 lb (0.0000001 g) → copepod 0.0000002 lb (0.0001 g) → anchovy 0.06 lb (25 g) → mackerel 1.5 lb (700 g) → bluefin 660 lb (300,000 g) → orca 11,000 lb (5,000,000 g); then the giants, whale shark 44,000 lb (20,000,000 g) and blue whale 330,000 lb (150,000,000 g).
- **US units under every number** (the user, 2026-10-24, for the US audience): every weight tag, size label and ruler mark shows both: weights lead in pounds with grams under them ("660 lb" over "300,000 g"), lengths in metres with feet under them ("2.5 m" over "8 ft"). Narrated weights give pounds too.
- **Size ruler** down the left edge, on a log scale from 0.01 mm to 30 m, with everyday marks drawn small beside it: a grain of salt, a sesame seed, a hand, a person, a bus. A marker climbs it.
- **Food pyramid** in the top right. One band per step, each ten times narrower than the one under it, labelled 100%, 10%, 1%, 0.1%, 0.01%, 0.001%. At each step, the 90% that's "burned up" curls off the band as ink smoke. By the orca, the top band is a hair.
- **Step card** at each new animal: "STEP 3 · ANCHOVY".
- Each animal gets a hand-drawn **ring and label** when a part of it is named (the copepod's eye, the anchovy's open mouth).

Something new comes on screen every 10–15 s.

## Script

Each section gives the line as it will be voiced (tags and punctuation per "Directing the voice"), the mood of each sentence, then what's on screen. *(Loop)* marks an open loop and where it closes. Times are targets; `timeline.ts` reads the real ones off the words.

### 0 · Cold open (0:00–0:25)

> [excited] An anchovy eats a copepod! [dramatically] A mackerel eats the anchovy. A TUNA eats the mackerel… [surprised] and an orca eats the tuna!
> [mischievously] There's always a bigger fish. [dramatically] Until, right at the top… there isn't.
> [curious] And then the biggest animal that has EVER lived skips the whole chain… [chuckles] and eats something the size of a paperclip. [nervous] And the one animal that hunts it? Less than half its size.
> [warmly] Let's climb it, one bite at a time. Starting with something smaller than a grain of salt.

*Moods: thrill → menace → shock → smug → ominous → puzzled → amused → uneasy → cosy.*

*Frame 1 is action: the anchovy's open mouth fills the screen, mid-gulp around a copepod (gulp SFX). Then on each "eats", the camera pulls back to the next gulp: mackerel, tuna, orca jaws closing on the tuna (one per line, so each animal is on screen as it's named; the weight tag flickers up through the numbers). On "there isn't", a slow pull back: the orca alone in empty blue, nothing coming. On "the biggest animal", a vast shadow slides over everything, and the blue whale's open throat sweeps through a cloud of krill; a paperclip is drawn beside one krill. On "less than half its size", orca fins circle the whale; cut away before anything happens (Loop 1: closed in section 9). On "grain of salt", a hard cut to a sunlit surface and a dive into one drop.*

### 1 · Diatom, 0.05 mm, 0.0000001 g (0:25–0:42)

> [curious] Step one isn't even an animal. [surprised] It's a plant… living in a shell of GLASS! [excited] A diatom. One breath in five that you take? A diatom made that oxygen. [dramatically] And every bite of food in this video starts here. [warmly] Call it a hundred percent.

*Moods: curious → amazed → delight → serious → cosy.*

*A single diatom, a glass pillbox with an etched pattern, turns slowly in a sunbeam. The weight tag: "0.0000001 g". Oxygen bubbles bead off it; on "one breath in five", one bubble in five rises out of frame. On "a hundred percent", the food pyramid draws its base band: "100%". (Loop 2: where does the food go? Closed in section 7.)*

### 2 · Copepod, ~1 mm, 0.0001 g (0:42–1:02)

> [excited] Step two: a THOUSAND times heavier! A copepod. [chuckles] Lots of them have just ONE eye. One's literally called Cyclops. [dramatically] It eats the diatom. And here's the catch: [sad] only about a TENTH of that food becomes copepod. The rest burns up… just staying alive. [softly] A hundred percent… down to ten.

*Moods: hype → silly → tense → glum → quiet.*

*Pull back ×20. The weight tag counts up, "×1,000!". A copepod kicks in on its long antennae and diatoms vanish into its mouth. Its single red eye gets a ring: "1 eye". On "burned up", 90% of the base band curls away as ink smoke, and a band ten times narrower draws on top: "10%".*

### 3 · Anchovy, ~15 cm, 25 g (1:02–1:22)

> [surprised] Step three: a quarter of a MILLION times heavier! An anchovy. [excited] It swims with its mouth wide open, like a net with fins, and sieves the copepods right out of the water! [curious] In the Mediterranean, it's the bluefin tuna's favourite meal. Hold that thought. [softly] Food left: one percent.

*Moods: shock → glee → intrigue → quiet.*

*Pull back ×150: the copepod shrinks to a dot, and a school of anchovies sweeps through a copepod cloud, mouths agape (ring: "open mouth = net"). The weight tag rolls up through five digits: "×250,000!". On "bluefin tuna", a tuna's shadow passes far behind the school. Pyramid: "1%".*

### 4 · Mackerel, ~40 cm, 700 g (1:22–1:42)

> [excited] Step four: thirty times heavier! A mackerel. [chuckles] And mackerel aren't fussy. Off Japan, they eat krill, a step DOWN, for half the year… then switch to anchovies in summer. [mischievously] Hold onto that: you don't HAVE to eat the step right below you. [softly] Food left: a tenth of a percent.

*Moods: hype → amused → sly → quiet.*

*Pull back ×3. "×30!". Mackerel drive the anchovies into a bait ball. On "krill", a mackerel dips down through a krill swarm, and an arrow points two bands down the pyramid. (Loop 3: closed in section 8.) Pyramid: "0.1%".*

### 5 · Atlantic bluefin tuna, ~2.5 m, 300 kg (1:42–2:05)

> [excited] Step five: FOUR HUNDRED times heavier! An Atlantic bluefin tuna. [dramatically] The biggest one ever caught weighed six hundred and seventy-nine kilos… [excited] that's almost FIFTEEN HUNDRED pounds! [surprised] Heavier than a grand piano! [curious] And it keeps its muscles WARM, in cold water. Fish aren't supposed to be able to do that. [softly] Food left: one hundredth of a percent.

*Moods: hype → awe → shock → intrigue → quiet.*

*Pull back ×6. "×400!". The tuna slices through the bait ball. On "heavier than a grand piano", a grand piano is drawn beside it. A person's outline appears on the size ruler for the first time. On "WARM", the tuna's flanks glow warm orange through the blue (a heat-camera wash). Pyramid: "0.01%".*

### 6 · The game (2:05–2:20)

> [warmly] Quick one: every animal you're watching is drawn for a game called InkFish. You start as the smallest fish in a puddle, and eat your way up, one bite at a time. [excited] Chapter one's free in your browser, at sixteen-bit dot ink!
> [mischievously] Okay. Step six. [dramatically] And the shark from Jaws is about to become a SIDE dish.

*Moods: friendly → upbeat → sly → menace.*

*A short gameplay clip: the inkling in the tide pool eating minnows, then growing (the game's level-up chime). "InkFish · 16bit.ink" in the corner. On "Step six", back to the open ocean, darker now.*

### 7 · Orca, ~7 m, 5 t (2:20–3:05)

> [excited] Step six: SEVENTEEN times heavier! The orca. [dramatically] In the Strait of Gibraltar, orcas chase bluefin for up to HALF an hour, flat out, until they catch one!
> [sarcastic] And yes, I know. An orca isn't a fish. [chuckles] "Bigger fish", not a fish. We'll allow it.
> [nervous] Off South Africa, two orcas called Port and Starboard started hunting GREAT WHITES. [surprised] Yes, the shark from Jaws. And the great whites didn't just hide. They left. For weeks… sometimes months.
> [curious] So what eats an orca? [dramatically] Nothing. Not one animal hunts a grown orca. [softly] There's always a bigger fish… until there isn't.

*Moods: hype → thrill → deadpan → playful → dread → shock → triumph → puzzled → grim → hush.*

*Pull back ×3. "×17!". A long chase: the tuna weaving, the orca never letting go; a stopwatch in the corner ticks up to "30 min". On "isn't a fish", a hand-drawn "FISH?" label flips over the orca. On "Port and Starboard", two orcas with bent, floppy dorsal fins (that's how they're recognised), and a great white with a big worried eye bolts out of frame. On "They left", a small coastline map shows shark dots scattering away. No blood. On "Nothing", the camera pulls back on an empty sea with the orca alone, the same shot as the cold open. Pyramid: "0.001%", a hair.*

### 8 · Why the chain stops (3:05–3:30)

> [curious] But why? Remember the hundred percent? [dramatically] Every step up keeps only a tenth. By the orca, out of everything the diatoms made… a THOUSANDTH of one percent is left. [sad] A hunter of orcas would get a tenth of that. [softly] There just isn't enough food up here for one more step. [surprised] Which means… if you want to get really, REALLY big… you can't climb.

*Moods: puzzled → serious → stunned → glum → hush → surprise.*

*The whole pyramid fills the screen, all six bands, from the 100% base to the hair at the top. A seventh band tries to draw above the orca and comes out as a dotted outline with nothing in it. (Loop 2 closed.)*

### 9 · The giants eat at the bottom (3:30–4:15)

> [mischievously] Remember the mackerel that went back down for krill? [excited] The giants do the same thing! [dramatically] The biggest FISH in the sea is the whale shark, as long as a bus. [chuckles] And it eats… copepods. And fish eggs. Step two.
> [excited] And the biggest animal that has EVER lived? The blue whale. A hundred and fifty TONNES: that's over three HUNDRED THOUSAND pounds. [surprised] It eats krill: little shrimp the size of a paperclip, that eat diatoms. [dramatically] It skips every step in between, so it can reach about a THOUSAND times more food than the orca can. [excited] In the feeding season, one blue whale eats about sixteen tonnes of them… thirty-five thousand pounds, every day!
> [softly] The biggest animals in the ocean aren't at the top of the chain. [warmly] They're at the bottom.

*Moods: sly → hype → awe → deadpan → awe → shock → triumph → wow → calm → warm.*

*(Loop 3 closed.) A whale shark glides in with its mouth open, through copepods; a bus is drawn on the ruler; the weight tag: "44,000 lb". A red arrow runs from the whale shark down to band 2. Then the blue whale: the camera pulls back so far that the orca becomes a speck, and the weight tag rolls up to "330,000 lb". Its throat balloons around a krill swarm; a paperclip sits beside one krill (the same drawing as the cold open). Its arrow also points to band 2. Under "sixteen tonnes", a counter ticks up. On "They're at the bottom", the pyramid becomes a picture of the whole video: the two giants at the base, the orca alone at the tip.*

### 10 · The payoff (4:15–4:45)

> [nervous] But even the blue whale isn't safe. [dramatically] In 2019, off Western Australia, scientists watched a pod of orcas, each less than half its length, chase down an adult blue whale… [surprised] and win. [softly] Together.
> [warmly] There's always a bigger fish. Until there isn't. [chuckles] And then… there's a team.
> [excited] Start at the bottom of the chain in InkFish: free in your browser, at sixteen-bit dot ink!

*Moods: dread → tension → shock → hush → warm → wry → upbeat.*

*The orca fins from the cold open circle the blue whale (Loop 1 closed). They herd it, it dives, and we cut away to the surface: a calm sea and a spout of spray. No blood. On "a team", the orcas swim off side by side. On the last line, the end card: the "InkFish" logo, "Free in your browser · 16bit.ink", and the right half kept clear for YouTube's end-screen elements (5 s after the last word).*

## Description

The final description, chapters and tags are in `promo/longform/upload.md` (chapter times read off `words.ts`).

## Art

| Animal | Status |
|---|---|
| Copepod | Exists: `../pipefish/brood.ts` (`copepodAt`); needs a bigger close-up with one eye |
| Anchovy, mackerel | The game's species (`src/levels/species.ts`: `anchovy`, `mackerel`) |
| Bluefin tuna | Exists: `../tuna/fish.ts` |
| Diatom, krill, paperclip | New: `art/plankton.ts` (painters in `art/plankton/`) |
| Orca, great white, whale shark, blue whale | New: `art/orca.ts` (with Port and Starboard's bent fin), `art/greatWhite.ts` (with a worried look), `art/whaleShark.ts`, `art/blueWhale.ts` (gape and ballooning throat) |

## Fact sources

| Claim | Source |
|---|---|
| Diatoms: one cell, silica (glass) walls; about one breath in five comes from diatoms | [WHOI](https://www.whoi.edu/know-your-ocean/did-you-know/does-the-ocean-produce-oxygen), [Live Science](https://www.livescience.com/46251-diversity-of-diatoms.html) |
| Copepods graze diatoms | [NASA Ocean Planet](https://seawifs.gsfc.nasa.gov/OCEAN_PLANET/HTML/oceanography_up_there.html) |
| *Cyclops* is a copepod genus, named for its single median eye | Textbook |
| Roughly 10% of energy passes from one level to the next (mean transfer efficiency 10%) | Pauly & Christensen 1995, *Nature*, via [FishBase](https://fishbase.se/Ecopath/PPRnatur.htm) |
| Anchovies filter-feed on copepods and krill with a wide-open mouth | [Aquarium of the Pacific](https://aquarium.org/animals/northern-anchovies/), Argentine anchovy diet ([Redalyc](https://www.redalyc.org/pdf/1750/175019398002.pdf)) |
| Atlantic bluefin in the Mediterranean: anchovy in >80% of samples, plus sardine, sprat and mackerel | Metabarcoding study, summarised in search results; **confirm the paper before publishing** |
| Chub mackerel off Japan switched from krill to anchovy after mid-July (1954 study, ~1,300 fish); chub mackerel feed on anchovies | [Hiroshima University](https://ir.lib.hiroshima-u.ac.jp/00040499?locale=en), [Brazilian J. Oceanography](https://revistas.usp.br/biocean/en/article/view/39885) |
| Bluefin eat mackerel and herring; record 679 kg (1,496 lb), 3.84 m, Nova Scotia 1979 | [Wikipedia](https://en.wikipedia.org/wiki/Atlantic_bluefin_tuna), [Outdoor Life](https://www.outdoorlife.com/fishing/world-record-tuna.md) |
| Bluefin keep their muscles warmer than the water (regional endothermy) | [National Geographic](https://www.nationalgeographic.com/animals/fish/facts/atlantic-bluefin-tuna) |
| A concert grand piano weighs ~480 kg | Textbook (Steinway Model D) |
| Conversions: 679 kg = 1,497 lb; 150 t = 330,693 lb; 16 t = 35,274 lb | 1 kg = 2.2046 lb |
| Gibraltar orcas chase tuna for up to 30 min at high sustained speed until they catch them | Guinet et al. 2007, [MEPS 347:111–119](https://int-res.com/abstracts/meps/v347/p111-119) |
| Port and Starboard kill great whites off South Africa (carcasses from 2017, filmed 2022); great whites left the area for weeks to months | [Live Science](https://livescience.com/killer-whales-attack-great-whites-video), Towner et al. 2022 via [Discover](https://discovermagazine.com/the-sciences/great-white-sharks-flee-from-orca-attacks) |
| Adult orcas have no natural predators | Textbook |
| Whale shark: more than 12 m (a city bus is ~12 m), eats copepods, krill and fish eggs | [Smithsonian](https://insider.si.edu/2011/05/scientists-discover-the-largest-assembly-of-whale-sharks-ever-recorded/) |
| Blue whale: up to ~30 m; large adults ~150 t (heaviest recorded ~190 t); still the largest animal ever after *Perucetus* was revised down | [Live Science](https://livescience.com/animals/extinct-species/colossus-the-enormous-oddball-whale-is-not-the-biggest-animal-to-ever-live-scientists-say) |
| Blue whales eat krill; krill eat phytoplankton (diatoms) | Textbook |
| North Pacific blue whales eat ~16 t of krill a day in the feeding season | Savoca et al. 2021, *Nature*, via [NPR](https://www.npr.org/2021/12/24/1067775108/the-calorie-intake-of-a-baleen-whale-is-mind-boggling) |
| Orcas killed an adult blue whale off Bremer Bay, WA, on 21 March 2019 (~18–21 m); published 2022 | Totterdell et al. 2022, *Marine Mammal Science*, via [NPR](https://www.vpm.org/npr-news/2022-02-18/scientists-witness-orcas-kill-the-worlds-largest-animal-the-blue-whale), [National Geographic](https://on.natgeo.com/3IByzGw) |
| Orcas are about 6–8 m and ~4–6 t (largest ~9 m) | Textbook |
| Weights (order of magnitude, for the weight tag): a 50 µm diatom ~10⁻⁷ g (its volume × ~1.1 g/cm³); a 1–1.5 mm copepod ~0.1 mg wet; a 15 cm anchovy ~25 g; a 40 cm chub mackerel ~700 g; a 2.5 m bluefin ~300 kg; whale shark ~20 t | Length–weight estimates; shown with "~" on screen |
