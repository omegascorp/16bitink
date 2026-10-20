# Outreach playbook

How we email game curators and small creators to bring players to 16bit.ink, without the domain getting marked as spam. It runs without the owner doing anything: Claude finds people, writes, sends, follows up and answers simple replies. Video channels have their own playbooks: `docs/shorts-playbook.md` and `docs/longform-playbook.md`. Add each batch to the results log below, then revise the rules if the data says otherwise.

## Where things live

- **Sending:** the Gmail connector, from **hayk@16bit.ink** (the default "Send mail as" in the hayk@alienart.io Google Workspace inbox; the connector has no From field, so it always uses the default). Never send outreach as alienart.io: a spam complaint would hurt the AlienArt business's own email.
- **Threads:** every outreach thread gets the Gmail label `16bit/outreach`. Don't touch AlienArt threads in the same inbox.
- **Contact log:** the Google Sheet "16bit.ink outreach log" (omegascorp@gmail.com's Drive). One row per person: status (`queued`, `sent`, `followed up`, `replied`, `covered`, `no`, `skip: …`), dates, game, tracking tag, thread id, and the research behind the pitch (where their email is published, why they fit, their recent post). Nobody gets a second first email: check the log before writing.
- **Keys:** the admin MCP at `https://16bit.ink/mcp` (README, "Admin MCP"). `create_key` with the person's name as the note; `list_keys` shows whether they redeemed it.
- **Links look wrapped, but aren't:** reading a sent email back (in Gmail on the web, or through the connector) shows its links as `google.com/url?q=…`. That's Gmail's display layer; recipients get the plain link (checked 2026-10-20 with a test email to another account).
- **Results:** the MCP's `traffic` tool. Each email links to its game page with `?via=<tag>` (e.g. `/games/inkfish?via=phaserworld`), which shows up as the source `16bit.ink/<tag>`, next to the YouTube short links (`16bit.ink/fish`).

## Who we write to

1. **Curators who invite submissions:** browser-game and indie newsletters, link blogs and review sites. They asked to be sent games, so the risk is lowest, and they don't need a key up front.
2. **Small creators (about 1k–100k subscribers):** ocean, marine-biology and animal-fact channels first (InkFish and InkCrab are built on real animals), then browser-game and cozy or hidden-gem indie channels. Each gets their own key.

Not worth it: guest posts (a B2B SEO tactic, mostly link farms), portals like CrazyGames and Poki (no outside links, their own purchases), anyone who charges for coverage, and channels or sites aimed at under-13s.

**Skip anyone who rejects AI-made games** (owner's decision, 2026-10-20). The code is written with AI help and InkMine's narration is an ElevenLabs voice. Everyone else gets one honest line: "the ink look is drawn by code, not by an image generator", plus "I do use AI help when writing the code" when they ask for AI disclosure. Never say the art is hand-drawn.

## Rules that keep 16bit.ink out of spam

- **Slow ramp:** 5 new emails a day in week 1, 10 in week 2, never more than 20. Spread them through the day.
- **Only addresses the person published** for contact, business or submissions, with the page it's on recorded. Never guess one, never buy lists. Respect "form only" and "don't email" notes.
- **Written by hand for one person:** plain text, one link, no attachments, images or tracking pixels. The first line names something specific they made recently. No two emails are the same.
- **One follow-up after 7 days, then never again.** Any reply ends the sequence.
- **Every email ends with** the 16bit.ink signature, the postal address (CAN-SPAM) and "Not for you? Reply "no" and I won't write again."
- **Brakes:** stop sending for the day after 2 bounces; stop everything and tell the owner on any angry reply or mention of spam.
- **Facts only from the code** (`apps/web/src/data/games.ts`, `games/*/src/levels/`). Price is always "a one-time $4.99".

Footer:

```
Thanks,
Hayk
16bit.ink
Flexi Desk, DUQE Square Business Center, Quarter Deck, QE2, Mina Rashid, Dubai, UAE

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

Each Sunday's new game is a fresh reason to write to curators, so pitch the newest game when it fits.

## Results log

| Date | Sent | To | Game | Replies | Keys redeemed | Visits (`traffic`) |
|---|---|---|---|---|---|---|
| 2026-10-20 | 5 | Phaser World, Gamedev.js Weekly, Web Curios, Cozy Game Reviews, Indie Game Picks | InkFish ×4, InkCrab ×1 | – | – | – |

Check replies, bounces and visits before each new batch; follow-ups for this batch are due 2026-10-27.
