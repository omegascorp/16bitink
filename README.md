# 16bit.ink

Hand-drawn browser games. Catalog site + games, starting with **InkFish**, a pen-and-ink fish-eat-fish game. Chapter 1 is free; the full game is a one-time Stripe purchase.

```
apps/web            Astro 7 site (Node server on DigitalOcean App Platform): catalog, game pages, full-screen player, Stripe checkout, Google sign-in, MongoDB purchases
packages/game-sdk   The contract between site and games (GameModule, GameHost)
games/inkfish       Phaser 4 game package: client game (src/) + server-only paid content (content/)
games/inkcrab       Second game (prototype): hermit crab trading up through shells; design in docs/inkcrab-design.md
games/inkmine       Third game: planet-hopping miner, chapter 1 free, chapters 2-3 (Mycel, Brine) in the $4.99 full game; design in docs/inkmine-design.md
games/inkgecko      Fourth game: Zuma/Luxor-style marble shooter, in the catalog since Oct 22, all 10 chapters built (1 free; 2–10 the full game: Pond, Greenhouse, Orchard, Rockery, Allotment, Wild Meadow, Old Barn, Ruins, Night Garden); design in docs/inkgecko-design.md
docs/               Research, tech & monetization decisions, art pipeline
```

## Develop

```bash
pnpm install
pnpm --filter @16bitink/inkfish dev     # game alone at http://localhost:5174 (prefix DEV_UNLOCK=true to play as an owner, DEV_ALL_LEVELS=true to open every level)
pnpm --filter @16bitink/inkcrab dev     # InkCrab test beach at http://localhost:5175 (not in the catalog yet)
pnpm --filter @16bitink/inkmine dev     # InkMine at http://localhost:5176 (?reset starts over)
pnpm --filter @16bitink/inkgecko dev    # InkGecko at http://localhost:5177 (/specimens.html shows its art, /map.html the whole level map)
pnpm dev                                # site at http://localhost:4321
pnpm test                               # unit tests (game logic, tokens, purchases, catalog)
MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm --filter @16bitink/web test   # + database integration tests
```

### Unlocking the full game

There are exactly two ways in:

- **Production:** a completed Stripe payment in live mode with a non-zero total. 100%-off promotion codes and test-mode payments never unlock the live site.
- **Local only:** `DEV_UNLOCK=true` in `apps/web/.env` (site) or in the environment when starting the game's dev server. It works only for requests to localhost, so it can't unlock the live site even if set there by mistake. `DEV_ALL_LEVELS=true` (same places, same localhost-only rule) opens every level without playing through; it never opens paid chapters by itself.

A purchase is saved in MongoDB (collection `purchases`, one record per paid Stripe Checkout Session) by the Stripe webhook and the success page. A full refund or a chargeback marks it, and the game locks again. Google sign-in restores purchases made with the same email on any device.

For checkout locally:

1. Copy `apps/web/.env.example` to `apps/web/.env`. Use Stripe **test** keys and a local MongoDB (`MONGODB_URI`).
2. Create the test product and price: `pnpm --filter @16bitink/web stripe:setup`.
3. Forward webhooks, and put the `whsec_…` it prints into `.env` as `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:4321/api/webhook
   ```
4. `pnpm dev`, then buy with the test card `4242 4242 4242 4242`.

## Analytics

First-party and cookie-free: pages and games send events to `POST /api/events`, stored in the MongoDB time-series collection `events` (created on the first write, raw events expire after about 25 months). Admins see them at `/admin/analytics`: visitors, play time, per-game level funnels, OS/browser/device/country, latest visits. Visiting any `/admin` page stops that browser from counting itself. Country comes from the bundled GeoLite2 database (`geoip-country`, updated by bumping the package); the IP is never stored. Browsers that send Global Privacy Control or Do Not Track send nothing.

## Admin MCP (Claude connector)

`/mcp` is an MCP server for admins, so Claude can run creator outreach: `list_games`, `create_key` (an activation key for one creator: at most 5 accounts, 30 keys a day, tagged "by outreach" in `/admin/keys`), `list_keys` (who each key was for and whether it was redeemed; redeemers' emails are never shown) and `traffic` (visitors, players, landing pages, referrers, home page card clicks and live sales over N days). Links in ads and posts can carry `?via=<tag>` (e.g. `/play/inkfish?via=fb-ad`): the visit then shows up as referrer `16bit.ink/<tag>`, like the short links. It can't delete, refund, unlock games for players or read their emails.

Connect it in claude.ai: Settings → Connectors → Add custom connector → `https://16bit.ink/mcp`. Claude registers itself, then you sign in with Google as an `ADMIN_EMAILS` account and click Allow. Claude Code works too (`claude mcp add --transport http 16bitink https://16bit.ink/mcp`). Access tokens last an hour and refresh for 30 days; tokens stop working as soon as the account is no longer an admin. Codes only go to Claude's callback or a loopback address. Storage: `oauth_clients` and `oauth_tokens` (hashes only, expiring). The OAuth and MCP endpoints are exempt from the cross-site form check (`src/lib/originCheck.ts`, which replaces Astro's `security.checkOrigin`), since Claude calls them from its servers with no cookies.

