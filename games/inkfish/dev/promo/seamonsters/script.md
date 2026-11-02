# Long-form #4: "Sea monsters size comparison… but every one is real"

**Status:** made 2026-10-29 (4:37). The files are in `promo/longform/` (`upload.md` has the title, description, chapters and tags). Re-record with `pnpm --filter @16bitink/inkfish promo -- --only long-seamonsters`; the captions come from `node dev/promo/seamonsters/saveSrt.mjs` and the thumbnails from `pnpm --filter @16bitink/inkfish thumbnail seamonsters`. The new drawings are on `longform.html?video=seamonsters-kit` (`&only=manatee` for one).

**Code:** `timeline.ts` reads every beat off `words.ts`; `species.ts` the row; `cast.ts` draws any animal through one door (reusing the oarfish, giant squid, sperm whale and blue whale); `lineup.ts` the row's slots and the camera (views ease in log space, each with its own seabed line); `stage.ts` the water, seabed, ruler, "you", the animals swimming in and the siphonophore run; `hud.ts` the counter, name card and monster map; `cards.ts` the legend cards and inset cards; `cutaways.ts` the full-frame scenes; `open.ts` the cold open; `fx.ts` filtered/tinted drawing through an offscreen layer (a canvas filter on the blue whale's big sprites blanks the canvas); `audio.ts`, `render.ts`, `thumbnails.ts`; `art/` the new drawings.

**Script:** facts checked by a separate agent the same day (fixes: the kraken was a mile and a half *around*, the sperm whale is 52 ft, the frilled shark's pregnancy is "one of the longest", the siphonophore's length is an estimate).

A narrated size line-up of the real animals behind the sea's monster legends, from the frilled shark (about your size) to the blue whale (100 ft), with the legend each one started: the sea serpent, the mermaid, the "plesiosaur" carcass, the kraken, Moby Dick. The twist at the end: the longest animal ever filmed isn't the blue whale, and it isn't even one animal.

- **Format:** 1920×1080, 30 fps, not looping. Target about 5:00 (~850 words), with the end card holding 5 s after the last word.
- **Voice:** the locked narrator, *Mark – Natural Conversations* (`UgBBYS2sOqTuMpoF3BR0`, `eleven_v4`), directed by "Directing the voice" in `docs/shorts-playbook.md`. One section per take, four takes each.
- **Sound:** the voice; a low bed that deepens as the animals get bigger; a ruler tick as each length counts up; a stamp thump on every "REAL"; creaking timber and a bell under the legend cards; a heartbeat under the blue whale.
- **Captions:** an `.srt` built from the word timings, uploaded as CC (not burned in).

## Why this shape

