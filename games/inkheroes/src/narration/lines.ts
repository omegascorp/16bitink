/**
 * The narrator's lines (spec, "Narration"): each story moment that's told
 * aloud has an id, and here, in one place, the script the voice reads,
 * with its ElevenLabs v4 delivery tags in brackets. The subtitles (and the
 * card the story falls back to) are the script with the tags taken out.
 * The recording of line `id` is narration/<id>.mp3; narration/lines.json
 * keeps what each recording said, so a script changed since is caught by
 * test/narration.test.ts. Pure: no Phaser, no audio.
 */

export type LineId =
  | 'part-ashford'
  | 'part-thornwood'
  | 'part-blackBanner'
  | 'eudora-joins'
  | 'eudora-lost'
  | 'kassander-flees'
  | 'korax-taken'
  | 'kassander-beaten'
  | 'chapter-won'
  | 'part-nekhen'
  | 'part-abu'
  | 'abu-won'
  | 'part-redLand'
  | 'twoLands-won';

export interface NarratedLine {
  /** Who's speaking, named on the strip. */
  readonly speaker: string;
  /** The story card's title, for Read and for the card it falls back to. */
  readonly title: string;
  /** What the voice reads: the words with their delivery tags, as ElevenLabs v4 takes them. */
  readonly script: string;
}

const NARRATOR_NAME = 'Narrator';

const told = (title: string, script: string): NarratedLine => ({ speaker: NARRATOR_NAME, title, script });

/**
 * Every narrated line, hand-written for the voice: lively tags, "!" and
 * "…", a change of mood every sentence or two, never [whispers].
 * part-blackBanner was recorded first (Nov 8, 2026): keep its script word
 * for word, or record it again.
 */
export const LINES: Readonly<Record<LineId, NarratedLine>> = {
  'part-ashford': told('Ashford', '[warm, storytelling] Ogres have taken the old bridge on the north road… and no cart has crossed it in a week. [proud] Ashford is small, but its people are stubborn! [resolute] Hold the town, raise an army… and clear that bridge.'),
  'part-thornwood': told('Thornwood', "[relieved] The ogres are gone, and the old bridge is open again! [storytelling] The north road runs on east… into Thornwood forest. [grim] Across the next river, brigands and their cyclops chief have taken the timber town. Take it back from its garrison, and its dwellings are yours. [intrigued] Near the road, a spellbook lies on a marble altar… guarded by Stymphalian birds. Win it, and magic is yours. [warm] And this land is too wide for one rider. Ianthe, a priestess of Athena, waits at your Tavern. Hire her… and she'll hold the roads behind you."),
  'part-blackBanner': told('The Black Banner', "[grand, storytelling] Thornwood is free… and its foresters show Rowan an old trail, south, down through the trees. [mysterious] Somewhere below, a town called Eudora still keeps its gates shut against the Black Banner. [ominous] Kassander of Korax flies that banner, a red raven on black, and he serves no crown. [urgent] His riders want Eudora too. Get there first… or you'll be storming its walls! [wry] Beat him in the field, and he simply runs home and hires again. [resolute] So take Korax… then hunt him down!"),
  'eudora-joins': told('Eudora opens its gates', "[joyful] Eudora's gates swing open! [warm] It held out against the Black Banner all this time… and now its walls, its garrison and its dwellings are yours."),
  'eudora-lost': told('Eudora has fallen', "[dismayed] Too late… Kassander's riders reached Eudora first. [bitter] The red raven flies over its walls now. [determined] Take it back from him!"),
  'kassander-flees': told('Kassander flees', "[scornful] Kassander turns his horse and runs! [wry] He's left his whole army on the field… [warning] but he'll hire another at home. Take his town, and he'll have nowhere left to run."),
  'korax-taken': told('Korax is yours', '[triumphant] Korax is yours! [eager] Kassander has no town left to run to… and your scouts are on his trail. Hunt him down!'),
  'kassander-beaten': told('Kassander is beaten', "[triumphant] Kassander falls! [solemn] The black banner is down… and it won't rise again."),
  'chapter-won': told('The Border March is free', "[warm, proud] The Border March is free! [storytelling] From Ashford's bridge to the walls of Korax, the Crown's roads are open again… [hopeful] and Rowan's name is known in every town along them."),
  'part-nekhen': told('Nekhen', "[grand, storytelling] Far to the south, where the Nile runs between two deserts, the flood is late this year. [ominous] The great sluice of the canal is shut… and the Petsuchos lies across it, the temple's own crocodile, gone wild, with its brood. [warm] Neferet, priestess of Isis, holds Nekhen on the west bank. Her rites can curse a foe, ward a friend… [hopeful] and, with an Ankh, raise the fallen! [resolute] Cross the river… and take the sluice back."),
  'part-abu': told('Abu', "[triumphant] The sluice is open, and the flood comes at last! [storytelling] Up the river road, at the First Cataract, the Nile breaks white over black granite… [grim] and Sand Raiders hold Abu, the island fort at the kingdom's southern gate. [sly] Its walls are high… but Egypt's builders don't break walls. They raise ramps against them! [resolute] Buy an Earth Ramp at your Workshop, choose your stretch of wall… and march straight up it. [warm] And Paser, a chariot captain, waits at your Tavern."),
  'abu-won': told('The southern gate', "[triumphant] Abu is ours again, and the raiders scatter into the desert! [joyful] Boats run down from the cataract once more, heavy with granite and gold… [warm] Neferet watches the sunset from the island's walls. [ominous] But out in the Red Land, a lord with no love for Isis has heard the news… and he is calling his chariots."),
  'part-redLand': told('The Red Land', "[grand, storytelling] Beyond the river lies Deshret, the Red Land… Set's own desert, where nothing green grows. [ominous] There Sethi, a lord who serves Set, has raised his red banner over Nubt, the city of gold! [grim] He rides with our own chariots and our own ramps… and he means to rule both lands. [urgent] Halfway across the sand, the caravan town of Gebtu still holds out. Whoever beats its garrison first holds the gold roads! [wry] And mind the sky: every few days, Set sends a storm. [resolute] Take Nubt… and bring Sethi down!"),
  'twoLands-won': told('The Two Lands are one', "[triumphant] Sethi falls, and his red banner falls with him! [solemn] The Red Land and the Black Land answer to one crown now… [joyful] the Two Lands are one! [warm] From Nekhen's sluice to the gold of Nubt, the Nile runs free… [hopeful] and Neferet's name is sung on every boat that sails it."),
};

