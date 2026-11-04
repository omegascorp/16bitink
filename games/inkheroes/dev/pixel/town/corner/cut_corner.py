"""Prepares the castle corners PixelLab painted as one building each (corner/master-*.png, from
make_guides.py's layouts): strips the grey shadow it added, and cuts each side corner in two, so its
rear wall can stand behind the city while the tower and front wall stand before it.
  python3 dev/pixel/town/corner/cut_corner.py  -> iso/corner-*.png, and the numbers townWalls.ts and townFlags.ts need
Then run build_town.py."""
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ISO = HERE.parent / 'iso'
# The tower's half width, a pixel over: everything this near the point belongs to it.
TOWER_REACH = 29
STUB_BASE_Y = 31


def without_shadow(im: Image.Image) -> Image.Image:
    """The sandstone is warm and the outline near black: a light grey pixel can only be the shadow."""
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and max(r, g, b) - min(r, g, b) < 16 and r > 80:
                px[x, y] = (0, 0, 0, 0)
    return out


def split(im: Image.Image, ox: int, oy: int, sign: int) -> tuple[Image.Image, Image.Image]:
    """The tower and front wall, and the rear wall behind them (`sign`: the side of the tower the walls run to)."""
    front, rear = Image.new('RGBA', im.size), Image.new('RGBA', im.size)
    src, f, r = im.load(), front.load(), rear.load()
    for y in range(im.height):
        for x in range(im.width):
            d = (x - ox) * sign
            rear_foot = oy - d / 2 + 2
            front_top = oy - STUB_BASE_Y + d / 2 - 1
            (f if d <= TOWER_REACH or y >= min(rear_foot, front_top) else r)[x, y] = src[x, y]
    return front, rear


def flag_spot(im: Image.Image) -> tuple[int, int, int, int]:
    """The flag's blue cloth in `im`, a pixel of air round it."""
    px = im.load()
    blue = [(x, y) for y in range(im.height) for x in range(im.width) if px[x, y][3] and px[x, y][2] > px[x, y][0] + 30]
    xs, ys = [p[0] for p in blue], [p[1] for p in blue]
    return min(xs), max(0, min(ys) - 1), max(xs) - min(xs) + 2, max(ys) - min(ys) + 3


def main() -> None:
    origins = json.loads((HERE / 'corners.json').read_text())
    points, flags = {}, {}

    def save(name: str, im: Image.Image, o: dict) -> None:
        box = im.getbbox()
        cut = im.crop(box)
        cut.save(ISO / f'{name}.png')
        points[name] = {'x': o['x'] - box[0], 'y': o['y'] - box[1]}
        if name.count('-') == 1:
            flags[name] = flag_spot(cut)

    for name, o in origins.items():
        im = without_shadow(Image.open(HERE / f'master-{name}.png').convert('RGBA'))
        if name in ('left', 'right'):
            front, rear = split(im, o['x'], o['y'], 1 if name == 'left' else -1)
            save(f'corner-{name}', front, o)
            save(f'corner-{name}-rear', rear, o)
        else:
            save(f'corner-{name}', im, o)
    print('points', json.dumps(points))
    print('flags', json.dumps(flags))


if __name__ == '__main__':
    main()
