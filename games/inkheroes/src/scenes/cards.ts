import type Phaser from 'phaser';
import { nextMap } from '../level/maps';
import { answerPrompt, playerTowns } from '../logic/adventure';
import { partDays } from '../logic/chapter';
import { PRIMARY_NAMES } from '../logic/hero';
import { blotsFor } from '../logic/save';
import { RANK_NAMES, SKILLS } from '../logic/skills';
import { UI_TEX } from './battle/pixelUi';
import { openCard } from './CardScene';
import { Session } from './session';

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
    openCard(scene, { title: first.title, body: first.text, picture: first.item ? UI_TEX.item(first.item) : undefined, buttons: [{ label: 'On we go', onClick: () => next() }] });
    return;
  }
  if (first?.kind === 'chest') {
    openCard(scene, {
      title: 'Treasure Chest',
      body: 'An old iron-bound chest, full of coin. Keep the gold, or give it to the villages along the road and learn from their stories?',
      buttons: [
        { label: `Keep ${first.gold} gold`, kind: 'crown', onClick: () => next('gold') },
        { label: `Take ${first.xp} experience`, kind: 'crown', onClick: () => next('xp') },
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
          return { label: `${RANK_NAMES[rank]} ${SKILLS[id].name}`, note: SKILLS[id].says(SKILLS[id].values[rank - 1]!), kind: 'crown' as const, onClick: () => next(id) };
        })
        : [{ label: 'On we go', onClick: () => next() }],
    });
    return;
  }
  if (adv.status === 'won') {
    const next = nextMap(session.def);
    const days = partDays(adv);
    const blots = blotsFor(days, session.def.parDays, adv.lostStacks);
    // The last part built: the chapter is done. Otherwise the land opens further and the hero rides on.
    const end = next ? `\nThe road goes on: ${next.name} lies ahead.` : '\nThe Border March is won: that is the end of chapter 1.';
    openCard(scene, {
      title: 'Victory!',
      body: `${session.def.goal.text[0]!.toUpperCase()}${session.def.goal.text.slice(1)}: done in ${days} ${days === 1 ? 'day' : 'days'}.\n${days <= session.def.parDays ? 'Within the par of ' : 'Par was '}${session.def.parDays} days${adv.lostStacks === 0 ? ', and not one company lost.' : '.'}${end}`,
      blots,
      // One way on: from the next part the map's own menu still leads back to the campaign.
      buttons: [next
        ? { label: `Ride on to ${next.name}`, onClick: () => rideOnward(scene, session) }
        : { label: 'Back to the campaign', onClick: () => toMenu(scene, session, null) }],
    });
    return;
  }
  if (adv.status === 'lost') {
    openCard(scene, {
      title: 'Defeat',
      body: `${playerTowns(adv).length ? `${adv.hero.name}'s army has been beaten.` : 'Your last town has fallen.'} Try this day again with a different plan?`,
      buttons: [
        { label: 'Replay the day', onClick: () => {
          session.replayDay();
          scene.scene.restart();
        } },
        { label: 'Back to the campaign', kind: 'plain', onClick: () => toMenu(scene, session, 'lose') },
      ],
    });
  }
}

/** The part won, the land opens further and the hero rides straight on. */
function rideOnward(scene: Phaser.Scene, session: Session): void {
  for (const key of ['MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  session.rideOn(scene);
  scene.scene.start('Map');
}

/** Leaves the map for the campaign menu (the game is kept: a lost day comes back to its morning). */
export function toMenu(scene: Phaser.Scene, session: Session, result: 'lose' | null): void {
  if (result) session.leaveLost(scene);
  for (const key of ['Map', 'MapHud', 'Card', 'Town', 'Battle']) if (key !== scene.scene.key) scene.scene.stop(key);
  scene.scene.start('Menu');
}
