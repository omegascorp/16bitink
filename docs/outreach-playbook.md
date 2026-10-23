# Outreach playbook

How we email game curators and small creators to bring players to 16bit.ink, without the domain getting marked as spam. The goal is for it to run without the owner doing anything: Claude finds people, writes, sends, follows up and answers simple replies. Until the new email style has proven itself, the owner reviews each batch and nothing goes out without their OK (since 2026-10-20). Video channels have their own playbooks: `docs/shorts-playbook.md` and `docs/longform-playbook.md`. Add each batch to the results log below, then revise the rules if the data says otherwise.

## Where things live

- **Sending:** the Gmail connector, from **hayk@16bit.ink** (the default "Send mail as" in the hayk@alienart.io Google Workspace inbox; the connector has no From field, so it always uses the default). Never send outreach as alienart.io: a spam complaint would hurt the AlienArt business's own email.
- **Threads:** every outreach thread gets the Gmail label `16bit/outreach`. Don't touch AlienArt threads in the same inbox.
- **Contact log:** the Google Sheet "16bit.ink outreach log" (omegascorp@gmail.com's Drive). One row per person: status (`queued`, `sent`, `followed up`, `replied`, `covered`, `no`, `skip: …`), dates, game, tracking tag, thread id, and the research behind the pitch (where their email is published, why they fit, their recent post). Nobody gets a second first email: check the log, and Gmail (`to:<address>`), before writing. No connected tool can edit the sheet's cells (Drive can only create, copy or trash files; the Google Docs connector only edits Docs), so the owner updates it by hand for now.
- **Keys:** the admin MCP at `https://16bit.ink/mcp` (README, "Admin MCP"). `create_key` with the person's name as the note; `list_keys` shows whether they redeemed it.
- **The Gmail connector wraps links for real:** any `https://` link in a message it creates or sends (`send_message`, `create_draft`, plain or HTML body) is rewritten to `https://www.google.com/url?q=…&source=gmail&ust=…`, and recipients get that. Checked 2026-10-20 in the raw MIME of drafts and sent mail. The `ust` timestamp is creation time + 24 h, and Web Curios' reply quoted the wrapped link. The earlier note that this was "display only" was wrong, and all 5 emails of 2026-10-20 went out wrapped. A link without `https://` (`16bit.ink/games/inkfish?via=x`) is left alone but may not be clickable everywhere. A link pasted into Gmail's own editor stays clean. Until there's a sending path that keeps links clean, Claude creates drafts and the owner pastes the link and schedules.
- **Results:** the MCP's `traffic` tool. Each email links to its game page with `?via=<tag>` (e.g. `/games/inkfish?via=phaserworld`), which shows up as the source `16bit.ink/<tag>`, next to the YouTube short links (`16bit.ink/fish`).

## Who we write to

1. **Curators who invite submissions:** browser-game and indie newsletters, link blogs and review sites. They asked to be sent games, so the risk is lowest. The email links to the game and offers a full-game key; outlets that run giveaways are offered a few keys for their readers.
2. **Small creators (about 1k–100k subscribers):** ocean, marine-biology and animal-fact channels first (InkFish and InkCrab are built on real animals), then browser-game and cozy or hidden-gem indie channels. They never asked to be pitched, so the first email has no link: it offers a key and a clip, and the link and key go in the reply when they say yes.

Keys are offered, never pasted into a first email. `create_key` runs only after a yes: one single-use key per person, or several single-use keys for a giveaway (not one shared 5-use key, so each winner gets their own).

Not worth it: guest posts (a B2B SEO tactic, mostly link farms), portals like CrazyGames and Poki (no outside links, their own purchases), anyone who charges for coverage, and channels or sites aimed at under-13s.

**Skip anyone who rejects AI-made games, AI-written emails or AI agents** (owner's decision, 2026-10-20). The code is written with AI help and InkMine's narration is an ElevenLabs voice. Before writing, open their contact or about page and record its exact words on AI, agents and pitches in the log; a summary isn't enough (Web Curios' page said "don't email me with an AI-generated email", the summary said "disclose AI use", and he replied annoyed). Don't bring up AI unprompted. Where a page asks for AI disclosure, say "the ink look is drawn by code, not by an image generator" and "I do use AI help when writing the code". Never say the art is hand-drawn.

## Rules that keep 16bit.ink out of spam

- **Slow ramp:** 5 new emails a day in week 1, 10 in week 2, never more than 20. Spread them through the day.
- **Only addresses the person published** for contact, business or submissions, with the page it's on recorded. Never guess one, never buy lists. Respect "form only" and "don't email" notes.
- **Written for one person:** plain text, at most one link, no attachments, images or tracking pixels. No two emails are the same.
- **Follow-ups are paused** (owner, 2026-10-20) until the owner turns them back on. When on: one, after 7 days, then never again. Any reply ends the sequence.
- **Every email ends with** the 16bit.ink signature, the postal address (CAN-SPAM) and "Not for you? Reply "no" and I won't write again."
- **Brakes:** stop sending for the day after 2 bounces; stop everything and tell the owner on any angry reply or mention of spam.
- **Facts only from the code** (`apps/web/src/data/games.ts`, `games/*/src/levels/`).
- **No prices in first emails** (owner, 2026-10-20). Say what's free ("the first 10 levels are free"); the key offer covers the rest. If someone asks, the price is "a one-time $4.99".

## How the email reads

The first batch (2026-10-20) read as AI-written: all five had the same skeleton (an "I saw X and Y in your issue, so here's…" opener, a store blurb, free chapter and price, an unprompted "drawn by code" line, "Play it here:", a list of three offers). The owner flagged it, and one curator called it out. Sameness is what gives a pitch away in 2026, and a store blurb gives the reader nothing.

- **Short:** 2–3 sentences of body, then the link and one offer. The owner's own replies are the model: plain, a little rough, no polish.
- **Why them, honestly:** one line on why this person, from something they said or do ("your about page says to send projects along", "you cover games with animal leads"). No compliments on posts, no listing two items from their last issue.
- **One concrete, checked detail they'd care about:** a real fact from the game (the field guide's barreleye, the hermit crab vacancy chain, the line boil drawn by code), not genre words.
- **Something for them:** a key, keys for their readers, a clip, or a technical write-up for dev newsletters.
- **Avoid:** colon-style subject lines ("Built with Phaser 4: …"), store copy (level counts, "no sign-up" everywhere), groups of three, self-deprecation, "I know you're busy".
- **Subject:** lower-key and specific, e.g. "a hermit crab game in ballpoint pen".
- **One game per first email**, the one that fits them best. Other games come up only in a reply ("if you liked this, InkCrab is the next one").
- **Don't mention "a new game every Sunday" in first emails** (owner, 2026-10-20). To an AI-wary curator, a game a week reads like churned-out content. It's fine in replies to people who already like a game.

