---
name: seo-growth-stage-strategy
description: >
  Determine how much SEO tinkering is actually appropriate for a site right now, before
  recommending any optimization action — a small/growing site and a mature one need opposite
  advice. Use at the start of any SEO engagement, before running any other audit skill in this
  pack, or when a user asks "should I be optimizing more" or "why isn't more tinkering helping."
  This is a gating skill: its answer changes what the other audit skills should even recommend.
  Not itself an audit (use site-audit-orchestrator).
---

# SEO Growth-Stage Strategy

Answers a question every other skill in this pack depends on: is this site at a stage where
adding coverage matters more than polishing what exists, or the reverse? Don't run a full
optimization audit on instinct — establish the stage first.

---

## Step 0 — Ask before assuming (this IS the skill, more than usual)

1. **How much content/coverage exists relative to the site's addressable topic space?** Still
   filling obvious gaps, or reasonably comprehensive already?
2. **How mature is the traffic?** Growing steadily, plateaued, or declining? Roughly how many
   Search Console clicks per 28 days, and how much revenue is at stake if something goes wrong?
3. **How much has actually been tinkered with already** — titles, structure, technical
   fixes — versus how much is genuinely new content?
4. **Is there a current, active concern** (a real drop, a suspected issue) or is this a
   proactive check-in with nothing specific wrong?
5. **What would "success" mean right now** — more coverage, better conversion on existing
   traffic, or just stability?
6. **How old is the site's search history** and how many pages have had at least one click in
   the last 90 days?

Do not skip this and jump straight to recommending fixes. The right answer to "should you
optimize this page" is genuinely different depending on the answers above.

**If none of this can be answered:** infer from whatever's directly observable — rough page
count, how recently content looks like it was added or updated, any traffic/revenue figures
volunteered elsewhere in the conversation — and, absent any of that either, default to treating
the site as **growth** stage (the middle stage in the cut-offs below). Growth means: balance
coverage and polish, and put every "build more" recommendation through the duplicate-intent and
quality gate (Step 1) before it is made. Do not default to "build more": for a site that is
really mature, adding pages without that gate can create overlapping or thin pages. Note
explicitly that the assessment is an inference, not confirmed.

---

## Stage cut-offs

These numbers are **practitioner estimates (PROPOSED, UNSURE)**, not Google figures. No
published data backs them; use them as a starting point and let the owner override.

| id | value | unit | basis | calibrate on |
|---|---|---|---|---|
| G-EARLY-CLICKS | under about 300 | Search Console clicks per 28 days | PROPOSED, UNSURE | the site's typical week-to-week variation and niche |
| G-EARLY-PAGES | under 100 | pages with at least one click in 90 days | PROPOSED, UNSURE | the site's total page count |
| G-EARLY-AGE | under 6 | months of search history | PROPOSED, UNSURE | how fast comparable sites got traction |
| G-MATURE-CLICKS | at least about 3,000 | Search Console clicks per 28 days, with a flat or rising trend | PROPOSED, UNSURE | the site's niche and revenue per click |

- **Early:** any one of G-EARLY-CLICKS, G-EARLY-PAGES or G-EARLY-AGE is true.
- **Mature:** G-MATURE-CLICKS is met and the 28-day trend is flat or rising over the last three periods.
- **Growth:** everything in between, or when figures conflict. Owner context (Step 0) can move a site one stage either way; say so when it does.

---

## Step 1 — Early and growth-stage guidance (still filling coverage gaps)

Early sites lean toward **coverage over polish**; growth sites balance both. At these stages,
filling a real gap (see `content-opportunity-discovery`, this pack) is usually worth more than
shaving a few percent off an existing page's CTR.

**The gate for ANY "build more" advice, at every stage.** Before recommending new pages:
1. Run `duplicate-intent-audit` on the intended topic family: does an existing page already
   serve the same search intent?
2. Check the existing pages in that family against `page-quality-audit`: are they thin or weak?
3. If either check fails, the recommendation becomes "consolidate or improve what exists," not
   "build more."

Keep the other audit skills' findings on file, but weight recommendations toward "build the
missing thing" only for gaps that pass the gate, unless something is actively broken (see Step 3).

---

## Step 2 — Mature/plateaued-stage guidance (comprehensive, growth has slowed)

Bias shifts toward **protecting and optimizing what already exists**. New-content ROI
diminishes once coverage is reasonably comprehensive, while the value of defending existing
rankings, fixing real quality/compliance issues (`page-quality-audit`, `protected-field-audit`,
this pack), and careful, measured optimization (`measurement-discipline`, this pack) rises. This
is also the stage where the full discipline of that measurement skill matters most — more is at
stake per change, so isolating cause and effect properly is worth the overhead it costs. New
pages still go through the Step 1 gate.

---

## Step 3 — Always: separate a real emergency from normal fluctuation, regardless of stage

Some things warrant immediate action at *any* stage, bypassing the growth-vs-mature framing
above entirely: a sudden major traffic drop, the site appearing broken, search-engine-reported
indexing errors. These are different in kind from ordinary ranking movement, and shouldn't wait
for a scheduled review cycle.

**Emergency detection is owned by `seo-health-monitoring`** (its Step 4 tiers, minimum-traffic
guard and alert rules). Do not define separate thresholds here; if the question is "is this a
real drop," use that skill's tiers and then `traffic-drop-diagnosis` for cause.

**Before reacting, determine whether the movement is broad or narrow** — this changes what the
correct response is:
- **Broad** (many unrelated pages moved together, same direction, same time) → likely an
  external cause (an algorithm update, a technical/infrastructure break) rather than anything
  about the specific pages. Investigate the external cause first (`traffic-drop-diagnosis`);
  don't start scattered page-by-page edits in response to a site-wide event — that makes
  unrelated changes indistinguishable from the real cause later.
- **Narrow** (a specific page or small cluster moved, nothing else did) → likely genuinely
  about that content/those pages. This is where a targeted audit (the other skills in this
  pack) is the right response.

Reacting to a broad decline with narrow, page-level tinkering — or reacting to a narrow issue by
assuming it's a site-wide event and doing nothing — are both real, common mistakes worth
explicitly checking against before recommending any action.

---

## Facts checked against Google documentation on 2026-10-05

This skill makes no claims about Google behavior. The stage numbers are not from Google. Where
it refers to Google updates, `traffic-drop-diagnosis` holds the checked facts.

---

## Output shape

A stated stage assessment (early / growth / mature, with the reasoning and which cut-off ids
applied, labelled confirmed or inferred), a recommendation on where effort should go right now
(coverage vs. optimization, weighted accordingly, with the Step 1 gate result for any "build
more" item), and — if there's an active concern — an explicit broad-vs-narrow classification
with the reasoning, before any specific fix is recommended.
