"""Makes a painted 512 x 512 ground tile seamlessly.

  python3 dev/pixel/world/seam.py prep <name>     paint/ground/raw-<name>.png -> out/seam/<name>-rolled.png + <name>-mask.png
  python3 dev/pixel/world/seam.py check <name>    paint/ground/seam-<name>.png: did the inpaint keep the unmasked pixels?

The tile is rolled by half, so its old edges meet in a cross through the middle and its new edges are the old middle,
which tiles. PixelLab inpaint_image repaints the cross (a wobbly band, not a straight one) and the tile is seamless.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'seam'
HALF = 22


def mask(n: int = 512, seed: int = 0) -> np.ndarray:
    ys, xs = np.mgrid[0:n, 0:n]
    c = n / 2
    wob_x = HALF + 7 * np.sin(ys * 0.045 + seed) + 4 * np.sin(ys * 0.13 + 2 * seed)
    wob_y = HALF + 7 * np.sin(xs * 0.05 + 3 + seed) + 4 * np.sin(xs * 0.11 + seed)
    off_x = 6 * np.sin(ys * 0.02 + seed)
    off_y = 6 * np.sin(xs * 0.025 + 1 + seed)
    return (np.abs(xs - c - off_x) < wob_x) | (np.abs(ys - c - off_y) < wob_y)


def wrap_blur(a: np.ndarray, r: int) -> np.ndarray:
    """A box blur that wraps round the tile's edges, r pixels either way, three passes (near Gaussian)."""
    out = a.astype(float)
    for _ in range(3):
        for axis in (0, 1):
            c = np.cumsum(np.concatenate([np.take(out, range(-r - 1, 0), axis=axis), out, np.take(out, range(0, r), axis=axis)], axis=axis), axis=axis)
            n = out.shape[axis]
            out = (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)
    return out


def flatten(a: np.ndarray, keep: float, r: int = 40) -> np.ndarray:
    """Takes out most of the big light and dark blotches, which are what makes a repeat show; keeps the fine paint."""
    low = wrap_blur(a, r)
    return np.clip(a - (1 - keep) * (low - low.mean(axis=(0, 1))), 0, 255).astype(np.uint8)


def prep(name: str, keep: str = '0.4') -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    a = flatten(np.array(Image.open(HERE / 'paint' / 'ground' / f'raw-{name}.png').convert('RGB')), float(keep))
    rolled = np.roll(np.roll(a, a.shape[0] // 2, axis=0), a.shape[1] // 2, axis=1)
    Image.fromarray(rolled).save(OUT / f'{name}-rolled.png')
    Image.fromarray((mask(a.shape[0]) * 255).astype(np.uint8)).save(OUT / f'{name}-mask.png')
    print(name, 'prepared')


def check(name: str) -> None:
    rolled = np.array(Image.open(OUT / f'{name}-rolled.png').convert('RGB')).astype(int)
    done = np.array(Image.open(HERE / 'paint' / 'ground' / f'seam-{name}.png').convert('RGB')).astype(int)
    m = mask(rolled.shape[0])
    diff = np.abs(rolled - done).sum(axis=-1)
    print(name, 'kept outside the mask:', round(float((diff[~m] < 6).mean()), 3), ' edge step x/y:',
          round(float(np.abs(done[:, 0] - done[:, -1]).mean()), 1), round(float(np.abs(done[0] - done[-1]).mean()), 1),
          ' inside step:', round(float(np.abs(done[:, 100] - done[:, 101]).mean()), 1))


def final(name: str, keep: str = '1') -> None:
    """The seamed tile, flattened again with wrap (still seamless), as paint/ground/<name>.png."""
    a = np.array(Image.open(HERE / 'paint' / 'ground' / f'seam-{name}.png').convert('RGB'))
    Image.fromarray(flatten(a, float(keep)) if float(keep) < 1 else a).save(HERE / 'paint' / 'ground' / f'{name}.png')


if __name__ == '__main__':
    {'prep': prep, 'check': check, 'final': final}[sys.argv[1]](*sys.argv[2:])
