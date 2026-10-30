/**
 * What a player picks when they tap a game's "Unlock" offer: the game they
 * are playing, or the All Games Pass. A small paper dialog over the game,
 * built from text only (never HTML), so nothing in it can inject markup.
 */

export type BuyChoice = 'game' | 'pass';

export interface ChooserText {
  /** The game being played, e.g. "InkFish". */
  readonly title: string;
  /** The game's price, e.g. "$4.99". */
  readonly price: string;
  readonly passTitle: string;
  readonly passPrice: string;
  /** "All 5 games + every future game". */
  readonly passPitch: string;
  /** When the pass next costs more, if that's still ahead. */
  readonly passNote?: string;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One option: a big button with its name, price and a line under it. */
function option(choice: BuyChoice, name: string, price: string, lines: readonly string[]): HTMLButtonElement {
  const button = el('button', `buy-choice buy-choice-${choice}`);
  button.type = 'button';
  button.value = choice;
  const head = el('span', 'buy-choice-head');
  head.append(el('span', 'buy-choice-name', name), el('span', 'buy-choice-price', price));
  button.append(head, ...lines.map((line) => el('span', 'buy-choice-line', line)));
  return button;
}

/**
 * Asks which to buy. Resolves with the choice, or null if the player
 * closed it. Without <dialog> support it goes straight to the game, as before the pass.
 */
export function chooseBuy(t: ChooserText): Promise<BuyChoice | null> {
  const dialog = el('dialog', 'buy-chooser');
  if (typeof dialog.showModal !== 'function') return Promise.resolve('game');
  dialog.setAttribute('aria-labelledby', 'buy-chooser-title');

  const title = el('h2', 'buy-chooser-title', 'Unlock the full game');
  title.id = 'buy-chooser-title';
  const game = option('game', `${t.title} · full game`, t.price, ['Every level of this game, yours to keep.']);
  const pass = option('pass', t.passTitle, t.passPrice, [t.passPitch, 'A new game every Sunday, unlocked for you the day it’s out.']);
  pass.prepend(el('span', 'buy-choice-sticker', 'Best value'));
  const note = el('p', 'buy-chooser-note', ['One-time purchase. No subscription, no ads.', t.passNote ? `Pass: ${t.passNote.toLowerCase()}.` : ''].filter(Boolean).join(' '));
  const close = el('button', 'buy-chooser-close', 'Not now');
  close.type = 'button';
  close.value = '';
  dialog.append(title, game, pass, note, close);

  return new Promise((resolve) => {
    let choice: BuyChoice | null = null;
    for (const b of [game, pass, close]) {
      b.addEventListener('click', () => {
        choice = b.value === 'game' || b.value === 'pass' ? b.value : null;
        dialog.close();
      });
    }
    // A tap on the backdrop (outside the paper) closes it too; a near-miss inside the paper doesn't.
    dialog.addEventListener('click', (e) => {
      const r = dialog.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (e.target === dialog && outside) dialog.close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(choice);
    });
    document.body.append(dialog);
    dialog.showModal();
    pass.focus();
  });
}
