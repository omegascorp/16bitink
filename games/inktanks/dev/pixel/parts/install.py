"""Installs the painted parts in src/art/pixel/parts/, with the manifest and the HUD icons.

  python3 dev/pixel/parts/install.py [--mk1=approved|painted]

Run after model.py, and sheets.py cut for hulls, drives and turrets. `--mk1=approved` (the default) keeps the detail
test's C paintings for Mk I, which the owner approved; their models are byte-identical to Mk I here. As the detail
test: a hull's stripe goes back to the model's flat grey under its mask, and a drive's frames 1 and 2 are frame 0's
painting plus the model's change between frames, so the paint never swims.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
RENDER = HERE / 'out' / 'render'
PAINTED = HERE / 'out' / 'painted'
APPROVED = HERE.parent.parent / 'detail-test' / 'assets' / 'C'
DEST = HERE.parent.parent.parent / 'src' / 'art' / 'pixel' / 'parts'
HULLS = ['hullLight', 'hullMedium', 'hullHeavy']
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks']
TURRETS = ['turretMG', 'turretCannon', 'turretRocket']
ICON, ICON_FIT = 24, 22
# Mk I families whose model changed from the detail test's, so the approved painting no longer fits: painted here.
# Every drive is now modelled per hull size (L, M, H), and Wheels got separate tyres with gaps and hub caps.
MK1_REPAINTED = set(DRIVES)
SIZES = {'L': 'hullLight', 'M': 'hullMedium', 'H': 'hullHeavy'}
INK = np.array([22, 20, 18])


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def save(a: np.ndarray, p: Path) -> None:
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p)


def painted(key: str, mk1: str) -> np.ndarray:
    family, tier = key.rsplit('-mk', 1)
    if tier == '1' and mk1 == 'approved' and family.split('-')[0] not in MK1_REPAINTED:
        return arr(APPROVED / f'{family}.png')
    return arr(PAINTED / f'{key}.png')


def install_part(key: str, mk1: str) -> list[str]:
    art = painted(key, mk1)
    model = arr(RENDER / f'{key}.png')
    art[..., 3] = model[..., 3]
    written = [key]
    stripe = RENDER / f'{key}-stripe.png'
    if stripe.exists():
        mask = np.array(Image.open(stripe)) > 0
        art[mask, :3] = model[mask, :3]
        Image.fromarray((mask * 255).astype(np.uint8)).save(DEST / f'{key}-stripe.png')
        written.append(f'{key}-stripe')
    save(art, DEST / f'{key}.png')
    if key.startswith('drive'):
        for f in (1, 2):
            frame = art.copy()
            frame[..., :3] += (arr(RENDER / f'{key}-f{f}.png')[..., :3] - model[..., :3]) * 0.9
            frame[..., 3] = arr(RENDER / f'{key}-f{f}.png')[..., 3]
            save(frame, DEST / f'{key}-f{f}.png')
            written.append(f'{key}-f{f}')
    return written


def outlined(im: Image.Image) -> Image.Image:
    """A 1 px soft ink edge round an icon, so it reads on any HUD colour."""
    a = np.array(im).astype(float)
    alpha = (a[..., 3] > 100).astype(np.uint8) * 255
    grown = np.array(Image.fromarray(alpha).filter(ImageFilter.MaxFilter(3))) > 0
    out = np.zeros_like(a)
    out[grown, :3] = INK
    out[grown, 3] = 230
    solid = alpha > 0
    out[solid, :3] = a[solid, :3]
    out[solid, 3] = 255
    return Image.fromarray(out.astype(np.uint8))


def squeeze_drive(im: Image.Image) -> Image.Image:
    """A drive's two sides moved together, so its icon isn't mostly the empty space under the hull."""
    a = np.array(im)
    cols = np.where(a[..., 3].max(axis=0) > 0)[0]
    left = cols[cols < 64]
    right = cols[cols >= 64]
    l = im.crop((left.min(), 0, left.max() + 1, 128))
    r = im.crop((right.min(), 0, right.max() + 1, 128))
    out = Image.new('RGBA', (l.width + r.width + 3, 128))
    out.alpha_composite(l, (0, 0))
    out.alpha_composite(r, (l.width + 3, 0))
    return out.crop(out.getbbox())


def icons() -> None:
    (DEST / 'icons').mkdir(exist_ok=True)
    for kind in (HULLS, DRIVES, TURRETS):
        ims = {}
        for fam in kind:
            im = Image.open(DEST / (f'{fam}-M-mk1.png' if fam in DRIVES else f'{fam}-mk1.png')).convert('RGBA')
            ims[fam] = squeeze_drive(im) if fam.startswith('drive') else im.crop(im.getbbox())
        # One scale per kind, so a Heavy's icon is bigger than a Light's.
        k = ICON_FIT / max(max(i.width, i.height) for i in ims.values())
        for fam, im in ims.items():
            w, h = max(4, round(im.width * k)), max(4, round(im.height * k))
            small = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1, 80, 2))
            icon = Image.new('RGBA', (ICON, ICON))
            icon.alpha_composite(small, ((ICON - w) // 2, (ICON - h) // 2))
            outlined(icon).save(DEST / 'icons' / f'{fam}.png')


def main() -> None:
    mk1 = next((a.split('=')[1] for a in sys.argv if a.startswith('--mk1=')), 'approved')
    shutil.rmtree(DEST, ignore_errors=True)
    DEST.mkdir(parents=True)
    meta = json.loads((RENDER / 'meta.json').read_text())
    keys, frames, stripe, aliases = [], {}, [], {}
    for fam in HULLS + DRIVES + TURRETS:
        for t in (1, 2, 3):
            for key in ([f'{fam}-{z}-mk{t}' for z in SIZES] if fam in DRIVES else [f'{fam}-mk{t}']):
                written = install_part(key, mk1)
                keys.append(key)
                if fam in DRIVES:
                    frames[key] = [key, f'{key}-f1', f'{key}-f2']
                if f'{key}-stripe' in written:
                    stripe.append(key)
            if fam in DRIVES:
                # The old size-less key stays as a copy of the L variant, so nothing that loads it breaks.
                old_key, src = f'{fam}-mk{t}', f'{fam}-L-mk{t}'
                for suffix in ('', '-f1', '-f2'):
                    shutil.copy(DEST / f'{src}{suffix}.png', DEST / f'{old_key}{suffix}.png')
                aliases[old_key] = src
                frames[old_key] = [old_key, f'{old_key}-f1', f'{old_key}-f2']
    icons()
    ring = {f'{h}-mk{t}': meta['ring'][h] for h in HULLS for t in (1, 2, 3)}
    manifest = {
        'density': 'C', 'unit': meta['unit'], 'size': meta['size'],
        'facing': 'north (-y) at rotation 0; pivot = frame centre (a turret pivots on its ring)',
        'mk1': mk1, 'mk1Repainted': sorted(MK1_REPAINTED),
        'families': {'hulls': HULLS, 'drives': DRIVES, 'turrets': TURRETS}, 'tiers': [1, 2, 3],
        'keys': keys,
        'ring': ring,
        'muzzle': meta['muzzle'],
        'frames': frames,
        'hullSize': {h: z for z, h in SIZES.items()},
        'drives': {d: {z: {f'mk{t}': f'{d}-{z}-mk{t}' for t in (1, 2, 3)} for z in SIZES} for d in DRIVES},
        'aliases': aliases,
        'stripe': stripe,
        'icons': {fam: f'icons/{fam}.png' for fam in HULLS + DRIVES + TURRETS},
    }
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('installed', len(keys), 'parts to', DEST, '| Mk I from', mk1)


if __name__ == '__main__':
    main()
