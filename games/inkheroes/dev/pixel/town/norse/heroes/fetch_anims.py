"""fetch_anims.py: downloads every finished job in heroes/anim_jobs.txt (uid pose job frames) not yet in dev/pixel/anim, via dev/pixel/fetch.py (--skip-first)."""
import subprocess, sys, urllib.request, urllib.error
from pathlib import Path
HERE = Path(__file__).resolve().parent
PIX = HERE.parents[2]
for line in open(HERE / 'anim_jobs.txt'):
    p = line.split()
    if len(p) != 4: continue
    uid, pose, job, n = p
    if (PIX / 'anim' / f'{uid}-{pose}.png').exists() and '--force' not in sys.argv: continue
    try:
        urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{job}/download?index=1')
    except urllib.error.HTTPError as e:
        print('wait', uid, pose, e.code); continue
    subprocess.run([sys.executable, str(PIX / 'fetch.py'), job, uid, pose, n, '--skip-first'], check=True, stdout=subprocess.DEVNULL)
    print('ok', uid, pose)
