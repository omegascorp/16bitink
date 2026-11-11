# helper: python3 addnorse_b.py [ids]  (adds/overwrites Norse lines 5-7 + northern neutrals in units.json; only its own keys)
# NB: the Norse War Boar is `warBoar`, because `boar` is already the Erymanthian Boar (Greek neutral).
import json, sys
from pathlib import Path
from PIL import Image
HERE = Path(__file__).parent
d = json.load(open(HERE / 'units.json'))
U = d['units']
TROT = "trotting in place loop: four legs trot heavily, head low, tail flicks, stays in the same spot, ends back at the starting pose"
CHARGE = "tusk charge attack: lowers its head and tusks, lunges forward to the right and gores with the tusks, then settles back to the starting pose"
FLY = "flying in place loop: big slow wing beats, the white horse's legs tucked, body bobs up and down a little, ends back at the starting pose"
VALK_ATK = "spear charge attack: the winged horse beats its wings once and surges forward to the right as the rider thrusts the spear hard to the right, then settles back to the starting pose"
DFLY = "flying in place loop: the dragon's two big wings beat slowly up and down, body bobs a little, legs hang, ends back at the starting pose"
DBREATH = "frost breath attack: the dragon rears its head back, then blasts a long jet of white-blue frost far to the right from its open mouth, then closes its mouth and settles back to the starting pose"
def foot_face(src, canvas, dx, foot, face):
    bb = Image.open(HERE.parent / src).convert('RGBA').getbbox()
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    ox = (canvas[0] - bw) // 2 + dx - bb[0]
    oy = canvas[1] - foot - bh - bb[1]
    return [face[0] + ox, face[1] + oy]
