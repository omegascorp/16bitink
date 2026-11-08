"""Downloads finished PixelLab image jobs: python3 dev/pixel/map/get.py <out.png>=<job_id> ...

Waits on a job still running (423) and retries a few times."""
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def get(job: str, out: Path) -> None:
    for _ in range(40):
        try:
            with urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{job}/download') as r:
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(r.read())
                print('ok', out)
                return
        except urllib.error.HTTPError as e:
            if e.code != 423:
                print('fail', out, e.code)
                return
            time.sleep(5)
    print('timeout', out)


for arg in sys.argv[1:]:
    path, job = arg.split('=')
    get(job, Path(path))
