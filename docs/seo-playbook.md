# SEO playbook

Started October 27, 2026. Search sent 4 visits in the 30 days before; almost everything came from Facebook, Instagram and Reddit.

## The bet

People still search for the old games ours play like ("games like motherload", "fishy flash game"). "Play Zuma" is lost: portals host the originals (CrazyGames runs Motherload through Ruffle) and Google owns "snake game". "Games like X" and nostalgia searches are winnable: their results are full of spam PDFs and thin pages.

Never title a page as if our game were the classic ("Play Zuma online"). Name the classic only to compare, and say ours isn't connected to its makers.

## "Games like X" pages

**One page per old game, not per game of ours** (decided Oct 27, 2026): people search by the old game's name, and our own game already has its page at `/games/<slug>`. One game of ours can have several pages (InkFish: Fishy and Feeding Frenzy). An old game gets its own page only when people search for it by name *and* it has its own story (history, where to play it now); otherwise mention it on a bigger page (Luxor on Zuma's, Hungry Shark on the fish pages, Super Motherload on Motherload's). Two pages with the same list of alternatives would compete with each other.

`/games-like/<classic>`, data in `apps/web/src/data/gamesLike.ts`, page in `apps/web/src/pages/games-like/[slug].astro`. The game page's "For fans of…" line links to each of its pages ("More games like Fishy · Feeding Frenzy"), and the sitemap lists it once its game is out. `/games-like` lists them all and is linked from every page's footer.

| Page | Our game | Status |
|---|---|---|
| Motherload | InkMine | Built Oct 27, 2026 |
| Zuma (leads with **no ads**: Megazuma on Playgama shows an ad before its game starts) | InkGecko | Built Oct 27, 2026 |
| Fishy (the free browser / Flash angle) | InkFish | Built Oct 27, 2026 |
| Feeding Frenzy (the PC / console / phone angle, so it doesn't repeat Fishy's list) | InkFish | Built Oct 27, 2026 |
| Heroes of Might and Magic III | InkHeroes | Written and checked Oct 27, 2026; hidden (`coming: 'InkHeroes'`) until InkHeroes is in the catalog. When `feat/inkheroes` merges, the test asks to remove `coming`: re-check Olden Era's status and the remake's date then |
| Snake (with the Blockade → Nokia → Google history) | InkSnake | Built Oct 27, 2026 |

Each page: an opening answer of 60 words at most naming our game and the classic, ours first with a Play button, 3+ honest alternatives with official links (competitors too), a comparison table with an **Ads** row, the classic's history and where to play it now, an FAQ, and sources. Tests in `apps/web/test/gamesLike.test.ts` hold these rules.

## Flash games roundup

`/flash-games` (data in `apps/web/src/data/flashGames.ts`): 12 well-known Flash games, each with a legal way to play it today (the maker's site, an official remaster, the Flashpoint Archive; never "unblocked" portals, and no Newgrounds links until someone checks they play). Games ours plays like (Motherload, Fishy) link to their "games like" page and back. It's the page to post where Flash fans gather (r/flashgames). Built Oct 27, 2026.

## Adding a page

1. Research agent: facts about the classic and alternatives, each with a source. Anything only one weak source backs is marked unconfirmed and left out.
2. Write the entry. Keep spoilers out and claims about competitors to what's sourced or seen (ads included).
3. A separate fact-check agent reads the entry and checks every claim and link. The Motherload check caught 8 problems, including outdated platform lists and a wrong mechanic, so never skip it.
4. Tests, then a look at the page at desktop and phone width.
5. After deploy: Search Console → URL Inspection → Request indexing.

## Ranking in Google and AI answers

- Answer first: each section opens with a sentence that answers its heading alone. AI answers quote these.
- Specific, sourced facts (dates, makers, mechanics), comparison tables, a neutral tone.
- A byline (Hayk) and an `updated` date. Re-check facts and bump `updated` every few months: AI answers favour fresh pages.
- Structured data: Article, ItemList, FAQPage (Google shows no FAQ snippets for most sites any more, but it helps machines read the page).
- Don't block AI crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot). ChatGPT search leans on Bing's index, so Bing Webmaster Tools matters as well as Google Search Console.
- No mass template pages: Google's scaled content abuse policy targets pages made mainly to rank. A few hand-checked pages instead.
- Post history pages where the fans are (r/flashgames, r/HoMM3): AI answers cite Reddit heavily.
- Every two weeks, ask ChatGPT, Perplexity and Google AI Mode the same searches and note whether we're cited.

## Audits

Seven checklists from Bevizio's free SEO pack (MIT) live in `.claude/skills/`: technical SEO, indexing and crawl health, duplicate intent, content opportunities, internal linking, freshness, and the growth-stage gate (we're early stage, under ~300 search clicks a month, so new pages beat polishing old ones). Run the technical and indexing checks after any deploy that adds pages. Their first run (Oct 29, 2026) found About/Terms/Privacy pointing their canonical at `/about.html` and the About page claiming the art was drawn on paper; both fixed.
