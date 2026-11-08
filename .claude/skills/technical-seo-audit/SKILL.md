---
name: technical-seo-audit
description: >
  Audit a page's technical SEO fundamentals — meta tags, canonical URLs, structured data,
  heading hierarchy, mobile basics. Use when auditing any page's on-page technical setup, when
  a user asks "is my technical SEO okay," or as part of a full site audit alongside
  page-quality-audit and internal-linking-audit (this pack). This dimension changes over time
  (Google periodically deprecates rich-result types) — verify current status rather than
  trusting a fixed list.
  Not for length/CTR decisions (ctr-snippet-optimization) or indexing problems (indexing-crawl-health-audit).
---

# Technical SEO Audit

Checks the mechanical/structural SEO layer: does Google's crawler and renderer get what they
need from this page, cleanly and without contradictions.

---

## Step 0 — Ask before assuming

1. What platform/CMS renders the pages? (Determines whether fixes are template-level, one-time
   fixes that scale, or truly per-page.)
2. Is there an existing sitemap/robots.txt, and when was it last checked for correctness?
3. Does structured data (schema/JSON-LD) already exist anywhere on the site?
4. Roughly how many distinct page templates exist? A technical issue found on one template
   instance is usually present on every page using that template — fix at the template level,
   don't patch instances one at a time.

**If any of the above is unknown:** check by examining a handful of live rendered pages directly
(view source, or fetch the page) rather than needing the platform/CMS named — most of what this
skill checks (meta tags, schema, heading structure) is directly observable from the rendered
page itself, and doesn't require background knowledge about the site's tech stack.

---

## Defaults

| id | value | unit | basis | calibrate on |
|---|---|---|---|---|
| T-TITLE-RULE | 50-60 | characters (title) | PROPOSED rule of thumb, not a Google rule. Google documents no title or description length limit | the rendered live result on desktop and mobile |

No other numeric thresholds. Everything else in this skill is a Google-documented fact or a
yes/no check.

---

## Step 1 — Meta tags

- **Title**: Google documents no limit on title length; long titles are shortened to fit the
  device width. Check the live result on desktop and mobile rather than trusting a number.
  T-TITLE-RULE (50-60 characters) is only a common rule of thumb, not a Google rule. Give every
  page a unique, descriptive title; avoid repeated or boilerplate titles. Many people put the
  main term early so it survives shortening; Google does not say this (practitioner habit).
  Google generates the displayed title automatically from several sources, so a good tag is a
  strong input, not a guarantee.
- **Meta description**: Google documents no limit on description length; it shortens snippets to
  fit the device width and often builds them from page text instead. Make it unique per page and
  state the actual value proposition, not keyword-stuffed. Google sometimes uses it when it
  describes the page better than the page text.
- **Canonical URL**: present, an absolute URL (Google advises absolute over relative paths),
  points to *this* page (not a different one — check for the common bug of every page on a
  template canonicalizing to the same wrong URL). Treat rel=canonical as a strong signal, not a
  command. Link to one consistent URL form for each page (for example one choice on trailing
  slash, www and protocol) so signals are not split.
- **Viewport tag**: add one so the page displays properly on mobile (`width=device-width,
  initial-scale=1.0`) — good practice. Google lists it as a supported tag but does not call it
  required for indexing.

---

## Step 2 — Structured data (schema.org / JSON-LD)

Google periodically deprecates which schema types produce a *visual* rich result — deprecation
usually means the rich-result display stops, not that the underlying markup becomes invalid or
harmful. **Before recommending or auditing any schema type, check Google's current structured
data documentation for its live status** rather than assuming a type still produces a rich
result. Time-sensitive examples (last verified 2026-10-05): FAQ rich results stopped appearing
on 7 May 2026; How-to rich results were removed in September 2023. Other types have also been
removed; check the current search gallery rather than a fixed list. Correct markup is not a
guarantee of a rich result.

Check: valid syntax (JSON-LD is Google's recommended format, though other formats are accepted),
required properties present for whatever type is used (items missing required properties are not
eligible for rich results), and that the markup matches what is visible on the page. Mark up
only content visible to readers; misleading markup can trigger a structured data manual action,
which removes rich result eligibility.

---

## Step 3 — Heading hierarchy and on-page structure

- Give each page a clear main heading containing the actual topic, not a generic template
  string. Google does not require exactly one H1; one clear main heading is simply good
  practice for readers.
- Keep headings in a sensible order for readers and screen readers. Google says the order does
  not matter for Search, so do not report skipped levels as a ranking or indexing problem.
- Write H2/H3 text that describes each section clearly in natural language. Varied wording
  rather than the primary keyword repeated verbatim reads better to people; Google does not say
  that headings signal topical depth.
- Target topic/term appears naturally in the opening content, not buried.

---

## Step 4 — Mobile and rendering basics

- No horizontal scroll at mobile viewport widths (usability good practice, not an indexing rule).
- Tap targets and text sized for mobile use without zooming (usability good practice).
- Confirm the page actually renders the same content to Google's crawler as to a browser
  (check for any client-side-only content that wouldn't be in the initial render; URL
  Inspection in Search Console shows what Google sees).

---

## Output shape

Per template family (not per page, unless template-level fixes don't explain a specific
instance): meta tag issues (duplication, boilerplate, wrong canonical, inconsistent URL form,
and any title or description visibly cut off in the live result), structured data status
(valid/invalid, using a currently-supported type or not), heading issues (labelled as good
practice, not Google requirements), mobile-rendering issues. Flag anything found on one template
instance as likely present site-wide on that template. State which findings are Google-documented
and which are good practice or rule of thumb.

Facts checked against Google documentation on 2026-10-05 (title link, snippet, consolidate
duplicate URLs, structured data policies and search gallery, SEO starter guide, updates log).
