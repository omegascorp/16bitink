# Shorts playbook

What we've learned from posting InkFish promo shorts (YouTube Shorts first), and how to use it for the next video. Add each new export to the results log, then revise the rules if the data says otherwise.

## Results log

All four videos below were posted 2026-10-11 and checked 2026-10-12, so about one day old. Each got ~1,300 views, which is YouTube's first test batch; none has broken out yet. Re-check at 7 days.

| Video (file in `games/inkfish/promo/`) | Length | Stayed to watch | Avg % viewed | Views | Engaged views | Likes | Subs |
|---|---|---|---|---|---|---|---|
| "There's always a bigger fish 🦈" (`inkfish-bigger-fish.mp4`) | 13s | **48%** | 110% | 1,282 | **519** | **13** | +1 |
| "Wait for the shark... 🦈👀" (`inkfish-viral-shark.mp4`) | 13s | 42% | **125%** | 1,376 | 459 | 8 | 0 |
| "How deep do fish actually live? 🌊" (`inkfish-how-deep.mp4`) | 25s | 33% | 85% | 1,304 | 387 | 11 | +1 |
| "InkFish Level 1" (long-form gameplay) | 61s | – | 34% | 2 | 1 | 1 | – |
| "Fish that eat birds?! 🐟🐦" (`inkfish-fish-eat-birds.mp4`), posted 2026-10-12, **checked ~1 hour in** | 12s | **16%** | ~70% (0:09 avg) | – | 31 | – | – |

Not exported yet: traffic sources, retention curves, and clicks through to 16bit.ink.

## What works so far

1. **A hook the viewer already knows wins the first second.** "There's always a bigger fish" is a known meme, so it had the best stayed-to-watch (48%) and the most engaged views. Stayed-to-watch is the number that decides whether YouTube shows a short to more people.
2. **A build-up with one sudden payoff drives rewatches.** "Wait for the shark…" lost more people at the start but was watched 1.25 times on average, the best of the three. The seamless loop matters here.
3. **Short beats long.** Both 13s shorts beat the 25s one on stayed-to-watch and % viewed.
4. **Explainers lose the swipe.** "How deep…" opened with a question and a slow descent: two-thirds of viewers swiped away, and it didn't loop (85% viewed). The people who stayed liked it (best likes per engaged view), so the idea is fine; the opening isn't.
5. **"This really happened" plus a role reversal is our strongest format.** A real event where the predator becomes prey, recreated in the game's ink style. It's the format behind "bigger fish".
6. **Long-form gets nothing without subscribers.** Stick to Shorts for now.
7. **A calm opening loses the swipe, even when the payoff is strong** (early, needs confirming). "Fish that eat birds" opened on an empty sea, the tern half off-screen and documentary captions ("Seychelles. A young tern skims the sea…"). The threat didn't appear until ~2s and the payoff at 4.6s. Only 16% stayed, half the other shorts' rate. Viewers who stayed left after ~9s, before the loop came round. Compare "bigger fish", which opens with the shark already on the hook.

## Rules for the next short

