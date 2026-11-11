"""walklock.py: each hero's walkLock (anim px, per frame) from the horizontal centroid of its walk frames, relative to frame 0 -> walklock.json."""
import json
from pathlib import Path
from PIL import Image
PIX = Path(__file__).resolve().parents[3]
out = {}
for uid in ['hervor', 'eirik', 'einar', 'sigurd', 'harald', 'heid', 'gunnhild', 'thorbjorg', 'brynhild', 'egil']:
    p = PIX / 'anim' / f'hero_{uid}-walk.png'
    if not p.exists(): continue
    s = Image.open(p).convert('RGBA'); n = s.width // 152
    cs = []
    for i in range(n):
        f = s.crop((i * 152, 0, (i + 1) * 152, 160)); px = f.load(); xs = [x for y in range(160) for x in range(152) if px[x, y][3] > 0]
        cs.append(sum(xs) / len(xs))
    out[uid] = [round(cs[0] - c) for c in cs]
    print(uid, out[uid])
json.dump(out, open(Path(__file__).parent / 'walklock.json', 'w'))
