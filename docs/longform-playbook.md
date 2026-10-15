# Long-form playbook

What we've learned about InkFish's long-form YouTube videos (16:9, not looping), and how to use it for the next one. Shorts have their own playbook: `docs/shorts-playbook.md`. Add each new export to the results log, then revise the rules if the data says otherwise.

## Results log

| Video | Length | CTR | Avg % viewed | Views | Engaged views | Likes | Subs |
|---|---|---|---|---|---|---|---|
| "InkFish Level 1" (gameplay), checked 2026-10-12 | 61s | – | 34% | 2 | 1 | 1 | – |
| "InkFish Level 1", thumbnail check 2026-10-11 to 10-13 | | **1.1%** on 1.6K impressions | | | | | |

### Tests in flight

| # | Video | Testing | Status |
|---|---|---|---|
| 1 | *Fish Get Weirder the Deeper You Go… Until They Can't* (`promo/longform/1 - fish get weirder the deeper you go.mp4`, 5:44). A narrated descent through the game's ten zones. The cold open teases a line no fish should cross and a camera that filmed something below it; the snailfish at 8,336 m pays it off at 5:10. | Can an educational video built on a proven promise ("the deeper you go…") bring views and site visits to a channel with few subscribers? Watch CTR across the three thumbnails, retention at 0:30 (the hook), at 2:07 (the game mention) and at 5:10 (the payoff), and youtube.com visits to 16bit.ink. | Made 2026-10-14, not yet posted |

## What works so far

1. **Long-form gets nothing without subscribers.** The gameplay video got 2 views in its first day. The shorts are how the channel grows; long-form has to earn its place through search and browse, so packaging (title + thumbnail) matters most.
2. **"The deeper you go, the stranger they get" is a proven promise.** *Why Deep Sea Creatures Get Creepier the Deeper You Go* has 17.1M views in 11 months, and *Why Animals Get Creepier the Deeper You Go* has 3.8M. A hand-painted *Most Disturbing Creatures in Each Ocean Layer* has 2.0M in 3 months, so a drawn style can win.
3. **"Why" beats "what".** The big ones explain one pattern across the whole video, so every section pays off the title.
4. **Don't lead with an angle that's being farmed.** "The depth no fish can survive" videos from new channels sit at 2–331 views. A strong story like that works better inside the video, as the open loop and the payoff.

### Similar videos (YouTube search, 2026-10-14)

| Video | Views | Age | Length | What it does |
|---|---|---|---|---|
| Insider Tech, *This Incredible Animation Shows How Deep The Ocean Really Is* | 83.5M | 9y | 3:29 | Pure depth scale |
| RealLifeLore, *The Ocean is Way Deeper Than You Think* | 50.5M | 9y | 6:36 | Scale, Everest under water |
| Luke Davidson, *The Ocean Is WAY DEEPER Than You Think* | 23.8M | 5y | 13:15 | Scale plus creatures |
| Ridddle, *Who Lives At The Bottom Of The Mariana Trench?* | 19.8M | 9y | 9:11 | Animals at the bottom |
| **Mr. Science, *Why Deep Sea Creatures Get Creepier the Deeper You Go*** | **17.1M** | **11mo** | 17:58 | A *why* that explains a pattern, zone by zone |
| MetaBallStudios, *Ocean DEPTH Comparison (3D Animation)* | 14.7M | 5y | 5:12 | Descent with a depth counter |
| Astrum Earth, *What They Found In the Deepest Place on Earth* | 13.2M | 1y | 34:38 | Mystery at the bottom |
| Bright Side, *Fascinating 3D Journey to the Ocean Depths* | 12.7M | 5y | 9:35 | Descent; thumbnail is a depth **split** (900 m vs 5,000 m) |
| Real Science, *Why Animals Get Creepier the Deeper You Go* | 3.8M | 3y | 16:38 | Same *why* format |
| Exard, *Deep Sea Monsters and Where They Might Live* | 2.9M | 1y | 4:36 | Flat 2-D animals on a depth ruler |
| **The Paint Explainer, *The Most Disturbing Creatures in Each Ocean Layer*** | **2.0M** | **3mo** | 15:18 | **Hand-painted** zone pyramid; closest to our style |
| Trust Me Bro, *The Craziest Deep Sea Creatures At Every Depth* | 0.7M | 6mo | 28:30 | Cartoon, zone by zone |
| *Why No Fish Can Live Below This Depth* / *The Deepest Fish Ever Found — and Why Nothing Swims Deeper* / *Scientists Filmed a Fish ALIVE at 27,349 Feet* | 123 / 2 / 331 | days–1mo | 12–24 min | New faceless channels, all on "the fish depth limit" |

## Rules for the next video

### Packaging

- **The title and thumbnail decide most of it.** Paddy Galloway puts the thumbnail at 80–90% psychology of the click and 10–20% design.
- **Make 3 clearly different thumbnails** and run them in Studio's **Test & Compare**. Log the winner here.
- **The thumbnail opens a curiosity gap; the title explains it without repeating it.**
- **Readable at 160×90:** one subject, high contrast, fewer than 4 words. In vidIQ's study of 500 breakout videos, 89% had a face or high-contrast colour. We have no human faces, so a fish's face and big eyes do that job.

### Thumbnails

