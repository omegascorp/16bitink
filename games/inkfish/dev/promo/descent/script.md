# Long-form #1: "Fish get weirder the deeper you go… until they can't"

**Status:** made 2026-10-14 (5:44). The files are in `promo/longform/` (`upload.md` has the title, description, chapters and tags). Re-record with `pnpm --filter @16bitink/inkfish promo -- --only long-descent`; the captions come from `node dev/promo/descent/saveSrt.mjs` and the thumbnails from `pnpm --filter @16bitink/inkfish thumbnail descent`.

The first long-form video. A narrated, educational descent from a tide pool to the bottom of the ocean, one stop for each of InkFish's ten chapters (`src/levels/zones.ts`). Every animal on screen is the game's own drawing.

- **Format:** 1920×1080, 30 fps, not looping. 5:44 (929 words), the end card holding 5 s after the last word.
- **Voice:** ElevenLabs, *Cedric M – Engaging Documentary Narrator* (as in the narrated shorts). One take per section, so any line can be redone on its own.
- **Sound:** the voice, a hum that gets lower and darker with depth, and quiet game effects.
- **Captions:** an `.srt` built from the word timings, uploaded as CC (not burned in).

## Why this shape

Packaging and retention follow `docs/longform-playbook.md`, which also holds the research behind them (similar videos and their views, thumbnail and retention practice). In short:

- **The promise is "every depth, stranger as you go".** It's proven at 17M and 2M views, and the 2M one is hand-drawn. That goes in the title.
- **"Why" beats "what".** Three things change on the way down (light, food, pressure), and every strange fish is an answer to one of them.
- **The depth-limit story is the open loop and the payoff, not the title.** New channels posting it as a title get almost no views.

## Packaging

### Title (pick one; the first is recommended)

1. **Fish Get Weirder the Deeper You Go… Until They Can't**: the proven "the deeper you go" promise plus the open loop the ending pays off.
2. *The Weirdest Fish at Every Depth of the Ocean*: safer and more search-friendly, but no loop.
3. *Why Fish Get Stranger the Deeper You Go*: the closest match to the 17M winner, maybe too close.

### Thumbnail: three variants for Test & Compare

All three follow the thumbnail rules in `docs/longform-playbook.md` (saturated colour, warm fish on blue, a big face with big eyes, 0–3 words in white or yellow with a fat black outline). All are drawn with the game's art in `dev/promo/thumbnail.ts`.

| | Concept | Why it should work |
|---|---|---|
| **A · Split** | Left half: bright blue, a small orange reef fish, cute, big eye, "10 m". Right half: near-black, the black seadevil's **open mouth filling the frame**, red inside, lure glowing, "4,000 m". Hard red divider. | Bright Side's split (12.7M) and the playbook's before/after rule. The size and creepiness contrast is the whole title in one picture. |
| **B · The line** | Dark blue water. Above: fangtooth and viperfish faces lit by their own glow. Across the lower third, a **red dashed line** with "NO FISH" in fat yellow under it. Below the line, a lamp's light cone with a pale fish shape half inside it. | A pure curiosity gap ("…until they can't"). The viewer wants to know what's below the line. |
| **C · Every layer** | A tall hand-drawn cross-section: ten bands from sunny turquoise to black, one game fish in each, getting stranger downwards. The bottom band holds a single glowing "?". | The Paint Explainer's drawn pyramid (2M in 3 months). It shows the scope: a whole ocean, in ink. |

## Picture

One continuous dive. The camera sinks through a single tall world, and the water darkens from the shallows' paper wash to near-black. Down the left edge runs a hand-drawn **depth gauge**. Beside it, **three dials**:

- ☀ light: 100% → 0;
- 🍤 food: plenty → scraps;
- ⬇ pressure: 1 → 1,100 atm.

The narration names them in the first minute, and they tick as we sink. At each stop:

