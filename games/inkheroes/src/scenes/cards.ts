import type Phaser from 'phaser';
import { answerPrompt } from '../logic/adventure';
import { PRIMARY_NAMES } from '../logic/hero';
import { blotsFor } from '../logic/save';
import { RANK_NAMES, SKILLS } from '../logic/skills';
import { openCard } from './CardScene';
import type { Session } from './session';

/**
 * The cards the map shows from the adventure's state: its waiting prompts
 * (messages, chests, level-ups), then victory or defeat.
 */
export function openPrompt(scene: Phaser.Scene & { showPrompts(): void }, session: Session): void {
  const adv = session.adv;
  const next = (choice?: Parameters<typeof answerPrompt>[1]): void => {
    session.set(answerPrompt(session.adv, choice));
    scene.showPrompts();
  };
  const first = adv.prompts[0];
  if (first?.kind === 'message') {
    openCard(scene, { title: first.title, body: first.text, buttons: [{ label: 'On we go', onClick: () => next() }] });
    return;
  }
  if (first?.kind === 'chest') {
    openCard(scene, {
      title: 'Treasure Chest',
      body: 'An old iron-bound chest, full of coin. Keep the gold, or give it to the villages along the road and learn from their stories?',
      buttons: [
        { label: `Keep ${first.gold} gold`, onClick: () => next('gold') },
        { label: `Take ${first.xp} experience`, kind: 'sky', onClick: () => next('xp') },
      ],
    });
    return;
  }
  if (first?.kind === 'levelUp') {
    const o = first.offer;
    const hero = adv.hero;
    openCard(scene, {
      title: `${hero.name} reaches level ${o.level}`,
      body: `+1 ${PRIMARY_NAMES[o.primary]}${o.choices.length ? '\nChoose a skill to learn:' : ''}`,
      buttons: o.choices.length
        ? o.choices.map((id, i) => {
          const rank = (hero.skills[id] ?? 0) + 1;
          return { label: `${RANK_NAMES[rank]} ${SKILLS[id].name}`, note: SKILLS[id].says(SKILLS[id].values[rank - 1]!), kind: i === 0 ? 'leaf' as const : 'sky' as const, onClick: () => next(id) };
        })
        : [{ label: 'On we go', onClick: () => next() }],
    });
    return;
  }
  if (adv.status === 'won') {
    const blots = blotsFor(adv.day, session.def.parDays, adv.lostStacks);
    openCard(scene, {
      title: 'Victory!',
      body: `${session.def.goal.text[0]!.toUpperCase()}${session.def.goal.text.slice(1)}: done, on day ${adv.day}.\n${adv.day <= session.def.parDays ? 'Within the par of ' : 'Par was '}${session.def.parDays} days${adv.lostStacks === 0 ? ', and not one company lost.' : '.'}`,
      blots,
      buttons: [{ label: 'Back to the campaign', onClick: () => toMenu(scene, session, null) }],
    });
    return;
  }
  if (adv.status === 'lost') {
    openCard(scene, {
      title: 'Defeat',
      body: `${adv.hero.name}'s army has been beaten. Try this day again with a different plan?`,
      buttons: [
        { label: 'Replay the day', onClick: () => {
          session.replayDay();
          scene.scene.restart();
        } },
        { label: 'Back to the campaign', kind: 'paper', onClick: () => toMenu(scene, session, 'lose') },
      ],
    });
  }
}

/** Leaves the map for the campaign menu. */
export function toMenu(scene: Phaser.Scene, session: Session, result: 'lose' | 'quit' | null): void {
  if (result) session.abandon(scene, result);
  for (const key of ['Map', 'MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  scene.scene.start('Menu');
}
