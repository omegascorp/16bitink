"""Per-family blueprint icons: the blank blueprint sheet from pickups/intel.png
(its tank drawing erased) with each part's icon redrawn as pale line art.

  python3 dev/pixel/blueprints.py        writes src/art/pixel/world/pickups/bp-<family>.png (64x64)
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
PICK = ROOT / 'src/art/pixel/world/pickups'
ICONS = ROOT / 'src/art/pixel/parts/icons'
FAMILY_ICON = {
    'machinegun': 'turretMG', 'cannon': 'turretCannon', 'rockets': 'turretRocket',
    'light': 'hullLight', 'medium': 'hullMedium', 'heavy': 'hullHeavy',
    'wheels': 'driveWheels', 'halftracks': 'driveHalftrack', 'tracks': 'driveTracks',
}
PAPER = (58, 124, 196, 255)
BOX = (18, 16, 55, 48)  # the drawing area on the sheet (erased, then redrawn): most of it, so the part reads at icon size
LINE = (232, 246, 255, 255)
DETAIL = (150, 200, 240, 255)
SCALE = 31 / 24  # one scale for all, so a Light hull stays smaller than a Heavy; a 24 px icon fills the box's height


def blank_sheet() -> Image.Image:
    s = Image.open(PICK / 'intel.png').convert('RGBA')
    for y in range(BOX[1], BOX[3]):
        for x in range(BOX[0], BOX[2]):
            s.putpixel((x, y), PAPER)
    return s


def line_art(icon: Image.Image) -> Image.Image:
    size = max(1, round(icon.width * SCALE))
    ic = icon.convert('RGBA').resize((size, round(icon.height * SCALE)), Image.NEAREST)
    alpha = ic.getchannel('A').point(lambda a: 255 if a > 110 else 0)
    outline = ImageChops.subtract(alpha, alpha.filter(ImageFilter.MinFilter(3)))
    # Interior detail: where the brightness jumps between neighbours.
    lum = ic.convert('L')
    edges = lum.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 38 else 0)
    inner = ImageChops.multiply(edges, alpha.filter(ImageFilter.MinFilter(3)))
    out = Image.new('RGBA', ic.size, (0, 0, 0, 0))
    out.paste(Image.new('RGBA', ic.size, DETAIL), mask=inner)
    out.paste(Image.new('RGBA', ic.size, LINE), mask=outline)
    return out


def main() -> None:
    for fam, name in FAMILY_ICON.items():
        sheet = blank_sheet()
        art = line_art(Image.open(ICONS / f'{name}.png'))
        cx, cy = (BOX[0] + BOX[2]) // 2, (BOX[1] + BOX[3]) // 2
        sheet.alpha_composite(art, (cx - art.width // 2, cy - art.height // 2))
        sheet.save(PICK / f'bp-{fam}.png')
        print('wrote', f'bp-{fam}.png')


if __name__ == '__main__':
    main()
