# Growth plan

A 30-day plan (November 1–30, 2026) to make 16bit.ink grow faster. It came from our own traffic and ad data (October 31), an outside review from ChatGPT that the owner shared, and the owner's decisions on both. Channel how-tos stay in their playbooks (`shorts-playbook.md`, `longform-playbook.md`, `seo-playbook.md`, `outreach-playbook.md`); this file holds the priorities, the order and the numbers we judge them by. Check the numbers every Saturday and add them to the log at the bottom.

**The goal:** start selling. Making games only makes sense if they sell (owner, October 31). Nothing sells while players don't come back, so the order is **retention, then distribution, then the offer**.

## Decided (owner, October 31, 2026)

1. **A new game still ships every Sunday**, but most of the month's effort goes to distribution and retention, not building.
2. **Checkout isn't the blocker; retention is.** No guest checkout for now. Revisit only if the funnel shows people opening checkout and not paying.
3. **InkSnake is the flagship for paid ads.** No head-to-head test.
4. **No Meta pixel** unless the benefit is clearly high. Ads are measured with `?via=` tags and our own analytics.
5. **The owner posts on Instagram Reels and TikTok**, reusing the content we already make.
6. **Try a directory of browser games without ads** on its own site as a two-week experiment, starting after week 1 (see "Week 2 experiment").

## Where we are (October 31, 2026)

From the admin MCP (`traffic`, `funnel`) and the Meta Ads account, last 28 days unless noted:

- **1,800 visitors → 331 players → 1 sale** ($4.99, InkMine).
- **Nobody comes back.** 2,020 sessions from 1,800 visitors. In 9 days: 0 new email subscribers, 4 new accounts, 1 visitor who opened the installed app.
- **Half of players are in Instagram's in-app browser.** It has no tabs, no bookmarks and no "add to home screen". Once a player closes it, there's no way back to their game unless they find the ad again or we have their email.
- **The Sunday signup is in the wrong place:** at the bottom of the home page and game pages. Players who land straight in a game never see it, and the games themselves never ask.
- **So each Sunday's game can only reach new people.** Nobody who played last week hears about it.
- **Almost nobody gets far into a game.** In 9 days, 74 players started InkFish and 1 reached level 10. InkSnake: 64 started, 2 reached level 10. Six players reached the end of any free chapter.
- **The home page loses most visitors:** 76% leave without playing, after about 10 seconds.
- **The Meta ad sent everyone to the home page.** It spent $69 on 1,400 clicks, optimized for landing page views. About 1,000 of the clicks and $30 of the spend came from outside the ad set's current 12 countries. Instagram visitors start a game 36% of the time; Facebook visitors 2–7%.
- **YouTube Shorts get views but send no players** (230k+ views, 11 visits in 28 days). YouTube doesn't make links in Shorts descriptions or comments clickable; only the channel's profile links and a short's related-video link are.
- **Two early drop-offs:** in InkGecko, 24 players beat level 1 but only 8 started level 2. In InkCrab, 3 of 9 beat level 2.

## What we took from the outside review

| Suggestion | Verdict | Why |
|---|---|---|
| One flagship game | **Yes: InkSnake** (owner) | Snake needs no explaining, and it held players 4 minutes on average in its first week |
| Test flagship candidates head to head | No (owner) | The budget goes to InkSnake |
| Portals: CrazyGames first, Poki later | **Not now** | Portal versions run the portal's ads and can't link back, so they don't feed 16bit.ink. "No ads" is our pitch on the "games like" pages. An InkFish CrazyGames build was started on the `crazygames` branch (October 16) if we revisit this as a separate revenue line |
| itch.io | **Yes** | Builds already exist (`apps/itch`); itch has sent 0 visits so far |
| A daily run with a challenge link | **Yes, on InkSnake, early** | It's both the reason to come back and the thing players share. No streaks and no "best streak": a challenge link carries a score to beat, and a missed day never counts against anyone |
| Game-first Shorts, reposted to TikTok and Reels | **Yes** | Reels and TikTok profiles carry a tappable link; Instagram visitors already play at 36% |
| Measure players per video, not views | **Yes** | It's the number that's been missing |
| Email ask inside the game | **Yes, first** | It's the only way back for in-app-browser players. Ask on game over and after level 3, not only at the end of the free chapter, which almost nobody reaches |
| Test when the offer appears | **Later** (week 4) | Retention first |
| Cap the All Games Pass's "every future game" | **No** | Its price already steps up with the catalog (`PASS_NEXT_STEP`: $19.99 at 10 games), and nobody has bought it yet |
| More SEO pages | **Pause** | Six "games like" pages are live since October 27. Let Search Console show which queries get impressions first |
| Paid ads as low priority | **No: fix them now** | They're already our biggest source, and the only one where we control the traffic |
| Rethink the weekly cadence | **Keep weekly** (owner) | But each Sunday's game now gets an email to past players and a post on every channel |