- **It's #2's winning title shape on the genre's biggest search term.** *Fish Eat Fish Size Comparison… But Every Animal Is Real* got 6.2% CTR and 63K impressions in four days (2026-10-29 export), our best long-form by far. *Sea Monsters Size Comparison* (MetaBallStudios) has 53M views, and it's all fiction (Godzilla, Leviathan, SCP). Ours lines up only real animals.
- **"Why" beats "what"** (`docs/longform-playbook.md`): the whole video answers one question, *where did the sea monster legends come from?* Every step is one legend and the animal behind it, so every section pays off the title.
- **MrBeast's stair-step:** the animals go up in length, 6.5 ft → 100 ft (the sperm whale at NOAA's 52 ft), with the number on screen at every step and a "× you" count beside it. The low steps go fast; the top steps get the most time.
- **Open loops:** (1) "the longest one isn't even ONE animal", planted in the cold open, closed by the siphonophore; (2) "a whale that sank a ship", closed at the sperm whale; (3) "the rotting thing the papers called a living sea reptile", the re-hook straight after the game mention.
- **Not megalodon:** the "megalodon size comparison" angle is farmed. "No megalodon. No Godzilla." in the cold open sets ours apart and is arguable.
- **Arguable lines (comment test):** "Rude, Chris… but fair." (manatees aren't pretty), "Sorry, Nessie fans.", "The sailors started that fight." (Essex), and the closing question, one animal or a crowd? Pinned question: *"Is a siphonophore one animal or thousands? 🪼 or 🐟🐟🐟"*.

## Packaging

### Title (test 1 against 2)

1. **Sea Monsters Size Comparison… But Every One Is Real**: #2's shape on the bigger search term.
2. **Every Sea Monster Legend Was a Real Animal**: the "why" as a statement, for viewers who don't search "size comparison".

### Thumbnails (Test & Compare takes three)

| | Concept | Why |
|---|---|---|
| **A · Legend vs real** | A hard split. Left: an old sepia engraving of a kraken wrapping a sailing ship. Right: the real giant squid on saturated blue, arms spread, one huge eye. Text: **"REAL"** on the right. | MrBeast's two-ends split, and the title's promise in one picture. |
| **B · Line-up** | Silhouettes in a row on blue, small to huge: "you", frilled shark, manatee, oarfish, giant squid, sperm whale, blue whale; then a thin pale string runs off the right edge, longer than all of them. Text: **"LONGER?"** on the string. | The size-comparison genre's look, plus the twist as a curiosity gap. |
| **C · The eye** | The giant squid's dinner-plate eye fills the right two-thirds, cropped; a tiny diver silhouette reflected in it. Text: **"IT'S REAL"** | One giant face with a big eye, our best-clicked frame. |

Bright saturated blue water, warm-coloured animals where possible (the oarfish's red crest, the squid's red-brown), 0–2 words in white or yellow with a fat black outline.

## Picture

- **One line-up, one continuous zoom out.** The classic size-comparison frame: a seabed line along the bottom, "you" standing at the left, each new animal swimming in from the right and settling beside the last one. The camera zooms out (in log space, like the food chain's) so each newcomer fills the frame on arrival, then pulls back to show the whole row.
- **The length counter, our "$1… $X":** big, bottom centre, **in feet** with metres under it, counting up with a tick from the last animal to the new one; beside it, "= 4.5 of you". One unit for the whole video.
- **A ruler** along the seabed in feet (metres under), growing with the zoom; a person, a bus and a football field drawn small along it as everyday marks.
- **The legend card:** each animal's legend appears first as an old sea-chart engraving on parchment (sepia ink, Caveat captions, a date: "1493", "1752", "1820"). The card then splits, and the real animal swims out of it in full colour. A red **REAL** stamp thumps on the card.
- **The monster map** in the top right: an old chart with a little drawing for each legend; each one gets its REAL stamp as the video goes. By the end, every monster on the map is stamped.
- **A name card** for every animal: "THE OARFISH · 26 ft · 8 m".
- Something new on screen every 10–15 s; every animal is introduced face-first.

## Script

Each section gives the line as it will be voiced, the mood of each sentence, then what's on screen. Times are targets; `timeline.ts` will read the real ones off the words.

### 0 · Cold open (0:00–0:30)

> [dramatically] For thousands of years, sailors swore they saw MONSTERS. [nervous] Sea serpents… a squid the size of an island… [surprised] a whale that sank a ship! [mischievously] Here's the thing: they weren't JUST making it up. [curious] Every one of those monsters is a real animal… [excited] and we're lining them all up, from about your size… to a hundred feet of whale. [chuckles] No megalodon. No Godzilla. [dramatically] And the longest one, at the very end? It isn't even ONE animal.

*Moods: epic → dread → shock → sly → curious → hype → cheeky → ominous.*

*Frame 1 is action: an engraved kraken arm, sepia on parchment, curling up around a sailing ship's mast (creaking timber). On "sea serpents", a serpent's coils rise out of an engraved sea; on "a squid the size of an island", sailors stand on what they think is an island and it opens an eye; on "a whale that sank a ship", a whale's head smashes into a hull. On "they weren't JUST making it up", the parchment tears down the middle and saturated blue water floods through. On "real animal", the giant squid's real eye fills the frame. On "from about your size… to a hundred feet", a fast fly-by of the whole line-up in silhouette, small to huge. On "No megalodon. No Godzilla.", two silhouettes get a red ✗ and drop away. On "isn't even ONE animal", a thin pale string runs off the right edge of the frame, unnamed.*

### 1 · You (0:30–0:38)

> [warmly] For scale, that's you: five foot nine. [mischievously] Keep an eye on him. He's about to feel very small.

*Moods: cosy → teasing.*

*"You", an ink silhouette, stand at the left of the seabed line. A height bar: "5 ft 9 in · 1.75 m". The counter appears: "5.75 ft".*

### 2 · Frilled shark, 6.5 ft (0:38–1:05)

> [curious] First, about your size: the frilled shark. [nervous] It looks like an eel… with about three HUNDRED teeth, each one shaped like a tiny trident. [surprised] And it might be pregnant for three and a half YEARS… one of the longest pregnancies of any animal on Earth! [softly] The scientist who first described it, back in 1884, wondered if a glimpse of this thing started a few sea-serpent stories. [dramatically] Six and a half feet. We're just warming up.

*Moods: curious → creepy → shock → eerie → build.*

*Legend card: an engraved serpent's head, frilled, rising beside a rowing boat. REAL stamp. The frilled shark swims out, face-first, mouth open, its trident teeth ringed in close-up. On "three and a half YEARS", a calendar flips three and a half times. It settles beside "you": counter 6.5 ft, "= 1.1 of you".*

Sources: recorded maximum 2.0 m (6.6 ft); ~300 trident-shaped teeth in ~25 rows; gestation estimated at "at least 3.5 years" from embryo growth (Tanaka et al. 1990, *Jpn J Ichthyol* 37:273), a rival to the alpine salamander's record in Guinness, hence "one of the longest"; Samuel Garman, "An Extraordinary Shark" (*Bull. Essex Inst.* 16, 1884), compared its head to a snake's and wouldn't dismiss a "serpent-like monster" (UTMSI, *Science and the Sea*).

### 3 · Manatee, 13 ft (1:05–1:30)

> [chuckles] Next up: the most famous sea monster of all… the mermaid. [mischievously] In 1493, Christopher Columbus wrote that he'd seen three mermaids… [sarcastic] and that they were "not as pretty as they are painted." [warmly] They were manatees. Up to thirteen feet of gentle sea cow… eating salad. [chuckles] Rude, Chris… but fair.

*Moods: silly → sly → sarcastic → tender → cheeky.*

*Legend card: an engraved mermaid on a rock, combing her hair, "1493". The card splits and a manatee drifts out, chewing seagrass, whiskers twitching. A Columbus-style quill caption writes the quote. On "Rude, Chris", the manatee blinks slowly at the camera. Counter 13 ft, "= 2.3 of you".*

Sources: Columbus's journal (via Las Casas), entry of 9 January 1493, on the way to the Río del Oro, Hispaniola: "vido tres serenas… no eran tan hermosas como las pintan" ("not as pretty as they paint them"; don't use the embellished "not half as beautiful"); read as manatees (History.com, Europeana); West Indian manatee usually ~3 m (10 ft), large adults ~4 m (13 ft) (SeaWorld).

### 4 · Oarfish, 26 ft (1:30–2:00)

> [dramatically] Now, a REAL sea serpent. [surprised] The oarfish: the longest bony fish alive, up to twenty-six feet! [curious] Silver, with a bright red crest… and it swims standing straight up. [nervous] In Japan, folklore says when one washes ashore… an earthquake is coming. [softly] So scientists checked over three hundred sightings of deep-sea fish like this one. [chuckles] They found no link. It's just a fish having a really bad day.

*Moods: epic → awe → wonder → dread → calm → laugh.*

*Legend card: a sea serpent engraved along a ship's side, "Here be serpents". The oarfish ribbons out of the card (the oarfish short's art), red crest rippling, then turns vertical. On "earthquake", the line-up shakes and a Japanese coastline map pulses; on "no link", a chart of sightings with a flat line. Counter 26 ft, "= 4.5 of you". Zoom out.*

