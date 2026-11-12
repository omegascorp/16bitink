export interface Alternative {
  readonly name: string;
  /** "Image & Form, 2013". */
  readonly madeBy: string;
  /** "PC, Switch, PlayStation, Xbox". */
  readonly platforms: string;
  /** "Paid", "Free in a browser". */
  readonly price: string;
  /** What it shares with the classic, and what's its own. */
  readonly why: string;
  /** Its official page. */
  readonly url: string;
}

export interface CompareRow {
  readonly label: string;
  readonly classic: string;
  readonly ours: string;
}

export interface Section {
  readonly heading: string;
  /** The first paragraph answers the heading by itself. */
  readonly paragraphs: readonly string[];
}

export interface GamesLikePage {
  /** The path after /games-like/, e.g. "motherload". */
  readonly slug: string;
  /** The older game's name, as people type it. */
  readonly classic: string;
  /** Our game's catalog slug. */
  readonly game: string;
  /**
   * Our game's title while it is still on its branch and not in the catalog: the page is written and
   * checked ahead, and stays down until the game joins the catalog (then remove this).
   */
  readonly coming?: string;
  /** The page's h1. */
  readonly heading: string;
  /** The meta description. */
  readonly description: string;
  /** The opening: answers the search in a few sentences that can be quoted whole. */
  readonly answer: string;
  /** About the classic: what it was, then where it can still be played. */
  readonly sections: readonly Section[];
  /** Why ours is on the list, in a paragraph or two, after the comparison table. */
  readonly oursWhy: readonly string[];
  readonly compare: readonly CompareRow[];
  /** Other games like the classic, best first; ours is listed above them. */
  readonly alternatives: readonly Alternative[];
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  readonly author: string;
  /** YYYY-MM-DD. */
  readonly published: string;
  /** YYYY-MM-DD: bump it whenever the facts are checked again or the page changes. */
  readonly updated: string;
}
