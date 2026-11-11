# helper: python3 addnorse_a.py [ids]  (adds/overwrites Norse lines 1-4: shieldmaiden, hunter(+Foot), berserker, dwarf, ranks 1-5)
import json, sys
d = json.load(open('units.json'))
U = d['units']
AXE = "axe swing attack: raises the axe overhead and chops down hard forward to the right, then recovers to the starting pose; feet stay in place"
SPEAR = "spear thrust attack: draws the spear back, lunges forward thrusting the spear hard to the right, then recovers to the starting pose; feet stay in place"
BOW = "archery attack: draws the bowstring back to the cheek, holds, releases the arrow to the right, then recovers; feet stay in place"
BOW_SKI = "archery attack: draws the bowstring back to the cheek, holds, releases the arrow to the right, then recovers; the skis stay planted in place"
TWIN = "twin axe attack: raises both axes and chops down and forward to the right with a roar, then recovers to the starting pose; feet stay in place"
HAMMER = "hammer smash attack: heaves the heavy hammer up and smashes it down hard forward to the right, then recovers to the starting pose; feet stay in place"
GLIDE = "gliding on skis in place loop: pushes with the legs, skis slide, body leans forward, stays in the same spot, ends back at the starting pose"
SKI_IDLE = "idle breathing loop: stands on skis, chest rises and falls gently, bow held ready, skis stay planted, ends back at the starting pose"
# (id, name, subject, attack, strike, extra)
SPECS = [
 ("shieldmaiden", "Shieldmaiden", "a norse shieldmaiden with a hand axe and a round painted shield", AXE, 4, {}),
 ("shieldmaiden2", "Spear Maiden", "a norse shieldmaiden in an iron helmet and mail with a spear and a round painted shield", SPEAR, 4, {}),
 ("shieldmaiden3", "Jarl's Shieldmaiden", "a norse jarl shieldmaiden in a helmet, mail and a red cloak with a Dane axe and a round painted shield", AXE, 4, {}),
 ("shieldmaiden4", "Lagertha's Guard", "a norse shieldmaiden in a gilded winged helmet and white fur mantle with a Dane axe and a round gold-rimmed shield", AXE, 4, {}),
 ("shieldmaiden5", "Einherjar", "a golden armoured norse warrior maiden with a golden glow, a golden axe and a round shield with a golden raven", AXE, 4, {}),
 ("berserker", "Berserker", "a norse berserker in a fur pelt with a big bearded axe", AXE, 4, {}),
 ("berserker2", "Bear Warrior", "a norse berserker in a bear-head hood with bronze arm rings and a big axe", AXE, 4, {}),
 ("berserker3", "Berserker of Odin", "a norse berserker in a bear-head hood with raven tattoos holding two axes", TWIN, 4, {}),
 ("berserker4", "Ulfhedinn", "a norse berserker in a wolf pelt over a bear-head hood holding two axes", TWIN, 4, {}),
 ("berserker5", "Chosen of Odin", "a norse berserker with glowing eyes, ravens on his shoulders and two golden rune axes", TWIN, 4, {}),
 ("dwarf", "Dwarf", "a short broad bearded dwarf smith with a heavy hammer", HAMMER, 4, {}),
 ("dwarf2", "Dwarf Guard", "a short broad bearded dwarf in an iron helmet and iron mail with a heavy hammer", HAMMER, 4, {}),
 ("dwarf3", "Rune-Forged Dwarf", "a short broad bearded dwarf in iron plate with glowing runes and a glowing rune hammer", HAMMER, 4, {}),
 ("dwarf4", "Dwarf Lord", "a short broad dwarf lord in a horned golden helm and fur cloak with a glowing rune hammer", HAMMER, 4, {}),
 ("dwarf5", "Son of Ivaldi", "a short broad dwarf master smith in gold and rune plate with a great golden rune hammer", HAMMER, 4, {}),
 ("hunter", "Hunter", "a norse hunter in a hooded fur cloak drawing a yew bow", BOW, 5, {"shot": [70, 48]}),
]
SKI_NAMES = {2: "Ski Bowman", 3: "Archer of Ullr", 4: "Huntsman of Skadi", 5: "Archer of Ydalir"}
SKI_SUBJ = {2: "a norse ski bowman on skis in a fur hood drawing a bow", 3: "a norse archer on skis with a rune-carved bow and a fur hood", 4: "a norse huntsman on skis in a white wolf-fur hood with a rune bow", 5: "a norse archer on skis with a golden rune yew bow and golden-trimmed leather"}
for r in (2, 3, 4, 5):
    SPECS.append((f"hunter{r}", SKI_NAMES[r], SKI_SUBJ[r], BOW_SKI, 5, {"walk": GLIDE, "idle": SKI_IDLE, "shot": [70, 48], "skis": True}))
    SPECS.append((f"hunter{r}Foot", SKI_NAMES[r], SKI_SUBJ[r].replace("on skis", "with skis strapped to his back"), BOW, 5, {"shot": [70, 48]}))
GEO = json.load(open('norse_a_geo.json')) if __import__('os').path.exists('norse_a_geo.json') else {}
only = set(sys.argv[1:])
for uid, name, subj, atk, strike, kw in SPECS:
    if only and uid not in only: continue
    canvas = [96, 96]
    g = GEO.get(uid, {})
    e = {"name": name, "src": f"pixel/src/{uid}.png", "canvas": canvas, "foot": 6, "dx": g.get("dx", -4), "subject": subj, "attack": atk,
         "strike": strike, "face": g.get("face", [48, 30])}
    kw = {k: v for k, v in kw.items() if k != "skis"}
    if "shot" in kw and "shot" in g: kw["shot"] = g["shot"]
    e.update(kw)
    U[uid] = e
json.dump(d, open('units.json', 'w'), indent=1); open('units.json', 'a').write('\n')
print('ok')