Sources: *Regalecus glesne*, longest living bony fish, record ~8 m (26 ft), reports to 11 m unconfirmed; red crest; often holds vertical (Florida Museum); Japanese folklore *ryūgū no tsukai*; Orihara et al. 2019 (*BSSA*, doi:10.1785/0120190014): 336 sightings of deep-sea fish 1928–2011 against 221 magnitude-6+ quakes, only one plausibly linked.

### 5 · The game (2:00–2:13)

> [warmly] Quick one: every animal you're seeing is drawn for a game called InkFish. You start as the smallest fish in the sea, and eat your way up. [excited] Chapter one is free in your browser, at sixteen-bit dot ink!

*The game's level-one scene: the inkling eats a few minnows and grows. "16bit.ink" in the corner, no URL.*

### 6 · Basking shark, 33 ft (2:13–2:45)

> [nervous] In 1977, a Japanese fishing boat hauled up something rotten. A long neck… a tiny head… four flippers. [surprised] The papers called it a living sea reptile, from the age of the DINOSAURS! [dramatically] It was most likely this: the basking shark. The second-biggest fish on Earth… it can grow over thirty feet long… [chuckles] and it eats plankton. [curious] When one rots, its huge jaw and gills fall away first… and what's left looks a lot like a plesiosaur. [mischievously] Sorry, Nessie fans.

