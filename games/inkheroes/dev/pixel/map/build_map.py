"""Builds the adventure map's pixel art into src/art/pixel/map/ and lists it in
src/art/pixel/map.ts.

  python3 dev/pixel/map/build_map.py

Sources (PixelLab create_image_pixen, style B; picks below, the rest are
rejects kept for reference):
  ground/<terrain>.png  top-down ground swatches; the map samples them in
                        irregular patches (pixelGround.ts), so they need not tile.
                        Water and snow are drawn in code.
  sites/*.png           one sprite per map site, standing on its bottom row.
  cover/*.png           mountains, a boulder, the bridge; trees come from the
                        battle's grass sheets (cover/split/, by split.py).
Every sprite is trimmed to its pixels; its feet are the middle of its bottom row.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
OUT = GAME / 'src' / 'art' / 'pixel' / 'map'
TS = GAME / 'src' / 'art' / 'pixel' / 'map.ts'

# terrain -> (source, border cropped off each side[, brightness])
GROUND = {
    'grass': ('ground/grass2.png', 12, 1.32),
    'dirt': ('ground/dirt.png', 12),
    'rough': ('ground/rough2.png', 40),
    'sand': ('ground/sand2.png', 12),
    'swamp': ('ground/swamp2.png', 12),
}
# site art -> (source, rows kept from the top or None for all)
SITES = {
    'town': ('sites/town-f.png', None),
    'mine-gold': ('sites/mine-gold-b.png', None),
    'mine-wood': ('sites/mine-wood.png', None),
    'mine-ore': ('sites/mine-ore-c.png', None),
    'mine-gems': ('sites/mine-gems.png', None),
    'mercCamp': ('sites/mercCamp-c.png', None),
    'watchtower': ('sites/watchtower.png', None),
    'windmill': ('sites/windmill-c.png', None),
    'stables': ('sites/stables-e.png', None),
    'standingStone': ('sites/standingStone.png', None),
    'shrine': ('sites/shrine.png', None),
    'chest': ('sites/chest.png', None),
    'campfire': ('sites/campfire.png', None),
    **{f'pile-{r}': (f'sites/pile-{r}.png', None) for r in ('gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems')},
}
COVER = {
    'tree': ['cover/split/tree-0.png', 'cover/split/tree-1.png', 'cover/split/tree-3.png', 'cover/split/tree-5.png',
             'cover/split/tree-6.png', 'cover/split/tree-7.png', 'cover/split/tree-8.png', 'cover/split/tree-9.png'],
    'pine': ['cover/split/tree-2.png', 'cover/split/tree-4.png'],
    'olive': ['cover/split/small-2.png', 'cover/split/small-3.png', 'cover/split/small-4.png', 'cover/split/small-5.png'],
    'mountain': ['cover/mountain-b.png', 'cover/mountain-c.png'],
    'rock': ['cover/rock-a.png'],
    'bridge': ['cover/bridge.png'],
}
# The campaign menu's map pictures, by map (or planned map) id.
VIGNETTES = ('ashford', 'thornwood', 'blackBanner')
# The town's hill runs off the canvas at the bottom: from this row its sides are cut back into a mound and outlined.
TOWN_TAPER = 128
EDGE = (34, 24, 16, 255)


def trimmed(path: Path, rows: int | None = None) -> Image.Image:
    im = Image.open(path).convert('RGBA')
    if rows is not None:
        im = im.crop((0, 0, im.width, rows))
    # Faint antialias specks round a sprite would be blurry squares on the map: alpha is all or nothing.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    box = im.getbbox()
    return im.crop(box) if box else im


def taper(im: Image.Image, start: int) -> Image.Image:
    """Cuts the rows from `start` down back from both sides (a slope), then outlines the new edge."""
    im = im.copy()
    px = im.load()
    w, h = im.size
    for y in range(start, h):
        t = int((y - start) * 0.9)
        for x in range(w):
            if x < t or x >= w - t:
                px[x, y] = (0, 0, 0, 0)
    out = im.copy()
    o = out.load()
    for y in range(start - 2, h):
        for x in range(w):
            if px[x, y][3] and any(not (0 <= x + dx < w and 0 <= y + dy < h) or not px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = EDGE
    return out


def ident(name: str) -> str:
    parts = name.replace('-', ' ').split()
    return parts[0] + ''.join(p[0].upper() + p[1:] for p in parts[1:])


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    imports: list[str] = []
    ground_rows: list[str] = []
    for terrain, (src, border, *lift) in GROUND.items():
        im = Image.open(HERE / src).convert('RGBA')
        im = im.crop((border, border, im.width - border, im.height - border))
        if lift:
            im = im.point(lambda v, f=lift[0]: min(255, round(v * f)))
        im.save(OUT / f'ground-{terrain}.png')
        imports.append(f"import ground{terrain.title()} from './map/ground-{terrain}.png?url';")
        ground_rows.append(f'  {terrain}: ground{terrain.title()},')

    def sprite(name: str, im: Image.Image) -> str:
        im.save(OUT / f'{name}.png')
        var = ident(name)
        imports.append(f"import {var} from './map/{name}.png?url';")
        return f'{{ url: {var}, w: {im.width}, h: {im.height}, footX: {im.width // 2}, footY: {im.height - 1} }}'

    def site(art: str, src: str, rows: int | None) -> Image.Image:
        im = trimmed(HERE / src, rows)
        return taper(im, TOWN_TAPER - (Image.open(HERE / src).height - im.height)) if art == 'town' else im

    site_rows = [f"  '{art}': {sprite(f'site-{art}', site(art, src, rows))}," for art, (src, rows) in SITES.items()]
    vignette_rows = []
    for v in VIGNETTES:
        Image.open(HERE / 'vignettes' / f'{v}.png').convert('RGBA').save(OUT / f'vignette-{v}.png')
        imports.append(f"import vignette{v[0].upper() + v[1:]} from './map/vignette-{v}.png?url';")
        vignette_rows.append(f'  {v}: vignette{v[0].upper() + v[1:]},')
    cover_rows = []
    for kind, srcs in COVER.items():
        items = [sprite(f'{kind}-{i}', trimmed(HERE / s)) for i, s in enumerate(srcs)]
        cover_rows.append(f'  {kind}: [\n    ' + ',\n    '.join(items) + ',\n  ],')
    TS.write_text(f"""// Generated by dev/pixel/map/build_map.py. Do not edit by hand.
