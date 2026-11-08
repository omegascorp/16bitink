# helper: python3 addegypt.py  (adds/overwrites Egypt's 21 unit entries in units.json)
import json
d = json.load(open('units.json'))
U = d['units']
GALLOP = "galloping in place loop: the horses gallop with legs reaching and gathering, the car rocks on its wheels, stays in the same spot, ends back at the starting pose"
CHARGE = "charge attack: the horses surge forward, the archer in the car drives to the right, then the chariot settles back to the starting pose"
STRIDE = "prowling in place loop: four legs stride in rhythm, head held high, tail swings, stays in the same spot, ends back at the starting pose"
POUNCE = "pounce attack: crouches, lunges forward to the right with a roar and a swipe of the paw, then settles back to the starting pose"
FLY = "flying in place loop: big slow wing beats, body bobs up and down a little, legs tucked, ends back at the starting pose"
BENNU_ATK = "dive attack: beats its wings once, lunges forward to the right with beak and talons, then settles back to the starting pose"
def unit(uid, name, canvas, dx, subject, attack, strike, face, **kw):
    e = {"name": name, "src": f"pixel/src/{uid}.png", "canvas": canvas, "foot": 6, "dx": dx, "subject": subject, "attack": attack, "strike": strike, "face": face}
    e.update(kw)
    U[uid] = e
SPEAR = "spear thrust attack: draws the spear back, lunges forward thrusting the spear hard to the right, then recovers to the starting pose; feet stay in place"
BOW = "archery attack: draws the bowstring back to the cheek, holds, releases the arrow to the right, then recovers; feet stay in place"
SLASH = "khopesh slash attack: raises the curved sword and slashes forward to the right, then recovers to the starting pose; feet stay in place"
J = "a jackal-headed egyptian temple guard"
FACE = json.load(open('egypt_faces.json')) if __import__('os').path.exists('egypt_faces.json') else {}
SPECS = [
 ("levy", "Nile Levy", [96,96], -8, "an egyptian levy spearman with a spear and a round hide shield", SPEAR, 4, {}),
 ("levy2", "Khopesh Warrior", [96,96], -8, "an egyptian warrior in a padded linen corselet with a curved bronze khopesh and a round shield", SLASH, 4, {}),
 ("levy3", "Shardana Guard", [96,96], -8, "an egyptian guard in a horned bronze helmet with a disc, a round bronze shield and a long sword", "sword thrust attack: draws the sword back, lunges forward thrusting hard to the right, then recovers to the starting pose; feet stay in place", 4, {}),
 ("nubian", "Nubian Archer", [96,96], -6, "a nubian archer drawing a bow, with a white headband", BOW, 5, {"shot":[70,48]}),
 ("nubian2", "Medjay Archer", [96,96], -6, "a medjay archer in leather armour drawing a big bow", BOW, 5, {"shot":[70,48]}),
 ("nubian3", "Bowman of Ta-Seti", [96,96], -6, "a nubian bowman with tall ostrich plumes and gold armbands drawing a great bow", BOW, 5, {"shot":[70,48]}),
 ("jackal", "Jackal Warrior", [112,112], -8, J + " with a spear and a khopesh at the hip", SPEAR, 4, {}),
 ("jackal2", "Sentinel of Anubis", [112,112], -8, J + " in bronze scale armour with a long spear", SPEAR, 4, {}),
 ("jackal3", "Hand of Anubis", [112,112], -8, J + " in gilded black armour with a khopesh in each hand", "twin khopesh attack: raises both curved swords and slashes down and forward to the right, then recovers to the starting pose; feet stay in place", 4, {}),
 ("chariot", "War Chariot", [144,112], -8, "an egyptian war chariot with an archer driver and two brown horses at the right front", CHARGE, 2, {"walk": GALLOP}),
 ("chariot2", "Royal Chariot", [144,112], -8, "a gilded egyptian chariot with an archer driver and two horses in caparisons at the right front", CHARGE, 2, {"walk": GALLOP}),
 ("chariot3", "Chariot of Horus", [144,112], -8, "a solid gold egyptian chariot with a falcon standard and two plumed horses at the right front", CHARGE, 2, {"walk": GALLOP}),
 ("mummy", "Mummy", [112,112], -8, "an egyptian mummy warrior in linen bandages with a bronze khopesh", SLASH, 3, {}),
 ("mummy2", "Royal Mummy", [112,112], -8, "a royal mummy in a gold-banded wrap with gold amulets and a khopesh", SLASH, 3, {}),
 ("mummy3", "Pharaoh's Mummy", [112,112], -8, "a pharaoh's mummy with a gold death mask, blue and gold nemes, crook and flail", "royal strike attack: raises the crook and flail and brings them down forward to the right, then lifts them back to the starting pose; feet stay in place", 3, {}),
 ("sphinx", "Sphinx", [144,112], -8, "a standing egyptian sphinx, lion body with a pharaoh's head in a blue and gold nemes", POUNCE, 3, {"walk": STRIDE}),
 ("sphinx2", "Guardian Sphinx", [144,112], -8, "a standing sphinx in bronze armour plates, lion body with a pharaoh's head", POUNCE, 3, {"walk": STRIDE}),
 ("sphinx3", "Great Sphinx", [144,112], -8, "a great sphinx with a gold nemes and a jewelled collar, lion body with a pharaoh's head", POUNCE, 3, {"walk": STRIDE}),
 ("bennu", "Bennu", [128,112], -6, "a fiery heron-like bennu bird with a long beak and flame feathers, flying", BENNU_ATK, 3, {"flies": True, "walk": FLY}),
 ("bennu2", "Golden Bennu", [128,112], -6, "a golden bennu bird with gold plumage and flame feather tips, flying", BENNU_ATK, 3, {"flies": True, "walk": FLY}),
 ("bennu3", "Bennu of Ra", [128,112], -6, "a bennu bird with a sun disc above its head and white-gold fire plumage, flying", BENNU_ATK, 3, {"flies": True, "walk": FLY}),
]
import sys
STRIKE = {'levy3': 3, 'levy2': 3, 'jackal3': 3, 'nubian3': 4}
SHOT = {'nubian': [68, 51], 'nubian2': [68, 51], 'nubian3': [68, 51]}
only = set(sys.argv[1:])
for uid, name, canvas, dx, subj, atk, strike, kw in SPECS:
    if only and uid not in only: continue
    f = FACE.get(uid, [canvas[0]//2, canvas[1]//3])
    kw = {k: v for k, v in kw.items() if k != 'shot'}
    if uid in SHOT: kw['shot'] = SHOT[uid]
    unit(uid, name, canvas, dx, subj, atk, STRIKE.get(uid, strike), f, **kw)
json.dump(d, open('units.json', 'w'), indent=1); open('units.json', 'a').write('\n')
print('ok')