*Moods: dread → shock → reveal → silly → curious → cheeky.*

*Re-hook. Legend card: a grainy, sepia "photo" of a slumped carcass on a deck, hanging from a crane; a newspaper headline "LIVING PLESIOSAUR?". Then the basking shark swims out, mouth gaping like a tunnel, gills flared. On "its huge jaw and gills fall away", a diagram: the shark's outline, the jaw and gills fade, and the remaining shape becomes a long-necked plesiosaur silhouette. Counter 33 ft, "= 5.7 of you".*

Sources: the *Zuiyō Maru* carcass, 25 April 1977, ~30 miles east of Christchurch, New Zealand, from ~300 m, ~10 m long, thrown back; a press conference on 20 July 1977, front pages called it a plesiosaur; fibres matched elastoidin (sharks and rays only), and the 1978 papers concluded most likely a basking shark (Kuban, TalkOrigins); basking shark is the second-largest fish, typically 6–8 m, measured maximum ~12 m (40 ft), so "can grow over thirty feet" (counter 33 ft / 10 m); rotting basking sharks lose jaw and gills first (the Stronsay beast, 1808).

### 7 · Giant squid, 40 ft (2:45–3:20)

> [dramatically] And the most famous monster of them all: the KRAKEN. [sarcastic] In the 1750s, a bishop in Norway wrote that it was about a mile and a half AROUND… [chuckles] and that sailors kept mistaking it for an island. [curious] The real one is the giant squid. Up to forty feet long… [surprised] with eyes the size of DINNER PLATES… the biggest eyes on the planet, tied with its cousin, the colossal squid! [softly] And nobody filmed one alive, in the deep, until 2012. [nervous] Forty feet… in the dark… watching you.

*Moods: epic → sarcastic → laugh → curious → shock → hush → dread.*

