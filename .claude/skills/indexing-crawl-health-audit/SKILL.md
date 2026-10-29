---
name: indexing-crawl-health-audit
description: >
  Diagnose why pages are not indexed or crawled properly: triage Search Console and Bing
  page-indexing statuses, check robots.txt, sitemaps, canonical/noindex signals, redirects, status
  codes, soft 404s, rendering and server health, then fix and verify. Use when a user asks "why
  isn't my page indexed," "check my robots/sitemap/noindex/canonical setup," or what "Crawled -
  currently not indexed" means. NOT for traffic-drop investigation (traffic-drop-diagnosis), on-page
  tags (technical-seo-audit) or content quality (page-quality-audit).
---

# Indexing and Crawl Health Audit

Separates three causes of missing URLs: a technical block, a signal conflict, or a search-engine
decision not to crawl or index a URL yet (Google does not always say why). Check and fix in that
order. Weigh recommendations by site maturity per `seo-growth-stage-strategy`; real emergencies
(site blocked, mass noindex, sitewide 5xx, defined numerically in the Defaults table) bypass it.

Facts checked against Google documentation on 2026-10-05. Time-sensitive items are marked
(time-sensitive): re-read the live page before quoting them.

---

## Step 0 — Ask before assuming

1. Which URLs or page types are affected, how many versus how many exist, and which matter?
2. When did it start, and what changed just before (deploy, migration, CMS/plugin, robots.txt, CDN/firewall, URL structure)?
3. Is Google Search Console or Bing Webmaster Tools connected, and can the page-indexing report be exported?
4. How are pages rendered (server HTML, static build, client-side JavaScript), and are they templated?
5. Can the Page indexing report counts be read in the Search Console interface or exported by the
   owner? If not, use "sampled mode" (Step 1b).

Search Console and Bing Webmaster Tools are free, need ownership verification, and are worth
connecting. The skill still runs without them at reduced precision — do not block on it. If a
search/analytics MCP or CSV export is available, use it; otherwise fall back to the steps below.

**If none of this can be answered:** work from what is directly observable — fetch robots.txt, the
sitemap and a sample of live URLs (status, redirects, canonical, robots meta/header, raw versus
rendered HTML); treat a `site:` query as a rough signal only. State plainly what is confirmed
(observed now) versus inferred (engine behaviour you could not see).

---

## Step 1 — Triage with the page-indexing report

Export every not-indexed status with counts. Status names, meanings and sample caps change —
**re-verify against current Search Console Help and Bing documentation before reporting.** Samples
are capped, so confirm patterns at template level. Classify:

- **Technical blocks (fix):** server error (5xx), redirect error, blocked by robots.txt, noindex, 401/403/other 4xx, soft 404.
- **Signal outcomes (check intent):** page with redirect, alternate page with proper canonical, duplicate without user-selected canonical, duplicate where the engine chose a different canonical.
- **Statuses Google reports without calling them errors:** discovered - currently not indexed (found but not crawled yet), crawled - currently not indexed (crawled, not indexed; Google gives no reason).
- **Warnings:** indexed though blocked by robots.txt; indexed without content.
- **Not found (404):** fine if intentionally gone; a problem only if linked internally or in the sitemap.

Count only URLs you want indexed; excluded variants and retired pages are usually healthy.

## Step 1b — Sampled mode (when counts are not available)

No public API reproduces the Page indexing report's counts. The Sitemaps API still reports
submitted counts, errors and warnings, but its per-sitemap `indexed` field is deprecated, so do
not use it. So:

- Prefer counts read from the Search Console interface or an owner export. Label them as read from the owner's report.
- Otherwise estimate by sampling with the URL Inspection API (Google quota: 2,000 queries per day and 600 per minute per site; time-sensitive, check the Search Console API limits page). Sample per template family, not across the whole site at random (sample size: `ICH-SAMPLE`).
- Report sampled results as **estimates** with the sample size, e.g. "about 70% of 100 sampled
  URLs in this template were indexed (estimate, not a site-wide count)". Never present a sample as the Page indexing count.
- If neither is possible, say "indexed count: not checked" rather than guessing.

URL Inspection checks single URLs only; do not use it to rebuild site-wide totals.

## Step 2 — Check robots.txt

