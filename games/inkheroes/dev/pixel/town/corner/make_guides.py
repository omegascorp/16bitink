"""Lays out the four castle corners with the game's real geometry, for PixelLab to repaint each as one
building (corner/guide-*.png): the round tower stands on the ground where the two walls' foot lines meet,
and a plain length of wall runs into each of its sides.
  python3 dev/pixel/town/corner/make_guides.py  -> guide-<corner>.png, corners.json (where that point falls in each)
Then repaint them (edit_image_pixen) to master-<corner>.png and run cut_corner.py."""
import json
from pathlib import Path

from PIL import Image, ImageEnhance

HERE = Path(__file__).resolve().parent
ISO = HERE.parent / 'iso'
ART = HERE.parents[3] / 'src/art/pixel/town'
STUB_BASE_Y = 31
SHADE = 0.82
# How far below the corner point the tower's base reaches: half its footprint, so the point is under its centre.
TOWER_FOOT = 10
# The wall the cut left down the tower's right side.
SLIVER = (52, 56)


def stub(flip: bool) -> Image.Image:
    im = Image.open(ART / 'wall-stub.png').convert('RGBA')
    if not flip:
        return im
    r, g, b, a = im.transpose(Image.FLIP_LEFT_RIGHT).split()
    return Image.merge('RGBA', (*ImageEnhance.Brightness(Image.merge('RGB', (r, g, b))).enhance(SHADE).split(), a))


def tower() -> Image.Image:
    im = Image.open(ISO / 'wall-tower.png').convert('RGBA')
    for y in range(SLIVER[1], im.height):
        for x in range(SLIVER[0], im.width):
            im.putpixel((x, y), (0, 0, 0, 0))
    return im


def corner(w: int) -> dict[str, list[tuple[Image.Image, int, int]]]:
    """Each corner's pieces back to front, placed relative to the corner point. The tower is always last: it stands proud of both walls."""
    t = tower()
    at = (-t.width // 2, TOWER_FOOT - t.height)
    rise = -33 - STUB_BASE_Y
    return {
        'front': [(stub(False), -w, rise - 1), (stub(True), 0, rise), (t, *at)],
        'left': [(stub(True), 0, rise), (stub(False), 0, -STUB_BASE_Y), (t, *at)],
        'right': [(stub(False), -w, rise - 1), (stub(True), -w, -STUB_BASE_Y), (t, *at)],
        'back': [(stub(True), -w, -STUB_BASE_Y), (stub(False), 0, -STUB_BASE_Y), (t, *at)],
    }


def main() -> None:
    w = stub(False).width
    origins = {}
    for name, pieces in corner(w).items():
        x0 = min(x for _, x, _ in pieces)
        y0 = min(y for _, _, y in pieces)
        x1 = max(x + im.width for im, x, _ in pieces)
        y1 = max(y + im.height for im, _, y in pieces)
        # PixelLab wants sides in fours: the padding goes right and below, so the point stays put.
        size = ((x1 - x0 + 3) // 4 * 4, (y1 - y0 + 3) // 4 * 4)
        out = Image.new('RGBA', size, (0, 0, 0, 0))
        for im, x, y in pieces:
            out.alpha_composite(im, (x - x0, y - y0))
        out.save(HERE / f'guide-{name}.png')
        origins[name] = {'x': -x0, 'y': -y0, 'w': size[0], 'h': size[1]}
    (HERE / 'corners.json').write_text(json.dumps(origins, indent=2) + '\n')
    print(origins)


if __name__ == '__main__':
    main()
