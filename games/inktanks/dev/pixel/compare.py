"""A look sheet: each frame set's model (top) above its painting (below), on grey. python3 compare.py <set> <zoom> <out>"""
import sys
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
name, z, dest = sys.argv[1], int(sys.argv[2]), sys.argv[3]
src = sorted((HERE / 'out' / 'frames' / name).glob('[0-9]*.png'))
fs = [Image.open(f).convert('RGBA') for f in src]
ps = [Image.open(HERE / 'paint' / name / f.name).convert('RGBA') for f in src]
s = fs[0].width * z
cols = min(len(fs), int(sys.argv[4]) if len(sys.argv) > 4 else 8)
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * s, rows * 2 * s), (118, 122, 110, 255))
for i, (a, b) in enumerate(zip(fs, ps)):
    x, y = (i % cols) * s, (i // cols) * 2 * s
    sheet.alpha_composite(a.resize((s, s), Image.NEAREST), (x, y))
    sheet.alpha_composite(b.resize((s, s), Image.NEAREST), (x, y + s))
sheet.save(dest)
