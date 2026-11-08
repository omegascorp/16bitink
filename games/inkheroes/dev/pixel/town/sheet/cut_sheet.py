"""Cuts the sheet PixelLab repainted in one call (sheet/master.png, from make_sheet.py's layout) back into the
pieces of the city's walls: the corners go on to cut_corner.py, the rest straight to build_town.py.
  python3 dev/pixel/town/sheet/cut_sheet.py && python3 dev/pixel/town/corner/cut_corner.py && python3 dev/pixel/town/build_town.py"""
import json
from pathlib import Path

from PIL import Image

from make_sheet import filled, shut_in

HERE = Path(__file__).resolve().parent
TOWN = HERE.parent
# What stops a hole the repaint left (the stone in the wall's shade).
HOLE = (150, 112, 74, 255)
# Part on the sheet -> the file it becomes.
OUT = {
    'corner-back': TOWN / 'corner/master-back.png',
    'corner-left': TOWN / 'corner/master-left.png',
    'corner-right': TOWN / 'corner/master-right.png',
    'corner-front': TOWN / 'corner/master-front.png',
    'wall': TOWN / 'iso/wall-a.png',
    'wall-up': TOWN / 'iso/wall-up.png',
    'gate': TOWN / 'iso/wall-gate.png',
}


def main() -> None:
    sheet = Image.open(HERE / 'master.png').convert('RGBA')
    parts = json.loads((HERE / 'parts.json').read_text())
    left = sheet.copy()
    for name, r in parts.items():
        box = (r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])
        part = sheet.crop(box)
        print(name, 'holes stopped:', len(shut_in(part)))
        filled(part, HOLE).save(OUT[name])
        trim = part.getbbox()
        print('  foot after the trim:', r['point'][0] - trim[0], r['point'][1] - trim[1])
        left.paste((0, 0, 0, 0), box)
    stray = left.getbbox()
    print('outside every part:', stray)


if __name__ == '__main__':
    main()
