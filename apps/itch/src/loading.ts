import type { LoadingReporter } from '@16bitink/game-sdk';

/** The edition's loading bar (#loading in index.html), standing in for the site's splash. */
export function pageLoading(root: HTMLElement | null): LoadingReporter {
  const fill = root?.querySelector<HTMLElement>('.fill');
  const label = root?.querySelector<HTMLElement>('.label');
  let done = false;
  return {
    progress: (fraction, text) => {
      if (fill) fill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
      if (label && text) label.textContent = text;
    },
    failed: (reason) => console.warn('[itch] boot failed:', reason),
    ready: () => {
      if (done) return;
      done = true;
      root?.classList.add('gone');
      setTimeout(() => root?.remove(), 400);
    },
  };
}
