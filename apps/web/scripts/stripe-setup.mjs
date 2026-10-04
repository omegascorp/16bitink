// Creates (once) the Stripe product and one-time price each catalog game
// sells, found later by its lookup key. Safe to run again: it only creates
// what is missing, and refuses to touch a price that differs from the plan.
//
//   cd apps/web
//   pnpm stripe:setup            # uses STRIPE_SECRET_KEY from .env
//   pnpm stripe:setup:prod       # ... from .env.production
//
// Run it once with the test key, and once with the live key before launch.
import Stripe from 'stripe';

const PRODUCTS = [
  {
    lookupKey: 'inkfish_full',
    name: 'InkFish: Full Game',
    description: 'The full InkFish game on 16bit.ink: all 100 levels across 10 ocean zones. One-time purchase, no subscription.',
    unitAmount: 499,
    currency: 'usd',
  },
];

const key = process.env.STRIPE_SECRET_KEY;
// A restricted key (rk_…) works too, if it may write Products and Prices.
if (!key || !/^[sr]k_(test|live)_[A-Za-z0-9]{20,}$/.test(key)) {
  console.error('Set STRIPE_SECRET_KEY (a real sk_/rk_ test or live key) in apps/web/.env first.');
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.includes('_live_') ? 'LIVE' : 'test';

for (const p of PRODUCTS) {
  const existing = (await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1, expand: ['data.product'] })).data[0];
  if (existing) {
    const matches = existing.type === 'one_time' && existing.unit_amount === p.unitAmount && existing.currency === p.currency && existing.active;
    console.log(`${matches ? 'ok' : 'MISMATCH'} [${mode}] ${p.lookupKey}: ${existing.id} (${existing.type}, ${existing.unit_amount} ${existing.currency}, active=${existing.active})`);
    if (!matches) process.exitCode = 1;
    continue;
  }
  const product = await stripe.products.create({ name: p.name, description: p.description, metadata: { lookup_key: p.lookupKey } });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.unitAmount,
    currency: p.currency,
    lookup_key: p.lookupKey,
    // Shown prices include any tax, so every buyer pays exactly the price on the page.
    tax_behavior: 'inclusive',
  });
  console.log(`created [${mode}] ${p.lookupKey}: product ${product.id}, price ${price.id} (${p.unitAmount} ${p.currency}, one-time)`);
}
