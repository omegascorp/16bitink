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

Not exported yet: traffic sources, retention curves, and clicks through to 16bit.ink.

## What works so far

1. **A hook the viewer already knows wins the first second.** "There's always a bigger fish" is a known meme, so it had the best stayed-to-watch (48%) and the most engaged views. Stayed-to-watch is the number that decides whether YouTube shows a short to more people.
2. **A build-up with one sudden payoff drives rewatches.** "Wait for the shark…" lost more people at the start but was watched 1.25 times on average, the best of the three. The seamless loop matters here.
3. **Short beats long.** Both 13s shorts beat the 25s one on stayed-to-watch and % viewed.
4. **Explainers lose the swipe.** "How deep…" opened with a question and a slow descent: two-thirds of viewers swiped away, and it didn't loop (85% viewed). The people who stayed liked it (best likes per engaged view), so the idea is fine; the opening isn't.
5. **"This really happened" plus a role reversal is our strongest format.** A real event where the predator becomes prey, recreated in the game's ink style. It's the format behind "bigger fish".
6. **Long-form gets nothing without subscribers.** Stick to Shorts for now.

## Rules for the next short

- **10–13 seconds**, one seamless loop: the last frame flows into the first (see the loop tests in `games/inkfish/test/promo*.test.ts`).
- **Action from the first frame.** No question or explainer before something moves.
- **One build-up, one payoff.** A threat appears, the prey reacts ("!"), then a single big moment around 40% of the way in.
- **A real event when possible**, with *"This really happened."* after the payoff. Fact-check it before posting.
- **A meme-style line at the end** that also works as the title, e.g. "there's always a bigger fish", "some fish eat birds".
- **On-screen text and the game's own sound effects.** No voiceover; it makes the loop seam obvious.
- **Text stays between y ≈ 270 and 1250** of the 1080×1920 frame. Shorts and Reels cover the top ~14% and bottom ~35% with buttons.
- **Show something you actually do in the game** (eat, grow, leap for birds, dodge hooks), so the short sells the game, not just a fact.
- **Title:** a short hook plus emoji plus `#shorts`, e.g. *"Fish that eat birds?! 🐟🐦 #shorts"*.
- **No links in the description.** One short with a link sat at ~20 views until the link was removed. Name the site ("16bit.ink") without a URL.

## Tests in flight

| Video | Testing | Status |
|---|---|---|
| `inkfish-fish-eat-birds.mp4`: giant trevally snatching a tern (Seychelles, *Blue Planet II*) | Combines the bigger-fish formula (real event, role reversal, meme line) with the shark short's build-up and payoff | Made 2026-10-12, not yet posted |
| `inkfish-viral-never-ends.mp4`: same footage as the shark short, hook "the food chain never ends" | Does the hook text alone move stayed-to-watch? | Ready, not yet posted |
| `inkfish-loop.mp4` vs `inkfish-loop-captions.mp4` | Do captions help? | Ready, not yet posted |

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

To add one, register it in `main.ts` (as `?short=<name>`) and in `record.mjs`'s variant list. Preview at `/promo.html?short=<name>` (`&t=4.2` freezes a moment) and record with `pnpm --filter @16bitink/inkfish promo -- --only <name>`. Loop length must be a whole number of video frames and of line-boil cycles; 12s works.
