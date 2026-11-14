"""Rolling frames for drives, the truck and the fortress treads, made from the painted base frame.

  python3 dev/pixel/rollframes.py            rewrites the -f1/-f2 drive frames, truck-1-f2 and fortress-treads-f2
  python3 dev/pixel/rollframes.py --check    only reports which frame sets are static

The paint pass painted one frame per drive and the install copied it to -f1 and -f2, so 25 of 36 drives (every
Tracks drive) never rolled. Here each frame is the base with its tread slid along the drive (towards the front,
-y, the way the top run of a track moves) by a share of the tread's own period. Only the tread moves: each column's
run of tread pixels is shifted inside its own ends, filled from one period back, so the outline never changes and
the pattern has no seam.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PARTS = ROOT / 'src/art/pixel/parts'
VEHICLES = ROOT / 'src/art/pixel/world/vehicles'
# Rounded track ends and tyre edges stay put: this many pixels at each end of a run.
CAP = 2
# A run shorter than this is a rivet or an edge, not tread.
MIN_RUN = 8
# The truck's body runs the full length: only short runs at its sides are tyres.
TRUCK_MAX_RUN = 30


def runs(col: np.ndarray) -> list[tuple[int, int]]:
    """Opaque runs [y0, y1) in a column of alpha."""
    out, y, n = [], 0, len(col)
    while y < n:
        if col[y] > 0:
            y0 = y
            while y < n and col[y] > 0:
                y += 1
            out.append((y0, y))
        else:
            y += 1
    return out


def tread_runs(a: np.ndarray, max_run: int | None) -> list[tuple[int, int, int]]:
    """(x, y0, y1) of every run that is tread, without its caps."""
    out = []
    for x in range(a.shape[1]):
        for y0, y1 in runs(a[:, x, 3]):
            if y1 - y0 < MIN_RUN or (max_run is not None and y1 - y0 > max_run):
                continue
            out.append((x, y0 + CAP, y1 - CAP))
    return out


def period(a: np.ndarray, rs: list[tuple[int, int, int]]) -> int:
    """The tread's repeat along y, 3–10 px: the shift that best matches the pattern to itself."""
    lum = a[..., :3].astype(float).mean(axis=2)
    best, best_err = 4, float('inf')
    for p in range(3, 11):
        err, n = 0.0, 0
        for x, y0, y1 in rs:
            if y1 - y0 <= p:
                continue
            seg = lum[y0:y1, x]
            err += float(np.abs(seg[p:] - seg[:-p]).sum())
            n += len(seg) - p
        if n and err / n < best_err:
            best, best_err = p, err / n
    return best


def rolled(a: np.ndarray, rs: list[tuple[int, int, int]], p: int, shift: int) -> np.ndarray:
    """The base with each tread run slid `shift` px towards -y, filled from one period back."""
    out = a.copy()
    for x, y0, y1 in rs:
        if y1 - y0 <= p:
            continue
        for y in range(y0, y1):
            src = y + shift
            while src >= y1:
                src -= p
            out[y, x] = a[src, x]
    return out


def frames_for(base: Path, outs: list[Path], max_run: int | None = None) -> str:
    a = np.array(Image.open(base).convert('RGBA'))
    rs = tread_runs(a, max_run)
    if not rs:
        return f'{base.name}: no tread found, skipped'
    p = period(a, rs)
    steps = len(outs) + 1
    for i, path in enumerate(outs, start=1):
        Image.fromarray(rolled(a, rs, p, round(i * p / steps))).save(path)
    return f'{base.name}: period {p} px, {len(rs)} tread columns -> {", ".join(o.name for o in outs)}'


def static(paths: list[Path]) -> bool:
    ims = [np.array(Image.open(p).convert('RGBA')) for p in paths]
    return all(np.array_equal(ims[0], im) for im in ims[1:])


def main() -> None:
    check = '--check' in sys.argv
    jobs: list[tuple[Path, list[Path], int | None]] = []
    for base in sorted(PARTS.glob('drive*.png')):
        if base.stem.endswith(('-f1', '-f2')):
            continue
        jobs.append((base, [base.with_name(f'{base.stem}-f1.png'), base.with_name(f'{base.stem}-f2.png')], None))
    jobs.append((VEHICLES / 'truck-1.png', [VEHICLES / 'truck-1-f2.png'], TRUCK_MAX_RUN))
    jobs.append((VEHICLES / 'fortress-treads.png', [VEHICLES / 'fortress-treads-f2.png'], None))
    for base, outs, max_run in jobs:
        if check:
            print(f'{base.name}: {"STATIC" if static([base, *outs]) else "rolls"}')
        else:
            print(frames_for(base, outs, max_run))


if __name__ == '__main__':
    main()
