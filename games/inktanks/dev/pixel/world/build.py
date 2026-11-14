"""Renders the world structures from their 3D models.

  python3 dev/pixel/world/build.py [--only=a,b] [--view]

Writes out/render/<name>/<name>-<state>[-front|-roof].png and <name>-<state>-shadow.png, all of one structure on the same
canvas, so one anchor serves every state and piece; out/render/structures.json holds anchor, footprint, height, sorts.
--view also writes out/view.png, every piece on grey.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import hull  # noqa: E402
from render3d import SUN, ShadowMap, blur, render, shrink  # noqa: E402
import farm  # noqa: E402,F401
import props  # noqa: E402,F401
import cover  # noqa: E402,F401
from farm import REGISTRY  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'render'
K = 3
PAD = 4


def screen_box(tris: np.ndarray) -> tuple[float, float, float, float]:
    sx, sy = tris[..., 0], tris[..., 1] - tris[..., 2]
    return float(sx.min()), float(sy.min()), float(sx.max()), float(sy.max())


def shadow_of(meshes, box) -> np.ndarray:
    """The ground shadow the meshes cast, on the canvas box (x0, y0, w, h) in native px: alpha 0..1."""
    x0, y0, w, h = box
    tris = np.concatenate([m.arrays()[0] for m in meshes if m.tris])
    xs, ys = tris[..., 0], tris[..., 1]
    span = max(xs.max() - xs.min(), ys.max() - ys.min()) + 2 * tris[..., 2].max() + 40
    sm = ShadowMap((-span, span, -span, span)).add(tris)
    s = 3
    gy, gx = np.mgrid[0:h * s, 0:w * s]
    pts = np.stack([gx.ravel() / s + x0 + 0.5 / s, gy.ravel() / s + y0 + 0.5 / s, np.full(w * h * s * s, 0.05)], axis=1)
    lit = sm.lit(pts).reshape(h * s, w * s)
    return 1 - lit.reshape(h, s, w, s).mean(axis=(1, 3))


def build(name: str, spec: dict) -> dict:
    out = OUT / name
    out.mkdir(parents=True, exist_ok=True)
    states = {st: spec['build'](st) for st in spec['states']}
    # One canvas for every state and piece, and for the shadows: the shadow of height z falls (0.78 z, -0.58 z) away.
    boxes = [screen_box(m.arrays()[0]) for ps in states.values() for m in ps.values() if m.tris]
    top = max(float(m.arrays()[0][..., 2].max()) for ps in states.values() for m in ps.values() if m.tris)
    sx = -SUN[0] / SUN[2]
    sy = -SUN[1] / SUN[2]
    gx0 = min(b[0] for b in boxes)
    gy0 = min(b[1] for b in boxes)
    gx1 = max(b[2] for b in boxes)
    gy1 = max(b[3] for b in boxes)
    gx1 = max(gx1, gx1 + sx * top * 0.0)
    x0 = math.floor(min(gx0, gx0 + sx * top)) - PAD
    y0 = math.floor(min(gy0, gy0 + sy * top - top * 0.2)) - PAD
    x1 = math.ceil(max(gx1, gx1 + sx * top)) + PAD
    y1 = math.ceil(gy1) + PAD
    w, h = x1 - x0, y1 - y0
    meta = {'anchor': [-x0, -y0], 'size': [w, h], 'states': spec['states'], 'hp': spec['hp'], 'flattenable': spec['flattenable'],
            'cover': spec['cover'], 'height': round(top, 1), 'footprint': {}, 'pieces': {}, 'roofFade': {}}
    for st, pieces in states.items():
        all_tris = [m for m in pieces.values() if m.tris]
        for piece, mesh in pieces.items():
            if not mesh.tris:
                continue
            tris, cols = mesh.arrays()
            sm = ShadowMap((-400, 400, -400, 400))
            for other in all_tris:
                sm.add(other.arrays()[0])
            rgba, rx, ry = render(tris, cols, sm, K)
            im = Image.fromarray(shrink(rgba, K))
            canvas = Image.new('RGBA', (w, h))
            canvas.alpha_composite(im, (rx - x0, ry - y0))
            key = f'{name}-{st}' + ('' if piece == 'body' else f'-{piece}')
            canvas.save(out / f'{key}.png')
            if mesh.floor_ids:
                fc = np.array([[1.0, 1.0, 1.0] if i in mesh.floor_ids else [0.0, 0.0, 0.0] for i in range(len(cols))])
                frgba, _, _ = render(tris, fc, sm, K)
                fim = Image.fromarray(shrink(frgba, K))
                fl = Image.new('RGBA', (w, h))
                fl.alpha_composite(fim, (rx - x0, ry - y0))
                f = np.array(fl)
                Image.fromarray(((f[..., :3].max(axis=-1) > 12) & (f[..., 3] > 0)).astype(np.uint8) * 255).save(out / f'{key}-floor.png')
            bb = canvas.getbbox()
            ground = [p for m in pieces.values() for r in m.runs for p in r]
            ys_ = [p[1] for p in ground] or [0.0]
            sort = 999 if piece == 'roof' else (min(ys_) + 2 if piece == 'body' and 'front' in pieces else max(ys_))
            meta['pieces'][key] = {'sortY': round(sort, 1), 'bbox': list(bb) if bb else None}
            if piece == 'roof' and bb:
                meta['roofFade'][str(st)] = [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]
        dark = shadow_of(all_tris, (x0, y0, w, h))
        alpha = np.clip(blur(dark, 1) * 1.1, 0, 1) * 110
        sh = Image.fromarray(np.dstack([np.full((h, w, 3), 18.0), alpha]).astype(np.uint8))
        sh.save(out / f'{name}-{st}-shadow.png')
        runs = [r for m in pieces.values() for r in m.runs]
        if spec['foot'] == 'hull' and runs:
            polys = [hull([p for r in runs for p in r])]
        else:
            polys = [hull(r) for r in runs]
        meta['footprint'][str(st)] = [[[round(x, 1), round(y, 1)] for x, y in p] for p in polys if len(p) >= 3]
    return meta


def view(meta: dict) -> None:
    """Every structure's states side by side on grey, at 1:1."""
    rows, x, y, rowh = [], 0, 0, 0
    tiles = []
    for name, m in meta.items():
        for st in m['states']:
            w, h = m['size']
            if x + w > 1900:
                x, y, rowh = 0, y + rowh + 6, 0
            tiles.append((name, st, x, y))
            x += w + 6
            rowh = max(rowh, h)
    sheet = Image.new('RGBA', (1900, y + rowh + 6), (112, 118, 100, 255))
    for name, st, x, y in tiles:
        d = OUT / name
        for suffix in ('-shadow', '', '-front', '-roof'):
            p = d / f'{name}-{st}{suffix}.png'
            if p.exists():
                sheet.alpha_composite(Image.open(p), (x, y))
    sheet.save(HERE / 'out' / 'view.png')
    print('view', sheet.size)


def main() -> None:
    only = next((a.split('=')[1].split(',') for a in sys.argv if a.startswith('--only=')), None)
    path = OUT / 'structures.json'
    meta = json.loads(path.read_text()) if path.exists() else {}
    for name, spec in REGISTRY.items():
        if spec.get('view') != 'oblique' or (only and name not in only):
            continue
        meta[name] = build(name, spec)
        print(name, meta[name]['size'], 'height', meta[name]['height'], flush=True)
    meta = {k: v for k, v in meta.items() if k in REGISTRY}
    path.write_text(json.dumps(meta, indent=1))
    if '--view' in sys.argv:
        view({k: v for k, v in meta.items() if not only or k in only})


if __name__ == '__main__':
    main()
