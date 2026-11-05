"""Paints the Catapult in the finer grades' woods and metals, so a battle and the gear tab show the grade the hero has.
It also draws the three item icons from the battle sprite.
  python3 dev/pixel/siege/recolour.py  -> dev/pixel/src/catapult2.png, catapult3.png, dev/pixel/anim/catapult2-*.png, catapult3-*.png,
                                          dev/pixel/ui/items/catapult*.png"""
import colorsys
from pathlib import Path

from PIL import Image

PIX = Path(__file__).resolve().parents[1]
ANIM = PIX / 'anim'
ITEMS = PIX / 'ui' / 'items'
ICON = 64
# Room left round an icon's picture, and how many colours it keeps once shrunk.
ICON_MARGIN = 1
ICON_COLOURS = 40


def bronze(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Warm the timber to polished bronze."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    out = colorsys.hsv_to_rgb(0.065, min(1, s * 1.5 + 0.2), min(1, v * 1.08))
    return tuple(int(c * 255) for c in out)


def ebony(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Darken the timber to ebony; the brightest fittings go gold."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if v > 0.72 and s > 0.3:
        out = colorsys.hsv_to_rgb(0.12, 0.62, min(1, v * 1.1))
    else:
        out = colorsys.hsv_to_rgb(0.72, 0.18, v * 0.42)
    return tuple(int(c * 255) for c in out)


def painted(path: Path, paint) -> Image.Image:
    im = Image.open(path).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (*paint(r, g, b), a)
    return im


def icon(sprite: Image.Image) -> Image.Image:
    """The sprite shrunk to an item's size: hard edges and a small palette, so it stays pixel art."""
    cut = sprite.crop(sprite.getbbox())
    k = (ICON - ICON_MARGIN * 2) / max(cut.size)
    small = cut.resize((round(cut.width * k), round(cut.height * k)), Image.LANCZOS)
    colours = small.convert('RGB').quantize(ICON_COLOURS, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    colours.putalpha(small.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    out = Image.new('RGBA', (ICON, ICON), (0, 0, 0, 0))
    out.paste(colours, ((ICON - colours.width) // 2, (ICON - colours.height) // 2))
    return out


if __name__ == '__main__':
    still = PIX / 'src' / 'catapult.png'
    icon(Image.open(still).convert('RGBA')).save(ITEMS / 'catapult.png')
    for grade, paint in (('catapult2', bronze), ('catapult3', ebony)):
        sprite = painted(still, paint)
        sprite.save(PIX / 'src' / f'{grade}.png')
        icon(sprite).save(ITEMS / f'{grade}.png')
        for pose in ('idle', 'attack'):
            painted(ANIM / f'catapult-{pose}.png', paint).save(ANIM / f'{grade}-{pose}.png')
