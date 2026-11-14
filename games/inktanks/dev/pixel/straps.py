"""Shoulder boards, one per rank, assembled from generated pieces so every count is exact.

  python3 dev/pixel/straps.py

Pieces (PixelLab, in dev/pixel/straps/): board.png (a plain olive board), gold.png (the gold-braided
general's board), star.png (a big gold star), star_small.png (a small one). Out: src/art/pixel/ui/straps/
<rank>.png standing up as worn, and <rank>-h.png lying flat (button to the right) for a line of text.

The insignia (an original scheme in the shoulder-board tradition):
  Private          plain olive
  Corporal         1 narrow gold bar across
  Sergeant         3 narrow bars
  Staff Sergeant   1 wide bar and 2 narrow
  Lieutenant       1 gold stripe down the middle, 2 small stars
  Captain          1 stripe, 4 small stars
  Major            2 stripes, 1 big star between
  Colonel          2 stripes, 3 big stars in a column
  Brigadier        gold braid, 1 big silver star
  General          gold braid, 3 big silver stars in a column
Bars and stripes are cut from the gold board's braid, so they share its texture.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / 'straps'
OUT = ROOT / 'src/art/pixel/ui/straps'


def load(name: str) -> Image.Image:
    im = Image.open(SRC / name).convert('RGBA')
    return im.crop(im.getbbox())


class Board:
    def __init__(self, base: Image.Image, gold: Image.Image):
        self.im = base.copy()
        self.gold = gold
        self.w, self.h = self.im.size
        self.cx = self.w // 2
        # Keep the edge piping clear: insignia sit inside this inset.
        self.edge = max(2, round(self.w * 0.14))

    def y(self, f: float) -> int:
        return round(self.h * f)

    def braid(self, w: int, h: int) -> Image.Image:
        """A w×h piece of the gold braid, from the middle of the gold board."""
        gw, gh = self.gold.size
        # A band from the middle, clear of the piping and the button, tiled to size.
        bw = min(w, gw - 2 * self.edge)
        bh = min(h, round(gh * 0.3))
        x0 = (gw - bw) // 2
        y0 = round(gh * 0.4)
        band = self.gold.crop((x0, y0, x0 + bw, y0 + bh))
        piece = Image.new('RGBA', (w, h))
        for x in range(0, w, bw):
            for y in range(0, h, bh):
                piece.paste(band, (x, y))
        return piece

    def inside(self, piece: Image.Image, x: int, y: int) -> None:
        """Pastes `piece` at (x, y), clipped to the board's own shape."""
        mask = self.im.split()[3].crop((x, y, x + piece.size[0], y + piece.size[1]))
        alpha = Image.composite(piece.split()[3], Image.new('L', piece.size, 0), mask)
        piece = piece.copy()
        piece.putalpha(alpha)
        self.im.alpha_composite(piece, (x, y))

    def bar(self, f: float, thick: int) -> None:
        """A gold bar across the board at height f (0 = button end)."""
        w = self.w - 2 * self.edge
        y = self.y(f) - thick // 2
        self.inside(self.braid(w, thick), self.edge, y)
        # A dark line under it, so it reads as sewn on.
        self.inside(Image.new('RGBA', (w, 1), (30, 26, 16, 170)), self.edge, y + thick)

    def stripe(self, dx: int, width: int = 3) -> None:
        """A gold stripe down the board from under the button to the bottom edge, dx from the centre."""
        y0 = self.y(0.22)
        h = self.h - self.edge // 2 - y0
        self.inside(self.braid(width, h), self.cx + dx - width // 2, y0)

    def star(self, s: Image.Image, dx: int, f: float) -> None:
        """A star with a dark rim, so it reads on cloth, stripes and braid alike."""
        rimmed = outlined(s)
        self.im.alpha_composite(rimmed, (self.cx + dx - rimmed.size[0] // 2, self.y(f) - rimmed.size[1] // 2))


def outlined(s: Image.Image) -> Image.Image:
    """The star on a 1 px dark rim (its alpha grown by one pixel)."""
    w, h = s.size
    out = Image.new('RGBA', (w + 2, h + 2))
    a = s.split()[3]
    rim = Image.new('L', (w + 2, h + 2), 0)
    for dx, dy in ((0, 1), (2, 1), (1, 0), (1, 2)):
        rim.paste(a, (dx, dy), a)
    out.paste(Image.new('RGBA', (w + 2, h + 2), (34, 24, 12, 255)), (0, 0), rim)
    out.alpha_composite(s, (1, 1))
    return out


def silver(s: Image.Image) -> Image.Image:
    """The gold star in silver, for the gold-braided boards (gold on gold would vanish)."""
    ramp = [(70, 76, 88), (128, 136, 148), (188, 194, 204), (236, 240, 246)]
    out = s.copy()
    px = out.load()
    for y in range(out.size[1]):
        for x in range(out.size[0]):
            r_, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r_ * 299 + g * 587 + b * 114) / 255000
            c = ramp[min(len(ramp) - 1, int(lum * len(ramp)))]
            px[x, y] = (*c, a)
    return out


def build() -> dict[str, Image.Image]:
    base, gold, big, small = load('board.png'), load('gold.png'), load('star.png'), load('star_small.png')
    sx = 7  # small side stars' offset from the centre (a 34 px board)
    wide = 10  # field officers' two stripes, either side of a big star
    out: dict[str, Image.Image] = {}

    def make(name: str, on_gold: bool = False) -> Board:
        b = Board(gold if on_gold else base, gold)
        out[name] = b.im
        return b

    make('private')
    make('corporal').bar(0.72, 3)
    b = make('sergeant')
    for f in (0.62, 0.70, 0.78):
        b.bar(f, 3)
    b = make('staffSergeant')
    b.bar(0.56, 7)
    b.bar(0.70, 3)
    b.bar(0.78, 3)
    b = make('lieutenant')
    b.stripe(0)
    b.star(small, -sx, 0.62)
    b.star(small, sx, 0.62)
    b = make('captain')
    b.stripe(0)
    b.star(small, -sx, 0.74)
    b.star(small, sx, 0.74)
    b.star(small, 0, 0.56)
    b.star(small, 0, 0.40)
    b = make('major')
    b.stripe(-wide)
    b.stripe(wide)
    b.star(big, 0, 0.58)
    b = make('colonel')
    b.stripe(-wide)
    b.stripe(wide)
    for f in (0.40, 0.60, 0.80):
        b.star(big, 0, f)
    make('brigadier', True).star(silver(big), 0, 0.58)
    b = make('general', True)
    for f in (0.38, 0.58, 0.78):
        b.star(silver(big), 0, f)
    return out


def even(ims: dict[str, Image.Image]) -> dict[str, Image.Image]:
    """Every board on one canvas size, centred, so they line up wherever they're shown."""
    w = max(i.size[0] for i in ims.values())
    h = max(i.size[1] for i in ims.values())
    out = {}
    for name, im in ims.items():
        c = Image.new('RGBA', (w, h))
        c.alpha_composite(im, ((w - im.size[0]) // 2, (h - im.size[1]) // 2))
        out[name] = c
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, im in even(build()).items():
        im.save(OUT / f'{name}.png')
        # Lying flat, the button end to the right.
        im.transpose(Image.Transpose.ROTATE_270).save(OUT / f'{name}-h.png')
        print(name, im.size)


if __name__ == '__main__':
    main()
