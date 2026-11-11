# usage: python3 dlp.py job:out.png ...  (waits for each real PNG; index via job:out.png:N)
import sys, time, urllib.request
for a in sys.argv[1:]:
    p=a.split(':'); job,out=p[0],p[1]; idx=f'?index={p[2]}' if len(p)>2 else ''
    for _ in range(60):
        try: d=urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{job}/download{idx}').read()
        except Exception as e: d=b''
        if d[:4]==b'\x89PNG': open(out,'wb').write(d); print('ok',out); break
        time.sleep(4)
    else: print('FAIL',job)
