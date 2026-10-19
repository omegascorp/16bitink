import Phaser from 'phaser';
import { VoicePlayer } from '../audio/voice';
import { getHost, getSound, REG } from '../host';
import type { Profile } from '../logic/economy';
import { hasNarration, narrationUrl } from '../narration/library';
import { readingTime, subtitleAt, subtitles } from '../narration/lines';
import { remember } from '../narration/journal';
import { STRIP_FIT, stripPlace, type StripPlace } from '../logic/screenLayout';
import { upcoming } from '../narration/upcoming';
import type { HudScene } from './HudScene';
import { screenScene, viewSize } from './hidpi';
import { plateCard } from './kit/plate';
import { iconTexture } from './kit/uiIcons';
import { plaque, plaqueIconSize, plaqueInk } from './kit/plaque';
import { storyCard, type StoryCardSpec } from './kit/storyCard';
import { label, prose, SEPIA } from './kit/type';

/** The strip at the foot of the screen, layout px: its height, padding, picture and buttons (its width and place: STRIP_FIT, stripPlace). */
const STRIP = { h: STRIP_FIT.h, pad: 16, portrait: 64, button: 44 } as const;
/** The strip's small buttons' label size (their icons are sized from it). */
const STRIP_ICON = 14;
/** Subtitles are read larger than other text, as they're on screen only a moment. */
const SUB_SIZE = 21;
/** A speaker's alien voice (the Lamplighters') plays first; the narrator starts after it, s per word, plus a beat. */
const ALIEN_WORD = 0.45;
/** The story's next lines fetched ahead: how many, and how often (ms) it's looked at, the first time a while after start so the game loads first. */
const AHEAD = { lines: 2, every: 3000, first: 4000 } as const;

/** A line in the queue: what the strip says and shows, and the card to read it on. */
interface Line {
  readonly spec: StoryCardSpec;
  readonly chunks: readonly string[];
  /** Seconds before the narrator starts (after a speaker's own voice). */
  readonly delay: number;
  /** The strip plays the speaker's own voice first (a card showing it already does). */
  readonly speak: boolean;
}

/** The same line: by its id, or the words of a card without one. */
const same = (a: StoryCardSpec, b: StoryCardSpec): boolean => (a.line ?? a.text) === (b.line ?? b.text);

/** Cards already warned about, in development, as having no recording. */
const warned = new Set<string>();

/** In development, says once when a card the narrator was asked to read has no recording, so it's never missed. */
function warnUnrecorded(spec: StoryCardSpec): void {
  if (!import.meta.env.DEV || warned.has(spec.line ?? spec.title)) return;
  warned.add(spec.line ?? spec.title);
  console.warn(spec.line ? `Narration: no recording for "${spec.line}" (narration/${spec.line}.mp3)` : `Narration: the card "${spec.title}" has no line id`);
}

/** A line for `spec`: its subtitles, and room first for the speaker's own voice, if it has one. */
const lineOf = (spec: StoryCardSpec, speak: boolean): Line => ({ spec, chunks: subtitles(spec.text), delay: spec.voice ? spec.voice.words * ALIEN_WORD + 0.8 : 0, speak });

/**
 * The narrator (spec, "Narration"), over every other scene and kept
 * through scene changes: story moments read aloud while play goes on, as
 * Bastion's narrator and Subnautica's voice logs are. One line at a time,
 * queued; a strip at the foot of the screen names it and shows its
 * subtitles in time with the voice, with pause, skip, and Read, which
 * opens the full card (with its pictures) and holds the world while it's
 * open. Everything else dips under the voice. With sound muted or
 * narration off, nothing is read or fetched: story moments are cards the
 * world waits on, as before, and switched back on, the next lines are
 * fetched again.
 */
export class NarratorScene extends Phaser.Scene {
  /** The full card is open from the strip: the world waits while it's read. */
  reading = false;
  private queue: Line[] = [];
  private line: Line | null = null;
  /** Seconds into the current line (the voice's clock while it plays, else the scene's). */
  private at = 0;
  private duration = 0;
  private paused = false;
  /** A modal card on another scene is showing this line already: the strip waits under it. */
  private covered = false;
  /** Sound went off: the line is on a card the world waits on, and closing it ends the line. */
  private carded = false;
  private buffer: AudioBuffer | null = null;
  private voicing = false;
  private voice!: VoicePlayer;
  private strip: Phaser.GameObjects.Container | null = null;
  /** The strip's width as last laid out (see place). */
  private stripW: number = STRIP_FIT.w;
  private subtitle: Phaser.GameObjects.Text | null = null;
  private bar: Phaser.GameObjects.Graphics | null = null;
  private pauseLabel: Phaser.GameObjects.Image | null = null;
  private shownChunk = -1;
  /** Ms until the story's next lines are looked at again. */
  private aheadIn: number = AHEAD.first;

  constructor() {
    super('Narrator');
  }

