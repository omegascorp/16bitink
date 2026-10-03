# 16bit.ink

Hand-drawn browser games. Catalog site + games, starting with **Inkfish**, a pen-and-ink fish-eat-fish game. Chapter 1 is free; the full game is a one-time Stripe purchase.

```
apps/web        Astro 7 site on Cloudflare Workers: catalog, game pages, full-screen player, Stripe checkout
games/inkfish   Phaser 4 game package (TypeScript); mounts into any element via bootInkfish()
docs/           Research, tech & monetization decisions, art pipeline
```

## Develop

```bash
pnpm install
pnpm --filter @16bitink/inkfish dev     # game alone at http://localhost:5174 (?unlocked=1 fakes ownership)
pnpm dev                                # site at http://localhost:4321
pnpm test                               # unit tests (game logic, entitlement tokens, catalog)
```

For checkout locally, copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`, use Stripe **test** keys, and forward webhooks:

```bash
stripe listen --forward-to localhost:8788/api/webhook
pnpm --filter @16bitink/web build && cd apps/web && npx wrangler dev --port 8788
```

## Deploy (Cloudflare)

1. In Stripe, create the product "Inkfish – Full Game" with a one-time price and copy its `price_…` id.
2. Set the secrets:
   ```bash
   cd apps/web
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put ENTITLEMENT_SECRET     # openssl rand -base64 48
   npx wrangler secret put STRIPE_PRICE_INKFISH
   ```
3. Add a Stripe webhook to `https://16bit.ink/api/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
4. In the Cloudflare dashboard, add a WAF rate-limiting rule for `/api/checkout` and `/purchase/success` (e.g. 10 req/min per IP).
5. Run `pnpm --filter @16bitink/web deploy`. `wrangler.jsonc` binds the `16bit.ink` custom domain, so the domain must be on Cloudflare DNS.

## Adding a game

1. Create `games/<slug>`, exporting a `boot…(parent, host)` function.
2. Add it to `apps/web/src/data/games.ts`.
3. Add a `/play/<slug>` page and a server-side level/content entry.

See [docs/tech-decisions.md](docs/tech-decisions.md) for the reasoning and the next steps.