On 2026-10-13 we compared the Level 1 thumbnail (pale paper, three lines of text, a "LEVEL 1" tag, 1.1% CTR) with the most-viewed fish-eat-fish videos on YouTube (Feed and Grow 26M/16M, ProjectJamesify "SIZE 1 vs SIZE 99999" 4.5M, "FROM THIS... TO THIS..." 7.9M) and the low-view Feeding Frenzy walkthroughs. The winners all do the same few things:

1. **One giant open mouth**, red inside, cropped by the frame edge so it feels too big to fit.
2. **Prey with a big eye**, small next to it: size contrast is the story.
3. **Bright saturated blue water with warm fish on it** (orange, red, green). Never pale fish on pale water.
4. **Before/after splits**: a hard red divider, a fat yellow arrow, numbers or "FROM THIS... TO THIS...". Bright Side's ocean video (12.7M) splits by depth.
5. **0–3 words**, white or yellow, with a fat black outline. The title carries the rest. No level tags or logos.
6. Walkthrough-style thumbnails (logo + "FULL GAME" + clutter) get thousands of views, not millions.

`pnpm --filter @16bitink/inkfish thumbnail` draws three on these rules (`hunter`, `glowup`, `run`) and a check sheet at YouTube's display sizes.

### Retention

- **The first 30 seconds:** an action or pattern break in 0–5 s, a specific promise in 5–15 s, and a reason to stay in 15–30 s. Three sentences of hook at most before the first real content.
- **The hook must match the title and thumbnail**, or viewers drop at 30 s.
- **Open loops:** plant them in the first minute and close them by the end. Give a one-line roadmap early.
- **Re-hook every 45–90 s:** "remember that…", "hold onto that", "it matters later".
- **Change what's on screen every 10–15 s.** A new subject, a label, a counter ticking, a cut.
- **Mention the game after the video has delivered something.** Re-hook straight after it, then give the full pitch at the end, after the payoff.
- **End 5 s after the last word**: YouTube's shortest end screen. A longer silent hold just loses viewers (the first cut held 12 s and was trimmed).

### Descriptions

Same as the shorts: search phrases first, **no links** (name the site, don't link it), YouTube chapters, then 3 hashtags.

## Collecting the data

Export from YouTube Studio at ~72 hours and at 7 days:

1. **Analytics → Advanced mode**, content type **Videos**, period **Lifetime**, grouped by **Content**. Include: Impressions, Impressions CTR, Views, Average view duration, Average percentage viewed, Likes, Comments, Shares, Subscribers gained.
2. **Test & Compare** result for the thumbnails.
3. **Traffic source**: search vs browse vs suggested.
4. **Retention curve** screenshot (per-video analytics → Engagement). Note the drops at the hook (~0:30), at the game mention, and at each re-hook.
5. **Site visits**: 16bit.ink traffic with a youtube.com referrer in the days after posting.

## Making a long-form video

Long-form videos live in `games/inkfish/dev/promo/<name>/` next to the shorts, and play on their own 1920×1080 page, `dev/longform.html` (`?video=<name>`, `&t=95` freezes a moment, `&from=95` plays from there). The first is `descent/`:

- `script.md`: the script, the packaging plan and every fact's source;
- `voice.mp3` and `words.ts`: the narration and its word timings, one take per section;
- `timeline.ts`: every beat, found by the word that names it (`said('tripodfish')`);
- `world.ts`: depth ↔ screen, and the camera's path (monotone, so it never overshoots a stop);
- `cast.ts`: every animal as a function of time, plus its bites and its ring and label;
- `water.ts`, `terrain.ts`, `hud.ts`, `inserts.ts`, `open.ts`: the scenery, the readouts, the cut-in cards and the cold open;
- `render.ts`, `audio.ts`: the frame and the soundtrack.

Steps, as done for `descent/`:

1. **Script first, facts checked.** Hook in the first 30 s, open loops planted early, the payoff last (see the rules above).
2. **Narrate it per section** with the ElevenLabs connector (voice *Cedric M – Engaging Documentary Narrator*, `eleven_v4`, four takes each). Price it first with `estimate_only`: about 4 credits per character per take. Pick each section's tightest take by its pauses (`ffmpeg … silencedetect`), trim the silence, speed up ×1.05 (`atempo`), and lay the takes on one track with a pause before each section (1–1.8 s; longer before "lights off" and the reveal).
3. **Transcribe the whole track once** with ElevenLabs Scribe for word timings, and write them into `words.ts` with the sections' start and end times. Use the script's spellings (Scribe writes US English).
4. **Build the picture** with every beat read off the words. Check frames with `node dev/promo/snap.mjs --page longform.html <dir> "video=descent" 31 95 …`, and preview stretches with `pnpm --filter @16bitink/inkfish promo -- --only long-descent --from 95 --to 130`.
5. **Record** with `pnpm --filter @16bitink/inkfish promo -- --only long-descent`: about 25–30 minutes for 6 minutes of video. The recorder brings the sound up to −14 LUFS (YouTube turns louder videos down but never turns quiet ones up).
6. **Captions:** an `.srt` from `words.ts` (lines of up to ~42 characters, broken at punctuation), uploaded as English subtitles rather than burned in.
7. Put the video, captions, thumbnails and the upload text in `promo/longform/` (`upload.md` holds titles, descriptions, tags and chapters), numbered like the shorts.
