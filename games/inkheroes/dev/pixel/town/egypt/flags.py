"""flags.py [piece...]: lists the blue banner cloths in a built Egyptian sprite (src/art/pixel/town-kemet): connected
blue pixels, small and thin, in the sprite's upper part. Used to write FLAGS in flags.ts.txt by hand from the result."""
import sys
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parents[4] / 'src' / 'art' / 'pixel' / 'town-kemet'
for name in sys.argv[1:]:
    im = Image.open(D / f'{name}.png').convert('RGBA')
    px = im.load()
    w, h = im.size
    blue = lambda x, y: px[x, y][3] > 0 and px[x, y][2] > px[x, y][0] + 40 and px[x, y][2] > px[x, y][1] + 10
    seen = set()
    out = []
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not blue(x, y):
                continue
            comp, st = [], [(x, y)]
            seen.add((x, y))
            while st:
                cx, cy = st.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and blue(nx, ny):
                        seen.add((nx, ny))
                        st.append((nx, ny))
            xs, ys = [p[0] for p in comp], [p[1] for p in comp]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if 10 <= len(comp) <= 160 and bh <= 16 and bw <= 26:
                out.append((min(xs), min(ys), bw, bh, len(comp)))
    print(name, (w, h), out)
