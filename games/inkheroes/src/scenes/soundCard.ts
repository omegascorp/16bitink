import type { SoundKind } from '../audio/soundSettings';
import type { CardButton, CardSpec } from './CardScene';

export type SoundSwitches = { isOn(kind: SoundKind): boolean; setOn(kind: SoundKind, on: boolean): void };

/** The little button that opens the card, in a corner of the screens without a menu. */
export const SOUND_BTN = { w: 44, h: 22, margin: 4 } as const;

const NAMES: Readonly<Record<SoundKind, string>> = { music: 'Music', effects: 'Effects', narration: 'Narration' };

/** The sound switches as a card, shown by `open`. A switch brings the card straight back, so all of them can be set in one go. */
export function soundCard(sound: SoundSwitches, open: (spec: CardSpec) => void): void {
  const flip = (kind: SoundKind): CardButton => {
    const on = sound.isOn(kind);
    return {
      label: `${NAMES[kind]}: ${on ? 'on' : 'off'}`,
      kind: on ? 'crown' : 'plain',
      onClick: () => {
        sound.setOn(kind, !on);
        soundCard(sound, open);
      },
    };
  };
  open({
    title: 'Sound',
    body: 'Narration off: the story is told on cards instead. Your choice is kept for next time.',
    buttons: [flip('music'), flip('effects'), flip('narration'), { label: 'Done', kind: 'primary', onClick: () => undefined }],
  });
}
