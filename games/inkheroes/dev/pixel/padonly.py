# usage: python3 padonly.py hero:<id>|unit:<id> ...  -> writes pad/<id>.png only (no manifest)
import sys, json
sys.path.insert(0, '.')
import build_assets as b
cfg = json.load(open('units.json'))
for a in sys.argv[1:]:
    kind, uid = a.split(':')
    spec = cfg['heroes' if kind == 'hero' else 'units'][uid]
    name = f'hero_{uid}' if kind == 'hero' else uid
    b.pad(spec).save(b.PIX / 'pad' / f'{name}.png'); print(name)
