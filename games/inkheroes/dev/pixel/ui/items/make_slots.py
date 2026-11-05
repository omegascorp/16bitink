"""Draws the empty-slot placeholders from painted icons, as dim three-tone silhouettes pressed into the slot's leather:
armor from the first set's own pieces (so a piece fills the shape waiting for it), the rest from ghost/*.png.
  python3 dev/pixel/ui/items/make_slots.py  -> slots/<slot>.png, then run build_ui.py"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / 'slots'
# Shadow, body and lit tones, and the brightness each starts at.
TONES = (((30, 22, 15, 255), 0), ((52, 38, 26, 255), 70), ((76, 57, 39, 255), 140))
SOURCES = {
    'helm': 'bronzeHelm', 'cuirass': 'bronzeCuirass', 'bracers': 'bronzeBracers', 'belt': 'warBelt', 'greaves': 'bronzeGreaves', 'boots': 'warSandals',
    'weapon': 'ghost/weapon', 'shield': 'ghost/shield', 'amulet': 'ghost/amulet', 'ring': 'ghost/ring', 'book': 'noviceSpellbook', 'machine': 'catapult',
}


def silhouette(name: str) -> Image.Image:
    src = Image.open(HERE / f'{name}.png').convert('RGBA')
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    sp, op = src.load(), out.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = sp[x, y]
            if a >= 128:
                lum = (r + g + b) / 3
                op[x, y] = [tone for tone, start in TONES if lum >= start][-1]
    return out


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    for slot, name in SOURCES.items():
        silhouette(name).save(OUT / f'{slot}.png')
