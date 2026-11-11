# usage: python3 fetchb.py  -> fetches every ready job in jobs_b.txt not yet in anim/ (skip-first), waits up to ~100 s
import subprocess, sys, time, urllib.request
from pathlib import Path
HERE=Path(__file__).parent
for line in open(HERE/'jobs_b.txt'):
    p=line.split()
    if len(p)<4: continue
    job,unit,pose,n=p[:4]
    if (HERE/'anim'/f'{unit}-{pose}.png').exists(): continue
    try: d=urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{job}/download?index=0').read()
    except Exception: d=b''
    if d[:4]!=b'\x89PNG': print('pending',unit,pose); continue
    print(subprocess.run([sys.executable,str(HERE/'fetch.py'),job,unit,pose,n,'--skip-first'],capture_output=True,text=True).stdout.strip())