## Deploy (DigitalOcean App Platform)

1. **Stripe:** set `STRIPE_SECRET_KEY` in `apps/web/.env` to the **live** key and run `pnpm --filter @16bitink/web stripe:setup`. This creates "InkFish: Full Game", a one-time $4.99 price with lookup key `inkfish_full`. Then put the test key back.
2. **MongoDB:** create a database (DigitalOcean Managed MongoDB or Atlas) and allow the app to reach it. Its connection string is `MONGODB_URI`.
3. **App:** create it in the App Platform dashboard from the GitHub repo, branch `main`, with a single **Web Service** (region `fra`, the smallest 512 MB instance is enough). If it also detects a "Function" (it mistakes `packages/game-sdk` for one), delete that component. Service settings:
   - Source directory: `/`
   - Build command: `pnpm install --frozen-lockfile && pnpm build`
   - Run command: `node apps/web/dist/server/entry.mjs`
   - HTTP port: `8080`, health check path `/`
   - Plain variables: `HOST=0.0.0.0`, `PORT=8080`, `STRIPE_AUTOMATIC_TAX=false`, `GOOGLE_CLIENT_ID`

   Then fill in the encrypted variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ENTITLEMENT_SECRET` (`openssl rand -base64 48`; at least 32 characters, or the site refuses to run)
   - `MONGODB_URI`
   - `GOOGLE_CLIENT_SECRET`
   - `ADMIN_EMAILS`: comma-separated Google account emails of admins. On each deploy (server start) and at sign-in, these users get role `admin` and everyone else `user`. Admins can open `/admin` to list players and unlock games for them, and `/admin/keys` to create activation keys (e.g. for YouTubers) that unlock a game at `/redeem` for one account, or for up to N accounts sharing the same key.

   Never set `DEV_UNLOCK` or `DEV_ALL_LEVELS` in production.
4. **Stripe webhook:** add an endpoint for `https://16bit.ink/api/webhook` with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
5. **Google:** add `https://16bit.ink/auth/google/callback` to the OAuth client's redirect URIs.
6. **Domain:** point `16bit.ink` at the app (App Platform issues the certificate).

Checkout, purchase confirmation and sign-in are rate-limited in the app (in memory, per instance).

## Adding a game

All games share one deployment, one checkout and one webhook.

1. Create `games/<slug>` (copy `games/inkfish/package.json` as a start). Its default export must be a `GameModule` from `@16bitink/game-sdk`: `mount(parent, host)`, which returns `{ destroy() }`. The game asks the host for everything else (ownership, paid content, buy, exit, storage).
2. Put paid content in the package's server-only `content/` entry (`"./content"` in `exports`). Never import it from the game's client code.
3. In `apps/web`:
   - Add the package as a dependency (`pnpm add '@16bitink/<slug>@workspace:*'`).
   - Add a catalog entry in `src/data/games.ts`: title, `theme`, `fonts`, `stripeLookupKey`.
   - Add one line to `src/games/loaders.ts` (client) and, if it sells content, one to `src/games/content.server.ts`.
   - A free demo with nothing for sale yet leaves out `price` and `stripeLookupKey`: its pages say the full game is coming soon.
   - Set `released` to the launch day to list it ahead: until that day (UTC) the home page and sitemap leave it out, while its pages, short link and checkout already work by link (`listedGames` in `src/data/games.ts`).
4. In Stripe, create the one-time price with that lookup key.
5. For the level funnel in `/admin/analytics`, call `host.track?.({ type: 'level_start', level, n, name })` when a level begins and `{ type: 'level_end', …, result, seconds }` when it is won, lost or left (`n` = the level's 1-based place in the game's order).

`/play/<slug>`, `/games/<slug>`, checkout, ownership and `/api/content/<slug>` then work without further changes. `pnpm test` fails if the catalog and the registries disagree.

See [docs/tech-decisions.md](docs/tech-decisions.md) for the reasoning and the next steps.
