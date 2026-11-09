"""paving.py: Egypt's paving (iso/paving.png) from the Greek swatch, warmed to sandstone (the swatch is isometric already, so tiles as it is)."""
from pathlib import Path
from PIL import Image
HERE = Path(__file__).parent
im = Image.open(HERE.parents[0] / 'iso' / 'paving.png').convert('RGBA')
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        px[x, y] = (min(255, int(r * 1.06 + 4)), min(255, int(g * 1.0 + 2)), max(0, int(b * 0.84)), a)
im.save(HERE / 'iso' / 'paving.png')
