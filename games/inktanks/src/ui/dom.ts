/** Small DOM helpers for the screens: escaped text, a screen layer, and click wiring by data-act. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type Actions = Readonly<Record<string, (el: HTMLElement) => void>>;

/** Fills `root` with a screen and wires every [data-act] element to its action. */
export function render(root: HTMLElement, className: string, html: string, acts: Actions): HTMLElement {
  root.className = `screen ${className}`;
  root.innerHTML = html;
  root.hidden = false;
  for (const el of root.querySelectorAll<HTMLElement>('[data-act]')) {
    const act = acts[el.dataset.act!];
    if (act) el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!(el as HTMLButtonElement).disabled) act(el);
    });
  }
  return root;
}

export function clear(root: HTMLElement): void {
  root.innerHTML = '';
  root.hidden = true;
}

export const medalsHtml = (m: readonly boolean[] | undefined, pop: readonly boolean[] = []): string =>
  [0, 1, 2].map((i) => `<span class="medal${m?.[i] ? ' on' : ''}${pop[i] ? ' pop' : ''}" style="animation-delay:${0.3 + i * 0.35}s"></span>`).join('');

export const clock = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