- **10–13 seconds**, one seamless loop: the last frame flows into the first (see the loop tests in `games/inkfish/test/promo*.test.ts`).
- **Action from the first frame.** No question or explainer before something moves. The threat should already be on screen in frame 1. Since every short loops, choose the file's start point (`start` in `record.mjs`) to land just before the payoff, not at the story's beginning.
- **The opening caption is a hook, not a setting.** "Seychelles. A young tern skims the sea…" reads like a documentary. Save the place name for after the payoff.
- **One build-up, one payoff.** A threat appears, the prey reacts ("!"), then a single big moment around 40% of the way in.
- **A real event when possible**, with *"This really happened."* after the payoff. Fact-check it before posting.
- **A meme-style line at the end** that also works as the title, e.g. "there's always a bigger fish", "some fish eat birds".
- **On-screen text and the game's own sound effects** for story shorts. *Being tested (from 2026-10-13):* an educational short with a voiceover, after the "This really happened" shorts didn't work well. A voiceover makes the loop seam obvious, so end the script mid-sentence and let the opening line finish it.
- **Text stays between y ≈ 270 and 1250** of the 1080×1920 frame. Shorts and Reels cover the top ~14% and bottom ~35% with buttons.
- **Show something you actually do in the game** (eat, grow, leap for birds, dodge hooks), so the short sells the game, not just a fact.
- **Title:** a short hook plus emoji plus `#shorts`, e.g. *"Fish that eat birds?! 🐟🐦 #shorts"*.
- **Descriptions are for search, not for reading.** Line 1 is the phrase people type ("blobfish underwater", "greenland shark age"), line 2 is search variants, then 3 hashtags (YouTube shows them above the title). Don't mention the game or the site in descriptions or tags; it's all about the content's discoverability. Nobody reads them. Tags work the same way: the most-searched phrase first, then question searches and misspellings ("blob fish", "oar fish"). Examples are in `games/inkfish/promo/schedule/titles.md`.
- **No links in the description.** One short with a link sat at ~20 views until the link was removed. Name the site ("16bit.ink") without a URL.

## Tests in flight