  create(): void {
    screenScene(this, true);
    const sound = getSound(this);
    if (sound) this.voice = new VoicePlayer(sound);
    this.scale.on('resize', this.build, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.build, this));
    sound?.onMuteChange(() => this.heard());
    sound?.onNarrationChange(() => this.heard());
  }

  /** Whether the narrator can be heard: sound on, and narration on. */
  private get audible(): boolean {
    const sound = getSound(this);
    return !!sound?.narration && !sound.muted;
  }

  /** Sound or narration switched: off, what's left to read goes on cards; on, the next lines are fetched. */
  private heard(): void {
    if (this.audible) {
      this.aheadIn = 0;
      return;
    }
    this.stopVoice();
    if (!this.line) return;
    // A card on another scene shows it already.
    if (this.covered) this.finish();
    else this.card(this.line);
  }

  /** Whether the narrator would read `spec` aloud: it can be heard and its line is recorded. */
  canSay(spec: StoryCardSpec): boolean {
    if (!this.audible) return false;
    if (hasNarration(spec.line)) return true;
    warnUnrecorded(spec);
    return false;
  }

  /**
   * Reads `spec` aloud in the strip, after whatever's playing, while play
   * goes on. False when it can't (narration off, or the line not recorded):
   * the caller shows the card instead.
   */
  say(spec: StoryCardSpec): boolean {
    if (!this.canSay(spec)) return false;
    if ((this.line && same(this.line.spec, spec)) || this.queue.some((l) => same(l.spec, spec))) return true;
    this.queue.push(lineOf(spec, true));
    return true;
  }

  /**
   * Reads `spec` aloud now while a card shows it, ahead of the queue; the
   * strip waits under the card and carries on once it's closed. A line it
   * cuts into is told again after it, not lost. Returns what to call then.
   */
  sayOver(spec: StoryCardSpec): () => void {
    if (!this.canSay(spec)) return () => undefined;
    this.queue = this.queue.filter((l) => !same(l.spec, spec));
    if (!this.line || !same(this.line.spec, spec)) {
      const cut = this.line;
      this.finish();
      this.queue.unshift(lineOf(spec, false), ...(cut ? [cut] : []));
    }
    this.covered = true;
    this.strip?.setVisible(false);
    return () => {
      this.covered = false;
      if (this.line && same(this.line.spec, spec)) this.build();
    };
  }

  /** Fetches `line`'s recording ahead of time, if it'll be read aloud. */
  prefetch(line: string | undefined): void {
    if (!this.audible || !hasNarration(line)) return;
    void narrationUrl(line)?.then((url) => this.voice?.prefetch(url));
  }

  /** Fetches the story's next lines, so their voice is there when they come. */
  private lookAhead(delta: number): void {
    this.aheadIn -= delta;
    if (this.aheadIn > 0) return;
    this.aheadIn = AHEAD.every;
    // The profile as the game has it, once it's loaded (reading it through getProfile would start the session).
    const p = this.registry.get(REG.profile) as Profile | undefined;
    if (p) for (const line of upcoming(p, AHEAD.lines)) this.prefetch(line);
  }

  update(_time: number, delta: number): void {
    this.lookAhead(delta);
    if (!this.line) {
      if (this.queue.length) this.begin(this.queue.shift()!);
      return;
    }
    if (this.carded) return;
    // Before the first click, tap or key the browser keeps the voice silent: the line waits at its start for it.
    if (!this.paused && !document.hidden && !getSound(this)?.waitingForGesture) {
      const heard = this.voicing ? this.voice.position : null;
      // The voice's own clock while it plays (it stops with a hidden tab); else the scene's.
      this.at = heard !== null ? heard + this.line.delay : this.at + delta / 1000;
      if (this.buffer && !this.voicing && this.at >= this.line.delay && this.at < this.line.delay + this.buffer.duration) this.startVoice();
    }
    if (this.at >= this.duration) {
      this.finish();
      return;
    }
    this.showProgress();
  }

  /** Stops everything: the voice, the strip, the queue. */
  clear(): void {
    this.queue = [];
    this.finish();
  }

  private begin(line: Line): void {
    this.line = line;
    this.at = 0;
    this.paused = false;
    this.buffer = null;
    this.voicing = false;
    this.shownChunk = -1;
    this.duration = line.delay + readingTime(line.spec.text);
    remember(getHost(this).storage, line.spec);
    // Queued before sound went off: a card, and nothing fetched.
    if (!this.audible) {
      this.card(line);
      return;
    }
    if (line.speak && line.spec.voice) getSound(this)?.speak(line.spec.voice.words, line.spec.voice.seed);
    this.build();
    const url = narrationUrl(line.spec.line);
    void url?.then((u) => this.voice?.load(u)).then((buffer) => {
      if (this.line !== line || !buffer) return;
      this.buffer = buffer;
      this.duration = line.delay + buffer.duration + 0.6;
    });
  }

  private startVoice(): void {
    if (!this.buffer || !this.line || !this.voice) return;
    this.voicing = this.voice.play(this.buffer, this.at - this.line.delay);
    getSound(this)?.duck(this.voicing);
  }

  private stopVoice(): void {
    this.voice?.stop();
    this.voicing = false;
    getSound(this)?.duck(false);
  }

  private finish(): void {
    this.stopVoice();
    this.carded = false;
    this.line = null;
    this.buffer = null;
    this.strip?.destroy();
    this.strip = null;
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) this.stopVoice();
    this.pauseLabel?.setTexture(iconTexture(this, this.paused ? 'play' : 'pause', plaqueIconSize(STRIP_ICON), plaqueInk()));
  }

  /** The full card, from the strip's Read: the world waits while it's open; the voice reads on. */
  private read(): void {
    const line = this.line;
    if (!line || this.reading) return;
    this.reading = true;
    this.strip?.setVisible(false);
    storyCard(this, line.spec, () => {
      this.reading = false;
      if (this.line !== line) return;
      if (this.carded) this.finish();
      else this.strip?.setVisible(true);
    }, 90, { narrate: false });
  }

  /** The line on its card, with the world waiting, as when there's no narration: closing it ends the line. */
  private card(line: Line): void {
    this.carded = true;
    this.strip?.destroy();
    this.strip = null;
    // Open from Read already: closing that ends it.
    if (this.reading) return;
    this.reading = true;
    storyCard(this, line.spec, () => {
      this.reading = false;
      if (this.line === line) this.finish();
    }, 90, { narrate: false });
  }

  /** Where the strip sits (see stripPlace): clear of the touch buttons while they show. */
  private place(width: number): StripPlace {
    const hud = this.scene.get('Hud') as HudScene | null;
    return stripPlace(width, hud?.sys.isActive() ? (hud.touch?.corner() ?? null) : null);
  }

  /** The strip for the current line, laid out for the screen as it is. */
  private build(): void {
    this.strip?.destroy();
    this.strip = null;
    const line = this.line;
    if (!line || this.covered) return;
    const { width, height } = viewSize(this);
    const { x: cx, w, lift } = this.place(width);
    this.stripW = w;
    const h = STRIP.h;
    const left = -w / 2 + STRIP.pad;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const pic = line.spec.portrait ?? line.spec.pictures?.[0];
    let x = left;
    if (pic && this.textures.exists(pic.key)) {
      const img = this.add.image(x, 0, pic.key).setOrigin(0, 0.5);
      img.setScale(Math.min(STRIP.portrait / img.height, STRIP.portrait / img.width));
      parts.push(img);
      x += img.displayWidth + 12;
    }
    const buttonsW = STRIP.button * 3 + 22 + 24;
    const textW = w / 2 - STRIP.pad - buttonsW - x;
    parts.push(label(this, x, -h / 2 + 12, line.spec.title, 15, SEPIA, '600').setOrigin(0, 0));
    this.subtitle = prose(this, x, -h / 2 + 34, '', SUB_SIZE, textW, '#1f2a55');
    parts.push(this.subtitle);
    this.bar = this.add.graphics();
    parts.push(this.bar);
    // From the right: Read, skip, pause.
    const small = { width: STRIP.button, height: 36, size: STRIP_ICON } as const;
    const readW = STRIP.button + 22;
    const readX = w / 2 - STRIP.pad - readW / 2;
    const skipX = readX - readW / 2 - 8 - STRIP.button / 2;
    const pauseX = skipX - STRIP.button - 8;
    const pause = plaque(this, pauseX, 0, 'Pause', () => this.togglePause(), { ...small, icon: this.paused ? 'play' : 'pause' });
    this.pauseLabel = pause.list[1] as Phaser.GameObjects.Image;
    parts.push(pause);
    parts.push(plaque(this, skipX, 0, 'Skip', () => this.finish(), { ...small, icon: 'skip' }));
    parts.push(plaque(this, readX, 0, 'Read', () => this.read(), { ...small, width: readW, size: 12 }));
    this.strip = plateCard(this, cx, height - lift - h / 2, w, h, parts, 131).setDepth(10);
    this.shownChunk = -1;
    this.showProgress();
  }

  /** The subtitle for where the line is, and a thin line along the strip's foot for how far through. */
  private showProgress(): void {
    const line = this.line;
    if (!line || !this.subtitle || !this.bar || !this.strip) return;
    const spoken = Math.max(0, this.duration - line.delay);
    const i = subtitleAt(line.chunks, Math.max(0, this.at - line.delay), spoken);
    if (i !== this.shownChunk) {
      this.shownChunk = i;
      this.subtitle.setText(this.at < line.delay ? '…' : (line.chunks[i] ?? ''));
    }
    const w = this.stripW;
    const k = Phaser.Math.Clamp(this.at / this.duration, 0, 1);
    this.bar.clear().lineStyle(2, 0x1f2a55, 0.35).lineBetween(-w / 2 + STRIP.pad, STRIP.h / 2 - 8, -w / 2 + STRIP.pad + (w - STRIP.pad * 2) * k, STRIP.h / 2 - 8);
  }
}

/** The narrator, from any scene (null before it's running). */
export function narrator(scene: Phaser.Scene): NarratorScene | null {
  const n = scene.scene.get('Narrator') as NarratorScene | null;
  return n && n.sys.isActive() ? n : null;
}
