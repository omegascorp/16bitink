# erase_gray.py unit pose frame...: removes near-white / grey-lilac streak pixels (low saturation, bright) from those frames
import sys, json
from PIL import Image
unit, pose = sys.argv[1], sys.argv[2]
path = f'anim/{unit}-{pose}.png'
strip = Image.open(path).convert('RGBA')
w = json.load(open('units.json'))['units'][unit]['canvas'][0]
for fr in map(int, sys.argv[3:]):
    f = strip.crop((fr * w, 0, (fr + 1) * w, strip.height)); px = f.load(); n = 0
    for y in range(f.height):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and min(r, g, b) > 120 and max(r, g, b) - min(r, g, b) < 50:
                px[x, y] = (0, 0, 0, 0); n += 1
    strip.paste(f, (fr * w, 0)); print(fr, n)
strip.save(path)