/** Chapter 1's places and people the lines name: a line is told only where its words are true. */
export const CHAPTER1 = { eudora: 'eudora-town', korax: 'korax-town', kassander: 'kassander' } as const;
/** Chapter 2's rival lord, his city and the town both race for (part 6, the Red Land). */
export const CHAPTER2 = { redLand: 'red-land', sethi: 'sethi', nubt: 'nubt-town', gebtu: 'gebtu-town' } as const;

/**
 * Set's sandstorms (part 6, `MapDef.stormEvery`): the day card's words the
 * morning before a storm, and on its day. Read, not told: no recording.
 */
export const STORM_WORDS = {
  rising: 'A storm is rising in the east! Tomorrow Set’s sand will cost double to cross… but the roads will hold.',
  blowing: 'Set’s storm howls across the desert! Every step on sand costs double today. Keep to the roads!',
} as const;

export const LINE_IDS = Object.keys(LINES) as LineId[];

export const isLineId = (x: unknown): x is LineId => typeof x === 'string' && Object.hasOwn(LINES, x);

/** The tags in a script: `[warm, storytelling]` and the like. */
const TAG = /\[[^\]]*\]/g;

/** A script's delivery tags, each as written inside its brackets. */
export const tagsOf = (script: string): string[] => [...script.matchAll(TAG)].map((m) => m[0].slice(1, -1));

/** What a script says: its words with the tags taken out, as the subtitles and the card show them. */
export const spoken = (script: string): string => script.replace(TAG, ' ').replace(/\s+/g, ' ').trim();

/** The words of line `id`. */
export const lineText = (id: LineId): string => spoken(LINES[id].script);

/** A story card's text and line, for a prompt that's told aloud. */
export const narrated = (id: LineId): { readonly text: string; readonly line: LineId } => ({ text: lineText(id), line: id });
