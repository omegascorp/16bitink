import { HAND_FONT } from '../scenes/ui';
import type { ClipFile, ClipJob } from './types';

const STYLE_ID = 'inkfish-clip-style';
const SHARE_TEXT = 'InkFish: play free at https://16bit.ink/games/inkfish';

/**
 * The look of the clip panel: paper, pen lines and handwriting, like the
 * game. Wide screens show the clip beside the result card; narrow ones a
 * small preview in the corner that opens up when tapped.
 */
const CSS = `
.ifclip { position: fixed; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 10px;
  font-family: ${HAND_FONT}; color: #2b2822; right: max(16px, 4vw); top: 50%; transform: translateY(-50%); }
.ifclip-title { font-size: 26px; font-weight: 700; color: #1f3f8a; }
.ifclip-preview { position: relative; padding: 0; border: 3px solid #2b2822; border-radius: 10px; background: #f4eddc;
  height: min(62vh, 560px); aspect-ratio: 9 / 16; overflow: hidden; cursor: pointer; box-shadow: 4px 5px 0 rgba(43, 40, 34, 0.18); }
.ifclip-preview video { width: 100%; height: 100%; object-fit: cover; display: block; }
.ifclip-wait { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center;
  padding: 12px; font-size: 24px; color: #5b5446; }
.ifclip[data-state='ready'] .ifclip-wait { display: none; }
.ifclip[data-state='making'] video, .ifclip[data-state='making'] .ifclip-actions { visibility: hidden; }
.ifclip-actions { display: flex; gap: 10px; }
.ifclip-btn { font: 700 24px ${HAND_FONT}; color: #1f3f8a; background: #f4eddc; border: 2.5px solid #2b2822; border-radius: 8px;
  padding: 4px 16px; cursor: pointer; text-decoration: none; }
.ifclip-btn:hover { background: #ebe1c8; }
.ifclip-close { display: none; }
@media (max-aspect-ratio: 5 / 4) {
  .ifclip { top: auto; transform: none; right: auto; left: 12px; bottom: 12px; gap: 6px; }
  .ifclip-title { font-size: 20px; }
  .ifclip-preview { height: 150px; }
  .ifclip-wait { font-size: 16px; }
  .ifclip:not(.is-open) .ifclip-actions { display: none; }
}
.ifclip.is-open { inset: 0; transform: none; justify-content: center; background: rgba(244, 237, 220, 0.94); }
.ifclip.is-open .ifclip-preview { height: min(78vh, 900px); }
.ifclip.is-open .ifclip-close { display: inline-block; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * The level's clip on the result screen: "inking" while it's made, then a
 * looping preview with Download and (where the device can) Share. Tapping
 * the preview opens it large, with sound.
 */
export class ClipPanel {
  private readonly root = el('div', 'ifclip');
  private readonly video = el('video', '');
  private url: string | null = null;
  private gone = false;

  constructor(parent: HTMLElement, private readonly job: ClipJob) {
    ensureStyle();
    this.root.dataset.state = 'making';
    const preview = el('button', 'ifclip-preview');
    preview.type = 'button';
    preview.setAttribute('aria-label', 'Play your highlights');
    Object.assign(this.video, { muted: true, loop: true, playsInline: true, autoplay: true });
    preview.append(this.video, el('span', 'ifclip-wait', 'Inking your highlights…'));
    preview.addEventListener('click', () => this.toggle());
    this.root.append(el('div', 'ifclip-title', 'Your highlights'), preview);
    parent.append(this.root);
    void job.result.then((clip) => this.show(clip));
  }

  private show(clip: ClipFile | null): void {
    if (this.gone) return;
    if (!clip) {
      this.root.remove();
      return;
    }
    this.url = URL.createObjectURL(clip.blob);
    this.video.src = this.url;
    void this.video.play().catch(() => undefined);
    const actions = el('div', 'ifclip-actions');
    const download = el('a', 'ifclip-btn', 'Download');
    download.href = this.url;
    download.download = clip.name;
    actions.append(download);
    const file = new File([clip.blob], clip.name, { type: clip.blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      const share = el('button', 'ifclip-btn', 'Share');
      share.type = 'button';
      share.addEventListener('click', () => {
        navigator.share({ files: [file], title: 'InkFish', text: SHARE_TEXT }).catch((err: unknown) => {
          // Closing the share sheet isn't an error.
          if (!(err instanceof DOMException && err.name === 'AbortError')) console.warn('[inkfish] could not share the clip', err);
        });
      });
      actions.append(share);
    }
    const close = el('button', 'ifclip-btn ifclip-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.toggle(false));
    actions.append(close);
    this.root.append(actions);
    this.root.dataset.state = 'ready';
  }

  /** Opens the clip large, with sound, or puts it back. */
  private toggle(open = !this.root.classList.contains('is-open')): void {
    if (this.root.dataset.state !== 'ready') return;
    this.root.classList.toggle('is-open', open);
    this.video.muted = !open;
    if (open) this.video.currentTime = 0;
    void this.video.play().catch(() => undefined);
  }

  destroy(): void {
    this.gone = true;
    this.job.cancel();
    this.video.pause();
    this.video.removeAttribute('src');
    this.root.remove();
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