// The adventure map's pixel art (PixelLab, style B, at the battle's pixel size: a map tile is 48 px).
// Sprites stand on (footX, footY), the middle of their bottom row.
import type {{ SiteArt }} from '../sites/types';
{chr(10).join(imports)}

export interface MapSprite {{
  readonly url: string;
  readonly w: number;
  readonly h: number;
  readonly footX: number;
  readonly footY: number;
}}

export type MapCover = {' | '.join(repr(k) for k in COVER)};

/** Top-down ground swatches by terrain, sampled in irregular patches (water and snow are drawn in code). */
export const MAP_GROUND: Readonly<Partial<Record<string, string>>> = {{
{chr(10).join(ground_rows)}
}};

/** Each site's sprite. Mines not drawn yet borrow the gold mine. */
export const MAP_SITES: Readonly<Partial<Record<SiteArt, MapSprite>>> = {{
{chr(10).join(site_rows)}
}};

/** The campaign menu's picture of each map (192 x 96), by map or planned-map id. */
export const MAP_VIGNETTES: Readonly<Record<string, string>> = {{
{chr(10).join(vignette_rows)}
}};

/** Trees, mountains, boulders and the bridge, a few of each to vary. */
export const MAP_COVER: Readonly<Record<MapCover, readonly MapSprite[]>> = {{
{chr(10).join(cover_rows)}
}};
""")
    print(f'wrote {TS}')


if __name__ == '__main__':
    main()
