import Phaser from 'phaser';
import { VoicePlayer } from '../audio/voice';
import { getSound } from '../host';
import { hasNarration, narrationUrl } from '../narration/library';
import { lineText, LINES, type LineId } from '../narration/lines';
import { readingTime, subtitleAt, subtitles } from '../narration/subtitles';
import { upcoming } from '../narration/upcoming';
import { PixelCard } from './battle/pixelCard';
import { NarratorStrip } from './narrator/narratorStrip';
import { defaultRoom, type Box, type StripRoom } from './narrator/stripLayout';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

/** The story's next lines fetched ahead: how many, and how often (ms) it's looked at, the first time a while after start so the game loads first. */
const AHEAD = { lines: 2, every: 3000, first: 4000 } as const;
/** How long a line waits at its start for its recording to arrive before the subtitles go on at a reading pace without it, s. */
const FETCH_WAIT = 4;
/** A breath after the voice before the strip goes, s. */
const TAIL = 0.6;
/** The game event the strip's place is told on (null when it's gone), for the map to keep its status line clear of it. */
export const STRIP_EVENT = 'narrator-strip';

/** A screen that says where it has room for the strip (the map's HUD, the town). */
interface HasRoom {
  narratorRoom(): StripRoom;
}

/** The screens that say where the strip goes, the one on top first. */
const ROOMY = ['Town', 'MapHud'] as const;

/** Lines already warned about, in development, as having no recording. */
const warned = new Set<string>();

/** In development, says once when a line the narrator was asked to tell has no recording, so it's never missed. */
function warnUnrecorded(line: LineId): void {
  if (!import.meta.env.DEV || warned.has(line)) return;
  warned.add(line);
  console.warn(`Narration: no recording for "${line}" (narration/${line}.mp3): shown on its card instead`);
}

/** The line playing: its id and subtitles. */
interface Playing {
  readonly id: LineId;
  readonly chunks: readonly string[];
}

/**
 * The narrator (spec, "Narration"), over every other scene and kept
 * through scene changes, as InkMine's: story moments told aloud while play
 * goes on. One line at a time, queued, the same line never twice in the
 * queue; a strip names the speaker and shows the subtitles in time with
 * the voice, with pause, skip, and Read, which opens the full text on a
 * card. The music and effects dip under the voice, and the voice waits for
 * the browser's first click, tap or key. With narration off, nothing is
 * told or fetched: the story stays on its cards, as before.
 */
export class NarratorScene extends Phaser.Scene {
  /** The full text is open on a card from the strip: the map waits while it's read. */
  reading = false;
  private queue: LineId[] = [];
  private line: Playing | null = null;
  /** Seconds into the current line (the voice's clock while it plays, else the scene's). */
  private at = 0;
  private duration = 0;
  /** Seconds the line has waited at its start for its recording. */
  private waited = 0;
  private loading = false;
  private paused = false;
  /** Narration went off mid-line: it's on its card, and closing that ends it. */
  private carded = false;
  private buffer: AudioBuffer | null = null;
  private voicing = false;
  private voice: VoicePlayer | null = null;
  private strip: NarratorStrip | null = null;
  private card: PixelCard | null = null;
  private root!: Phaser.GameObjects.Container;
  private size = { w: 0, h: 0, k: 1 };
  private shownChunk = -1;
  private aheadIn: number = AHEAD.first;

  constructor() {
    super('Narrator');
  }

