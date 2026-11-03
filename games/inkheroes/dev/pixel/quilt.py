# Builds the 1408x1056 battle backgrounds (the 960x540 world sits at (224,258) in them) by
# image quilting: the 768-wide PixelLab pieces in dev/pixel/bg960/ stay in the middle and the
# area around them is filled with patches cut from the same painting, each joined along its
# minimum-error seam. Never mirrors, never blends: every pixel is one of the painting's own.
# The sky above the horizon strip is quilted upward from the strip's top rows.
#   python3 dev/pixel/quilt.py <terrain> [<terrain> ...]  -> dev/pixel/bg/<terrain>.png
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
# The painting is placed so the world sees the horizon's hills and trees at its top edge
# (behind the first hex row, as in H3) even on a plain 16:9 screen.
SKY = 178  # rows of quilted sky above the horizon strip
W, H = 1408, 1056
CX = (W - 768) // 2  # 320: where the 768-wide pieces go
GROUND_Y = 140  # the ground piece's top, below the strip's top; the strip covers 160 rows over it
SKY_P, SKY_O, SKY_ROWS = 32, 8, 48  # sky patches are cut from the strip's top SKY_ROWS rows
BLEND = 24  # horizon rows that dissolve into the ground
BAYER = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16
# Patch grids are anchored so a patch's strip lands exactly on the pinned piece's edge:
# (768 - O) must be a multiple of S = P - O for both sides to line up.
GROUND_P, GROUND_O = 64, 20
HORIZON_P, HORIZON_O = 86, 24
TOLERANCE = 0.15
# Ground columns dropped from the left of a painting (sand's sun glow ends in a hard edge);
# 768 - trim - GROUND_O must stay a multiple of GROUND_P - GROUND_O.
TRIM = {'sand': 220}
# Horizon columns the sky is quilted from, where the strip's top rows hold branches.
SKY_FROM = {'swamp': (407, 633)}
# Horizon columns never copied (a landmark appears once; the left edge holds the sun's glow).
AVOID = {
    'grass': [(0, 60), (280, 400)],
    'dirt': [(0, 30), (280, 480)],
    'rough': [(0, 40), (320, 440)],
    'sand': [(0, 130), (90, 480), (660, 768)],
    'snow': [],
    'swamp': [(200, 520)],
}  # pick at random among candidates within this much of the best match


def cut_vertical(err: np.ndarray) -> np.ndarray:
    """Cheapest top-to-bottom path through err (h x w); returns the column per row."""
    h, w = err.shape
    cost = err.copy()
    for y in range(1, h):
        prev = cost[y - 1]
        best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
        cost[y] += best
    path = np.empty(h, dtype=int)
    path[-1] = int(np.argmin(cost[-1]))
    for y in range(h - 2, -1, -1):
        x = path[y + 1]
        lo, hi = max(0, x - 1), min(w, x + 2)
        path[y] = lo + int(np.argmin(cost[y, lo:hi]))
    return path


def keep_old_mask(old: np.ndarray, new: np.ndarray, filled: np.ndarray, o: int) -> np.ndarray:
    """Which filled pixels of the patch keep the old value: those beyond the seam cut through
    each overlap strip (left, top, right) that has filled pixels in it."""
    ph, pw = filled.shape
    err = ((old.astype(np.int32) - new.astype(np.int32)) ** 2).sum(axis=2).astype(float)
    err[~filled] = 0
    keep = np.zeros_like(filled)
    cols, rows = np.arange(pw)[None, :], np.arange(ph)[:, None]
    if filled[:, :o].any():
        path = cut_vertical(err[:, :o])
        keep |= cols < path[:, None]
    if filled[:, pw - o:].any():
        path = cut_vertical(err[:, pw - o:]) + pw - o
        keep |= cols > path[:, None]
    if filled[:o, :].any():
        path = cut_vertical(err[:o, :].T)
        keep |= rows < path[None, :]
    inner = np.zeros_like(filled)
    inner[o:, o:pw - o] = True
    keep |= filled & inner  # pinned painting deep inside the patch always stays
    return keep & filled


