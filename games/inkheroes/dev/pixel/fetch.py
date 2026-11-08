# Downloads a PixelLab animation job into dev/pixel/anim/<unit>-<pose>-<n>.png frames,
# writes a horizontal strip dev/pixel/anim/<unit>-<pose>.png and reports how the feet drift.
# Usage: python3 dev/pixel/fetch.py <job_id> <unit> <pose> <frame_count> [--skip-first]
# Frame 0 of a PixelLab job is our own input; --skip-first leaves it out of the strip.
import sys
import urllib.request
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
ANIM = HERE / 'anim'


def fetch(job: str, index: int) -> Image.Image:
    url = f'https://api.pixellab.ai/mcp/images/{job}/download?index={index}'
    with urllib.request.urlopen(url) as r:
        data = r.read()
    path = ANIM / f'_tmp_{job}_{index}.png'
    path.write_bytes(data)
    return Image.open(path).convert('RGBA')


def feet(im: Image.Image) -> tuple[int, int]:
    """Bottom row of the opaque pixels and the x-centre of the lowest eighth."""
    x0, y0, x1, y1 = im.getbbox()
    a = im.getchannel('A').load()
    rows = range(y1 - max(2, (y1 - y0) // 8), y1)
    xs = [x for y in rows for x in range(x0, x1) if a[x, y]]
    return y1, (min(xs) + max(xs)) // 2


def main() -> None:
    job, unit, pose, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    skip = '--skip-first' in sys.argv
    ANIM.mkdir(exist_ok=True)
    frames = [fetch(job, i) for i in range(n + 1)]
    for f in ANIM.glob(f'_tmp_{job}_*.png'):
        f.unlink()
    if skip:
        frames = frames[1:]
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        f.save(ANIM / f'{unit}-{pose}-{i}.png')
        strip.paste(f, (i * w, 0))
    strip.save(ANIM / f'{unit}-{pose}.png')
    semi = sum(1 for f in frames for p in f.getdata() if 0 < p[3] < 255)
    print(f'{unit}-{pose}: {len(frames)} frames {w}x{h} semi-alpha={semi}')
    print('  feet (bottom, x):', [feet(f) for f in frames])


if __name__ == '__main__':
    main()