# id, name, canvas, dx, face-in-still, subject, attack, strike, extra
SPECS = [
 ("warBoar", "War Boar", [152,112], -8, (96,48), "a huge boar in norse war barding: mail, iron plates and a painted rune shield", CHARGE, 3, {"walk": TROT}),
 ("warBoar2", "Iron Boar", [152,112], -8, (98,48), "a huge boar in full mail and iron plates with a rune shield and an iron helmet", CHARGE, 3, {"walk": TROT}),
 ("warBoar3", "Boar of Freyr", [152,112], -8, (98,48), "a huge boar with shining golden bristles and gold rune-carved tusk caps in iron armour", CHARGE, 3, {"walk": TROT}),
 ("warBoar4", "Hildisvíni", [152,112], -8, (98,48), "a huge boar in gold-plated armour and a gold helmet with a purple caparison and golden bristles", CHARGE, 3, {"walk": TROT}),
 ("warBoar5", "Gullinbursti", [152,112], -8, (98,48), "a huge golden-bristled boar in gold armour with glowing gold runes", CHARGE, 3, {"walk": TROT}),
 ("valkyrie", "Valkyrie", [128,112], -6, (58,16), "a valkyrie in a winged helmet with a round shield and spear on a white winged horse", VALK_ATK, 4, {"flies": True, "walk": FLY}),
 ("valkyrie2", "Battle Valkyrie", [128,112], -6, (58,16), "a valkyrie in a winged helmet and steel breastplate with a round shield and spear on a white winged horse in barding", VALK_ATK, 4, {"flies": True, "walk": FLY}),
 ("valkyrie3", "Valkyrie of Odin", [128,112], -6, (58,16), "a valkyrie in gold mail and a gold winged helmet with a spear of light on a white winged horse", VALK_ATK, 4, {"flies": True, "walk": FLY}),
 ("valkyrie4", "Valkyrie Captain", [128,112], -6, (58,16), "a valkyrie captain in gold armour with a crimson cloak and a glowing spear on a white winged horse", VALK_ATK, 4, {"flies": True, "walk": FLY}),
 ("valkyrie5", "Valkyrie of Fólkvangr", [128,112], -6, (58,16), "a radiant valkyrie in white and gold armour with a halo and a blazing spear on a glowing white winged horse", VALK_ATK, 4, {"flies": True, "walk": FLY}),
 ("dragon", "Frost Dragon", [224,160], -24, (132,36), "a frost dragon with four legs and two wings, pale blue scales", DBREATH, 3, {"flies": True, "walk": DFLY}),
 ("dragon2", "Ice Dragon", [224,160], -24, (132,36), "an ice dragon with four legs and two wings, bright ice-blue scales and frosted wings", DBREATH, 3, {"flies": True, "walk": DFLY}),
 ("dragon3", "Fáfnir's Kin", [224,160], -24, (132,36), "an ice-blue dragon with four legs and two wings, a crown of dark horns and glowing rune scars", DBREATH, 3, {"flies": True, "walk": DFLY}),
 ("dragon4", "Elder Dragon", [224,160], -24, (132,36), "an elder steel-blue dragon with four legs and two wings, a spine beard and scarred wings", DBREATH, 3, {"flies": True, "walk": DFLY}),
 ("dragon5", "Níðhöggr", [224,160], -24, (132,36), "the black-blue dragon Níðhöggr with four legs and two wings, bone horns and pale glowing eyes", DBREATH, 3, {"flies": True, "walk": DFLY}),
 ("troll", "Troll", [128,120], -8, (70,30), "a hulking brown troll with a big wooden club", "club smash attack: raises the big wooden club high overhead and smashes it down forward to the right, then lifts it back to the starting pose", 5, {"walk": "lumbering walk in place loop: heavy steps, shoulders sway, club dragged low, stays in the same spot, ends back at the starting pose"}),
 ("frostGiant", "Frost Giant", [144,120], -8, (62,24), "a blue-skinned frost giant in furs with a huge ice axe", "axe smash attack: raises the huge ice axe overhead and brings it down forward to the right, then lifts it back to the starting pose", 4, {"walk": "lumbering walk in place loop: heavy steps, shoulders sway, axe held low, stays in the same spot, ends back at the starting pose"}),
 ("skoll", "Sköll", [176,120], -12, (118,32), "a huge dark grey wolf with a shaggy mane", "bite attack: crouches, leaps forward to the right with jaws snapping wide, then lands back in the starting pose", 3, {"walk": "prowling in place loop: four legs stride in rhythm, head low, tail swings, stays in the same spot, ends back at the starting pose"}),
 ("draugr", "Draugr", [96,104], -4, (40,20), "an undead norse draugr warrior with grey-blue skin, rusted mail and a rusty axe", "axe chop attack: raises the rusty axe and chops down forward to the right, then recovers to the starting pose; feet stay in place", 4, {}),
 ("barrowKing", "Barrow King", [112,120], -6, (62,20), "an undead norse jarl in a rusted crown and rotted royal mail with a long rusted sword", "sword slash attack: raises the long sword and slashes down forward to the right, then recovers to the starting pose; feet stay in place", 4, {}),
 ("wolfWinter", "Winter Wolf", [112,96], -6, (68,22), "a snarling white winter wolf", "bite attack: crouches, leaps forward to the right with jaws snapping, then lands back in the starting pose", 3, {"walk": "trotting in place loop: four legs trot in rhythm, head low, tail streams, stays in the same spot, ends back at the starting pose"}),
]
only = set(sys.argv[1:])
for uid, name, canvas, dx, face, subj, atk, strike, kw in SPECS:
    if only and uid not in only: continue
    src = f'pixel/src/{uid}.png'
    if not (HERE.parent / src).exists(): continue
    e = {"name": name, "src": src, "canvas": canvas, "foot": 6, "dx": dx, "subject": subj, "attack": atk, "strike": strike,
         "face": foot_face(src, canvas, dx, 6, face)}
    e.update(kw)
    U[uid] = e
json.dump(d, open(HERE / 'units.json', 'w'), indent=1); open(HERE / 'units.json', 'a').write('\n')
print('ok')
