# helper: python3 addnorse_rams.py  (adds/overwrites the Norse battering rams' entries ram, ram2, ram3 in units.json; take dev/pixel/.lock first)
import json
d = json.load(open('units.json'))
U = d['units']
IDLE = "idle loop: the machine stands still, the log sways very slightly on its chains, ends back at the starting pose"
ATTACK = "ramming: the log swings back on its chains, then drives forward hard to the right as if hitting a gate, then swings back to the starting pose; the frame and wheels stay still"
SPECS = [
 ("ram", "Ram", "a viking battering ram: a long thick log with a round iron cap hung under a timber frame with a plank shed roof on four wheels, no crew", {}),
 ("ram2", "Iron Ram", "a viking battering ram: an iron-shod log with a boar-head iron cap under a heavy timber frame with an iron-studded roof on iron-banded wheels, no crew", {"canvas": [128, 96], "dx": -12}),
 ("ram3", "Ram of the Sea-Kings", "a viking battering ram: a log carved as a longship dragon prow with gold fittings under a dark timber frame with a gold-trimmed roof on gold-rimmed wheels, no crew", {"strip": [[97, 91, 81], 5], "canvas": [128, 96], "dx": -12}),
]
for uid, name, subj, kw in SPECS:
    e = {"name": name, "src": f"pixel/src/{uid}.png", "canvas": [96, 96], "foot": 6, "dx": 0, "subject": subj, "idle": IDLE, "attack": ATTACK, "strike": 3, "face": [48, 56]}
    e.update(kw)
    U[uid] = e
json.dump(d, open('units.json', 'w'), indent=1); open('units.json', 'a').write('\n')
print('ok')