1. A **chapter card** (zone name + depth range, Caveat font, like the game's map).
2. The chapter's **player fish** swims along with the camera: the inkling, then the goby, the perch fry… down to the snailfish.
3. Each fish gets a hand-drawn **ring and label** when it's named.
4. One small **action beat** from the game's mechanics: a bite, a leap, the lure, a lunge.

Something new comes on screen every 10–15 s. Between zones the camera keeps sinking while the gauge counts metres.

## Script

Each section lists its words, then what's on screen. *(Loop)* marks an open loop and where it closes.

### 0 · Cold open (0:00–0:30)

> The deeper you go in the ocean, the stranger fish get. Teeth too long to fit in their mouths. Heads you can see straight through. Searchlights that no one else can see.
> But keep going, and somewhere around eight kilometres down… they stop. There's a line in the ocean that no fish should be able to cross.
> In 2022, scientists lowered a camera just past that line. And something swam into the light.
> To see what it was, we have to start at the very top. In a puddle.

*Frame 1 is action: the viperfish's fangs snap shut in black water (bite SFX). Then quick cuts, one per line: the barreleye's green eyes turning inside its clear head, and the loosejaw's red beam sweeping. On "around eight kilometres", the gauge whips down and a red dashed line draws itself across the screen at 8,200 m. On "swam into the light", a lander's lamp makes a cone of light, and a pale tail flicks at its edge; we cut away before it's seen. (Loop 1: what was it? Closed at the end.) On "In a puddle", a hard cut to bright paper and sunlight, and the gauge flicks to 0 m.*

### 1 · Tide Pool, 0–5 m (0:30–1:00)

> A tide pool. Full sunlight, more food than anyone can eat, and the only weight on top is the air.
> On the way down, three things are going to change. The light fades. The food runs out. And the pressure climbs, one more atmosphere for every ten metres. Every strange fish we meet is an answer to one of those three.
> And the rule here is the rule all the way down: eat anything smaller than you… and don't get eaten by anything bigger.

*The inkling eats two minnows. On "three things", the three dials draw themselves in beside the gauge, all at their surface values. On "anything bigger", the perch lunges at the inkling and misses (dash SFX).*

### 2 · Seagrass Margins, 5–15 m (1:00–1:12)

> Five metres. A meadow, and it isn't seaweed. Seagrass is a flowering plant that moved back into the sea. And here, it's the pipefish dad who carries the eggs.

*The goby takes over. Seagrass sways. A pipefish hangs among the blades, its pouch ringed.*

### 3 · Kelp Forest, 15–30 m (1:12–1:27)

> Fifteen metres. A forest of giant kelp, which can grow more than half a metre in a day. The sheephead keeps it standing: it cracks the sea urchins that would eat it, with buck teeth.

*The perch fry weaves through kelp stems. A sheephead crunches an urchin.*

### 4 · Crosshatch Reef, 30–50 m (1:27–1:42)

> Thirty metres. Reefs cover less than one percent of the sea floor, and hold about a quarter of all ocean species. The parrotfish grinds up coral… and poops it out as sand. A lot of tropical beaches are parrotfish poop.

*The butterflyfish over coral. A parrotfish crunches, and white sand puffs out behind it.*

### 5 · Shipwreck, 50–120 m (1:42–1:57)

> Fifty metres, and the first dial is turning. Water swallows red light first, so down here, a red snapper looks grey. Remember that. It matters four kilometres from now.

*The young tuna passes the hull. The light dial drops. The colour wash drains from the scene, and the snapper's red fades to grey. (Loop 2: red light. Closed at 4,000 m.)*

### 6 · The Drop-off, 120–200 m (1:57–2:15)

> Then the floor just… ends. This is the edge of the continental shelf. And by two hundred metres, sunlight is too weak for anything to grow. From here down, nothing makes food. Everything eats what falls from above… or each other.

*The mako pup swims over the shelf edge as the seabed drops away under the camera. The food dial drops. The light rays thin to nothing.*

### 7 · The game (2:15–2:27)

> Every fish in this video is from a game called InkFish, where you start in that puddle and eat your way to the bottom. Chapter one is free in your browser, at sixteen-bit dot ink.
> Okay. Lights off. From here down, everything changes.

*The game's map: ten zones down a sloping seabed, with a route drawn from the tide pool to the trench. On "Lights off", cut to near-black.*

### 8 · Twilight Ink, 200–1,000 m (2:27–3:15)

> The twilight zone. A faint blue glow from above, and that's all. So fish down here make their own light. About three out of every four animals in the deep can glow.
> The barreleye has a see-through head. Those two green domes inside it are its eyes, and they turn, to look straight up through its own forehead.
> And every night, lanternfish swim hundreds of metres up to feed, then sink back down before sunrise. It's the biggest migration on Earth. It happens every single night, and almost nobody has ever seen it.

*The lanternfish with its lights. A close-up of the barreleye, with its eyes rotating up. A column of glowing fish rises past the camera.*

### 9 · Midnight Blot, 1,000–4,000 m (3:15–4:10)

> A thousand metres. No sunlight at all. About four degrees, and a hundred times the pressure at the surface. Food is so rare that hunters here don't chase. They wait.
> The black seadevil dangles a lure lit by glowing bacteria, and swallows whatever comes to look. The viperfish's fangs are so long they don't fit inside its mouth. And the fangtooth tucks its fangs into two sockets beside its brain.
> Notice something. Fish down here are getting soft. Watery bodies, weak bones, and many have no air inside at all. Hold onto that.

*The viperfish in pitch black. The seadevil's lure is the only light. Something swims up to it, and the jaws snap (bite SFX). The fangtooth's skull with the sockets ringed. On "Notice something", the pressure dial glows. (Loop 3: why soft? Closed in the trench.)*

### 10 · The Abyssal Plain, 4,000–6,000 m (4:10–4:50)

> Four kilometres. Mud, among the flattest ground on Earth, and it covers more of the planet than all the continents put together.
> The tripodfish stands on three fin rays like stilts, facing the current, waiting for food to drift into its mouth.
> And remember the red light that vanished at fifty metres? The stoplight loosejaw makes its own. Almost nothing down here can see red. So it hunts with a searchlight only it can see.

*The camera reaches the seabed. Marine snow falls. A tripodfish on stilts. Sea pigs walking. The loosejaw's red beam sweeps and lights up a shrimp that never sees it coming. (Loop 2 closed.)*

### 11 · The Hadal Trench, 6,000–11,000 m (4:50–6:05)

> Six kilometres, and the floor opens again. The hadal zone, named after Hades. Its deepest point is almost eleven kilometres down. Drop Mount Everest in, and its peak would still be two kilometres under water.
> Down here, the pressure dial wins. Remember how soft the fish were getting? That's half of how they cope: with no air inside, there's nothing to crush. The other half is invisible. Pressure squeezes the molecules inside every cell out of shape, so deep fish fill their cells with a molecule that holds them together. And the deeper they live, the more of it they need.
> Somewhere around eight thousand two hundred metres, scientists think a fish would hold so much of it that it would be saltier than the sea. Any deeper, and water would push its way in. That's the line.
> So where would you look for the deepest fish? Not in the deepest trench. The scientist Alan Jamieson bet on the trenches off Japan, because their water is a little warmer, and warmth lets a fish go a little deeper.
> In 2022, his team lowered a camera into the Izu-Ogasawara Trench. Eight thousand, three hundred and thirty-six metres down…

*The camera tips over the trench edge, and the gauge spins past 6,000, 7,000… Mount Everest is drawn to scale beside the gauge. On "fill with a molecule", a magnifier (as in `mates/`) shows a cell filling with dots. The red dashed line from the opening comes back at 8,200 m. On "Not in the deepest trench", a small hand-drawn map shows the Mariana Trench crossed out and an arrow to Japan. Then the lander's lamp from the opening, the same shot. (Loop 3 closed.)*

### 12 · The payoff (6:05–6:35)

> …and this swam into the light. A baby snailfish. Soft, pink, almost see-through. The deepest fish ever filmed, right at the edge of what a fish can survive.
> Below it, there's still life: shrimp-like amphipods, sea cucumbers. Just no more fish.
> In the last chapter of InkFish, you get to be this fish. Start in the tide pool, eat your way down, and see if you can make it here. Chapter one is free in your browser at sixteen-bit dot ink.

*The snailfish swims into the lamp, the reveal held back since 0:25 (Loop 1 closed). Gentle music swell (hum plus the game's level-up chime). Pull out into the full cross-section of all ten zones with the route drawn through them. End card: "InkFish" logo and "Free in your browser · 16bit.ink", with room for YouTube's end-screen elements (last 20 s).*

## Description (draft)

Search phrases first, no link (the site is named, not linked; see `docs/longform-playbook.md`):

> What lives at every depth of the ocean, from a tide pool to the Mariana Trench, and why fish get weirder the deeper you go.
> deep sea creatures, ocean zones explained, deepest fish ever filmed, mariana trench animals, twilight zone ocean, anglerfish, barreleye, snailfish 8336 m
>
> 0:00 The line no fish can cross
> 0:30 Tide pool
> 1:00 Seagrass, kelp, reef
> 1:42 Shipwreck: where red disappears
> 1:57 The drop-off
> 2:27 Twilight zone
> 3:15 Midnight zone
> 4:10 Abyssal plain
> 4:50 Hadal trench
> 6:05 The deepest fish ever filmed
>
> Every animal is drawn for InkFish, free in your browser at 16bit.ink.
> #deepsea #ocean #fish

## Fact sources

| Claim | Source |
|---|---|
| Snailfish (*Pseudoliparis* sp., juvenile) filmed at 8,336 m, Izu-Ogasawara Trench, 2022 (announced Apr 2023); deepest fish ever filmed | [NHM](https://nhm.ac.uk/discover/news/2023/april/deepest-ever-fish-filmed-depth-8336-metres.html), [Smithsonian](https://www.smithsonianmag.com/smart-news/behold-the-deepest-fish-ever-filmed-180981937/), [Guinness](https://www.guinnessworldrecords.com/news/2023/4/snailfish-sink-to-new-lows-to-extend-their-record-as-the-worlds-deepest-fish-743278) |
| Jamieson predicted the deepest fish would be off Japan because those trenches are slightly warmer; warmth lets fish go deeper | [Guinness](https://www.guinnessworldrecords.com/news/2023/4/snailfish-sink-to-new-lows-to-extend-their-record-as-the-worlds-deepest-fish-743278) |
| TMAO rises with depth; at ~8,200 m (range 8,200–8,400) fish would be isosmotic with seawater; deeper, osmosis would drive water into cells (Yancey, Jamieson et al. 2014) | [NIWA](https://niwa.co.nz/news/scientists-discover-how-low-fish-can-go), [FishBio](https://fishbio.com/pressure/) |
| ~1 atm more per 10 m, so ~100 atm at 1,000 m and ~1,100 at the bottom | [Ambient pressure](https://en.wikipedia.org/wiki/Ambient_pressure) |
| Challenger Deep ~10.9 km; Everest's peak would be ~2 km under | [EarthDate](https://earthdate.org/node/481) |
| Diel vertical migration: the largest migration on Earth, every night | [Scientific American / WHOI](https://www.scientificamerican.com/article/greatest-migration-on-earth-happens-under-darkness-every-day) |
| Barreleye's eyes rotate inside a clear head; viperfish fangs don't fit; fangtooth sockets; seadevil's bacterial lure; tripodfish; loosejaw red light; pipefish males; sheephead; parrotfish sand | The game's fact cards in `src/guide/` (already checked) |
| 76% of animals seen from the surface to 3,900 m off California can glow (Martini & Haddock 2017) | [Live Science](https://www.livescience.com/58653-75-percent-of-ocean-animals-glow.html) |
| Reefs cover <1% of the seafloor and support ~25% of marine life | [NOAA Fisheries](https://www.fisheries.noaa.gov/video/corals-exploration-restoration-and-protection) |
| Challenger Deep: amphipods and sea cucumbers, no fish | [Mission Blue](https://missionblue.org/2012/12/scientific-results-from-james-camerons-dive-to-the-oceans-deepest-point/) |
| Textbook facts (no single source needed): seagrass is a flowering plant; giant kelp grows up to ~60 cm a day; red light is absorbed first; little light for growth below ~200 m; ~4 °C below 1,000 m; abyssal plains cover over half of Earth's surface; bathypelagic fish have watery flesh, weak skeletons and often no swim bladder | |
