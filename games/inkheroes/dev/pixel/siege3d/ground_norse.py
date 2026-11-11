"""The Norse ring fort's ground, drawn from the game's own snow field (no PixelLab): paint/norse/{court,moat,bridge}.png.

  python3 dev/pixel/siege3d/ground_norse.py

The court is trodden snow with patches of black mud and a plank street from the gate to the hall's steps; the ditch is the
Greek moat with its water frozen and its banks turned to snowy earth; the bridge is the Greek one, which is already timber.
"""
from __future__ import annotations

import colorsys
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
OUT = HERE / 'paint' / 'norse'
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5
ROAD_Y, ROAD_END = 380, 236


def smooth_noise(rng: np.random.Generator, size: int, cell: int) -> np.ndarray:
    g = rng.random((size // cell + 3, size // cell + 3))
    ys, xs = np.mgrid[0:size, 0:size] / cell
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a, b, c, d = g[y0, x0], g[y0, x0 + 1], g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy


def court() -> None:
    rng = np.random.default_rng(16)
    snow = np.array(Image.open(GAME / 'src' / 'art' / 'pixel' / 'battle' / 'bg-snow.png').convert('RGB'), dtype=float)
    from PIL import ImageFilter
    crop = Image.fromarray(snow[360:872, 420:932].astype(np.uint8)).filter(ImageFilter.MedianFilter(13))
    base = np.array(crop, dtype=float)
    gray = base.mean(axis=2, keepdims=True)
    base = np.clip(gray, 0, 168) * np.array([0.98, 1.0, 1.03])
    base += (smooth_noise(rng, 512, 9)[..., None] - 0.5) * 16 + (rng.random((512, 512, 1)) - 0.5) * 7
    n = smooth_noise(rng, 512, 46) * 0.6 + smooth_noise(rng, 512, 17) * 0.3 + smooth_noise(rng, 512, 6) * 0.1
    tile = np.tile(BAYER, (128, 128))
    mud = (n + tile * 0.08) > 0.7
    rim = ((n + tile * 0.08) > 0.64) & ~mud
    grain = rng.random((512, 512))
    mud_col = (np.array([92, 76, 62]) * (0.85 + 0.3 * grain[..., None])) * 0.8 + base * 0.2
    rim_col = base * 0.8 + np.array([96, 84, 72]) * 0.2
    out = np.where(mud[..., None], mud_col, np.where(rim[..., None], rim_col, base * 0.94))
    # Stamped hollows and sparse straw.
    for _ in range(90):
        x, y = rng.integers(0, 512, 2)
        out[y, x:x + 2] = np.array([150, 120, 76]) if rng.random() < 0.5 else out[y, x:x + 2] * 0.7
    # The plank street: boards across a trodden bed, from the gate to the hall's steps.
    for x in range(0, ROAD_END):
        edge = 17 - 2 * abs(((x * 7) % 5) - 2) * (x > ROAD_END - 20)
        for dy in range(-int(edge), int(edge) + 1):
            y = ROAD_Y + dy + (x // 60) * 0
            board = (x // 8)
            tone = 0.72 + 0.28 * ((board * 37 % 11) / 11)
            seam = x % 8 == 0
            edge_dark = abs(dy) > edge - 2
            c = np.array([132, 94, 58]) * tone
            if seam:
                c = c * 0.55
            if edge_dark:
                c = c * 0.62
            c = c * (0.94 + 0.12 * grain[y, x])
            out[y, x] = c
    # Snow drifted into the corners of the street.
    for x in range(0, ROAD_END, 3):
        for dy in (-18, 18):
            if rng.random() < 0.4:
                out[ROAD_Y + dy:ROAD_Y + dy + 2, x:x + 3] = np.array([226, 232, 238])
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).convert('RGBA').save(OUT / 'court.png')


def moat() -> None:
    im = Image.open(GAME / 'src' / 'art' / 'pixel' / 'siege' / 'moat.png').convert('RGBA')
    src = HERE / 'paint' / 'greek' / 'moat.png'
    im = Image.open(src).convert('RGBA')
    a = np.array(im)
    rng = np.random.default_rng(5)
    out = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            r, g, b, al = a[y, x]
            if al == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if 0.4 < h < 0.62 and s > 0.12:
                # Frozen water: pale blue-grey with a cold sheen.
                nl = 0.5 + l * 0.7
                rgb = colorsys.hls_to_rgb(0.57, min(0.86, nl), 0.28)
            elif 0.14 < h <= 0.4 and s > 0.15:
                # Moss and grass: snow.
                rgb = colorsys.hls_to_rgb(0.58, min(0.96, 0.78 + l * 0.2), 0.3)
            else:
                # Stone and earth: dark frozen earth, its lit edges under snow.
                if l > 0.42:
                    rgb = colorsys.hls_to_rgb(0.58, min(0.95, 0.66 + l * 0.35), 0.28)
                else:
                    rgb = colorsys.hls_to_rgb(0.07, l * 0.8 + 0.04, 0.32)
            out[y, x, :3] = np.array(rgb) * 255
    Image.fromarray(out).save(OUT / 'moat.png')
    shutil.copy(HERE / 'paint' / 'greek' / 'bridge.png', OUT / 'bridge.png')


if __name__ == '__main__':
    court()
    moat()
