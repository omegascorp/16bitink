"""Builds the pixel battle UI's art: the action icons and the stat icons.

  python3 dev/pixel/ui/build_ui.py

Action icons (icon-*.png, 32 x 32), the unit card's stat icons
(stats/stat-*.png, 16 x 16), the spellbook's spell icons (spells/<id>.png,
24 x 24, named by spell id) and the skill icons (skills/<id>.png, 32 x 32,
named by skill id), all PixelLab create_image_pixen, are copied to
src/art/pixel/ui/ and listed in src/art/pixel/ui.ts.

The text font is Ark Pixel 12 proportional (OFL, fonts/ark-pixel-OFL.txt), a
real pixel font so the battle can be translated: cut here to Latin, Greek,
Cyrillic and punctuation (needs fonttools and brotli) into
src/art/pixel/ui/ark-pixel-12.woff2. The baked glyph sheets tried first are
in rejects/.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
OUT = GAME / 'src' / 'art' / 'pixel' / 'ui'
TS = GAME / 'src' / 'art' / 'pixel' / 'ui.ts'

ICONS = ('wait', 'defend', 'spell', 'auto', 'endDay', 'town', 'menu', 'hall', 'recruit', 'leave', 'smith', 'tavern', 'store', 'tower', 'voicePause', 'voicePlay', 'voiceSkip', 'voiceRead')
STATS = ('attack', 'defense', 'shots', 'damage', 'health', 'left', 'speed', 'mana', 'power', 'knowledge', 'morale', 'luck', 'sight')
ITEMS = ('bronzeHelm', 'bronzeCuirass', 'bronzeBracers', 'warBelt', 'bronzeGreaves', 'warSandals', 'linenHood', 'linenChiton', 'linenArmbands', 'cordSash', 'linenLeggings', 'templeSandals', 'noviceSpellbook', 'oracleSpellbook', 'alexandrianCodex', 'catapult', 'catapult2', 'catapult3')
BAGS = ('satchel', 'saddlebags', 'packMule')
SLOT_ICONS = ('helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots', 'weapon', 'shield', 'amulet', 'ring', 'book', 'machine')
RESOURCES = ('gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems')
SKILLS = ('logistics', 'pathfinding', 'offense', 'archery', 'armorer', 'leadership', 'luck', 'wisdom', 'intelligence', 'mysticism', 'sorcery', 'estates', 'scouting', 'learning')
SPELLS = ('magicArrow', 'haste', 'slow', 'stoneSkin', 'cure', 'dispel', 'lightningBolt', 'bless', 'bloodlust')
FONT_SRC = HERE / 'fonts' / 'ark-pixel-12px-proportional-latin.otf.woff2'
# Latin (with its extensions and Vietnamese), Greek, Cyrillic, general punctuation, euro, arrows, minus, times.
FONT_RANGES = 'U+0020-007E,U+00A0-024F,U+0370-03FF,U+0400-04FF,U+1E00-1EFF,U+2010-205F,U+20AC,U+2190-2193,U+2212,U+00D7'


def build_font() -> None:
    subprocess.run([sys.executable, '-m', 'fontTools.subset', str(FONT_SRC), f'--unicodes={FONT_RANGES}', '--flavor=woff2',
                    f'--output-file={OUT / "ark-pixel-12.woff2"}', '--layout-features=*'], check=True)
    shutil.copyfile(HERE / 'fonts' / 'ark-pixel-OFL.txt', OUT / 'ark-pixel-OFL.txt')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    build_font()
    for icon in ICONS:
        shutil.copyfile(HERE / f'icon-{icon}.png', OUT / f'icon-{icon}.png')
    for stat in STATS:
        shutil.copyfile(HERE / 'stats' / f'stat-{stat}.png', OUT / f'stat-{stat}.png')
    for skill in SKILLS:
        shutil.copyfile(HERE / 'skills' / f'{skill}.png', OUT / f'skill-{skill}.png')
    for spell in SPELLS:
        shutil.copyfile(HERE / 'spells' / f'{spell}.png', OUT / f'spell-{spell}.png')
        shutil.copyfile(HERE / 'spells64' / f'{spell}.png', OUT / f'spellArt-{spell}.png')
    for item in ITEMS:
        shutil.copyfile(HERE / 'items' / f'{item}.png', OUT / f'item-{item}.png')
    for slot in SLOT_ICONS:
        shutil.copyfile(HERE / 'items' / 'slots' / f'{slot}.png', OUT / f'slot-{slot}.png')
    for res in RESOURCES:
        shutil.copyfile(HERE / 'res' / f'res-{res}.png', OUT / f'res-{res}.png')
    shutil.copyfile(HERE / 'laurel.png', OUT / 'laurel.png')
    shutil.copyfile(HERE / 'guild' / 'room.png', OUT / 'guildRoom.png')
    shutil.copyfile(HERE / 'smith' / 'room.png', OUT / 'smithRoom.png')
    shutil.copyfile(HERE / 'store' / 'room.png', OUT / 'storeRoom.png')
    for bag in BAGS:
        shutil.copyfile(HERE / 'bags' / f'{bag}.png', OUT / f'bag-{bag}.png')
    cap = lambda i: i[0].upper() + i[1:]  # noqa: E731
    imports = [f"import icon{cap(i)} from './ui/icon-{i}.png?url';" for i in ICONS]
    imports += [f"import stat{i.title()} from './ui/stat-{i}.png?url';" for i in STATS]
    rows = [f"  {i}: icon{cap(i)}," for i in ICONS]
    stat_rows = [f"  {i}: stat{i.title()}," for i in STATS]
    imports += [f"import skill{cap(i)} from './ui/skill-{i}.png?url';" for i in SKILLS]
    skill_rows = [f"  {i}: skill{cap(i)}," for i in SKILLS]
    imports += [f"import spell{i[0].upper() + i[1:]} from './ui/spell-{i}.png?url';" for i in SPELLS]
    spell_rows = [f"  {i}: spell{i[0].upper() + i[1:]}," for i in SPELLS]
    imports += [f"import spellArt{i[0].upper() + i[1:]} from './ui/spellArt-{i}.png?url';" for i in SPELLS]
    imports += ["import guildRoom from './ui/guildRoom.png?url';", "import smithRoom from './ui/smithRoom.png?url';", "import storeRoom from './ui/storeRoom.png?url';"]
    imports += [f"import bag{cap(i)} from './ui/bag-{i}.png?url';" for i in BAGS]
    bag_rows = [f"  {i}: bag{cap(i)}," for i in BAGS]
    spell_art_rows = [f"  {i}: spellArt{i[0].upper() + i[1:]}," for i in SPELLS]
    imports += [f"import item{cap(i)} from './ui/item-{i}.png?url';" for i in ITEMS]
    item_rows = [f"  {i}: item{cap(i)}," for i in ITEMS]
    imports += [f"import slot{cap(i)} from './ui/slot-{i}.png?url';" for i in SLOT_ICONS]
    slot_rows = [f"  {i}: slot{cap(i)}," for i in SLOT_ICONS]
    imports += [f"import res{i.title()} from './ui/res-{i}.png?url';" for i in RESOURCES]
    imports.append("import laurel from './ui/laurel.png?url';")
    res_rows = [f"  {i}: res{i.title()}," for i in RESOURCES]
    TS.write_text(f"""// Generated by dev/pixel/ui/build_ui.py. Do not edit by hand.
