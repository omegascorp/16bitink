# Builds a terrain's battle scenery: the separate parts the backdrop is composed from at run
# time (src/scenes/battle/pixelScenery.ts), so every battle's background is laid out fresh
# for the screen and never repeats.
#   python3 dev/pixel/scenery.py <terrain> [...]
# reads  dev/pixel/parts/<terrain>/scenery.json  (which sheets hold which kind of part)
# writes src/art/pixel/scenery/<terrain>.png     (one atlas of every part)
#        src/art/pixel/scenery.ts                (rects by kind, sky gradient, ground colour)
# Sheets are cut into their separate sprites (opaque islands, merged within MERGE px);
# ground patches are cut from the terrain's ground painting with a ragged, dithered rim.
# Alpha is made binary, so parts stay pixel-exact when they are laid over each other.
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
GAME = HERE.parents[1]
OUT = GAME / 'src' / 'art' / 'pixel' / 'scenery'
KINDS = ('cloud', 'mountain', 'far', 'hill', 'tree', 'landmark', 'patch', 'tuft', 'stone', 'bush')
MERGE = 2  # islands closer than this are one sprite (a tree's crown and trunk)
ATLAS_W = 1024
BAYER = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16


def islands(mask: np.ndarray, merge: int) -> list[np.ndarray]:
    """Boolean masks of the 8-connected islands of `mask` (grown by `merge` px to join)."""
    h, w = mask.shape
    grown = mask.copy()
    for _ in range(merge):
        g = grown.copy()
        g[1:] |= grown[:-1]
        g[:-1] |= grown[1:]
        g[:, 1:] |= grown[:, :-1]
        g[:, :-1] |= grown[:, 1:]
        grown = g
    label = np.zeros((h, w), dtype=np.int32)
    n = 0
    for y, x in zip(*np.nonzero(grown)):
        if label[y, x]:
            continue
        n += 1
        stack = [(y, x)]
        label[y, x] = n
        while stack:
            cy, cx = stack.pop()
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if grown[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = n
                        stack.append((ny, nx))
    return [(label == i) & mask for i in range(1, n + 1)]


def cut_sheet(path: Path, spec: dict) -> list[np.ndarray]:
    im = np.array(Image.open(path).convert('RGBA'))
    if spec.get('cropBottom'):
        im = im[:im.shape[0] - spec['cropBottom']]
    opaque = im[..., 3] >= 128
    im[..., 3] = np.where(opaque, 255, 0)
    parts = [opaque] if spec.get('whole') else islands(opaque, spec.get('merge', MERGE))
    out = []
    for m in parts:
        if m.sum() < spec.get('minArea', 24):
            continue
        ys, xs = np.nonzero(m)
        if ys.max() - ys.min() + 1 > spec.get('maxHeight', 10 ** 6):
            continue  # too tall for its place, or two parts stacked into one
        sprite = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        sprite[..., 3] = np.where(m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], sprite[..., 3], 0)
        out.append(sprite)
    return out


def cut_patches(path: Path, spec: dict, rng: np.random.Generator) -> list[np.ndarray]:
    """Ragged round pieces of the ground painting whose rim dissolves in an ordered dither,
    so overlapping pieces blend without new colours."""
    src = np.array(Image.open(path).convert('RGB'))
    a, b = spec.get('rows', (0, src.shape[0]))
    src = src[a:b]
    lo, hi = spec.get('size', (96, 160))
    rim = spec.get('rim', 14)
    out = []
    for _ in range(spec.get('count', 24)):
        size = int(rng.integers(lo, hi + 1)) // 4 * 4
        y = int(rng.integers(0, src.shape[0] - size + 1))
        x = int(rng.integers(0, src.shape[1] - size + 1))
        piece = src[y:y + size, x:x + size]
        c = (size - 1) / 2
        yy, xx = np.mgrid[0:size, 0:size]
        ang = np.arctan2(yy - c, xx - c)
        wobble = sum(rng.uniform(0.04, 0.1) * np.sin(k * ang + rng.uniform(0, 6.3)) for k in (2, 3, 5))
        edge = c * (0.92 + wobble)
        inside = (edge - np.hypot(yy - c, xx - c)) / rim  # 1+ = solid, 0..1 = rim, <0 = out
        keep = inside >= np.tile(BAYER, (size // 4 + 1, size // 4 + 1))[:size, :size]
        alpha = np.where(keep & (inside > 0), 255, 0).astype(np.uint8)
        out.append(np.dstack([piece, alpha]))
    return out


def pack(sprites: list[tuple[str, np.ndarray]]) -> tuple[np.ndarray, list[tuple[str, int, int, int, int]]]:
    """Shelf-packs sprites (tallest first) into one atlas; returns it and (kind, x, y, w, h)."""
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i][1].shape[0])
    x = y = shelf = 0
    placed = [None] * len(sprites)
    for i in order:
        h, w = sprites[i][1].shape[:2]
        if x + w > ATLAS_W:
            x, y, shelf = 0, y + shelf + 1, 0
        placed[i] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    atlas = np.zeros((y + shelf, ATLAS_W, 4), dtype=np.uint8)
    rects = []
    for (kind, s), (px, py) in zip(sprites, placed):
        h, w = s.shape[:2]
        atlas[py:py + h, px:px + w] = s
        rects.append((kind, px, py, w, h))
    return atlas, rects