## Targets for November 30

| Number | Now | Target |
|---|---|---|
| Players who come back on another day | not measured | 15% |
| Players who leave an email | ~0% | 5% |
| Sunday email list | 0 | 150 |
| Visitors who start a game | 18% | 50% |
| InkSnake players from ads, per dollar | not measured | 4 |
| Players who buy | 0.3% | 1% |
| Visits from Reels, TikTok and YouTube | ~11 a month | 300 a month |

Working targets, not benchmarks.

## The plan

### Week 1 (November 1–7): measure retention, and give players a way back

1. **Count returning players.** The visitor id in localStorage (`apps/web/src/lib/client/analytics.ts`) already ties visits together. Add "came back on a later day" (day 1 and day 7) per game, per source and per browser to the `traffic` tool, so we can see Instagram in-app players apart from the rest.
2. **Ask for an email in the games:** on game over, after level 3 and on the free-chapter end screen: "Get one email when Sunday's new game is out." One field, one tap, never blocking play, with the same consent text and unsubscribe as `SundaySignup.astro`. Start with InkSnake and InkFish, then the rest.
3. **Send the Sunday email for real:** one note per new game to everyone on the list, with the game's link. It's what makes the weekly cadence a retention engine.
4. **"Continue where you left off" on the home page** for returning visitors: their last game and level, one tap to play.
5. **Fix the two drop-offs:** find out why InkGecko players stop between levels 1 and 2 (watch the flow on a phone), and soften InkCrab level 2.

### Week 1, in parallel: the InkSnake ad

The ad is the only steady source of players while the YouTube links are being fixed. It's a $5-a-day test of whether players come back, not a growth engine. At 1 sale per 331 players it can't pay for itself yet. Stop it if retention doesn't move.

Status (October 31): the campaign and ad set exist as drafts. The ad waits for the owner to upload the video in Ads Manager → Media.

- **Campaign** "InkSnake – Instagram – play (2026-10-31)" (`120247434733880741`): traffic objective, $5 a day.
- **Ad set** `120247434734690741`: Instagram only (Feed, Stories, Reels, Explore), phones only, the 12 countries with location set to "people living in", optimized for landing page views (no pixel).
- **Video:** `promo/inksnake-sea-krait.mp4`, chosen over `inksnake-gameplay.mp4`, which is landscape. It's a vertical narrated swallow with "InkSnake · 16bit.ink" in every frame. The sea krait is chapter 6 (paid), so the text says play starts as the corn snake.
- **Link:** `https://16bit.ink/play/inksnake?via=meta-snake`.
- **Text:** "Ten real snakes, each with its own trick. This sea krait hunts eels on the reef. Start as a corn snake on the farm: 10 levels free in your browser, no ads, no sign-up." Headline "Play InkSnake free", with a Play Game button.
- **When it goes live,** pause the old home-page campaign "[16/10/2026] Promoting http://16bit.ink/". Its creative calls the games "hand-drawn", which breaks the owner's rule.
- **No Instagram account is linked** to the ad account, so the ad runs on Instagram under the 16bit.ink Facebook Page's name until the owner links one.
- **Judged by** `16bit.ink/meta-snake` in `traffic`: players per dollar, the share who come back, and the share who reach level 3.

### Weeks 2–4: reuse every video on every channel (the owner posts)

Each video we make goes to YouTube Shorts, Instagram Reels and TikTok, plus Facebook Reels at no extra cost.

| Platform | Profile link | Notes |
|---|---|---|
| YouTube | `16bit.ink/fish?via=yt` as the first channel link | Shorts links can't be tapped; say "link on the channel" in the last frame |
| Instagram | `16bit.ink/play/inksnake?via=ig` | Bio link; also a link sticker on a Story the day each Reel goes up |
| TikTok | `16bit.ink/play/inksnake?via=tt` | TikTok may show a bio link only for business accounts or after 1,000 followers; check when setting up |

