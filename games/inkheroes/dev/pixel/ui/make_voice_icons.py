"""Draws the narrator strip's button icons (16 x 16): pause, play, skip and read.

At this size an image generator draws arrows as bent sticks, so these are
drawn by script on the pixel grid, in the HUD's gilt: a gold ramp lit from
the top, a dark outline, and cream pages for the book. Writes
icon-voicePause.png, icon-voicePlay.png, icon-voiceSkip.png and
icon-voiceRead.png here; build_ui.py copies them into the game.

    python3 make_voice_icons.py
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
SIZE = 16
OUTLINE = (20, 13, 8, 255)
# The gilt, top to bottom (the HUD's title gold in the middle).
GOLD = [(255, 236, 168, 255), (248, 210, 110, 255), (226, 172, 74, 255), (176, 120, 46, 255)]
PAGE = (243, 230, 196, 255)
PAGE_SHADE = (214, 196, 156, 255)
LINE = (150, 120, 84, 255)


def gilt(y: int, top: int, bottom: int) -> tuple:
    """The gold for row `y` of a shape running from `top` to `bottom`."""
    t = (y - top) / max(1, bottom - top)
    return GOLD[min(len(GOLD) - 1, int(t * len(GOLD)))]


def paint(mask: set, colour=None) -> Image.Image:
    """`mask` (a set of (x, y)) filled with the gilt (or `colour(x, y)`), outlined all round."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ys = [y for _, y in mask]
    top, bottom = min(ys), max(ys)
    for x, y in mask:
        img.putpixel((x, y), colour(x, y) if colour else gilt(y, top, bottom))
    for x, y in mask:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
            p = (x + dx, y + dy)
            if p not in mask and 0 <= p[0] < SIZE and 0 <= p[1] < SIZE:
                img.putpixel(p, OUTLINE)
    return img


def triangle(x0: int, top: int, bottom: int, step: float) -> set:
    """A triangle pointing right: its back edge at x0 from `top` to `bottom`, growing `step` px a row to the middle."""
    mid = (top + bottom) / 2
    out = set()
    for y in range(top, bottom + 1):
        reach = int((min(y - top, bottom - y)) * step)
        out |= {(x, y) for x in range(x0, x0 + reach + 1)}
    return out


def pause() -> Image.Image:
    return paint({(x, y) for x in (4, 5, 6, 9, 10, 11) for y in range(3, 13)})


def play() -> Image.Image:
    return paint(triangle(5, 2, 13, 1.0))


def skip() -> Image.Image:
    # Two arrows and a bar: to the end of the line.
    return paint(triangle(2, 4, 11, 1.0) | triangle(7, 4, 11, 1.0) | {(x, y) for x in (12, 13) for y in range(4, 12)})


def read() -> Image.Image:
    """An open book: two cream pages dipping to the spine, lines of text, a gilt cover under them."""
    pages, cover = set(), set()
    for x in range(1, 15):
        # The pages' top edge rises towards the outer edges and dips at the spine.
        d = min(abs(x - 7), abs(x - 8))
        top = 4 - min(2, d // 2)
        for y in range(top, 12):
            pages.add((x, y))
        cover |= {(x, 12)} | ({(x, 13)} if 2 <= x <= 13 else set())
    def colour(x: int, y: int) -> tuple:
        if (x, y) in cover:
            return gilt(y, 12, 13)
        if x in (7, 8):
            return PAGE_SHADE
        if y in (5, 7, 9) and (2 <= x <= 5 or 10 <= x <= 13):
            return LINE
        return PAGE
    return paint(pages | cover, colour)


if __name__ == '__main__':
    for name, draw in (('voicePause', pause), ('voicePlay', play), ('voiceSkip', skip), ('voiceRead', read)):
        draw().save(HERE / f'icon-{name}.png')
        print('wrote', f'icon-{name}.png')
