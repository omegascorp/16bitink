---
name: content-opportunity-discovery
description: >
  Systematically identify the highest-probability next pieces of content to build, using
  Search Console near-miss data, keyword-tool expansion, and structural gap analysis against
  what already exists — rather than guessing at topics. Use when a user asks "what should I
  build next," "where are my content gaps," or before any content-creation session. This is
  discovery, not creation — feed the output into whatever process actually builds the page.
  Not for title/snippet work on pages that already rank (ctr-snippet-optimization).
---

# Content Opportunity Discovery

Finds specific, evidence-backed next content to build, ranked by probability of success —
rather than brainstorming topics with no signal behind them.

**Evidence rule:** impressions, CTR and position are supporting evidence only; clicks are the
headline; for days in the affected window (13 May 2025 to 27 Apr 2026) they are inaccurate.
Google documented that logging error as making impressions, and so CTR and average position,
inaccurate; clicks were not affected.

---

## Step 0 — Ask before assuming

1. Is Search Console (or equivalent) access available? This is the single highest-value input
   — pages the search engine already associates the site with, ranking just outside the good
   positions, are the fastest path to more traffic.
2. Is there a structured inventory of what content already exists (a content matrix, a
   sitemap, a spreadsheet)? Structural gap analysis needs this to find *combinations* that are
   missing, not just individual missing topics.
3. Is a keyword-research tool (Bing Webmaster, or equivalent) available as a secondary source?
4. What does the site's content actually look like when it succeeds — which existing
   format/angle performs best? New candidates should be evaluated against that pattern, not a
   generic "good content" standard.
5. Is there an audience/monetization skew worth weighting for (e.g. one segment of traffic is
   worth more per pageview than another)? If so, factor it into scoring, not just raw
   volume/probability.

**If neither Search Console nor a keyword-research tool is available:** don't stop — lean on
Step 2 (structural gap analysis, which only needs a content inventory, not any external tool)
as the primary source, and use general web search to gauge whether a candidate topic has real
demand instead of a keyword tool's volume number. The output will be less precise without
external data, but still directionally useful — say so plainly rather than treating a
tool-free run as a full substitute. **On getting the tools connected:** Google Search Console
and Bing Webmaster Tools are both free — each just needs site-ownership verification (a DNS
record, an HTML file, or a meta tag) and takes a few minutes. If the person running this doesn't
have them connected yet, mention it's genuinely worth doing for a much stronger version of this
skill going forward, but proceed with what's available now rather than blocking on it.

---

## Defaults

Every number below is PROPOSED: a practitioner starting default, not a Google figure, to be
calibrated on the site's own data.

| id | value | unit | basis | calibrate on |
|---|---|---|---|---|
| T-NEARMISS | position 8.0-20.0, 100+ impressions, impressions on 3+ days | average position over 28 days | PROPOSED. The 8-20 range is a practitioner estimate. This skill owns the near-miss band | the site's own position and impression distribution |
| T-OPP-SHORTLIST | roughly 10-15 candidates | candidates | PROPOSED | how many the team can build per cycle |

Referenced, not defined here: T-CTR-BAND (the position band for CTR work, owned by `ctr-snippet-optimization`), used only for the tie-break in Step 1.

---

## Step 1 — Search-engine near-miss scan (highest priority)

Pull query-level performance data (28 days, or longer if available) and find queries in the
"near-miss" zone (T-NEARMISS: average position 8.0-20.0, at least 100 impressions, on at least
3 days) — an estimate set from practitioner habit, not a Google figure. These are queries the
search engine already associates the site with; a targeted improvement has an unusually high
chance of breaking through compared to targeting a completely cold topic. Judge size by clicks
where you can; impressions are supporting evidence only, and inaccurate for any day in the
affected window.

**Tie-break with `ctr-snippet-optimization` (positions about 8 to 15):** a query-page pair is a
CTR item if a matching, non-thin page exists with stable position and below-median CTR; otherwise
it is an opportunity item (no page matches the intent, the page is thin, or its position or CTR
does not fit the CTR conditions). Never both. A page's own CTR gap stays in the CTR item; do not
count it again as a position gain here. Send CTR
items to `ctr-snippet-optimization` and keep only opportunity items here. For each near-miss
query, name the page that currently ranks and decide which side of the rule it falls on, with
the evidence (is the page on-intent, is it thin, is its position stable).

---

## Step 2 — Structural gap analysis

If the site has any kind of repeatable structure (a matrix of entities × content-types — e.g.
"we have a calculator for every X, but no comparison page for several X-vs-Y pairs that both
have calculators"), look for missing *combinations*, not just individual missing pages. This is
usually a much larger and more reliable source of candidates than blind keyword brainstorming,
because each candidate is validated by the fact that its component parts already prove demand
individually.

---

## Step 3 — Keyword-tool expansion (secondary, use if Steps 1–2 don't yield enough)

If the near-miss scan and structural analysis together don't produce enough candidates, expand
into new territory using a keyword-research tool for topic areas not yet covered. Treat this as
a fallback source, not the primary one — it lacks the "already proven demand" signal the first
two sources have built in.

---

## Step 4 — Verify search intent before finalizing candidates

For top candidates, check what's *actually* ranking for the target query right now. Confirm the
intent matches what would be built (e.g. don't build a long-form article for a query where
every real result is a tool/calculator, or vice versa) — a candidate can look great on volume
and near-miss position and still be the wrong content format for that specific query. If every
top result is an official or regulator page, an ordinary article is unlikely to win: change the
candidate's role or drop it.

---

## Step 4b — Duplicate-intent check before recommending any new page

Before any candidate is recommended as a new page, check whether an existing page already
serves the same intent (use `duplicate-intent-audit`; at minimum, search the site's inventory
and Search Console for pages already ranking or receiving impressions for the query). If one
does, the candidate is not a new page: if that page is on-intent and not thin, it is a CTR item
(hand to `ctr-snippet-optimization`); if it is thin, the opportunity is a substantial rework of
it, not a second page. A new page that overlaps an existing page's intent is a cannibalisation
risk. Record the result of this check for every candidate.

---

## Step 5 — Score and rank

Score every surviving candidate on: search volume/opportunity size, likelihood of ranking (near-
miss status weighs heavily here), and monetization/audience value if that's a relevant factor
for this site. Present a ranked shortlist with the reasoning per candidate, not just a raw list.

---

## Output shape

A ranked shortlist (T-OPP-SHORTLIST: roughly 10–15 candidates is usually the useful range), each with: the
opportunity source (near-miss / structural gap / keyword expansion), the evidence behind it
(current position/clicks/impressions, or which existing pieces prove the structural gap), the
duplicate-intent check result, the confirmed search intent, and a score/reasoning. Label what is
inferred versus confirmed, and mark any impression-based figure from the affected window as
inaccurate. Hand this off to whatever process actually creates content — this skill's job ends
at the shortlist.

Facts checked against Google documentation on 2026-10-05 (Search Console data anomalies page).