def build(terrain: str) -> dict:
    folder = HERE / 'parts' / terrain
    spec = json.loads((folder / 'scenery.json').read_text())
    rng = np.random.default_rng(sum(map(ord, terrain)))
    sprites: list[tuple[str, np.ndarray]] = []
    for kind, sheets in spec['parts'].items():
        assert kind in KINDS, kind
        for sheet in sheets:
            src = (folder / sheet['sheet']).resolve()
            cut = cut_patches(src, sheet, rng) if kind == 'patch' else cut_sheet(src, sheet)
            sprites += [(kind, s) for s in cut]
    atlas, rects = pack(sprites)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas).save(OUT / f'{terrain}.png')
    ground = np.array(Image.open((folder / spec['groundColour']['from']).resolve()).convert('RGB'))
    a, b = spec['groundColour'].get('rows', (0, ground.shape[0]))
    base = '#%02x%02x%02x' % tuple(np.median(ground[a:b].reshape(-1, 3), axis=0).astype(int))
    counts = {k: sum(1 for r in rects if r[0] == k) for k in KINDS}
    print(terrain, atlas.shape[1], 'x', atlas.shape[0], counts)
    return {'sky': spec['sky']['stops'], 'ground': base, 'rects': rects}


def write_manifest(done: dict[str, dict]) -> None:
    lines = ["// Generated by dev/pixel/scenery.py from dev/pixel/parts/<terrain>/scenery.json. Do not edit by hand.",
             "// Battle scenery: separate parts the backdrop lays out at run time (pixelScenery.ts).",
             "// Each rect is [x, y, w, h] in the terrain's atlas; sprites stand on their bottom row."]
    for t in done:
        lines.append(f"import {t}Atlas from './scenery/{t}.png?url';")
    lines += ["", "export type SceneryKind = " + ' | '.join(f"'{k}'" for k in KINDS) + ";",
              "export type Rect = readonly [number, number, number, number];", "",
              "export interface SceneryArt {",
              "  readonly url: string;",
              "  /** Sky colour stops as [rows above the horizon, colour], highest first; dithered between. */",
              "  readonly sky: readonly (readonly [number, string])[];",
              "  /** The bare ground under the patches. */",
              "  readonly ground: string;",
              "  readonly parts: Readonly<Partial<Record<SceneryKind, readonly Rect[]>>>;",
              "}", "",
              "export const SCENERY: Readonly<Record<string, SceneryArt>> = {"]
    for t, d in done.items():
        lines.append(f"  {t}: {{")
        lines.append(f"    url: {t}Atlas,")
        lines.append("    sky: [" + ', '.join(f"[{h}, '{c}']" for h, c in d['sky']) + "],")
        lines.append(f"    ground: '{d['ground']}',")
        lines.append("    parts: {")
        for k in KINDS:
            rs = [r for r in d['rects'] if r[0] == k]
            if rs:
                lines.append(f"      {k}: [" + ', '.join(f"[{x}, {y}, {w}, {h}]" for _, x, y, w, h in rs) + "],")
        lines += ["    },", "  },"]
    lines.append("};")
    (OUT.parent / 'scenery.ts').write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    terrains = sys.argv[1:] or sorted(p.name for p in (HERE / 'parts').iterdir() if (p / 'scenery.json').exists())
    write_manifest({t: build(t) for t in terrains})
