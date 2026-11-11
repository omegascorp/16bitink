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
  | 'blackBanner-won'
  | 'part-othrys'
  | 'othrys-won'
  | 'chapter-won'
  | 'part-nekhen'
  | 'part-abu'
  | 'abu-won'
  | 'part-redLand'
  | 'redLand-won'
  | 'part-delta'
  | 'twoLands-won'
  | 'part-hladir'
  | 'hrimgrimnir'
  | 'hladir-won'
  | 'part-uppsala'
  | 'uppsala-joins'
  | 'aun'
  | 'uppsala-won'
  | 'part-bloodaxe'
  | 'eirik'
  | 'kaupang-lost'
  | 'eirik-flees'
  | 'bloodaxe-won'
  | 'part-halogaland'
  | 'gunnhild'
  | 'eirik-returns'
  | 'skoll'
  | 'tyrfing'
  | 'longWinter-won';

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
  'blackBanner-won': told('The Black Banner falls', "[triumphant] The black banner is down, and Korax opens its gates to the Crown! [puzzled] But in Kassander's tent, Rowan's scouts find letters… sealed with a wolf's head. [ominous] Kassander served a master. [grim] Lykaon, the wolf-king of Arcadia, has woken the old faith of the Titans… [urgent] and he rides for Mount Othrys!"),
  'part-othrys': told('Othrys', "[grand, storytelling] South of the Border March rises Mount Othrys, where the Titans sat before the gods were born… [awed] and on its summit their forge still burns! [ominous] Lykaon of Lykosoura wants it: whoever holds the forge has the Titans' oath. [warning] He is no Kassander. He scouts, he hires more heroes, he waits for his moment… and he builds toward the Titans' own spire. [wry] Three roads lead in, by the ford, the coast or the mountain pass: none of them is easy. [resolute] Take his towns, beat the wolf-king himself… and finish your city before he finishes his!"),
  'othrys-won': told('The Titans’ oath', "[triumphant] Lykaon falls, and the wolf banners fall from Lykosoura's walls! [solemn] On Othrys the forge burns on… [awed] and the Titans' oath passes to Rowan, the Crown's champion. [warm] For the first time in an age, the old giants and the young gods stand on one side."),
  'chapter-won': told('The Border March is free', "[warm, proud] The Border March is free! [storytelling] From Ashford's bridge to the walls of Korax, the Crown's roads are open again… [hopeful] and Rowan's name is known in every town along them."),
  'part-nekhen': told('Nekhen', "[grand, storytelling] Far to the south, where the Nile runs between two deserts, the flood is late this year. [ominous] The great sluice of the canal is shut… and the Petsuchos lies across it, the temple's own crocodile, gone wild, with its brood. [warm] Neferet, priestess of Isis, holds Nekhen on the west bank. Her rites can curse a foe, ward a friend… [hopeful] and, with an Ankh, raise the fallen! [resolute] Cross the river… and take the sluice back."),
  'part-abu': told('Abu', "[triumphant] The sluice is open, and the flood comes at last! [storytelling] Up the river road, at the First Cataract, the Nile breaks white over black granite… [grim] and Sand Raiders hold Abu, the island fort at the kingdom's southern gate. [sly] Its walls are high… but Egypt's builders don't break walls. They raise ramps against them! [resolute] Buy an Earth Ramp at your Workshop, choose your stretch of wall… and march straight up it. [warm] And Paser, a chariot captain, waits at your Tavern."),
  'abu-won': told('The southern gate', "[triumphant] Abu is ours again, and the raiders scatter into the desert! [joyful] Boats run down from the cataract once more, heavy with granite and gold… [warm] Neferet watches the sunset from the island's walls. [ominous] But out in the Red Land, a lord with no love for Isis has heard the news… and he is calling his chariots."),
  'part-redLand': told('The Red Land', "[grand, storytelling] Beyond the river lies Deshret, the Red Land… Set's own desert, where nothing green grows. [ominous] There Sethi, a lord who serves Set, has raised his red banner over Nubt, the city of gold! [grim] He rides with our own chariots and our own ramps… and he means to rule both lands. [urgent] Halfway across the sand, the caravan town of Gebtu still holds out. Whoever beats its garrison first holds the gold roads! [wry] And mind the sky: every few days, Set sends a storm. [resolute] Take Nubt… and bring Sethi down!"),
  'redLand-won': told('Set’s banner falls', "[triumphant] Sethi falls, and Set's red banner comes down over Nubt! [joyful] The south is one at last… [uneasy] but a boat comes up the river with bad news. [grim] In the north a foreign king holds the Delta: Apepi of Avaris, who took the name of the serpent of chaos! [urgent] And he rides for Iunu, the city of the sun."),
  'part-delta': told('The Delta', "[grand, storytelling] North of the Red Land the Nile spreads into a thousand channels… the Delta, green and wide, all the way to the sea. [ominous] There Apepi, a king of the Hyksos, rules from Avaris. His people came over Sinai with horses and took Egypt's gods as their own! [awed] He rides for Iunu, where the Benben stone stands, the hill the Bennu first landed on. Whoever holds it has the Bennu's flight! [warning] He scouts, he hires captains, he waits for his moment… [wry] Three ways lead in, by the White Walls, the north wadi or the desert road behind Nubt: none of them is easy. [resolute] Take Avaris and Per-Bastet… and bring the serpent-king down!"),
  'twoLands-won': told('The Two Lands are one', "[triumphant] Apepi falls, and the serpent banners fall from the walls of Avaris! [solemn] The Hyksos ride back over Sinai… [joyful] and from the cataract to the sea, the Two Lands are one! [awed] Over Iunu the Bennu wheels in the morning light. [warm] From Nekhen's sluice to the marshes of the Delta, the Nile runs free… [hopeful] and Neferet's name is sung on every boat that sails it."),
  'part-hladir': told('Hladir', "[grand, storytelling] It is the third winter with no summer… the Fimbulwinter, the great winter before the end of the world. [grim] The fjord is frozen, the ships can't sail, and the steadings are starving. [ominous] At the fjord's mouth the frost giant Hrimgrimnir sits on the ice with his wolves… and no ship has passed him in three winters. [proud] But Hladir has a shieldmaiden! Hervor, whose father and his eleven brothers were berserkers. [wry] Wound a berserker, and he only hits harder… [resolute] Raise the hall's warriors, and drive the giant off the ice!"),
  'hrimgrimnir': told('Hrimgrimnir', "[ominous] There, out on the ice… Hrimgrimnir! [awed] Tall as a mast, with frost in his beard, and he answers every blow that's struck at him. [grim] His wolves circle, hungry. [eager] Good! Let him strike the berserkers… every wound only makes them angrier!"),
  'hladir-won': told('The ice breaks', "[triumphant] Hrimgrimnir falls, and the ice at the fjord's mouth cracks like thunder! [joyful] The longships can sail again, and Hladir eats tonight. [uneasy] But the sun still won't climb above the hills… [mysterious] and the winter isn't ending. [resolute] Over the mountains, the great temple at Uppsala keeps the old lore. Hervor rides south to ask who is keeping the sun away!"),
  'part-uppsala': told('Uppsala', "[grand, storytelling] Over the mountains, the road runs down to Uppsala, where the old kings sleep in their mounds… [ominous] but they sleep no longer! The mounds have opened, and the dead walk the snow. [grim] At the great temple, Barrow Kings hold the gate, and Aun the Old holds the steps. [intrigued] On the temple's altar lies a rune staff. Win it, and Hervor can carve the runes: Tyr's rune makes a company fiercer with every man it loses! [warm] Uppsala's ring fort still holds out… and Heid the volva is there. [resolute] Take the staff, and free the temple!"),
  'uppsala-joins': told('Uppsala opens its gates', "[relieved] Uppsala's gates swing open, and its people come out to meet Hervor! [mysterious] In the hall sits Heid, the volva, her staff across her knees. She has read the winter in the bones and the stars… [shocked] and it isn't the gods' doing at all! [ominous] Someone is singing it. A song of sorcery, sung in the far north, night after night… [resolute] Hire Heid at your Tavern, and she'll ride with you to find the singer."),
  'aun': told('Aun the Old', "[ominous] There, on the temple's steps… Aun the Old! [disgusted] He gave Odin nine of his own sons, one every ten years, to buy himself more life… [grim] and even death couldn't make him let go. [uneasy] The dead of all three mounds stand with him. [eager] Carve a rune on your army first… then send them up those steps!"),
  'uppsala-won': told('The temple is free', "[triumphant] Aun the Old falls, and the dead lie down in their mounds again! [solemn] Smoke rises from the temple's fire for the first time in three winters… [uneasy] but a rider comes up the frozen road with bad news. [grim] At Avaldsnes, on the western sea, Eirik Bloodaxe has raised his banner: the king who killed his own brothers for the crown! [urgent] The starving jarls kneel to him one by one… and he means to be king of the whole hungry land."),
  'part-bloodaxe': told('The Bloodaxe', "[grand, storytelling] South over the fells, the land runs down to the western sea… [grim] and there, at Avaldsnes, Eirik Bloodaxe has raised his banner! The king who killed his own brothers for the crown. [ominous] The starving jarls kneel to him one by one… [urgent] On the frozen bay in the east lies Kaupang, the market town, with the last grain ships of the north. He wants them. Get there first… or you'll be fighting him for every sack of grain! [sly] His ring fort has walls of timber and earth… but a Norse army doesn't climb walls. It breaks the gate! [resolute] Buy a Ram at Kaupang's Shipwright, take Avaldsnes… and bring the Bloodaxe down!"),
  'eirik': told('Eirik Bloodaxe', "[ominous] There, under a red banner… Eirik Bloodaxe himself! [grim] He carries his brothers' blood in his name, and he's proud of it. [wry] His shieldmaidens fight harder for him than for any jarl in the north… [eager] Good! Let them meet Hervor's!"),
  'kaupang-lost': told('Kaupang has fallen', "[dismayed] Too late… Eirik's riders reached Kaupang first! [bitter] His banner flies over the grain ships now, and the hungry jarls will follow the bread. [determined] Take it back from him!"),
  'eirik-flees': told('Eirik flees', "[scornful] The Bloodaxe turns his horse and runs! [wry] He's left his whole army in the snow… [warning] but he'll hire another at Avaldsnes. Take his ring fort, and he'll have nowhere left to run."),
  'bloodaxe-won': told('The Bloodaxe flees north', "[triumphant] Avaldsnes falls, and Eirik's banner comes down over the western sea! [joyful] Kaupang's grain ships sail for the steadings, and the north eats tonight… [uneasy] but the Bloodaxe isn't dead. [grim] He has fled north, to the far north where the sun no longer rises, to his queen: Gunnhild, Mother of Kings. [ominous] And at night, from beyond the mountains, Heid hears her singing… [resolute] Hervor rides north to Halogaland, to end the song!"),
  'part-halogaland': told('Halogaland', "[grand, storytelling] North of the fjords lies Halogaland, where the sun no longer rises… [awed] Only the northern lights burn over the snow, green and cold. [ominous] And every night, from Bjarkoy and Steigen, a woman's voice carries over the ice. Gunnhild, Mother of Kings, is singing the winter! [grim] She learned her seidr from the Sami in the far north, and the jarls kneel to her husband because they're starving. [uneasy] At Mimir's Well, at a root of the world tree, the wolf Skoll waits… and while the song holds, he is closing on the sun. [resolute] Two towns stand between her and the coast. Take them first… then take Bjarkoy and Steigen, and stop the song!"),
  'gunnhild': told('Gunnhild', "[ominous] There, in a cloak of black feathers… Gunnhild herself! [awed] The snow goes quiet where she walks, and her runes turn a shield arm to ice. [wry] She doesn't need to win the fight… only to keep singing. [resolute] Then don't give her time to finish the verse!"),
  'eirik-returns': told('The Bloodaxe rides again', "[surprised] Look, under the red banner again… Eirik Bloodaxe! [scornful] He ran all the way north to his queen, and she gave him a new army. [grim] He fights for her now, and he fights hard: he has nowhere else to run. [eager] Good. This time, there's no Avaldsnes to flee to!"),
  'skoll': told('Skoll', "[awed] There, by the well at the world tree's root… Skoll, the wolf who hunts the sun! [ominous] He's bigger than a longship, and every winter night he gets a little closer to it. [intrigued] Mimir's Well lies behind him. Its water gave Odin his wisdom, for the price of an eye… [eager] Beat the wolf, and the well will make your best warriors into legends!"),
  'tyrfing': told('Tyrfing', "[hushed, awed] In the barrow's dark, across Angantyr's knees… Tyrfing! [solemn] The sword the dwarves forged for a king, and cursed: it never misses, and every time it's drawn, it must kill. [warm] It was Hervor's father's sword. Now it's hers… [grim] and its curse with it. [resolute] Let the curse fall on Gunnhild!"),
  'longWinter-won': told('The sun rises', "[triumphant] Gunnhild falls, and in the middle of a verse… her song stops! [hushed, awed] For a moment the whole north holds its breath. [relieved] Then, far away, Skoll lifts his head… he's lost the sun's scent! [joyful] And over the fjord, for the first time in three winters, the sun comes up! [warm] The ice groans and cracks, the longships rock free, and on every steading roof the snow begins to drip. [proud] From Hladir to Halogaland, the north sings a new song now… and it's Hervor's!"),
};

/** Chapter 1's places and people the lines name: a line is told only where its words are true. */
export const CHAPTER1 = { eudora: 'eudora-town', korax: 'korax-town', kassander: 'kassander' } as const;
/** Chapter 3's: the town that opens its gates in part 2 (Uppsala, where Heid reads the winter), and part 3's rival king, his ring fort and the market town both race for. */
export const CHAPTER3 = { uppsala: 'uppsala-town', eirik: 'eirik', avaldsnes: 'avaldsnes-town', kaupang: 'kaupang-town', gunnhild: 'gunnhild' } as const;
/** Chapter 2's first rival lord, his city and the town both race for (chapter 2's part 3, the Red Land). */
export const CHAPTER2 = { redLand: 'red-land', sethi: 'sethi', nubt: 'nubt-town', gebtu: 'gebtu-town' } as const;

/**
 * Set's sandstorms (the Red Land, `MapDef.stormEvery`): the day card's words the
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