- **What to post:** the ocean Shorts as they are (they're proven), plus one InkSnake gameplay clip a day in the four formats from the review: challenge ("Can you survive 30 seconds?"), surprise ("squeeze what you can't swallow"), nostalgia ("remember Nokia Snake?") and "which animal next?".
- **Each Sunday:** a 10-second clip of the new game, on every channel, the day it ships.
- **Claude prepares, per video:** the file, the caption for each platform, hashtags, and the profile link to use. The owner posts.

### Week 2 (November 8–14): the daily run on InkSnake

A level with the same seed for everyone each day, a score, and a "beat my score" link that opens the same run. Each new day's run gets mentioned in the Sunday email. No streaks.

### Week 2 experiment (November 8–21): a directory of browser games without ads

**The idea** (owner, October 31, after watching macbase.app grow in a couple of days): a separate site where indie developers list their own browser games for free, with 16bit.ink's games featured. MacBase is a free directory of Mac apps that its makers submit. Each listing gets a "Verified on MacBase" badge and links tagged `?ref=macbase.app`, so every maker shares their own listing. It's owned by Fore Studio, which promotes its own app bundle on it. That's the same model: a neutral directory that also promotes its owner's products.

**Why a separate site, not a section of 16bit.ink:** developers won't list their games in a rival's store, and 16bit.ink's brand is one maker's ink-style games. The directory features ours openly ("From the makers of 16bit.ink", a featured slot), and its links back help 16bit.ink in search.

**The angle:** "Browser games without ads": only games with no ads (free, or pay once), each linking to its maker's own site. A plain browser-game directory wouldn't stand out among itch.io, Newgrounds, CrazyGames, Poki, Foundplay, klyo and idev.games. "No ads" is already our pitch ([seo-playbook.md](seo-playbook.md)), and InkFish and InkSnake fit it. Directory visitors play: Foundplay sent us 7 visitors and all 7 started a game, against 2–7% from Facebook ads.

**The minimum (2–3 days to build):**

- About 30 hand-picked games at launch, each checked by hand for no ads and a working link. One page per game: a screenshot, two lines, the maker's link tagged `?ref=<domain>`.
- A submit form: the game's URL, the maker's contact and a confirmation that it has no ads. Each game is checked by hand before it's listed. Later, maybe, submission through an MCP link, as MacBase does.
- A badge makers can put on their own page ("Listed on …, no ads"), so they share the listing.
- Links out only. We never host or embed other people's games, which avoids rights problems.
- Our games: a featured slot and a "made by 16bit.ink" line, tagged `?via=<directory>` so `traffic` shows what it sends.

**Launch:** the owner posts in their own words on r/IndieDev, r/WebGames, Show HN, and the Phaser forum and Discord (the outreach playbook's rules apply). Each maker we list gets one email saying they're listed, with their badge.

**Kill or keep:** keep it only if, in the two weeks after launch, it gets about 50 games submitted by makers and 1,000 visitors. Either way, record how many players it sends to 16bit.ink.

**Domain (checked with whois October 31):** `noads.gg` and `adfreegames.io` look unregistered; `noadgames.com` is taken; `.games` names can't be checked by whois, so check them at a registrar. The owner picks the name.

### Week 3 (November 15–21): outside players

1. InkSnake's free chapter on itch.io (`pnpm --filter @16bitink/itch build inksnake`).
2. Owner posts in their own words: r/WebGames and Show HN for InkSnake, following the outreach playbook's rules.

### Week 4 (November 22–30): the offer, and double down

1. With players coming back, test an earlier offer card on InkSnake: after level 5, never in the middle of a run.
2. Compare channels by returning players and sales, not visits. Keep the two best and drop the rest.
3. Raise the ad budget only if players from ads come back and some buy.

## The Meta pixel (not now)

What it would add: Meta could aim the ad at people likely to start a game, instead of people likely to click. What it costs: a third-party script on every page, a privacy policy change, and cookie consent in the EU. With $5 a day of spend, the gain is small. Reconsider only if spend passes about $300 a month and the players from ads stop playing.

## Not doing in November

Guest checkout, CrazyGames and Poki, changes to the All Games Pass, new SEO pages, and more cold email.

## Weekly log

| Week ending | Visitors | Started a game | Came back | Emails | Sales | Ad spend | Ad players | Notes |
|---|---|---|---|---|---|---|---|---|
| Oct 31 (28 days) | 1,800 | 331 (18%) | – | 0 | 1 | $69 | – | Baseline |
