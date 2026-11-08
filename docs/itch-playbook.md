# itch.io playbook

itch.io is a discovery channel for 16bit.ink: each game gets a free page there with its chapter 1 playable in the browser, and the full game stays on 16bit.ink.

## Why only the free chapter is on itch.io

itch.io takes **only donations** for browser (HTML5) games: "Currently all HTML5 games on itch.io are set up to only take payments as donations" ([itch.io docs](https://itch.io/docs/creators/html5)). Selling there would mean a paid *downloadable* build, plus a second checkout and a second set of saves to support. So, for now:

- **On itch.io:** chapter 1 (the same free part as on the site), in the browser, no sign-up.
- **The full game:** the offer at the end of chapter 1 opens `16bit.ink/games/<slug>?via=itch` in a new tab. The site's stats count those visits as `16bit.ink/itch`.
- **Exit / ← 16bit.ink button:** opens `16bit.ink/?via=itch` in a new tab, so the game keeps running behind it.

Known gap: progress made on itch.io stays in the itch.io embed. Someone who buys on the site starts over on 16bit.ink. If many itch.io players buy, add a way to carry progress over.

## Build

```sh
pnpm --filter @16bitink/itch build inkfish     # or several slugs, or `all`
pnpm --filter @16bitink/itch cover inkfish     # 630×500 cover (1260×1000 PNG), after the build
ITCH_GAME=inkmine pnpm --filter @16bitink/itch dev   # play an edition locally
```

The build writes:

- `apps/itch/dist/<slug>-itch.zip`: upload this. `index.html` is at the zip's root, paths are relative, and fonts are self-hosted, so the game makes no requests to other hosts.
- `apps/itch/dist/<slug>-cover.png`: the cover image.

How it works:

- The game and its catalog data (title, colours, fonts, price) come from `apps/web/src/data/games.ts`.
- The host is `apps/itch/src/host.ts`. It never unlocks the game, and `loadContent` always rejects.
- The build fails if any module from a game's `content/` (the paid levels) ends up in the bundle. It also fails if the build is over itch.io's limits (1,000 files, 500 MB unzipped).
- Saves use the embed's localStorage.
- Rebuild and re-upload after each game release. itch.io keeps the same page and replaces the file.

Sizes as of 2026-10-29: InkFish 0.8 MB, InkCrab 0.8 MB, InkGecko 0.8 MB, InkSnake 1.0 MB, InkMine 11.3 MB (it bundles its narration).

## Page settings (same for every game)

| Field | Value |
|---|---|
| Account / creator name | `16bitink` (pages become `16bitink.itch.io/<slug>`) |
| Kind of project | **HTML** |
| Release status | Released (InkMine: In development, since 3 of its 10 worlds are out) |
| Pricing | **No payments** (one ask, the $4.99 on the site, rather than a donation prompt as well) |
| Upload | `<slug>-itch.zip`, tick **This file will be played in the browser** |
| Embed options | Embed in page, **960 × 540** (16:9, which also makes itch.io lock phones to landscape), **Mobile friendly** on, **Fullscreen button** on, Automatically start on page load **off** (the click-to-play also lets the browser start the sound), Scrollbars off |
| Cover image | `<slug>-cover.png` |
| Screenshots | 3–5 at 16:9 from mid-level play (promo stills work), not menus |
| Gameplay video | the game's best-performing short, as a YouTube link |
| Generative AI disclosure | **Required.** Answer honestly (see below) |
| Theme | Background = the game's `theme.paper`, text = `theme.ink`, links/buttons = `theme.accent` |
| Community | Comments on |
| Visibility | Draft → play the embed on a desktop and a phone → Public |

**Generative AI disclosure.** itch.io requires the answer, and projects that hide AI use lose browse-page listing ([80.lv](https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/)). It has categories for graphics, sound, text and code:
- InkMine's story narration is ElevenLabs: tick **Sound**.
- Tick **Code** and **Text** if AI wrote them.
- Do **not** add the `no-ai` tag.

itch.io has a vocal anti-AI audience, so expect some of them to skip the page. Hiding the AI use is the worse risk, because it loses browse listing.

**Copy rules** (same as the site):
- The art is code-drawn in a pen-and-ink *style*. Never say or tag "hand-drawn".
- Say "one-time purchase", and lead with **no ads**, which is the difference from portal clones.

## Tag rules (itch.io quality guidelines)

From [itch.io's quality guidelines](https://itch.io/docs/creators/quality-guidelines#tags):
- Only use tags listed on [itch.io/tags](https://itch.io/tags), spelled as they are there. These aren't on the list, so they're not used: `fish` (only `Fishing` is, and it means something else), `crab`, `marble shooter`, `match-3`, `doodle`. `Hand-drawn` is on the list but never used here: the art is drawn in code.
- Don't tag what a metadata field already says:
  - genre: `action`, `puzzle`, `platformer`…
  - inputs: `mouse`, `keyboard`, `touch`
  - platform: `html5`
  - made with: `phaser`
- No synonym pairs (`fish` and `fishes`, `ocean` and `sea`).
- No game or creator names, and nothing that isn't in the game. Breaking these can remove the account from browse and search.

## InkFish listing (first)

Assets, after `build inkfish` and `cover inkfish`: `apps/itch/dist/inkfish-listing/`.
- `cover.png`: 630×500, saved at 1260×1000.
- `screenshot-1…5-*.png`: 1920×1080 frames of real play by the site's autopilot, HUD included. Upload them in their numbered order.

The five screenshots:
1. **Wreck:** the pirate shipwreck, chapter 5.
2. **Shallows:** a ×4 Frenzy combo on the seabed, with the plastic bag drifting by. Chapter 1, free.
3. **Pike:** "A pike is hunting you!" in the flashlight dark of Nib Narrows. Chapter 1, free.
4. **Reef:** "Jelly drift!" over the coral, chapter 4.
5. **Twilight:** a glowing lanternfish in a ×4 Frenzy, chapter 7.

Two show what's free; three show the deeper zones the full game adds.

Retake them with `pnpm --filter @16bitink/itch screenshots inkfish`, with the dev server running unlocked. Every run plays differently, so pick from `dist/screens/`.

**Title:** InkFish

**Short description or tagline:** Eat smaller fish. Grow. Don't get eaten.

**Genre:** Action

**Tags (10):** `underwater`, `Arcade`, `Casual`, `Cute`, `Animals`, `2D`, `Singleplayer`, `Score Attack`, `Survival`, `Family Friendly`

Spares if one doesn't fit: `combos` (the Ink Frenzy), `Fast-Paced`.

**Metadata:**
- Inputs: Mouse, Keyboard, Touchscreen
- Average session: A few minutes
- Languages: English
- Made with: Phaser

**Details (description):**

> **A fish-eat-fish game drawn in pen and ink.** Start as a doodle-sized fry in a sketchbook tide pool and eat your way up the food chain, until the fish that hunted you become lunch.
>
> **Eat. Grow. Don't get eaten.** Anything smaller than you is food. Anything bigger is trouble. Chain meals fast to build an **Ink Frenzy** and multiply your score.
>
> **Something keeps happening in the water:**
> - a pike that hunts you down
> - a dragonfly hatch to leap out of the water for
> - jellyfish swarms to lure predators into
> - things sinking from above: a battery that shocks predators into lunch, or a plastic bag you really shouldn't eat
>
> **Chapter 1 is free right here:** 10 levels in the Tide Pool Sketchbook, no sign-up.
>
> **The full game** goes all the way down, through 90 more levels in 9 deeper zones: seagrass, kelp, coral reef, a pirate shipwreck, the drop-off, twilight, midnight, the abyss and the Hadal Trench. Each zone gives you a new fish to play, with its own ability. Squirt ink, flash like a lanternfish, double-dash as a tuna…
>
> The full game is a **one-time $4.99 on [16bit.ink](https://16bit.ink/games/inkfish?via=itch)**: no ads, no subscription, no energy timers.
>
> **Controls**
> - Mouse or finger: swim
> - Space, click or the dash button: dash
> - E: your fish's ability (ink, flash…)
> - Esc / P: pause
> - M: sound on/off
>
> Made by one person at [16bit.ink](https://16bit.ink/?via=itch), where a new pen-and-ink game comes out every Sunday.

If the AI disclosure is "Yes", add one line at the end. The guidelines ask for AI use to be stated in the description too. For example: *"Made with AI-assisted code."* List whichever of code, text and sound apply.

## The other games

Same template. Take the tagline, description, features and controls from `games.ts`. The genre goes in the Genre field, so it's not repeated in the tags, and inputs go in Metadata.

| Game | Genre | Tags | Note |
|---|---|---|---|
| InkCrab | Platformer | `Animals`, `Cute`, `Casual`, `Arcade`, `Side Scroller`, `Survival`, `nature`, `2D`, `Singleplayer`, `Family Friendly` | 10 beaches, 100 levels |
| InkMine | Adventure | `Space`, `Exploration`, `Sci-fi`, `Aliens`, `Story Rich`, `Atmospheric`, `Crafting`, `Open World`, `2D`, `Singleplayer` | Mark *In development* and say how many worlds are out |
| InkGecko | Puzzle | `Arcade`, `Casual`, `Cute`, `Animals`, `Boss battle`, `combos`, `Colorful`, `2D`, `Singleplayer`, `Family Friendly` | Bosses every 10th level |
| InkSnake | Action | `Snake`, `Arcade`, `Casual`, `Cute`, `Animals`, `nature`, `Top-Down`, `Score Attack`, `2D`, `Singleplayer` | A real snake species per chapter |

## Launch plan

1. **InkFish first.** It is the best-tested game and fish-eat-fish is a search people already make. Watch the page for a week: views → plays (itch.io analytics), then `16bit.ink/itch` visits and purchases in `/admin/analytics`.
2. **Then one game every few days, not all at once.** Each new page gets its own moment in itch.io's "new" listings, and the pages link to each other.
3. **From then on, each Sunday release goes to itch.io the same day**, built with `build <slug>`.
4. **Post a short devlog on each page** with every update, since devlogs show up in followers' feeds. Group the games in a "16bit.ink" collection on the creator page.
5. **Re-evaluate after a month.** If itch.io players ask to buy there, add a paid downloadable full edition. A single-file offline build would make that possible.
