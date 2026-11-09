# Erases stray motion streaks the generator drew, in an animation strip (anim/<unit>-<pose>.png), in place.
#        erase.py <unit> <pose> <frame> rect X0 Y0 X1 Y1 -> clears the box
#        erase.py <unit> <pose> <frame> copy SRC -> replaces the frame with frame SRC
# usage: erase.py <unit> <pose> <frame> color R G B   -> removes every pixel of exactly that colour in that frame
#        erase.py <unit> <pose> <frame> island X0 Y0 X1 Y1 -> removes the opaque islands lying wholly inside the box (frame px)
import sys
from PIL import Image

unit, pose, frame, mode = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
path = f'anim/{unit}-{pose}.png'
strip = Image.open(path).convert('RGBA')
n = strip.width // strip.height if strip.width % strip.height == 0 else None
FW = {'112': 112, '96': 96}
# the frame width is the canvas width in units.json
import json
w = json.load(open('units.json'))['units'][unit]['canvas'][0]
f = strip.crop((frame * w, 0, (frame + 1) * w, strip.height))
px = f.load()
H = f.height
if mode == 'color':
    r, g, b = map(int, " ".join(sys.argv[5:]).replace(",", " ").split())
    for y in range(H):
        for x in range(w):
            if px[x, y][:3] == (r, g, b) and px[x, y][3]:
                px[x, y] = (0, 0, 0, 0)
elif mode == 'copy':
    src = int(sys.argv[5])
    f = strip.crop((src * w, 0, (src + 1) * w, strip.height))
elif mode == 'rect':
    x0, y0, x1, y1 = map(int, sys.argv[5:9])
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px[x, y] = (0, 0, 0, 0)
else:
    x0, y0, x1, y1 = map(int, sys.argv[5:9])
    seen = set()
    for y in range(H):
        for x in range(w):
            if px[x, y][3] and (x, y) not in seen:
                st, pix = [(x, y)], []
                seen.add((x, y))
                while st:
                    cx, cy = st.pop(); pix.append((cx, cy))
                    for nx in range(cx - 1, cx + 2):
                        for ny in range(cy - 1, cy + 2):
                            if 0 <= nx < w and 0 <= ny < H and px[nx, ny][3] and (nx, ny) not in seen:
                                seen.add((nx, ny)); st.append((nx, ny))
                if all(x0 <= a <= x1 and y0 <= b <= y1 for a, b in pix):
                    for a, b in pix: px[a, b] = (0, 0, 0, 0)
                    print('removed island of', len(pix))
strip.paste(f, (frame * w, 0))
strip.save(path)
