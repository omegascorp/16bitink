# 16bit.ink

Hand-drawn browser games. Catalog site + games, starting with **InkFish**, a pen-and-ink fish-eat-fish game. Chapter 1 is free; the full game is a one-time Stripe purchase.

```
apps/web            Astro 7 site on Cloudflare Workers: catalog, game pages, full-screen player, Stripe checkout
packages/game-sdk   The contract between site and games (GameModule, GameHost)
games/inkfish       Phaser 4 game package: client game (src/) + server-only paid content (content/)
docs/               Research, tech & monetization decisions, art pipeline
```

## Develop

```bash
pnpm install
pnpm --filter @16bitink/inkfish dev     # game alone at http://localhost:5174 (prefix DEV_UNLOCK=true to play as an owner)
pnpm dev                                # site at http://localhost:4321
pnpm test                               # unit tests (game logic, entitlement tokens, catalog)
```

### Unlocking the full game

There are exactly two ways in:

- **Production:** a completed Stripe payment in live mode with a non-zero total. 100%-off promotion codes and test-mode payments never unlock the live site.
- **Local only:** `DEV_UNLOCK=true` in `apps/web/.dev.vars` (site) or in the environment when starting the game's dev server. It works only for requests to localhost, so it can't unlock the live site even if set there by mistake.

For checkout locally, copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`, use Stripe **test** keys, and forward webhooks:

```bash
stripe listen --forward-to localhost:8788/api/webhook
pnpm --filter @16bitink/web build && cd apps/web && npx wrangler dev --port 8788
```

## Deploy (Cloudflare)

1. In Stripe, create the product "InkFish – Full Game" with a one-time price, and give the price the lookup key `inkfish_full`.
2. Set the secrets:
   ```bash
   cd apps/web
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put ENTITLEMENT_SECRET     # openssl rand -base64 48 (at least 32 characters, or the site refuses to run)
   ```
3. Add a Stripe webhook to `https://16bit.ink/api/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
   Never set `DEV_UNLOCK` in production.
4. In the Cloudflare dashboard, add a WAF rate-limiting rule for `/api/checkout` and `/purchase/success` (e.g. 10 req/min per IP).
5. Run `pnpm --filter @16bitink/web deploy`. `wrangler.jsonc` binds the `16bit.ink` custom domain, so the domain must be on Cloudflare DNS.

## Adding a game

All games share one deployment, one checkout and one webhook.

1. Create `games/<slug>` (copy `games/inkfish/package.json` as a start). Its default export must be a `GameModule` from `@16bitink/game-sdk`: `mount(parent, host)`, which returns `{ destroy() }`. The game asks the host for everything else (ownership, paid content, buy, exit, storage).
2. Put paid content in the package's server-only `content/` entry (`"./content"` in `exports`). Never import it from the game's client code.
3. In `apps/web`:
   - Add the package as a dependency (`pnpm add '@16bitink/<slug>@workspace:*'`).
   - Add a catalog entry in `src/data/games.ts`: title, `theme`, `fonts`, `stripeLookupKey`.
   - Add one line to `src/games/loaders.ts` (client) and, if it sells content, one to `src/games/content.server.ts`.
4. In Stripe, create the one-time price with that lookup key.

`/play/<slug>`, `/games/<slug>`, checkout, ownership and `/api/content/<slug>` then work without further changes. `pnpm test` fails if the catalog and the registries disagree.

See [docs/tech-decisions.md](docs/tech-decisions.md) for the reasoning and the next steps.