def quilt(src: np.ndarray, out_w: int, out_h: int, pin_x: int, p: int, o: int,
          rows_for, rng: np.random.Generator, avoid: list[tuple[int, int]] = (),
          pool: np.ndarray | None = None) -> np.ndarray:
    """Grows src (pinned at (pin_x, 0)) to out_w x out_h. rows_for(ty) gives the source rows
    a patch at target row ty may be cut from, so light and perspective stay in their band."""
    sh, sw, _ = src.shape
    s = p - o
    pad = p
    out = np.zeros((out_h + 2 * pad, out_w + 2 * pad, 3), dtype=np.uint8)
    filled = np.zeros(out.shape[:2], dtype=bool)
    out[pad:pad + sh, pad + pin_x:pad + pin_x + sw] = src
    filled[pad:pad + sh, pad + pin_x:pad + pin_x + sw] = True
    inside = np.zeros_like(filled)
    inside[pad:pad + out_h, pad:pad + out_w] = True
    ax = pin_x + o - p  # this patch's right strip is the pinned piece's left edge
    xs = range(ax - s * ((ax + p) // s + 1), out_w, s)
    ay = sh - o  # this patch's top strip is the pinned piece's bottom edge
    ys = range(ay - s * ((ay + p) // s + 1), out_h, s)
    for ty in ys:
        for tx in xs:
            if tx + p <= 0 or ty + p <= 0:
                continue
            y0, x0 = ty + pad, tx + pad
            old = out[y0:y0 + p, x0:x0 + p]
            have = filled[y0:y0 + p, x0:x0 + p]
            if (have | ~inside[y0:y0 + p, x0:x0 + p]).all():
                continue
            new = pick(src if pool is None else pool, old, have, rows_for(ty), p, rng, avoid)
            keep = keep_old_mask(old, new, have, o)
            out[y0:y0 + p, x0:x0 + p] = np.where(keep[..., None], old, new)
            filled[y0:y0 + p, x0:x0 + p] = True
    return out[pad:pad + out_h, pad:pad + out_w]


def quilt_columns(src: np.ndarray, out_w: int, pin_x: int, p: int, o: int,
                  rng: np.random.Generator, avoid: list[tuple[int, int]]) -> np.ndarray:
    """Grows a strip sideways with full-height patches p wide (sky, hills and trees stay
    in their rows), each joined along its cheapest vertical seam."""
    sh, sw, _ = src.shape
    s = p - o
    out = np.zeros((sh, out_w + 2 * p, 3), dtype=np.uint8)
    filled = np.zeros(out.shape[:2], dtype=bool)
    out[:, p + pin_x:p + pin_x + sw] = src
    filled[:, p + pin_x:p + pin_x + sw] = True
    xs = np.array([x for x in range(0, sw - p + 1)
                   if not any(x < b and x + p > a for a, b in avoid)])
    ax = pin_x + o - p
    for tx in range(ax - s * ((ax + p) // s + 1), out_w, s):
        x0 = tx + p
        cols = filled[0, x0:x0 + p]
        lo, hi = max(0, -tx), min(p, out_w - tx)
        if lo >= hi or cols[lo:hi].all():
            continue
        old = out[:, x0:x0 + p].astype(np.int32)
        have = filled[:, x0:x0 + p]
        band = np.lib.stride_tricks.sliding_window_view(src.astype(np.int32), p, axis=1)
        band = band[:, xs].transpose(1, 0, 3, 2)  # (n, sh, p, 3)
        costs = (((band - old) ** 2) * have[..., None]).sum(axis=(1, 2, 3))
        ok = np.flatnonzero(costs <= costs.min() * (1 + TOLERANCE) + 1)
        sx = int(xs[ok[rng.integers(len(ok))]])
        new = src[:, sx:sx + p]
        err = ((old - new) ** 2).sum(axis=2).astype(float)
        keep = np.zeros_like(have)
        c = np.arange(p)[None, :]
        if cols[:o].any():
            keep |= c < cut_vertical(err[:, :o])[:, None]
        if cols[p - o:].any():
            keep |= c > (cut_vertical(err[:, p - o:]) + p - o)[:, None]
        keep &= have
        out[:, x0:x0 + p] = np.where(keep[..., None], old, new).astype(np.uint8)
        filled[:, x0:x0 + p] = True
    return out[:, p:p + out_w]


def pick(src: np.ndarray, old: np.ndarray, have: np.ndarray, rows: range, p: int,
         rng: np.random.Generator, avoid=()) -> np.ndarray:
    sw = src.shape[1]
    xs = np.array([x for x in range(0, sw - p + 1, 2)
                   if not any(x < b and x + p > a for a, b in avoid)])
    cands = [(sy, int(sx)) for sy in rows for sx in xs]
    if not have.any():
        sy, sx = cands[rng.integers(len(cands))]
        return src[sy:sy + p, sx:sx + p]
    m = have[..., None]
    target = old.astype(np.int32)
    costs = []
    for sy in rows:  # every x offset of one source row band at once
        band = np.lib.stride_tricks.sliding_window_view(src[sy:sy + p].astype(np.int32), p, axis=1)
        band = band[:, xs].transpose(1, 0, 3, 2)  # (n, p, p, 3)
        costs.append((((band - target) ** 2) * m).sum(axis=(1, 2, 3)))
    costs = np.concatenate(costs)
    ok = np.flatnonzero(costs <= costs.min() * (1 + TOLERANCE) + 1)
    sy, sx = cands[ok[rng.integers(len(ok))]]
    return src[sy:sy + p, sx:sx + p]


def near(ty: int, slack: int, last: int) -> range:
    """Source rows within `slack` of target row ty, kept inside 0..last."""
    lo = min(max(0, ty - slack), last)
    return range(lo, min(last, max(0, ty) + slack) + 1, 2)


def sky_above(sky: np.ndarray, pool: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """SKY rows of sky to stack on top of `sky` (the strip's top rows), cut from `pool`.
    Quilting grows downward, so it runs on the rows in reverse order and the result is
    turned back: the patches themselves keep their own orientation."""
    sh = sky.shape[0]
    grown = quilt(sky[::-1], W, sh + SKY, 0, SKY_P, SKY_O,
                  lambda ty: range(0, sh - SKY_P + 1), rng, pool=pool[::-1])
    return grown[sh:][::-1]


def build(terrain: str) -> Path:
    rng = np.random.default_rng(sum(map(ord, terrain)))
    src = HERE / 'bg960'
    ground = np.array(Image.open(src / f'{terrain}-ground.png').convert('RGB'))
    horizon = np.array(Image.open(src / f'{terrain}-horizon.png').convert('RGB'))
    gh, hh = ground.shape[0], horizon.shape[0]
    p, hp = GROUND_P, HORIZON_P

    def ground_rows(ty: int) -> range:
        if ty < gh:  # beside the painting: cut from about the same rows
            return near(min(ty, gh - p), 24, gh - p)
        return range(gh // 2, gh - p + 1, 2)  # below it: the nearest ground

    trim = TRIM.get(terrain, 0)
    scene_h = H - SKY
    g = quilt(ground[:, trim:], W, scene_h - GROUND_Y, CX + trim, p, GROUND_O, ground_rows, rng)
    hz = quilt_columns(horizon, W, CX, hp, HORIZON_O, rng, AVOID[terrain])
    scene = np.zeros((scene_h, W, 3), dtype=np.uint8)
    scene[GROUND_Y:] = g
    keep = np.clip((hh - 1 - np.arange(hh)) / BLEND, 0, 1)[:, None]
    dither = np.tile(BAYER, (hh // 4 + 1, W // 4))[:hh, :W]
    use_h = (keep >= 1) | (dither < keep) | (np.arange(hh)[:, None] < GROUND_Y)
    scene[:hh] = np.where(use_h[..., None], hz, scene[:hh])
    a, b = SKY_FROM.get(terrain, (0, horizon.shape[1]))
    sky = sky_above(hz[:SKY_ROWS], horizon[:SKY_ROWS, a:b], rng)
    out = np.concatenate([sky, scene])
    path = HERE / 'bg' / f'{terrain}.png'
    Image.fromarray(out).save(path)
    return path


if __name__ == '__main__':
    for t in sys.argv[1:]:
        print(build(t))
