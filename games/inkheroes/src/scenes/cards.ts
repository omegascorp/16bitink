import type Phaser from 'phaser';
import { nextMap } from '../level/maps';
import { answerPrompt, ourHeroes, playerTowns, type Adventure } from '../logic/adventure';
import { getHost } from '../host';
import { partDays } from '../logic/chapter';
import { PRIMARY_NAMES } from '../logic/hero';
import { RANK_NAMES, SKILLS } from '../logic/skills';
import { has, type Town } from '../logic/town';
import { UI_TEX } from './battle/pixelUi';
import { openCard, type CardSpec } from './CardScene';
import { narrator } from './NarratorScene';
import { Session } from './session';
import { isLineId, lineText } from '../narration/lines';

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
    // Told aloud, the story plays in the narrator's strip while play goes on: a part's opening keeps a short card (its brief and goal), the rest none.
    const told = isLineId(first.line) && !!narrator(scene)?.say(first.line);
    if (told && first.brief === undefined) {
      next();
      return;
    }
    openCard(scene, { title: first.title, body: told ? first.brief! : first.text, picture: first.item ? UI_TEX.item(first.item) : undefined, report: first.report, buttons: [{ label: 'On we go', onClick: () => next() }] });
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
          return { label: `${RANK_NAMES[rank]} ${SKILLS[id].name}`, note: SKILLS[id].says(SKILLS[id].values[rank - 1]!), picture: UI_TEX.skill(id), kind: 'crown' as const, onClick: () => next(id) };
        })
        : [{ label: 'On we go', onClick: () => next() }],
    });
    return;
  }
  if (adv.status === 'won') {
    const next = nextMap(session.def);
    const days = partDays(adv);
    // Otherwise the land opens further and the hero rides on; after the last part built, the chapter's own card.
    const end = next ? `\nThe road goes on: ${next.name} lies ahead.` : '';
    openCard(scene, {
      title: 'Victory!',
      body: `${session.def.goal.text[0]!.toUpperCase()}${session.def.goal.text.slice(1)}: done in ${days} ${days === 1 ? 'day' : 'days'}${adv.lostStacks === 0 ? ', and not one company lost' : ''}.${end}`,
      // One way on: from the next part the map's own menu still leads back to the campaign.
      buttons: [next
        ? { label: `Ride on to ${next.name}`, onClick: () => rideOnward(scene, session) }
        : { label: 'On we go', onClick: () => openCard(scene, chapterDoneCard(scene, session)) }],
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

/** The hero is about to storm walls with no war machine: what it's for, where to get one, and what going without costs. */
export function wallsCard(town: Town, adv: Adventure, storm: () => void): CardSpec {
  const smith = playerTowns(adv).find((t) => has(t, 'blacksmith'));
  const buy = smith ? `The Blacksmith in ${smith.name} sells them.` : 'Build a Blacksmith in a town of yours to buy one.';
  return {
    title: `The walls of ${town.name}`,
    body: `Walls stop your army, and only a war machine can break them. A Catapult rides with you as gear and brings them down. ${buy}\nWithout one, your troops must hack through the gate by hand, under fire.`,
    picture: UI_TEX.item('catapult'),
    buttons: [
      { label: 'Not yet', kind: 'crown', onClick: () => undefined },
      { label: 'Storm it now', kind: 'plain', onClick: storm },
    ],
  };
}

/**
 * The end of everything built so far: the chapter's ending (told by the
 * narrator, or read here), how the whole march went, and what comes next,
 * so finishing the early access reads as an ending, not a dead end.
 */
function chapterDoneCard(scene: Phaser.Scene, session: Session): CardSpec {
  const adv = session.adv;
  const told = !!narrator(scene)?.say('chapter-won');
  const towns = playerTowns(adv).length;
  const heroes = ourHeroes(adv).length;
  const march = `${adv.day} days on the march, ${towns} ${towns === 1 ? 'town' : 'towns'} under your banner, ${heroes === 1 ? 'one hero' : `${heroes} heroes`} riding.`;
  return {
    title: 'Chapter 1 complete',
    body: [
      ...(told ? [] : [lineText('chapter-won')]),
      march,
      'That is all of InkHeroes for now: the game is in early access. Chapter 2 crosses to a new land with a new people, their own heroes, troops and way of taking walls. It is being made now.',
      'Thank you for playing!',
    ].join('\n\n'),
    buttons: [
      { label: 'Back to the campaign', kind: 'crown', onClick: () => toMenu(scene, session, null) },
      { label: 'More games', kind: 'plain', onClick: () => getHost(scene).onExit() },
    ],
  };
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