*Legend card: the engraved kraken from the cold open, its back an "island" with sailors on it, "1752". The card tears and the giant squid unfurls out of it (the kraken short's art), arms spread. On "DINNER PLATES", a plate slides up next to its eye: the same size. On "2012", a grainy deep-sea camera frame with a timestamp; a dim squid arm crosses it. On "watching you", lights down; just the eye in the dark, then it blinks. Counter 40 ft, "= 7 of you".*

Sources: Erik Pontoppidan, Bishop of Bergen, *The Natural History of Norway* (1752–53; English 1755): the kraken's back "about an English mile and an half in circumference", seen as islands (1778 *Britannica*); *Architeuthis* longest examined ~13 m (43 ft); eyes up to ~27 cm, tied with the colossal squid as the largest (Britannica, Guinness); first photographed alive 2004, filmed at the surface 2006, first filmed in its deep habitat July 2012 off Chichijima (Kubodera, Widder; aired January 2013).

### 8 · Sperm whale, 52 ft (3:20–4:00)

> [excited] Fifty-two feet now. And this one HUNTS the kraken. [dramatically] The sperm whale: the biggest brain of any animal on Earth. [nervous] In 1820, one rammed a whaling ship called the Essex… TWICE… [surprised] and sank it! [softly] The crew drifted in tiny boats for three months. [curious] Thirty years later, a writer named Herman Melville turned it into a book about a white whale: Moby-Dick. [mischievously] So yes, the monster was real. [sarcastic] But honestly? The sailors started that fight.

*Moods: hype → menace → dread → shock → despair → wonder → sly → sarcastic.*

*Closes loop 2. The sperm whale arrives from the dark with a giant squid's arm trailing from its jaw (a nod, no gore). On "biggest brain", its outline goes translucent and the brain lights up, a football drawn beside it for scale. Legend card: an engraved whale's head smashing into the side of a three-masted ship, "1820". On "three months", three small whaleboats on an empty sea, a sun crossing the sky three times fast. On "Moby-Dick", an old book cover. Counter 52 ft, "= 9 of you". A big zoom out.*

Sources: males up to 52 ft (16 m) (NOAA; 95% of records under 15.85 m), so the counter reads 52 ft, = 9 of you; the largest brain of any animal, ~7–8 kg; eats giant squid (mostly medium squid; no fight ever observed, so draw a trailing arm, not a battle); the Essex, 20 Nov 1820, rammed twice and sunk; the last survivors picked up 18 and 23 Feb 1821 (~90 days); *Moby-Dick*, 1851, drew on the Essex (Britannica; National Geographic).

### 9 · Blue whale, 100 ft (4:00–4:30)

> [dramatically] And then there's the one no sailor ever needed to make up. [excited] The blue whale: about a hundred feet long, and heavier than any dinosaur we've ever found! [surprised] Its heart can slow to just TWO beats a minute! [softly] It's the biggest animal that has ever lived… [curious] seventeen of you, lined up head to toe.

*Moods: epic → hype → shock → awe → wonder.*

*The biggest zoom out: a vast shadow slides over the whole line-up, then the blue whale glides in above it (the food chain's art). A school bus and a basketball court drawn small under it. On "TWO beats", a slow heartbeat (SFX) and a heart rate line with two blips. On "seventeen of you", seventeen "you" silhouettes pop in head to toe along its belly. Counter 100 ft, "= 17 of you". No legend card: the monster map gets a new drawing, stamped REAL straight away.*

Sources: blue whale ~30 m (98 ft), NOAA up to 110 ft; up to ~150–190 t against Argentinosaurus's ~70–80 t; 2 bpm recorded in a diving whale (Goldbogen et al. 2019, *PNAS* 116:25329); Perucetus cut to ~60–110 t (Motani & Pyenson 2024), Ichthyotitan (2024) a length estimate from jaw fragments; 100 ÷ 5.75 ≈ 17.

### 10 · The twist: siphonophore, 150 ft (4:30–5:10)

> [mischievously] So the blue whale wins… right? [dramatically] Not on length. [curious] In 2020, a robot sub off Australia filmed THIS: a pale string, coiled in the dark… about a hundred and fifty feet long. [surprised] Longer than the blue whale! [softly] It's a siphonophore. And it isn't one animal… [curious] it's thousands of tiny clones, joined together, each with one job. Some swim. Some sting. Some eat. [chuckles] So is it one monster… or a crowd? [mischievously] Scientists still argue about that. [warmly] Either way: every monster the sailors feared was real. [dramatically] The real ones are just WEIRDER.

*Moods: sly → twist → eerie → shock → hush → wonder → silly → cheeky → warm → epic.*

*Closes loop 1. The camera follows the pale string from the cold open as it runs on past the blue whale's tail and keeps going; a ROV's lights pick out a spiral, coiled in the black. Counter rolls past 100 ft to 150 ft, "= 26 of you". On "thousands of tiny clones", a magnifier ring over the string: identical little bodies, each labelled as it's named ("swim", "sting", "eat"). On "one monster… or a crowd?", the counter flickers between "1" and "1,000s". On "every monster… was real", the monster map fills the screen, every legend stamped REAL. On "WEIRDER", pull back to the whole line-up, "you" tiny at the left.*

Sources: *Apolemia* siphonophore, Ningaloo Canyons, Western Australia, April 2020, Schmidt Ocean Institute (R/V *Falkor*, ROV *SuBastian*; press release 9 April 2020): "an estimated 150-foot siphonophore, seemingly the longest animal ever recorded", an estimate from video of a coiled spiral (their reports say 45 m / 148 ft; 47 m is press only); never say "longest ever" flatly; a colony of genetically identical zooids budded from one embryo (swimming bells, feeding polyps, stinging tentacles, reproductive parts); whether a colony is one individual is a real debate; 150 ÷ 5.75 ≈ 26.

### 11 · End (5:10–5:18)

> [warmly] Every animal in this video is drawn for InkFish. Chapter one is free at sixteen-bit dot ink.

*End card for 5 s: the related video (#2 food chain) and subscribe.*
