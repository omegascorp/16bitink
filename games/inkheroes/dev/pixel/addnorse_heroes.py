# helper: python3 addnorse_heroes.py  (adds/overwrites the ten Norse hero entries under "heroes" in units.json; touches only those keys)
# Also writes each hero's animation canvas (anim_in/hero_<id>.png, the still unscaled on animCanvas) to upload to animate_image_pixminimax.
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
d = json.load(open(HERE / 'units.json'))
H = d['heroes']
GALLOP = "galloping in place loop: the horse gallops, the rider sways with the stride, stays in the same spot, ends back at the starting pose"
CANVAS, ANIM, SCALE, FOOT, DX = [132, 139], [152, 160], 0.87, 5, -8
# id: (name, subject, attack prompt, strike frame, shadow colour to strip, face centre (canvas px, set after the idle frame is seen))
SPECS = {
 'hervor': ("Hervor", "a norse shieldmaiden, a young woman with a red-blonde braid in mail with a round painted shield and a raised sword, on a dark brown horse",
            "sword attack: the rider swings the sword down and across in a slash to the right, then raises it back to the starting pose; the horse stays in place", 3, None),
 'eirik': ("Eirik Bloodaxe", "a norse warrior king with a black beard in an iron helmet and a red cloak holding a bearded battle axe, on a black horse",
           "axe attack: the rider swings the battle axe forward to the right in a heavy chop, then lifts it back to the starting pose; the horse stays in place", 3, None),
 'einar': ("Einar", "a norse archer with a blond braided beard in a fur-trimmed coat holding a huge longbow with a quiver, on a brown horse",
           "archery attack: the rider draws the bowstring back to the cheek, holds, releases an arrow to the right, then lowers the bow to the starting pose; the horse stays in place", 4, [90, 90, 89]),
 'sigurd': ("Sigurd", "a young fair-haired norse hero in mail with a blue cloak holding a bright great sword upright, on a grey horse",
            "sword attack: the rider swings the great sword down and forward to the right in a slash, then raises it back to the starting pose; the horse stays in place", 3, None),
 'harald': ("Harald Hardrada", "a tall norse king with a long moustache and a gold circlet in a purple and gold coat holding a gold-hilted sword, on a white horse",
            "sword attack: the rider swings the sword down and forward to the right in a slash, then raises it back to the starting pose; the horse stays in place", 3, None),
 'heid': ("Heid", "an old norse seeress with long grey hair in a hooded blue-grey cloak holding a tall iron-topped staff, on a pale grey horse",
          "spell casting: the rider raises the staff to the sky, its iron top flashes with blue light, then lowers it to the starting pose; the horse stays in place", 3, None),
 'gunnhild': ("Gunnhild", "a norse sorceress queen with black hair and a silver crown in a dark red dress with a raven on her shoulder holding a carved staff, on a chestnut horse",
              "spell casting: the rider raises the staff to the sky, the rune on it flashes with red light, the raven spreads its wings, then she lowers it to the starting pose; the horse stays in place", 3, None),
 'thorbjorg': ("Thorbjorg", "a small young norse seeress in a blue cloak and a white-furred black hood holding a brass-topped staff, on a small brown pony",
               "spell casting: the rider raises the staff to the sky, the bead on it flashes with white light, then lowers it to the starting pose; the pony stays in place", 3, [129, 113, 80]),
 'brynhild': ("Brynhild", "a norse valkyrie with golden hair and a winged helmet in mail with a round shield and a spear, on a white horse",
              "spear attack: the rider thrusts the spear forward to the right, then draws it back to the starting pose; the horse stays in place", 3, [80, 66, 52]),
 'egil': ("Egil", "a big dark-bearded norse skald in a hooded grey fur cloak holding a tall rune-carved staff and a scroll, on a stocky brown horse",
          "spell casting: the rider raises the rune staff to the sky, the runes on it flash with blue light, then lowers it to the starting pose; the horse stays in place", 3, None),
}
FACE = json.load(open(HERE / 'town/norse/heroes/faces.json')) if (HERE / 'town/norse/heroes/faces.json').exists() else {}
WL = json.load(open(HERE / 'town/norse/heroes/walklock.json')) if (HERE / 'town/norse/heroes/walklock.json').exists() else {}
(HERE / 'anim_in').mkdir(exist_ok=True)
for uid, (name, subj, atk, strike, strip) in SPECS.items():
    e = {"name": name, "src": f"pixel/src/hero_{uid}.png", "canvas": CANVAS, "foot": FOOT, "dx": DX, "subject": subj, "walk": GALLOP, "attack": atk,
         "strike": strike, "face": FACE.get(uid, [58, 30]), "animCanvas": ANIM, "scale": SCALE}
    if uid in WL:
        e["walkLock"] = WL[uid]
    if strip:
        e["strip"] = [strip, 12]
    H[uid] = e
    # the still, ground shadow stripped, unscaled on the animation canvas (same placement as build_assets.pad, before its scaling)
    im = Image.open(HERE / 'src' / f'hero_{uid}.png').convert('RGBA')
    if strip:
        px, bottom = im.load(), im.getbbox()[3]
        for y in range(bottom - 12, bottom):
            for x in range(im.width):
                if list(px[x, y][:3]) == strip:
                    px[x, y] = (0, 0, 0, 0)
    c = im.crop(im.getbbox())
    out = Image.new('RGBA', tuple(ANIM), (0, 0, 0, 0))
    out.paste(c, (max(0, round((CANVAS[0] - c.width * SCALE) / 2 / SCALE + DX / SCALE)), ANIM[1] - round(FOOT / SCALE) - c.height))
    out.save(HERE / 'anim_in' / f'hero_{uid}.png')
    print(uid, c.size)
json.dump(d, open(HERE / 'units.json', 'w'), indent=1)
open(HERE / 'units.json', 'a').write('\n')
print('ok')
