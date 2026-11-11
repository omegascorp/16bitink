"""ground.py: the Norse city's snowy paving (iso/paving.png, the Greek swatch cooled and whitened) and its garden's snow swatch (iso/ground.png, tileable)."""
import random
from pathlib import Path
from PIL import Image
HERE = Path(__file__).parent
im = Image.open(HERE.parents[0] / 'iso' / 'paving.png').convert('RGBA')
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        px[x, y] = (min(255, int(r * 0.86 + 22)), min(255, int(g * 0.9 + 26)), min(255, int(b * 0.96 + 34)), a)
im.save(HERE / 'iso' / 'paving.png')
# Snow: drifts of soft blue-white, a few speckles, wraps at its edges.
random.seed(11)
N = 128
cols = [(238, 243, 248), (226, 234, 243), (212, 223, 236), (196, 210, 228)]
g = Image.new('RGBA', (N, N))
q = g.load()
import math
for y in range(N):
    for x in range(N):
        v = math.sin(x * 2 * math.pi / N * 2 + 1.0) + math.sin(y * 2 * math.pi / N * 3) + math.sin((x + y) * 2 * math.pi / N * 4 + 2.0) * 0.7 + math.sin((x - 2 * y) * 2 * math.pi / N * 5) * 0.5
        i = 0 if v > 1.2 else 1 if v > 0.1 else 2 if v > -1.1 else 3
        q[x, y] = (*cols[i], 255)
for _ in range(220):
    x, y = random.randrange(N), random.randrange(N)
    q[x, y] = (255, 255, 255, 255) if random.random() < 0.6 else (180, 196, 216, 255)
g.save(HERE / 'iso' / 'ground.png')