  create(): void {
    this.root = this.add.container(0, 0);
    const fit = pixelUiCamera(this, (size) => {
      this.size = size;
      this.relayout();
    });
    this.size = fit();
    const sound = getSound(this);
    if (sound) this.voice = new VoicePlayer(sound);
    const off = sound?.onSwitch((kind) => kind === 'narration' && this.heard());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off?.());
  }

  /** Whether the narrator can be heard: narration on, in a browser that can play it. */
  private get audible(): boolean {
    const sound = getSound(this);
    return !!sound?.canSpeak && sound.isOn('narration');
  }

  /**
   * Tells line `id` in the strip, after whatever's playing, while play goes
   * on. False when it can't (narration off, or the line not recorded): the
   * caller shows the story on its card instead.
   */
  say(id: LineId): boolean {
    if (!this.audible) return false;
    if (!hasNarration(id)) {
      warnUnrecorded(id);
      return false;
    }
    if (this.line?.id !== id && !this.queue.includes(id)) this.queue = [...this.queue, id];
    return true;
  }

  /** Stops everything: the voice, the strip, the queue. */
  clear(): void {
    this.queue = [];
    this.finish();
  }

  update(_time: number, delta: number): void {
    this.keepOnTop();
    this.lookAhead(delta);
    if (!this.line) {
      const [next, ...rest] = this.queue;
      if (next) {
        this.queue = rest;
        this.begin(next);
      }
      return;
    }
    if (this.carded) return;
    this.advance(delta / 1000);
    if (this.at >= this.duration) {
      this.finish();
      return;
    }
    this.showProgress();
  }

  /** The strip stays over every screen, and over the cards (so pause, skip and Read can be reached while a part's brief is open). */
  private keepOnTop(): void {
    const all = this.game.scene.getScenes(false);
    if (all[all.length - 1] !== this) this.scene.bringToTop();
  }

  /** Moves the line on: by the voice while it plays; while its recording is on its way, not at all for a moment; never before the browser lets sound start. */
  private advance(dt: number): void {
    const line = this.line;
    if (!line || this.paused || this.reading || document.hidden || getSound(this)?.waitingForGesture) return;
    if (!this.buffer && this.loading && this.waited < FETCH_WAIT) {
      this.waited += dt;
      return;
    }
    const heard = this.voicing ? this.voice?.position ?? null : null;
    this.at = heard ?? this.at + dt;
    if (this.buffer && !this.voicing && this.at < this.buffer.duration) this.startVoice();
  }

  /** Fetches the story's next lines, so their voice is there when they come. */
  private lookAhead(delta: number): void {
    this.aheadIn -= delta;
    if (this.aheadIn > 0) return;
    this.aheadIn = AHEAD.every;
    const session = Session.peek(this);
    if (!session || !this.audible) return;
    for (const line of upcoming(session.adv, AHEAD.lines)) {
      if (hasNarration(line)) void narrationUrl(line)?.then((url) => this.voice?.prefetch(url));
    }
  }

  /** Narration switched: off, what's being told goes on its card; on, the next lines are fetched. */
  private heard(): void {
    if (this.audible) {
      this.aheadIn = 0;
      return;
    }
    this.stopVoice();
    if (this.line) this.toCard(this.line);
  }

  private begin(id: LineId): void {
    const line: Playing = { id, chunks: subtitles(lineText(id)) };
    this.line = line;
    this.at = 0;
    this.waited = 0;
    this.paused = false;
    this.buffer = null;
    this.voicing = false;
    this.shownChunk = -1;
    this.duration = readingTime(lineText(id));
    // Queued before narration went off: its card, and nothing fetched.
    if (!this.audible) {
      this.toCard(line);
      return;
    }
    this.build();
    const url = narrationUrl(id);
    this.loading = !!url && !!this.voice;
    void url?.then((u) => this.voice?.load(u) ?? null).then((buffer) => {
      if (this.line !== line) return;
      this.loading = false;
      if (!buffer) return;
      this.buffer = buffer;
      this.duration = buffer.duration + TAIL;
    });
  }

  private startVoice(): void {
    if (!this.buffer || !this.voice) return;
    this.voicing = this.voice.play(this.buffer, this.at);
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
    this.loading = false;
    this.strip?.destroy();
    this.strip = null;
    this.game.events.emit(STRIP_EVENT, null);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) this.stopVoice();
    this.strip?.setPaused(this.paused);
  }

  /** The full text, from the strip's Read: the map waits while it's open, and so does the voice. */
  private read(): void {
    const line = this.line;
    if (!line || this.reading) return;
    this.stopVoice();
    this.strip?.setVisible(false);
    this.openCard(line, () => {
      if (this.line !== line) return;
      if (this.carded) this.finish();
      else this.strip?.setVisible(true);
    });
  }

  /** The line on its card, as when there's no narration: closing it ends the line. */
  private toCard(line: Playing): void {
    this.carded = true;
    this.strip?.destroy();
    this.strip = null;
    this.game.events.emit(STRIP_EVENT, null);
    // Open from Read already: closing that ends it.
    if (this.reading) return;
    this.openCard(line, () => {
      if (this.line === line) this.finish();
    });
  }

  /** A card with the line's title and words over everything, with one button to close it. */
  private openCard(line: Playing, onClose: () => void): void {
    this.reading = true;
    const spec = { title: LINES[line.id].title, body: lineText(line.id), buttons: [{ label: 'On we go', onClick: () => undefined }] };
    const close = (): void => {
      this.card = null;
      this.reading = false;
      onClose();
    };
    this.card = new PixelCard(this, this.root, spec, this.size, close);
    // Redrawn at a new size, the same card, answered the same way.
    this.redrawCard = () => {
      this.card?.dispose();
      this.card = new PixelCard(this, this.root, spec, this.size, close, true);
    };
  }

  private redrawCard: (() => void) | null = null;

  /** Where the strip goes on the screen showing now. */
  private room(): StripRoom {
    // Over a card (centred, the screen dimmed under it), at the foot, where it covers the card least.
    if (this.scene.isActive('Card')) {
      const hud = this.scene.get('MapHud') as (Phaser.Scene & HasRoom) | null;
      const map = hud?.sys.isActive() ? hud.narratorRoom() : null;
      return map?.from === 'bottom' ? map : { x: 4, w: this.size.w - 8, y: this.size.h - 2, from: 'bottom' };
    }
    for (const key of ROOMY) {
      const s = this.scene.get(key) as (Phaser.Scene & Partial<HasRoom>) | null;
      if (s?.sys.isActive() && s.narratorRoom) return s.narratorRoom();
    }
    return defaultRoom(this.size);
  }

  /** The strip for the current line. */
  private build(): void {
    const line = this.line;
    if (!line) return;
    this.strip?.destroy();
    const { speaker, title } = LINES[line.id];
    this.strip = new NarratorStrip(this, this.room(), speaker, title, { pause: () => this.togglePause(), skip: () => this.finish(), read: () => this.read() });
    this.root.addAt(this.strip.root, 0);
    this.strip.setPaused(this.paused);
    this.strip.setVisible(!this.reading);
    this.shownChunk = -1;
    this.showProgress();
    this.game.events.emit(STRIP_EVENT, this.strip.bounds);
  }

  /** After a resize: the strip in its new place, the card redrawn. */
  private relayout(): void {
    if (this.reading) this.redrawCard?.();
    if (this.strip) this.placeStrip();
  }

  /** The strip in the room the screen under it has now (it changes with the screen: the map, a town). */
  private placeStrip(): void {
    if (!this.strip) return;
    const before = this.strip.bounds;
    this.strip.layout(this.room());
    const now = this.strip.bounds;
    if (!sameBox(before, now)) this.game.events.emit(STRIP_EVENT, now);
  }

  /** The subtitle for where the line is, and the line along the strip's foot for how far through. */
  private showProgress(): void {
    const line = this.line;
    if (!line || !this.strip) return;
    this.placeStrip();
    const i = subtitleAt(line.chunks, this.at, this.duration - (this.buffer ? TAIL : 0));
    if (i !== this.shownChunk) {
      this.shownChunk = i;
      this.strip.setSubtitle(line.chunks[i] ?? '');
    }
    this.strip.setProgress(this.at / this.duration);
  }

  /** Where the strip is, for a screen to keep clear of (null with none showing). */
  get stripBounds(): Box | null {
    return this.strip && !this.reading ? this.strip.bounds : null;
  }
}

const sameBox = (a: Box, b: Box): boolean => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** The narrator, from any scene (null before it's running, or in a game without one). */
export function narrator(scene: Phaser.Scene): NarratorScene | null {
  const n = scene.scene.get('Narrator') as NarratorScene | null;
  return n?.sys.isActive() ? n : null;
}

/** Whether the narrator's card is open over the screen (the map waits while it is). */
export const narratorReading = (scene: Phaser.Scene): boolean => !!narrator(scene)?.reading;
