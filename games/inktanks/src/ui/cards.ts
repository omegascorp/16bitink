import { esc, render } from './dom';

export interface CardButton {
  readonly label: string;
  readonly run: () => void;
  readonly kind?: 'go' | 'gold';
}

/**
 * A small card over whatever is showing: the full-game offer on a paid
 * level, "coming" on a chapter still being made, the pause menu, the boot
 * screen's error. A tap outside the panel runs `dismiss`, when given.
 */
export function showCard(root: HTMLElement, title: string, lines: readonly string[], buttons: readonly CardButton[], dismiss?: () => void): void {
  const acts: Record<string, () => void> = {};
  const btns = buttons.map((b, i) => {
    acts[`b${i}`] = b.run;
    return `<button class="btn${b.kind ? ` ${b.kind}` : ''}" data-act="b${i}">${esc(b.label)}</button>`;
  }).join('');
  if (dismiss) acts.dismiss = dismiss;
  const backdrop = dismiss ? '<div data-act="dismiss" style="position:absolute;inset:0"></div>' : '';
  render(root, 'dim', `${backdrop}<div class="panel modal rise"><div class="t36 gold">${esc(title)}</div>${lines.map((l) => `<div>${esc(l)}</div>`).join('')}<div class="row center">${btns}</div></div>`, acts);
}

/** The boot screen, until the art is in: the wordmark and a loading bar. */
export function showBoot(root: HTMLElement): (fraction: number) => void {
  render(root, 'boot dark', '<div class="wordmark">InkTanks</div><div class="bar"><i style="width:0%"></i></div><div class="t12 dimt">Rolling out the tanks…</div>', {});
  const bar = root.querySelector<HTMLElement>('.bar i')!;
  return (f) => {
    bar.style.width = `${Math.round(Math.min(1, Math.max(0, f)) * 100)}%`;
  };
}
