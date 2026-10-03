# Tech & monetization decisions

Researched October 2026.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Game engine | **Phaser 4.2** + TypeScript | v4 stable since Apr 2026. Built-in scenes, input, tweens, scale manager and fullscreen. New WebGL renderer. |
| Site | **Astro 7** | Zero-JS catalog pages (SEO), on-demand endpoints for checkout. Cloudflare-owned since Jan 2026, still open source. |
| Hosting | **Cloudflare Workers + static assets** | Free tier allows commercial use. Unlimited static bandwidth suits game assets. R2 has zero egress for future art atlases. |
| Payments | **Stripe Checkout** (one-time) | Hosted, PCI-free. Webhook for fulfilment. |
| Entitlements | HMAC-signed httpOnly cookie (now) → DB + magic link (next) | Zero-infra launch. The DB adds cross-device restore and refund revocation. |

Rejected:
- **PixiJS:** renderer only, so we'd rebuild an engine for every catalog game.
- **KAPLAY:** weaker on mobile with many sprites.
- **Next.js:** React weight we don't need.
- **Vercel:** its Hobby plan forbids commercial use.

## Monetization: free demo + one-time unlock (option A), not in-app purchases

**Recommendation: A first, a hybrid later.**

- One SKU per game (~$4.99), one entitlement and one restore flow. There's no virtual economy to balance or secure.
- Consumable IAPs in a fish-eat-fish game read as pay-to-win and clash with the hand-drawn premium brand.
- Later: a "16bit.ink Pass" bundle for all games, and maybe cosmetic, non-consumable extras (paper and pen styles).
- If we wrap for app stores (Capacitor):
  - Sell the *same* non-consumable unlock via Apple/Google IAP, with RevenueCat syncing entitlements.
  - Apple: US storefront external purchase links are currently allowed at 0% after the 2025 contempt ruling. SCOTUS granted cert on 30 Jun 2026, so treat it as unstable.
  - Google Play: since 30 Jun 2026, alternative billing is allowed in the US, UK and EEA, with a reduced 10% service fee.

### Sales tax / VAT: decide before launch

Selling digital goods to EU/UK customers makes **you** liable for VAT from the first sale.

| Option | Fee | Tax handling |
|---|---|---|
| Stripe direct (built) | ~2.9% + $0.30 (+0.5% Stripe Tax) | You register/remit (EU OSS, UK, US states). Set `STRIPE_AUTOMATIC_TAX=true` once Stripe Tax is configured. |
| Merchant of record: Stripe Managed Payments (preview) / Paddle / Lemon Squeezy | ~5% + $0.50 | They are the seller and handle all tax. |

At $4.99 the MoR fixed fee costs about 15%. Still, an MoR is the low-effort choice while volume is small. The checkout code sits behind one endpoint (`/api/checkout`), so swapping providers is a contained change.

## Anti-piracy, realistically

- The client bundle contains **only** the demo levels. Paid chapters are served by `/api/levels/inkfish` after the cookie is verified.
- A paying user could still dump the JSON. That's acceptable at this price point.
- Spend effort on easy restore, not on DRM.

## Full-screen play

- `/play/<game>` is a dedicated page: `100dvh`, `viewport-fit=cover`, `touch-action: none`, Phaser `Scale.RESIZE`.
- The "Tap to play" splash exists because browsers only allow `requestFullscreen()` inside a user gesture.
- Android also locks to landscape.
- **iPhone Safari has no element fullscreen.** The page fills the viewport, and a hint suggests *Add to Home Screen*: the PWA manifest uses `display: fullscreen`.

## Next steps

1. **Entitlement DB + restore:** Cloudflare D1 (or Supabase).
   - The webhook upserts `(email, game, session_id)`.
   - `/restore` emails a magic link via Resend/Postmark, which re-issues the cookie.
   - `charge.refunded` revokes.
2. Pick Stripe+Tax vs a merchant of record (see above).
3. Real pen art: replace `generateInkTextures()` with scanned atlases (see `art-pipeline.md`).
4. Audio (Phaser audio sprites), bosses, Endless mode.
5. Analytics (privacy-friendly) on demo → purchase conversion.
