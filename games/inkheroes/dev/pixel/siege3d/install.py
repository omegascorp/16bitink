"""Puts a castle's painted parts into the game: src/art/pixel/siege/*.png and src/art/pixel/siege.ts.

  python3 dev/pixel/siege3d/install.py greek

Takes out/<castle>/painted/*.png and pieces.json (see sheets.py), paint/<castle>/{court,moat,bridge}.png and the shadow
the model casts on the ground. What's here and not in the model is how the pieces sort among the figures: `SORT`.
Details: docs/inkheroes-castles.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
OUT = GAME / 'src' / 'art' / 'pixel' / 'siege'
TS = GAME / 'src' / 'art' / 'pixel' / 'siege.ts'

hex_x = lambda c, r: 161 + 44 * c + (22 if r % 2 else 0)  # noqa: E731
hex_y = lambda r: 88 + 42 * r  # noqa: E731
WALL_COL = [12, 11, 11, 10, 10, 9, 10, 10, 11, 11, 12]
WALL = [(hex_x(c, r), hex_y(r)) for r, c in enumerate(WALL_COL)]
GATE_ROW = 5
SOUTH_TOWER = (709, 549)

# The ground line each part sorts on among the figures. It isn't always its true foot: the upper arm and the gate sort
# early, or a figure outside them would be hidden; the back wall and north tower sort behind the arm that runs to them;
# the keep and south tower sort just behind the company on them, which sorts on its hex (TOWER_SORT in battleView.ts);
# the near wall sorts on its true foot, over every figure; it's cut around the south tower instead (`ghost`).
SORT = {
    'farWall': 30, 'towerNorth': 40, 'wallNorth': 86, 'wallNorthInner': 128, 'wallGateNorth': 212,
    'gate': 140, 'keep': 297, 'wallGateSouth': 346, 'wallSouthInner': 382, 'wallSouth': 466, 'wallSouthEnd': 507, 'towerSouth': 509, 'nearWall': 560,
}
# Where a piece lies flat on the ground it needs only these.
MOAT_AT = (508, 40)
BRIDGE_AT = (504, 285)
# The court's painting: placed so its road starts at the gate; plain paving past it, for wide screens.
COURT_AT = (560, -82)
COURT_H = 652
FAR_X = 1680
FAR_Y = 70
COURT_PLAIN = (262, 300, 512, 512)
COURT_JOIN = 48
COURT_DIM = 0.8
COURT_CALM = 0.3
SHADOW_DARK = 0.42
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5
# The back wall's stretch that repeats, clear of the north tower.
FAR_RUN = 60
FAR_END = 16
# The near wall is see-through, so the figures behind it stay in sight: its top reads firmest, as the line of the wall.
NEAR_FACE_Y = 508
NEAR_TOP_ALPHA = 0.5
NEAR_FACE_ALPHA = 0.34
# The keep's steps, west of its body, came back from the painting nearly white: warmed to sit on the court's stone.
STEPS_END_X = 820
STEPS_TONE = np.array([0.82, 0.74, 0.6])
# The court stops at the near wall's foot.
COURT_END = 559

pieces: list[tuple[str, tuple[int, int], float]] = []


def add(key: str, im: Image.Image, at: tuple[int, int], foot: float) -> None:
    box = im.getbbox() or (0, 0, 1, 1)
    im.crop(box).save(OUT / f'{key}.png')
    pieces.append((key, (at[0] + box[0], at[1] + box[1]), foot))


def inner_edge(sy: float) -> float:
    """Where the court starts at screen height `sy`: the wall's line, and the gate's back between the drums."""
    if WALL[GATE_ROW - 1][1] <= sy <= WALL[GATE_ROW + 1][1]:
        return WALL[GATE_ROW][0] + 2
    line = [*WALL, SOUTH_TOWER]
    if sy <= WALL[0][1]:
        return WALL[0][0]
    if sy >= SOUTH_TOWER[1]:
        return SOUTH_TOWER[0]
    for (ax, ay), (bx, by) in zip(line, line[1:]):
        if ay <= sy <= by:
            return ax + (bx - ax) * (sy - ay) / (by - ay)
    return WALL[0][0]


def court(castle: str) -> tuple[Image.Image, tuple[int, int]]:
    """The paved ground inside the walls: the painting, plain paving past it, and the shadow the model really casts."""
    art = Image.open(HERE / 'paint' / castle / 'court.png').convert('RGBA')
    x0, y0 = COURT_AT
    w, h = FAR_X - x0, COURT_H
    plain = art.crop(COURT_PLAIN)
    sheet = Image.new('RGBA', (w, h))
    for ny in range(h // plain.height + 1):
        for nx in range(w // plain.width + 1):
            tile = plain.transpose(Image.FLIP_TOP_BOTTOM) if ny % 2 else plain
            sheet.alpha_composite(tile.transpose(Image.FLIP_LEFT_RIGHT) if nx % 2 else tile, (nx * plain.width, ny * plain.height))
    a = np.array(sheet)
    pa = np.array(art)
    edge = np.concatenate([pa[:, -COURT_JOIN:, :3].reshape(-1, 3), pa[-COURT_JOIN:, :, :3].reshape(-1, 3)])
    a[..., :3] = np.clip(a[..., :3] * (edge.mean(0) / np.array(plain)[..., :3].reshape(-1, 3).mean(0)), 0, 255).astype(np.uint8)
    for iy in range(art.height):
        for ix in range(art.width):
            keep = min(art.width - ix, art.height - iy) / COURT_JOIN
            if keep >= 1 or keep > BAYER[iy % 4, ix % 4] + 0.5:
                a[iy, ix] = pa[iy, ix]
    mean = a[..., :3].reshape(-1, 3).mean(0)
    a[..., :3] = (a[..., :3] * (1 - COURT_CALM) + mean * COURT_CALM).astype(np.uint8)
    shadow = json.loads((HERE / 'out' / castle / 'ground.json').read_text())
    lit = np.array(Image.open(HERE / 'out' / castle / 'ground.png').convert('L')) / 255
    for iy in range(h):
        sy = iy + y0
        edge_x = inner_edge(sy) + 6
        for ix in range(w):
            sx = ix + x0
            if sx < edge_x or sy < FAR_Y - 12 or sy >= COURT_END:
                a[iy, ix] = 0
                continue
            gx, gy = sx - shadow['x'], sy - shadow['y']
            sun = lit[gy, gx] if 0 <= gy < lit.shape[0] and 0 <= gx < lit.shape[1] else 1.0
            a[iy, ix, :3] = (a[iy, ix, :3] * (COURT_DIM * (1 - SHADOW_DARK * (1 - sun)) + BAYER[iy % 4, ix % 4] * 0.05)).astype(np.uint8)
    return Image.fromarray(a), (x0, y0)


def long_far_wall(im: Image.Image, at: tuple[int, int]) -> tuple[Image.Image, tuple[int, int]]:
    """The back wall carried on for wide screens, its stretch mirrored end to end."""
    # The stretch stops short of the wall's sawn-off end, which would show at every join.
    im = im.crop((0, 0, im.width - FAR_END, im.height))
    run = im.crop((FAR_RUN, 0, im.width, im.height))
    out = Image.new('RGBA', (FAR_X - at[0], im.height), (0, 0, 0, 0))
    out.alpha_composite(im, (0, 0))
    x, flip = im.width, True
    while x < out.width:
        out.alpha_composite(run.transpose(Image.FLIP_LEFT_RIGHT) if flip else run, (x, 0))
        x, flip = x + run.width, not flip
    return out, at


def ghost(im: Image.Image, at: tuple[int, int], tower: Image.Image, tower_at: tuple[int, int]) -> Image.Image:
    """The near wall made see-through, and cut where the south tower stands, which it runs into."""
    a = np.array(im, dtype=float)
    rows = np.arange(a.shape[0]) + at[1]
    a[..., 3] *= np.where(rows < NEAR_FACE_Y, NEAR_TOP_ALPHA, NEAR_FACE_ALPHA)[:, None]
    cut = Image.new('L', im.size, 0)
    cut.paste(tower.getchannel('A'), (tower_at[0] - at[0], tower_at[1] - at[1]))
    a[np.array(cut) > 0, 3] = 0
    return Image.fromarray(a.astype(np.uint8))


def warm_steps(im: Image.Image, x: int) -> Image.Image:
    """The keep with its steps toned down, `x` being its left edge in the world."""
    a = np.array(im, dtype=float)
    a[:, :STEPS_END_X - x, :3] *= STEPS_TONE
    return Image.fromarray(a.astype(np.uint8))


def main(castle: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob('*.png'):
        f.unlink()
    place = json.loads((HERE / 'out' / castle / 'sheets.json').read_text())
    for key, p in place.items():
        part = key.rsplit('-', 1)[0]
        im = Image.open(HERE / 'out' / castle / 'painted' / f'{key}.png').convert('RGBA')
        at = (p['wx'], p['wy'])
        if part == 'keep':
            im = warm_steps(im, at[0])
        if part in ('farWall', 'nearWall'):
            im, at = long_far_wall(im, at)
        if part == 'nearWall':
            south = place['towerSouth-1']
            im = ghost(im, at, Image.open(HERE / 'out' / castle / 'painted' / 'towerSouth-1.png').convert('RGBA'), (south['wx'], south['wy']))
        add(key, im, at, SORT[part])
    paint = HERE / 'paint' / castle
    add('moat', Image.open(paint / 'moat.png').convert('RGBA'), MOAT_AT, 0)
    add('bridge', Image.open(paint / 'bridge.png').convert('RGBA'), BRIDGE_AT, 0)
    im, at = court(castle)
    add('court', im, at, 0)
    meta = json.loads((HERE / 'out' / castle / 'ground.json').read_text())
    add('keepShadow', Image.open(HERE / 'out' / castle / 'keepShadow.png').convert('RGBA'), (meta['x'], meta['y']), 0)
    write_ts()


def write_ts() -> None:
    cap = lambda s: ''.join(p[0].upper() + p[1:] for p in s.split('-'))  # noqa: E731
    lines = [f"import {'p' + cap(k)} from './siege/{k}.png?url';" for k, *_ in pieces]
    rows = [f"  '{k}': {{ url: p{cap(k)}, x: {at[0]}, y: {at[1]}, foot: {foot} }}," for k, at, foot in pieces]
    TS.write_text('\n'.join([
        '// Generated by dev/pixel/siege3d/install.py: do not edit by hand.',
        *lines, '',
        "/** One piece of a town's walls: its picture, its top-left in the 960 x 540 battle world, and the ground line it sorts on. */",
        'export interface SiegePiece {', '  readonly url: string;', '  readonly x: number;', '  readonly y: number;', '  readonly foot: number;', '}', '',
        'export const SIEGE_ART: Readonly<Record<string, SiegePiece>> = {', *rows, '};', '']))


if __name__ == '__main__':
    main(sys.argv[1])