// The pixel battle UI's action icons (32 x 32), the unit card's stat icons (16 x 16)
// the spellbook's spell icons (24 x 24) and the gear's item icons (64 x 64).
import type {{ ItemId }} from '../../logic/items';
import type {{ Resource }} from '../../logic/resources';
import type {{ SkillId }} from '../../logic/skills';
import type {{ SpellId }} from '../../logic/spells';
{chr(10).join(imports)}

export type IconName = {' | '.join(repr(i) for i in ICONS)};

export const ICONS: Readonly<Record<IconName, string>> = {{
{chr(10).join(rows)}
}};

export type StatName = {' | '.join(repr(i) for i in STATS)};

export const STAT_ICONS: Readonly<Record<StatName, string>> = {{
{chr(10).join(stat_rows)}
}};

/** The hero's skills (32 x 32). */
export const SKILL_ICONS: Readonly<Record<SkillId, string>> = {{
{chr(10).join(skill_rows)}
}};

export const SPELL_ICONS: Readonly<Partial<Record<SpellId, string>>> = {{
{chr(10).join(spell_rows)}
}};

/** The guild's spell paintings (64 x 64). */
export const SPELL_ART: Readonly<Partial<Record<SpellId, string>>> = {{
{chr(10).join(spell_art_rows)}
}};

/** The guild's library (768 x 340). */
export const GUILD_ROOM = guildRoom;

/** The Blacksmith's forge (768 x 340). */
export const SMITH_ROOM = smithRoom;

/** The Storeroom's interior (768 x 340). */
export const STORE_ROOM = storeRoom;

export type BagArt = {' | '.join(repr(i) for i in BAGS)};

/** The bag upgrades' icons (64 x 64). */
export const BAG_ART: Readonly<Record<BagArt, string>> = {{
{chr(10).join(bag_rows)}
}};

/** The gear's item icons (64 x 64). */
export const ITEM_ICONS: Readonly<Partial<Record<ItemId, string>>> = {{
{chr(10).join(item_rows)}
}};

export type SlotIcon = {' | '.join(repr(i) for i in SLOT_ICONS)};

/** The silhouettes in empty gear slots (64 x 64). */
export const SLOT_ICONS: Readonly<Record<SlotIcon, string>> = {{
{chr(10).join(slot_rows)}
}};

/** The purse's resource icons (16 x 16). */
export const RESOURCE_ICONS: Readonly<Record<Resource, string>> = {{
{chr(10).join(res_rows)}
}};

/** The laurel wreath a won map earns (24 x 24), up to three. */
export const LAUREL = laurel;
""")
    print(f'wrote {TS}')


if __name__ == '__main__':
    main()
