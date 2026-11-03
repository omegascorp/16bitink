"""Cuts a PixelLab sheet of separate sprites into one image each: the alpha's
connected islands (pixels closer than MERGE count as one, so a crown and its
trunk stay together), largest first.
  python3 dev/pixel/map/split.py <sheet.png> <out-prefix>  -> <out-prefix>-<n>.png
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

MERGE = 2
MIN_AREA = 120


def islands(alpha: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    h, w = alpha.shape
    solid = alpha > 0
    seen = np.zeros_like(solid)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if not solid[y0, x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            l, t, r, b, n = x0, y0, x0, y0, 0
            while q:
                y, x = q.popleft()
                n += 1
                l, t, r, b = min(l, x), min(t, y), max(r, x), max(b, y)
                for dy in range(-MERGE, MERGE + 1):
                    for dx in range(-MERGE, MERGE + 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and solid[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            q.append((yy, xx))
            if n >= MIN_AREA:
                out.append((l, t, r + 1, b + 1, n))
    return sorted(out, key=lambda i: -i[4])


def split(sheet: Path, prefix: str) -> list[Path]:
    im = Image.open(sheet).convert('RGBA')
    paths = []
    for i, (l, t, r, b, _) in enumerate(islands(np.array(im)[:, :, 3])):
        p = Path(f'{prefix}-{i}.png')
        p.parent.mkdir(parents=True, exist_ok=True)
        im.crop((l, t, r, b)).save(p)
        paths.append(p)
    return paths


if __name__ == '__main__':
    for p in split(Path(sys.argv[1]), sys.argv[2]):
        print(p, Image.open(p).size)