- Fetch per host and protocol: 200, within the size limit (re-verify). Per Google: a 4xx (except 429) is treated as if no valid robots.txt existed (no restrictions). For 5xx, Google stops crawling the site for the first 12 hours, then uses the last good copy of robots.txt for up to 30 days (if no cached copy exists, Google assumes no restrictions). Google treats 429 differently from other 4xx; its robots.txt page does not say how. After 30 days, if the site is generally available, Google treats it as having no robots.txt; if the site has general availability problems, crawling stops. So a robots.txt that errors is an urgent fix even though the effect is delayed.
- No blanket `Disallow: /` (common after staging deploys). Test `*`/`$` wildcards and precedence against sample URLs, including ones that must stay crawlable.
- robots.txt controls crawling, not indexing: a blocked URL can still be indexed from links, and a `noindex` on a blocked page is never seen. To de-index, allow crawling and use noindex (or 404/410).
- Do not block CSS, JS or data needed to render. Unsupported directives (e.g. crawl-delay for Google) do nothing.

## Step 3 — Audit the sitemap

- Only canonical, indexable, 200 URLs, absolute, matching canonical tags exactly (host, protocol, slash, case); no redirects, 404s, noindex, blocked or parameter URLs.
- Google's limit is 50 MB uncompressed or 50,000 URLs per sitemap file; use a sitemap index beyond that. Check Bing's limits in its current docs.
- `lastmod` only for real, significant content changes. Google uses it only if it is consistently and verifiably accurate; a `lastmod` that is false loses Google's trust (see `content-freshness-audit`). Google ignores `priority` and `changefreq`.
- Compare submitted versus indexed per sitemap using the Search Console interface (the API's indexed field is deprecated; see Step 1b); confirm each is submitted in each engine and listed in robots.txt. Sitemaps are hints, not guarantees. A very small, well-linked site may not need one.

## Step 4 — Check canonical and noindex signals

- Indexable pages: one absolute self-referencing canonical, consistent with sitemap, internal links and redirects.
- Flag: noindex plus canonical elsewhere, canonical to a redirected/404/noindex page, chains, a template canonicalizing every page to one URL, JS-only canonical/noindex, multiple conflicting canonicals.
- Check meta robots AND `X-Robots-Tag` (including CDN/server rules) and staging or password settings leaked to production. Noindex is not a way to pick a canonical.
- Do not mix signals: Google documents redirects and `rel=canonical` as strong, sitemaps as weak; the engine may still choose its own.

## Step 5 — Redirects, status codes, server health

- Each URL resolves in one hop to a 200; flag chains and loops. Normalise variants (http/https, www, slash, case, tracking parameters): one form returns 200, the rest 301 or canonicalise.
- Redirect a removed URL only to a genuinely equivalent page; blanket redirects to a homepage or hub may be treated as soft 404s (common practitioner inference; Google's help says only to return a real 404 for pages that are truly gone). A clean 404/410 is better.
- Error and empty-result pages must return 404/410, not 200.
- Intermittent 5xx/429 slows crawling. Check logs (verify genuine bots by reverse DNS, not user-agent), crawl stats, uptime, and whether a CDN, firewall or bot rule blocks crawlers that browsers pass.

## Step 6 — Rendering and discoverability

- Compare raw HTML with rendered DOM: are content, canonical and robots meta in raw HTML? JS cannot reliably remove a noindex.
- Key pages need crawlable `<a href>` links. Find orphans and dead internal links (`internal-linking-audit`); strip tracking parameters from internal links.

## Step 7 — Templated and programmatic pages

- Compare indexed versus not-indexed pages within a template. A whole template or thin subset excluded points to quality or duplication, not a fault (`duplicate-intent-audit`, `page-quality-audit`).
- **Crawled - currently not indexed.** Google's definition is only that the page was crawled but not indexed; it may or may not be indexed in future and there is no need to resubmit the URL. Google does not give a reason, so do not label it a quality decision. Check what is checkable (Steps 2 to 6), compare against indexed siblings in the same template, and treat a quality or duplication explanation as an inference to test (`duplicate-intent-audit`, `page-quality-audit`). Many are stale variants that clear once signals agree.
- **Discovered - currently not indexed.** Google found the URL but has not crawled it, typically because crawling was expected to overload the site, so the crawl was rescheduled (no last crawl date). On a small site, check server health, response times and 5xx/429 first (Step 5). Weak internal links are a reasonable second check but not something Google states for this status.
- **Crawl budget** matters only for large sites. Google's guide is for sites with about 1M+ unique pages changing weekly, or about 10,000+ pages changing daily, or many URLs stuck at Discovered - currently not indexed (Google calls these a rough estimate; time-sensitive). If new pages are crawled the same day they are published, you do not need it.
- **New pages** typically take a few days to about a week or so to be crawled and indexed (Google, time-sensitive). Do not diagnose a page younger than that.
- Faceted navigation, pagination and parameter URLs: keep crawl paths into near-infinite URL spaces closed and make sure each canonical URL is linked and in the sitemap (check Google's current guidance on faceted navigation). `hreflang` alternates must be reciprocal and point at canonical, indexable URLs.
- Do not noindex or delete URLs that earn clicks; if in doubt, leave them alone.

## Step 8 — Inspect individual URLs

- Sample with URL Inspection: indexed view = what the engine last stored (declared versus selected canonical, last crawl); live test = what is fetchable now.
- A passing live test does not guarantee indexing; a request only goes into Google's indexing queue. Check manual-action and security reports separately.
- Request-indexing is quota-limited (no figure stated here; do not quote one) and resubmitting a crawled-not-indexed URL is not needed per Google; fix the cause, then use a sitemap for volume. Bing has URL Inspection and IndexNow (not re-checked here); re-verify labels.
- The Indexing API is only for pages with JobPosting or BroadcastEvent structured data. Do not recommend it for ordinary pages.

## Step 9 — Prioritise and fix

1. Site-wide blocks first (robots, mass noindex, server errors, firewall, broken deploys).
2. Template-level signal fixes (canonical, sitemap contents, redirect rules).
3. Sample before bulk: prove a fix on a few URLs before applying it to thousands.
4. Content and consolidation decisions last.

Emergency triggers (bypass the growth-stage weighting): mass noindex and sitewide 5xx as defined in `ICH-MASS-NOINDEX` and `ICH-5XX-SITE`; or robots.txt blocking the whole site. Those numbers are PROPOSED and UNSURE; state which condition matched and the evidence.

Gate risky changes (robots.txt, template-wide noindex/canonical, redirect rules, removals): sample test, rollback path, owner confirmation; chain/loop-check redirect rules. Never mass-submit URLs instead of fixing the cause, add noindex/redirects or delete pages just to tidy counts, or call a status an error without checking intent.

## Step 10 — Verify

- Re-fetch to confirm the fix is live (status, headers, canonical, robots).
- Use the report's validate-fix flow; validation and recrawls take days to weeks. Recheck at the `ICH-RECHECK` intervals.
- Measure by indexed counts and clicks. Google documented a logging error (13 May 2025 to 27 Apr 2026) that made impressions, and so CTR and average position, inaccurate; clicks were not affected. Other logged anomalies (for example Discover) affected clicks too. Lead with clicks; **check Google's Search Console data-anomalies page for the period before using any trend as evidence.**
- Log baseline and change (`change-and-decision-log`); isolate changes (`measurement-discipline`). Hand off: moved URLs to `site-migration-safety`, traffic loss to `traffic-drop-diagnosis`, ongoing watching to `seo-health-monitoring`, on-page tags to `technical-seo-audit`.

---

## Output shape

1. **Status table:** each not-indexed status, count and its source (owner report, export, or sampled estimate with sample size), sample URLs, verdict (technical / signal conflict / Google has not crawled or indexed it / intentional), confirmed versus inferred.
2. **Findings by layer:** robots, sitemap, canonical/noindex, redirects/status/server, rendering/discovery, template quality — each with evidence.
3. **Prioritised fix list:** template-level first, with expected effect, risk and rollback.
4. **Verification plan:** what to recheck, when, and target counts (clicks and indexed URLs).
5. **Not checked / needs access:** what could not be examined and why.

---

## Defaults (not Google figures; all PROPOSED)

| id | value | unit | basis | calibrate on |
|---|---|---|---|---|
| ICH-MASS-NOINDEX | a whole template family, or 10%+ of sitemap URLs, newly noindexed | share of URLs | PROPOSED, UNSURE | the site's own noindex count before and after a deploy |
| ICH-5XX-SITE | server errors (5xx) on 5%+ of sampled URLs, or on the homepage and one key template, in 2+ consecutive checks | share of sampled URLs; consecutive checks | PROPOSED, UNSURE | the site's normal error rate in server logs |
| ICH-SAMPLE | 100 URLs per template family (all of it if smaller) | URLs | PROPOSED (practitioner estimate) | URL Inspection quota and how much the family varies |
| ICH-RECHECK | 2, 4, then 8-12 weeks after a fix | weeks | PROPOSED (practitioner estimate; Google gives days to weeks for validation) | how fast this site is recrawled |

Google-documented figures used above (robots.txt 12 hours and 30 days, 50 MB / 50,000 URLs per
sitemap, URL Inspection quota, crawl-budget thresholds, new-page timing) are facts from Google's
pages, checked 2026-10-05, and are time-sensitive.
