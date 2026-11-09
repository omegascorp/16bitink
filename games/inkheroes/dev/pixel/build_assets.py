# Builds the game's pixel-art battle assets from dev/pixel sources.
#   1. pads each unit's still onto its animation canvas -> dev/pixel/pad/<id>.png (upload these to animate)
#   2. copies animation strips (dev/pixel/anim/<id>-<pose>.png) into src/art/pixel/units/,
#      falling back to a 1-frame strip of the padded still while a pose isn't generated yet
#   3. copies backgrounds and obstacles into src/art/pixel/battle/
#   4. writes src/art/pixel/manifest.ts (sizes, frame counts, feet, strike frames, shot points, urls)
# Usage: python3 dev/pixel/build_assets.py   (from games/inkheroes)
import json
import shutil
from pathlib import Path

from PIL import Image

GAME = Path(__file__).resolve().parents[2]
DEV = GAME / 'dev'
PIX = DEV / 'pixel'
OUT = GAME / 'src' / 'art' / 'pixel'
POSES = ('idle', 'walk', 'attack')
TERRAINS = ('grass', 'dirt', 'rough', 'sand', 'snow', 'swamp')
OBSTACLES = ('rock', 'tree')


def shrink(im: Image.Image, scale: float) -> Image.Image:
    """Scales pixel art down by a non-whole factor without blur: a premultiplied box filter,
    then the alpha cut back to 0 or 255 (so the figure keeps hard edges)."""
    w, h = im.size
    nw, nh = round(w * scale), round(h * scale)
    px = im.load()
    pre = Image.new('RGBA', im.size)
    pp = pre.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            pp[x, y] = (r * a // 255, g * a // 255, b * a // 255, a)
    small = pre.resize((nw, nh), Image.BOX)
    sp = small.load()
    out = Image.new('RGBA', (nw, nh))
    op = out.load()
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = sp[x, y]
            if a >= 128:
                op[x, y] = (min(255, r * 255 // a), min(255, g * 255 // a), min(255, b * 255 // a), 255)
    return out


def pad(spec: dict) -> Image.Image:
    im = Image.open(DEV / spec['src']).convert('RGBA')
    if spec.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if spec.get('strip'):  # a baked-in ground shadow: drop its colour from the bottom rows
        rgb, rows = spec['strip']
        px, bottom = im.load(), im.getbbox()[3]
        for y in range(bottom - rows, bottom):
            for x in range(im.width):
                if list(px[x, y][:3]) == rgb:
                    px[x, y] = (0, 0, 0, 0)
    c = im.crop(im.getbbox())
    if spec.get('scale'):  # a figure drawn too big for its place: the canvas in `canvas` is already the scaled one
        c = shrink(c, spec['scale'])
    w, h = spec['canvas']
    if c.width > w or c.height > h - spec['foot']:
        raise SystemExit(f"{spec['src']}: {c.size} does not fit canvas {w}x{h}")
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(c, ((w - c.width) // 2 + spec.get('dx', 0), h - spec['foot'] - c.height))
    return out


def despeckle(frame: Image.Image, keep: int = 60) -> Image.Image:
    """Drops opaque islands smaller than `keep` px that aren't the main body
    (arrows or stones the generator drew in flight; the engine draws its own)."""
    w, h = frame.size
    a = frame.getchannel('A').load()
    seen = [[False] * w for _ in range(h)]
    islands = []
    for y in range(h):
        for x in range(w):
            if a[x, y] and not seen[y][x]:
                stack, pix = [(x, y)], []
                seen[y][x] = True
                while stack:
                    cx, cy = stack.pop()
                    pix.append((cx, cy))
                    for nx in range(cx - 1, cx + 2):
                        for ny in range(cy - 1, cy + 2):
                            if 0 <= nx < w and 0 <= ny < h and a[nx, ny] and not seen[ny][nx]:
                                seen[ny][nx] = True
                                stack.append((nx, ny))
                islands.append(pix)
    if len(islands) < 2:
        return frame
    biggest = max(len(i) for i in islands)
    out = frame.copy()
    px = out.load()
    for pix in islands:
        if len(pix) < keep and len(pix) < biggest:
            for x, y in pix:
                px[x, y] = (0, 0, 0, 0)
    return out


def clean_strip(strip: Image.Image, w: int) -> Image.Image:
    out = strip.copy()
    for i in range(strip.width // w):
        out.paste(despeckle(strip.crop((i * w, 0, (i + 1) * w, strip.height))), (i * w, 0))
    return out


def locked_strip(strip: Image.Image, w: int, shifts: list[int]) -> tuple[Image.Image, int]:
    """Holds a walk's body still: each frame moves by its `shifts` entry, plus
    the smallest margin that keeps them all on the canvas. Returns the strip and the margin."""
    frames = [strip.crop((i * w, 0, (i + 1) * w, strip.height)) for i in range(len(shifts))]
    boxes = [(f.getbbox(), dx) for f, dx in zip(frames, shifts)]
    low = max(-(box[0] + dx) for box, dx in boxes)
    high = min(w - (box[2] + dx) for box, dx in boxes)
    if low > high:
        raise SystemExit(f'the locked walk does not fit the {w} px canvas (margin {low}..{high})')
    margin = max(low, min(0, high))
    out = Image.new('RGBA', strip.size, (0, 0, 0, 0))
    for i, (frame, dx) in enumerate(zip(frames, shifts)):
        out.paste(frame, (i * w + dx + margin, 0))
    return out, margin


def foot_x(im: Image.Image) -> int:
    x0, y0, x1, y1 = im.getbbox()
    a = im.getchannel('A').load()
    xs = [x for y in range(y1 - max(2, (y1 - y0) // 8), y1) for x in range(x0, x1) if a[x, y]]
    return (min(xs) + max(xs)) // 2


def unit_entry(uid: str, spec: dict, defaults: dict, imports: list[str]) -> str:
    still = pad(spec)
    (PIX / 'pad').mkdir(exist_ok=True)
    still.save(PIX / 'pad' / f'{uid}.png')
    w, h = spec['canvas']
    frames, done = {}, []
    walk_margin = 0
    for pose in POSES:
        src = PIX / 'anim' / f'{uid}-{pose}.png'
        dst = OUT / 'units' / f'{uid}-{pose}.png'
        borrow = spec.get(f'{pose}From')
        if borrow and (PIX / 'anim' / f"{uid}-{borrow['pose']}.png").exists():
            # a loop assembled from another pose's frames (e.g. the griffin's wing beats)
            whole = clean_strip(Image.open(PIX / 'anim' / f"{uid}-{borrow['pose']}.png").convert('RGBA'), w)
            strip = Image.new('RGBA', (w * len(borrow['frames']), h))
            for i, f in enumerate(borrow['frames']):
                strip.paste(whole.crop((f * w, 0, (f + 1) * w, h)), (i * w, 0))
            strip.save(dst)
            frames[pose] = len(borrow['frames'])
            done.append(pose)
        elif src.exists():
            strip = Image.open(src)
            if spec.get('scale'):  # frames were generated on `animCanvas`; scale each down onto `canvas`
                aw, ah = spec['animCanvas']
                if strip.height != ah or strip.width % aw:
                    raise SystemExit(f'{src}: {strip.size} is not a strip of {aw}x{ah} frames')
                n = strip.width // aw
                scaled = Image.new('RGBA', (w * n, h))
                for i in range(n):
                    scaled.paste(shrink(strip.convert('RGBA').crop((i * aw, 0, (i + 1) * aw, ah)), spec['scale']), (i * w, 0))
                strip = scaled
            if strip.height != h or strip.width % w:
                raise SystemExit(f'{src}: {strip.size} is not a strip of {w}x{h} frames')
            clean = clean_strip(strip.convert('RGBA'), w)
            if pose == 'walk' and spec.get('walkLock'):
                lock = [round(v * spec['scale']) for v in spec['walkLock']] if spec.get('scale') else spec['walkLock']
                clean, walk_margin = locked_strip(clean, w, lock)
            clean.save(dst)
            frames[pose] = strip.width // w
            done.append(pose)
        else:
            still.save(dst)
            frames[pose] = 1
        imports.append(f"import {var(uid, pose)} from './units/{uid}-{pose}.png?url';")
    strike = min(spec.get('strike', defaults['strike']), frames['attack'] - 1)
    shot = spec.get('shot')
    lines = [
        f"  {uid}: {{",
        f"    name: {json.dumps(spec['name'])}, w: {w}, h: {h}, footX: {foot_x(still)}, footY: {h - spec['foot']},",
        f"    frames: {{ idle: {frames['idle']}, walk: {frames['walk']}, attack: {frames['attack']} }}, strike: {strike},",
    ]
    if shot:
        lines.append(f"    shotFrom: {{ x: {shot[0]}, y: {shot[1]} }},")
    if spec.get('flies'):
        lines.append('    flies: true,')
    if walk_margin:
        lines.append(f"    walkFootX: {foot_x(still) + walk_margin},")
    if spec.get('face'):
        lines.append(f"    face: {{ x: {spec['face'][0]}, y: {spec['face'][1]} }},")
    lines.append(f"    url: {{ idle: {var(uid, 'idle')}, walk: {var(uid, 'walk')}, attack: {var(uid, 'attack')} }},")
    lines.append('  },')
    print(f'{uid:10s} {w}x{h} frames {frames} animated: {done or "none"}')
    return '\n'.join(lines)


def var(*parts: str) -> str:
    head, *rest = [p.replace('-', '_') for p in parts]
    return head + ''.join(p[:1].upper() + p[1:] for p in rest)


def still_entry(name: str, path: Path, imports: list[str]) -> str:
    im = Image.open(path).convert('RGBA')
    x0, y0, x1, y1 = im.getbbox()
    shutil.copyfile(path, OUT / 'battle' / f'{name}.png')
    imports.append(f"import {var('obstacle', name)} from './battle/{name}.png?url';")
    return f"  {name}: {{ w: {im.width}, h: {im.height}, footX: {foot_x(im)}, footY: {y1}, url: {var('obstacle', name)} }},"


def main() -> None:
    cfg = json.loads((PIX / 'units.json').read_text())
    (OUT / 'units').mkdir(parents=True, exist_ok=True)
    (OUT / 'battle').mkdir(parents=True, exist_ok=True)
    defaults = {'strike': 4}
    imports: list[str] = []
    units = [unit_entry(uid, spec, defaults, imports) for uid, spec in cfg['units'].items()]
    heroes = [unit_entry(f'hero_{side}', spec, defaults, imports) for side, spec in cfg['heroes'].items()]

    bgs = []
    for t in TERRAINS:
        src = PIX / 'bg' / f'{t}.png'
        if not src.exists():
            src = PIX / 'bg' / 'grass.png'
        Image.open(src).convert('RGB').save(OUT / 'battle' / f'bg-{t}.png')
        imports.append(f"import {var('bg', t)} from './battle/bg-{t}.png?url';")
        bgs.append(f'  {t}: {var("bg", t)},')

    obstacles = [still_entry(o, PIX / 'obstacles' / f'{o}.png', imports)
                 for o in OBSTACLES if (PIX / 'obstacles' / f'{o}.png').exists()]

    ts = f"""// Generated by dev/pixel/build_assets.py from dev/pixel/units.json. Do not edit by hand.
// Pixel-art battle assets (PixelLab, style B, 32-bit on a 960x540 native world).
// Every frame strip is `frames` frames of w x h laid left to right, facing right.
// footX/footY: the pixel under the unit's feet, which goes on the hex centre.
// strike: the attack frame where the blow lands or the shot leaves; shotFrom: projectile start.
// face: the centre of the unit's face in its idle frame, for the turn order's portrait.
{chr(10).join(imports)}

export type Pose = 'idle' | 'walk' | 'attack';

export interface UnitArt {{
  readonly name: string;
  readonly w: number;
  readonly h: number;
  readonly footX: number;
  readonly footY: number;
  readonly frames: Readonly<Record<Pose, number>>;
  readonly strike: number;
  readonly shotFrom?: {{ readonly x: number; readonly y: number }};
  readonly flies?: boolean;
  /** The walk's own foot column, where its frames were moved to hold the body still. */
  readonly walkFootX?: number;
  /** The centre of the face in the idle frame: the turn order's portrait is cut round it. */
  readonly face?: {{ readonly x: number; readonly y: number }};
  readonly url: Readonly<Record<Pose, string>>;
}}

export interface StillArt {{
  readonly w: number;
  readonly h: number;
  readonly footX: number;
  readonly footY: number;
  readonly url: string;
}}

/** Battle art by creature id (ids are the logic's; names are the Greek retheme). */
export const UNIT_ART: Readonly<Record<string, UnitArt>> = {{
{chr(10).join(units)}
}};

/** The hero standing beside the field. Keyed by the ids in units.json `heroes`. */
export const HERO_ART: Readonly<Record<string, UnitArt>> = {{
{chr(10).join(heroes).replace('  hero_', '  ')}
}};

/** 1408x1056 battle backgrounds by terrain (the 960x540 world sits in the middle); the hex field is drawn over them. */
export const BATTLE_BG: Readonly<Record<string, string>> = {{
{chr(10).join(bgs)}
}};

/** Obstacle sprites standing on a hex. */
export const OBSTACLE_ART: Readonly<Record<string, StillArt>> = {{
{chr(10).join(obstacles)}
}};
"""
    (OUT / 'manifest.ts').write_text(ts)
    print('wrote', OUT / 'manifest.ts')


if __name__ == '__main__':
    main()