| Video | Testing | Status |
|---|---|---|
| `inkfish-fish-eat-birds.mp4`: giant trevally snatching a tern (Seychelles, *Blue Planet II*) | Combines the bigger-fish formula (real event, role reversal, meme line) with the shark short's build-up and payoff | Posted 2026-10-12: 16% stayed to watch after ~1 hour (worst so far); a re-cut that opens on the threat is the next test |
| `inkfish-anglerfish-light.mp4`: the black seadevil rising into the sunlight (Tenerife, 2025), opening on her glowing lure with *"there is a light, anglerfish"* | Does a known meme plus action in frame 1 fix the opening that sank "fish eat birds"? | Made 2026-10-12, queue #1 |
| `inkfish-anglerfish-mates.mp4` (21s): **narrated** explainer, how male anglerfish fuse to females ("This tiny fish is about to become part of her body…"), with word-by-word captions | First educational short with a voiceover, after the "This really happened" shorts didn't work well | Made 2026-10-12, not yet posted |
| Narrated batch (queue 3–8): `inkfish-blobfish.mp4` (20s), `inkfish-greenland-shark.mp4` (18s), `inkfish-barreleye.mp4` (21s), `inkfish-oarfish.mp4` (21s), `inkfish-coelacanth.mp4` (22.5s), `inkfish-fangtooth.mp4` (21s) | Same narrated format as mates, each on a deep-sea fact with a proven audience (blobfish meme, "400-year-old shark", MBARI's see-through head, the "doomsday fish", the "living fossil", fangtooth). Compare stayed-to-watch across topics to see which hooks work | Made 2026-10-12; numbered copies in `promo/schedule/` |
| `inkfish-clownfish.mp4` (19.5s): narrated, "Nemo's dad should have become his mom", one anemone family ranked by size, opening mid-gulp on the barracuda | Does a reference everyone knows (a Pixar film) beat the deep-sea topics on stayed-to-watch? | Made 2026-10-13, queue #9 |
| `inkfish-viral-never-ends.mp4`: same footage as the shark short, hook "the food chain never ends" | Does the hook text alone move stayed-to-watch? | Ready, not yet posted |
| `inkfish-loop.mp4` vs `inkfish-loop-captions.mp4` | Do captions help? | Ready, not yet posted |

## Idea bank

Researched 2026-10-12 for proof that a topic already went viral. Prefer topics with a proven audience: the viewer recognises them in the first second.

| Idea | Proof it travels | Game assets | Status |
|---|---|---|---|
| **The anglerfish that swam to the light**: a black seadevil filmed rising to the surface off Tenerife, Feb 2025; it died hours later | Huge meme: one TikTok repost got 119M views in ~10 days, fan art 19.2M, a Pixar-style animation 2.1M in a day, a follow-up short film in Nov 2025. Known phrases: *"there is a light, anglerfish"*, *"she just wanted to see the light"* | `seadevil` (the game's black seadevil boss, with a lit lure); the depth short's water, light rays and glow helpers | Made: `inkfish-anglerfish-light.mp4` |
| **Flying fish between the devil and the deep blue sea**: chased by mahi-mahi from below, snatched by frigatebirds above | BBC *The Hunt* (2015) clip, narrated by Attenborough; 2025 news coverage of "first-ever footage" of seabirds catching flying fish mid-air. No view counts found | `mahi`, `flyingfish`, `gannet`; the birds short's surface scenery | Next in line |
| **Pufferfish inflates inside a predator** | Real clips (moray vs puffer, Red Sea 2017, NatGeo; Cook Islands 2020); no view counts found | `puffer` (puffing is a game mechanic), `moray` | Folded into #4 below |

### Next seven (chosen 2026-10-13, narrated format, queue #9–15)

Batch 3–8 is all deep sea. This one mixes in reef fish whose facts are already famous, to see if a known reference (a film, a beach) beats a strange animal on stayed-to-watch. Each uses a species the game already draws. All seven were made on 2026-10-13 and copied into `promo/schedule/` as #9–15.

| # | Hook (first line) | The fact (as narrated, fact-checked) | Proof it travels | File (loop) |
|---|---|---|---|---|
| 9 | *"Nemo's dad should have become his mom."* | Clownfish are all born male and rank by size; when the female dies her mate turns female (Fricke 1977; Buston, BU) | The "scientifically accurate Finding Nemo" fact runs every year; everyone knows Nemo | `inkfish-clownfish.mp4` (19.5s) |
| 10 | *"White sand beaches are fish poop."* | Parrotfish grind coral into sand; a big one makes hundreds of kilos a year; one Maldives island is mostly made of it (Perry et al. 2015, Vakkaru) | One of the most-shared ocean facts | `inkfish-parrotfish.mp4` (16.5s) |
| 11 | *"This fish has no face."* | Faceless cusk, ~4 km down; eyes buried under the skin, mouth underneath; first collected by HMS *Challenger* in the 1870s (sources say 1873 or 1874), hauled up again by RV *Investigator* in 2017 | Worldwide news in 2017 | `inkfish-faceless-cusk.mp4` (19.5s) |
| 12 | *"One pufferfish can kill thirty people."* | Tetrodotoxin, deadlier than cyanide (multipliers vary 100–1,200×, so none is shown), no antidote; licensed fugu chefs; puffs up by gulping water | Fugu and "puffer vs moray" clips are evergreen | `inkfish-pufferfish.mp4` (19.5s) |
| 13 | *"Its mouth is bigger than its body."* | Gulper (pelican) eel, down to ~3 km; balloons its mouth, squeezes water out of its gills; mostly eats small crustaceans | E/V *Nautilus* clip (2018) went viral | `inkfish-gulper-eel.mp4` (19.5s) |
| 14 | *"This fish flew for forty-five seconds."* | NHK filmed a 45 s flight off Yakushima in 2008 (Guinness); glides up to ~400 m; mahi-mahi below, seabirds above | BBC *The Hunt* clip; 2025 "first footage" news | `inkfish-flying-fish.mp4` (19.5s) |
| 15 | *"This fish is blacker than black."* | Pacific blackdragon skin reflects as little as 0.05% of light, thanks to packed pigment granules (Davis et al. 2020). It is the study's second-blackest fish, so the short never says "blackest" | Smithsonian ultra-black fish study (2020) was everywhere | `inkfish-blackdragon.mp4` (18s) |

## Long-form thumbnails

The first level 1 thumbnail (pale paper, three lines of text, "LEVEL 1" tag) got **1.1% CTR on 1.6K impressions** in its first two days (2026-10-11 to 10-13). On 2026-10-13 we compared it with the most-viewed fish-eat-fish videos on YouTube (Feed and Grow 26M/16M, ProjectJamesify "SIZE 1 vs SIZE 99999" 4.5M, "FROM THIS... TO THIS..." 7.9M) and the low-view Feeding Frenzy walkthroughs. The winners all do the same few things:

1. **One giant open mouth**, red inside, cropped by the frame edge so it feels too big to fit.
2. **Prey with a big eye**, small next to it: size contrast is the story.
3. **Bright saturated blue water with warm fish on it** (orange, red, green). Never pale fish on pale water.
4. **Before/after splits**: a hard red divider, a fat yellow arrow, numbers or "FROM THIS... TO THIS...".
5. **0–3 words**, white or yellow, with a fat black outline. The title carries the rest. No level tags or logos.
6. Walkthrough-style thumbnails (logo + "FULL GAME" + clutter) get thousands of views, not millions.

`pnpm --filter @16bitink/inkfish thumbnail` draws three on these rules (`hunter`, `glowup`, `run`) and a check sheet at YouTube's display sizes. Upload all three to Studio's **Test & Compare** and log the winner here.

## Collecting the data

Export from YouTube Studio once each video is ~72 hours old, and again at 7 days:

1. **Analytics → Advanced mode**, content type **Shorts**, period **Lifetime**, grouped by **Content**. Include: Shown in feed, Stayed to watch %, Views, Engaged views, Average percentage viewed, Average view duration, Likes, Comments, Shares, Subscribers gained. **Export → CSV.**
2. **Traffic source** for the same period, to check views come from the Shorts feed.
3. **Retention curve** screenshot for each short (per-video analytics → Engagement), to see the second people swipe at.
4. **Site visits:** since the descriptions carry no links (see the rules above), watch 16bit.ink traffic with a youtube.com referrer in the days after each post.

Map each YouTube title to its file name in `games/inkfish/promo/`, so results tie back to the choices that made them.

## Making a short

The pipeline is in `games/inkfish/dev/promo/`. Each short has its own folder (`bigger/`, `depth/`, `birds/`):

- `story.ts`: every beat as a pure function of time;
- `render.ts`: draws a frame;
- `audio.ts`: the soundtrack, mixed from the game's sound effects.

To add one, register it in `main.ts` (as `?short=<name>`) and in `record.mjs`'s variant list. Preview at `/promo.html?short=<name>` (`&t=4.2` freezes a moment) and record with `pnpm --filter @16bitink/inkfish promo -- --only <name>`. Record when nothing else is editing files under `dev/`: Vite hot-reloads the page on any edit, and a reload mid-recording fails with "Execution context was destroyed". Loop length must be a whole number of video frames (30 fps) and of line-boil cycles (0.375s), which means a **multiple of 1.5s** (12s, 18s, 21s, 22.5s…).

**Narrated shorts** (`mates/` is the example):

1. Write the script so it ends mid-sentence and the first line finishes it. Fact-check every claim first.
2. Generate it with the ElevenLabs connector: one flow, four takes, voice *Cedric M – Engaging Documentary Narrator*. Pick the tightest take by its pauses (`ffmpeg … silencedetect`).
3. Speed it up a little with `ffmpeg -af atempo=…` (pitch is kept). Choose the tempo so the voice ends about 0.3s before the loop point. Pick the loop first (a multiple of 1.5s, see above), then the tempo: `tempo = last word's end ÷ (loop − 0.3)`. About 1.07–1.13 sounds natural.
4. Transcribe the take with ElevenLabs Scribe for word timings, and keep them in `words.ts`. Every beat and the captions are timed from the words.
5. In `audio.ts`, the voice goes straight to the output; game sound effects stay quiet under it.
