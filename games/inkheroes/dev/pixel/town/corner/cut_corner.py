"""Prepares the castle corners cut from the walls' sheet (corner/master-*.png, see sheet/): cuts each side
corner in two, so its rear wall can stand behind the city while the tower and front wall stand before it.
  python3 dev/pixel/town/corner/cut_corner.py  -> iso/corner-*.png, and the numbers townWalls.ts and townFlags.ts need
Then run build_town.py."""
import json
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ISO = HERE.parent / 'iso'
# The flag flies above the tower, in the sprite's top rows.
FLAG_ROWS = 16


def split(im: Image.Image, name: str) -> tuple[Image.Image, Image.Image]:
    """The tower and front wall, and the rear wall behind them (corner/front-<name>.png, from make_sheet.py, says which is which)."""
    empty = Image.new('RGBA', im.size)
    # A pixel wider: the repaint's edge wanders that far, and a stray bit of tower must not stand behind the city.
    mask = Image.open(HERE / f'front-{name}.png').filter(ImageFilter.MaxFilter(3))
    return Image.composite(im, empty, mask), Image.composite(empty, im, mask)


def flag_spot(im: Image.Image) -> tuple[int, int, int, int]:
    """The flag's blue cloth in `im`, a pixel of air round it."""
    px = im.load()
    blue = [(x, y) for y in range(FLAG_ROWS) for x in range(im.width) if px[x, y][3] and px[x, y][2] > px[x, y][0] + 30]
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
        im = Image.open(HERE / f'master-{name}.png').convert('RGBA')
        if name in ('left', 'right'):
            front, rear = split(im, name)
            save(f'corner-{name}', front, o)
            save(f'corner-{name}-rear', rear, o)
        else:
            save(f'corner-{name}', im, o)
    print('points', json.dumps(points))
    print('flags', json.dumps(flags))


if __name__ == '__main__':
    main()
