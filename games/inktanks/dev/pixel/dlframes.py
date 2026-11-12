"""Downloads every frame of a PixelLab edit_image job: python3 dev/pixel/dlframes.py <job> <set> [n]  ->  paint/<set>/NN.png"""
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

job, name = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 16
out = Path(__file__).resolve().parent / 'paint' / name
out.mkdir(parents=True, exist_ok=True)
for i in range(n):
    url = f'https://api.pixellab.ai/mcp/images/{job}/download?index={i}'
    for _ in range(20):
        try:
            urllib.request.urlretrieve(url, out / f'{i:02d}.png')
            break
        except urllib.error.HTTPError as e:
            if e.code == 423:
                time.sleep(10)
                continue
            if e.code in (400, 404):
                print('stops at', i)
                sys.exit(0)
            raise
print('saved', n, 'frames to', out)
