# Makes the broken-arrow cursor from the arrow: the shaft is snapped halfway along it, the
# head half hangs from the break, bent a quarter turn or an eighth, and pale splinters
# stand out of the break, so a far shot reads as a weak one. Quarter turns move pixels only.
#   python3 dev/pixel/cursors/make_broken.py  -> arrow-broken.png
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
OUTLINE = (20, 14, 10, 255)
SPLINTER = (226, 200, 150, 255)
SPLINTER_DARK = (150, 118, 76, 255)
SNAP_AT = 2  # px along the shaft past its middle where it snaps


def parts(im: np.ndarray) -> tuple[np.ndarray, np.ndarray, int, int]:
    """The rear and head halves, and the break on the shaft (x, y)."""
    h, w = im.shape[:2]
    ys, xs = np.nonzero(im[..., 3] >= 128)
    along = xs - ys
    mid = (along.min() + along.max()) // 2 + SNAP_AT
    yy, xx = np.mgrid[0:h, 0:w]
    head = (xx - yy) > mid
    return im * (~head)[..., None], im * head[..., None], (w + mid) // 2, (h - mid) // 2


def splinters(out: np.ndarray, x: int, y: int) -> None:
    """Pale slivers at the break, each with its own outline where it stands off the shaft."""
    slivers = ((0, -1, SPLINTER), (1, -2, SPLINTER), (-1, -2, SPLINTER_DARK), (2, 0, SPLINTER), (-2, -1, SPLINTER), (1, 1, SPLINTER_DARK))
    for dx, dy, _ in slivers:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if out[y + dy + oy, x + dx + ox, 3] < 128:
                out[y + dy + oy, x + dx + ox] = OUTLINE
    for dx, dy, c in slivers:
        out[y + dy, x + dx] = c


def main() -> None:
    im = np.array(Image.open(HERE / 'arrow.png').convert('RGBA'))
    rear, head, bx, by = parts(im)
    out = np.zeros_like(im)
    out[rear[..., 3] >= 128] = rear[rear[..., 3] >= 128]
    # A quarter turn clockwise about the break: the head hangs down to the right.
    turned = np.rot90(head, k=-1)
    h = im.shape[0]
    # (x, y) -> (h-1-y, x) under the turn; shift so the break stays where it was.
    dx, dy = bx - (h - 1 - by), by - bx
    moved = np.roll(np.roll(turned, dy, axis=0), dx, axis=1)
    keep = moved[..., 3] >= 128
    out[keep] = moved[keep]
    splinters(out, bx, by)
    Image.fromarray(out).save(HERE / 'arrow-broken.png')
    print('arrow-broken.png')


if __name__ == '__main__':
    main()
