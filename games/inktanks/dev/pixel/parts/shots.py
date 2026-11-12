"""Check shots of the installed parts, saved to games/inktanks/dev/shots/parts/.

  python3 dev/pixel/parts/shots.py

  contact-1x.png   every part at 1:1: families at Mk I-III, the drives at each hull size, drive frames, stripe masks
  contact-2x.png   the same at 2x, as the game shows them on a 1920 x 1080 screen
  builds-2x.png    assembled tanks at every tier, stripes tinted in the four clan colours, icons below
  phone.png        a 960 x 540 native field of tanks, shown at an 844 x 390 phone's size
Code here only places, rotates and tints the painted parts for the check: the art is the painting.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PARTS = HERE.parent.parent.parent / 'src' / 'art' / 'pixel' / 'parts'
GROUND = HERE.parent.parent / 'detail-test' / 'assets' / 'C' / 'ground.png'
OUT = HERE.parent.parent / 'shots' / 'parts'
FAMILIES = ['turretMG', 'turretCannon', 'turretRocket', 'hullLight', 'hullMedium', 'hullHeavy', 'driveWheels', 'driveHalftrack', 'driveTracks']
CLANS = {'Ink Brigade': (46, 78, 150), 'Boars': (150, 62, 40), 'Weasels': (196, 156, 54), 'Crows': (72, 62, 96)}
BG = (110, 112, 104, 255)
CELL = 96
MAN = json.loads((PARTS / 'manifest.json').read_text())


def load(key: str) -> Image.Image:
    return Image.open(PARTS / f'{key}.png').convert('RGBA')


def tinted(hull: str, colour: tuple[int, int, int]) -> Image.Image:
    a = np.array(load(hull)).astype(float)
    mask = np.array(Image.open(PARTS / f'{hull}-stripe.png')) > 0
    lum = a[..., :3].mean(axis=2, keepdims=True) / 128.0
    a[mask, :3] = np.clip(lum[mask] * np.array(colour), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def tank(drive: str, hull: str, gun: str, t: int, colour=None, frame: str = '') -> Image.Image:
    im = Image.new('RGBA', (128, 128))
    im.alpha_composite(load(f'{drive}-{MAN["hullSize"][hull]}-mk{t}{frame}'))
    h = f'{hull}-mk{t}'
    im.alpha_composite(tinted(h, colour) if colour else load(h))
    rx, ry = MAN['ring'][h]
    im.alpha_composite(load(f'{gun}-mk{t}'), (round(rx), round(ry)))
    return im


def mid(im: Image.Image) -> Image.Image:
    o = (128 - CELL) // 2
    return im.crop((o, o, o + CELL, o + CELL))


def contact(z: int) -> None:
    """Rows 1-3: Mk I-III of every family (drives in their M size). Rows 4-6: every drive at L, M and H, Mk I-III.
    Row 7: the M drives' Mk I frames 1 and 2, and the three Mk III hull stripe masks in white."""
    sheet = Image.new('RGBA', (CELL * 9 * z, CELL * 7 * z), BG)

    def put(im: Image.Image, c: int, r: int) -> None:
        sheet.alpha_composite(mid(im).resize((CELL * z, CELL * z), Image.NEAREST), (c * CELL * z, r * CELL * z))

    for r, t in enumerate((1, 2, 3)):
        for c, fam in enumerate(FAMILIES):
            put(load(f'{fam}-M-mk{t}' if fam.startswith('drive') else f'{fam}-mk{t}'), c, r)
    for r, size in enumerate('LMH'):
        for c, (fam, t) in enumerate((f, t) for f in FAMILIES[6:] for t in (1, 2, 3)):
            put(load(f'{fam}-{size}-mk{t}'), c, 3 + r)
    row = [load(f'{f}-M-mk1-f{n}') for f in FAMILIES[6:] for n in (1, 2)]
    for h in ('hullLight', 'hullMedium', 'hullHeavy'):
        m = np.array(Image.open(PARTS / f'{h}-mk3-stripe.png'))
        row.append(Image.fromarray(np.dstack([m, m, m, m])))
    for c, im in enumerate(row):
        put(im, c, 6)
    sheet.save(OUT / f'contact-{z}x.png')


BUILDS = [('driveWheels', 'hullLight', 'turretMG'), ('driveHalftrack', 'hullMedium', 'turretCannon'), ('driveTracks', 'hullHeavy', 'turretRocket'),
          ('driveTracks', 'hullHeavy', 'turretCannon'), ('driveWheels', 'hullMedium', 'turretRocket'), ('driveHalftrack', 'hullLight', 'turretMG')]


def builds() -> None:
    z = 2
    cols = list(CLANS.values())
    sheet = Image.new('RGBA', (CELL * 9 * z, (CELL * 2 + 64) * z), BG)
    i = 0
    for b, build in enumerate(BUILDS):
        for t in (1, 2, 3):
            im = mid(tank(*build, t, cols[i % 4])).resize((CELL * z, CELL * z), Image.NEAREST)
            sheet.alpha_composite(im, ((i % 9) * CELL * z, (i // 9) * CELL * z))
            i += 1
    for c, fam in enumerate(FAMILIES):
        # Each icon at 4x (to judge it) and at 1:1 (as the HUD shows it, x2 on a 1080p screen: 48 px).
        icon = load(f'icons/{fam}')
        sheet.alpha_composite(icon.resize((96, 96), Image.NEAREST), (c * CELL * z + 8, CELL * 2 * z + 16))
        sheet.alpha_composite(icon.resize((48, 48), Image.NEAREST), (c * CELL * z + 120, CELL * 2 * z + 40))
    sheet.save(OUT / 'builds-2x.png')


def phone() -> None:
    g = Image.open(GROUND).convert('RGBA')
    field = Image.new('RGBA', (960, 540))
    for y in range(0, 540, g.height):
        for x in range(0, 960, g.width):
            field.alpha_composite(g, (x, y))
    cols = list(CLANS.values())
    spots = [(120, 120, 20), (330, 110, -35), (560, 140, 90), (800, 120, 160), (150, 330, 200), (380, 300, 0), (610, 340, -120), (820, 360, 45), (480, 460, 270)]
    for n, (x, y, ang) in enumerate(spots):
        build, t = BUILDS[n % 3 + (3 if n >= 6 else 0)], n // 3 + 1
        im = tank(*build, t, cols[n % 4]).rotate(-ang, Image.NEAREST)
        a = np.array(im)
        shadow = np.zeros_like(a)
        shadow[..., 3] = (a[..., 3] > 0) * 90
        field.alpha_composite(Image.fromarray(shadow), (x - 64 + 3, y - 64 + 4))
        field.alpha_composite(im, (x - 64, y - 64))
    field.save(OUT / 'field-native.png')
    screen = Image.new('RGBA', (844, 390), (0, 0, 0, 255))
    shown = field.resize((693, 390), Image.LANCZOS)
    screen.alpha_composite(shown, ((844 - 693) // 2, 0))
    screen.save(OUT / 'phone.png')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    contact(1)
    contact(2)
    builds()
    phone()
    print('saved to', OUT)


if __name__ == '__main__':
    main()
