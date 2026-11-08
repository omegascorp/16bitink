"""Draws the stat icons the hero sheet adds, at their 16 x 16 pixels: Spell Power (a star of light),
Knowledge (an open book), Morale (a pennant), Luck (a clover) and Sight (an eye).
  python3 dev/pixel/ui/make_stats.py  -> stats/stat-*.png, then run build_ui.py"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent / 'stats'
SIZE = 16
INK = (40, 26, 16, 255)


def outlined(body: dict[tuple[int, int], tuple[int, int, int, int]]) -> Image.Image:
    """`body`'s pixels with a dark line round them, as the other stat icons have."""
    im = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    for (x, y) in body:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in body and 0 <= nx < SIZE and 0 <= ny < SIZE:
                im.putpixel((nx, ny), INK)
    for p, c in body.items():
        im.putpixel(p, c)
    return im


def power() -> Image.Image:
    white, gold, violet = (255, 250, 220, 255), (248, 210, 110, 255), (176, 120, 232, 255)
    body = {}
    c = 7
    for i in range(1, 7):
        tone = gold if i < 4 else violet
        for p in ((c + i, c), (c - i, c), (c, c + i), (c, c - i)):
            body[p] = tone
    for i in range(1, 4):
        for p in ((c + i, c + i), (c - i, c - i), (c + i, c - i), (c - i, c + i)):
            body[p] = gold if i == 1 else violet
    for p in ((c, c), (c + 1, c), (c - 1, c), (c, c + 1), (c, c - 1)):
        body[p] = white
    return outlined(body)


def knowledge() -> Image.Image:
    page, shade, cover = (240, 226, 190, 255), (196, 176, 138, 255), (72, 98, 184, 255)
    body = {}
    for x in range(1, 15):
        top = 3 + abs(x - 7) // 3 if x < 8 else 3 + abs(x - 8) // 3
        for y in range(top, top + 8):
            body[(x, y)] = page
        body[(x, top + 8)] = cover
    for x in (7, 8):
        for y in range(3, 11):
            body[(x, y)] = shade
    for y in (6, 8):
        for x in (3, 4, 5, 10, 11, 12):
            body[(x, y)] = shade
    return outlined(body)


def morale() -> Image.Image:
    pole, red, dark = (214, 176, 110, 255), (214, 72, 56, 255), (156, 44, 36, 255)
    body = {(4, y): pole for y in range(2, 15)}
    for x in range(5, 13):
        for y in range(3 + (x - 5) // 3, 10 - (x - 5) // 3):
            body[(x, y)] = dark if y >= 8 - (x - 5) // 3 else red
    return outlined(body)


def luck() -> Image.Image:
    leaf, light, stem = (92, 176, 84, 255), (150, 216, 120, 255), (60, 120, 58, 255)
    body = {}
    for cx, cy in ((5, 5), (10, 5), (5, 10), (10, 10)):
        for dx in (-2, -1, 0, 1):
            for dy in (-2, -1, 0, 1):
                if abs(dx + 0.5) + abs(dy + 0.5) < 3:
                    body[(cx + dx, cy + dy)] = leaf
        body[(cx - 1, cy - 1)] = light
    for i in range(3):
        body[(8 + i, 12 + i)] = stem
    return outlined(body)


def sight() -> Image.Image:
    white, iris, pupil = (240, 232, 214, 255), (72, 130, 196, 255), (24, 30, 52, 255)
    body = {}
    for x in range(1, 15):
        half = 3 - abs(x - 7.5) // 2.4
        for y in range(int(7 - half), int(8 + half) + 1):
            body[(x, y)] = white
    for x in range(6, 10):
        for y in range(6, 10):
            body[(x, y)] = iris
    for p in ((7, 7), (8, 7), (7, 8), (8, 8)):
        body[p] = pupil
    return outlined(body)


if __name__ == '__main__':
    for draw in (power, knowledge, morale, luck, sight):
        draw().save(HERE / f'stat-{draw.__name__}.png')
