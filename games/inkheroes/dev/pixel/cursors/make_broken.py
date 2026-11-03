# Makes the broken-arrow cursor from the arrow: the sprite is cut across its shaft halfway
# along it (the shaft runs bottom-left to top-right), and the two halves are pushed apart
# along the shaft with a little sideways kink, so it reads as snapped. Pixels are only moved.
#   python3 dev/pixel/cursors/make_broken.py  -> arrow-broken.png
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
GAP = 2  # px each half moves away from the break, along the shaft
KINK = 1  # px the head half also drops sideways

im = np.array(Image.open(HERE / 'arrow.png').convert('RGBA'))
h, w = im.shape[:2]
ys, xs = np.nonzero(im[..., 3] >= 128)
along = xs - ys  # position along the bottom-left -> top-right shaft
mid = (along.min() + along.max()) / 2
out = np.zeros_like(im)
yy, xx = np.mgrid[0:h, 0:w]
head = (xx - yy) > mid
for part, (dx, dy) in ((~head, (-GAP, GAP)), (head, (GAP + KINK, -GAP + KINK))):
    src = im * part[..., None]
    shifted = np.roll(np.roll(src, dy, axis=0), dx, axis=1)
    keep = shifted[..., 3] > 0
    out[keep] = shifted[keep]
Image.fromarray(out).save(HERE / 'arrow-broken.png')
print('arrow-broken.png')