Footer:

```
Thanks,
Hayk
16bit.ink
DUQE Square Business Center, Quarter Deck, QE2, Mina Rashid, Dubai, UAE

Not for you? Reply "no" and I won't write again.
```

## Replies

Answer simple ones the same day: a key (`create_key`, note = their name and outlet), screenshots, a clip or more detail. Mark the row `replied`. Flag the owner, and don't answer, on anything about money (paid coverage, rate cards, sponsorship), contracts, or a complaint. A "no" or "unsubscribe" gets one polite line at most, and status `no`.

## Plan

| Week | What | Volume |
|---|---|---|
| 1 (from 2026-10-20) | Curators who invite submissions | 5/day |
| 2 | Small creators, each with a key (needs the admin MCP connected) | 10/day |
| 3+ | A daily routine does it all: research new names, send, follow up, answer, log | up to 20/day |

A new game is a reason to write again to people who covered or liked an earlier one. For first emails, pick whichever game fits the person, not just the newest.

## Directories and communities (added 2026-10-23)

Cold email got 1 reply from 10 (an angry one). Places that *ask* for games can't be annoyed by a submission, so they come before more email. Submit each game separately: one listing per game, each linking to its own `/games/<slug>?via=<site>` page.

**Now, nothing to build (link-out):**

| Where | How | Notes |
|---|---|---|
| [Foundplay](https://foundplay.io/submit) | Paste the game's URL, sign in with an emailed code, publish | Free, no exclusivity, live right away, link goes to our site. Lists "AI-made originals" too, so no AI problem. `foundplay.io` already sent 5 visitors who all started a game (week to 2026-10-23), though we have no listing yet |
| Phaser | [Showcase forum](https://phaser.discourse.group/t/welcome-to-the-phaser-showcase-forum/19) post per game, Phaser Discord, [editor.phaser.io/share](https://editor.phaser.io/share) for their news | The dev angle: no image files, everything drawn by code. Their "made with Phaser" list reads itch.io metadata |
| Show HN | One post, from the owner's HN account | "Things people can run… without barriers such as signups" fits: the free levels need no account. Lead with how the ink is drawn by code; expect questions on AI and on the paid part, answer them plainly |
| Reddit | r/WebGames, r/playmygame, r/IndieGaming, r/IndieDev, r/phaser, r/gamedev (Screenshot Saturday) | Owner's account. Read each sidebar first; r/WebGames wants no sign-ups and some account history. One game per post, days apart |

**Later, needs a standalone build of each game's free levels** (a zip with `index.html` at the root, paid levels left out, a "full game at 16bit.ink" end screen):

- **itch.io**: the largest browser-game audience. Upload the free levels, tag the engine as Phaser, link to 16bit.ink for the rest (or sell on itch too: 10% cut by default, and itch handles payment).
- **Newgrounds**: players vote on whether a game stays. Whether it allows links out to a paid version is unconfirmed, so check its upload rules first.
- **Game Jolt, idev.games, klyo** (klyo also takes a plain URL, reviewed before listing).

**Skip:** Poki (web-exclusive for 5 years by default), CrazyGames and GameDistribution/GameMonetize (their SDK and ads, no links out), Bounty Board Arcade ("every game in the Arcade is free").

Forum, Reddit and HN posts go out from the owner's own accounts and in their own words. Claude prepares the facts, clips and screenshots, but doesn't write the posts: a post that reads as AI-written gets called out there just like Web Curios did. Directory forms (Foundplay, klyo) are fine for Claude to fill in.

## Results log

| Date | Sent | To | Game | Replies | Keys redeemed | Visits (`traffic`) |
|---|---|---|---|---|---|---|
| 2026-10-20 | 5 | Phaser World, Gamedev.js Weekly, Web Curios, Cozy Game Reviews, Indie Game Picks | InkFish ×4, InkCrab ×1 | 1: Web Curios, annoyed at an AI-written pitch (owner answered; status `no`) | – | 0 by end of day |
| 2026-10-21 | 5 | Indie Hive, Alpha Beta Gamer, kottke.org, Waxy, Gaming Furever | InkFish ×4, InkMine ×1 | 0 by 2026-10-23 | – | 0 by 2026-10-23 |

Check replies, bounces and visits before each new batch. No follow-ups for the 2026-10-20 batch: it was written in the old style.
