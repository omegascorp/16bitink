"""A small 3D renderer for the castles, in numpy alone: triangles, a depth buffer, sun shadows, ambient occlusion.

A point is (gx, gy, z) in native pixels of the battle world: gx and gy are where it stands on the field, z its height.
The field's projection is an oblique one: screen = (gx, gy - z), and nearer means further south or higher (gy + z).
So a face turned south shows at full size, a face turned due west or east shows edge-on, and a top shows at full size.
That projection is why every castle lands exactly on the hexes: no camera to line up.
"""
from __future__ import annotations

import colorsys
import math

import numpy as np

SUN = np.array([-0.56, 0.42, 0.72])
SUN = SUN / np.linalg.norm(SUN)
AMBIENT = 0.46
SKY = 0.22
SUN_LIGHT = 0.96
VIEW = np.array([0.0, 1.0, 1.0])
SHADOW_RES = 2.0
SHADOW_BIAS = 1.6
AO = {'radius': 5, 'strength': 0.055, 'floor': 0.5}


def stone_colour(hue: float, sat: float, light: float) -> np.ndarray:
    return np.array(colorsys.hls_to_rgb(hue, min(1.0, light), sat))


class Mesh:
    """Triangles with a colour each."""

    def __init__(self) -> None:
        self.tris: list[np.ndarray] = []
        self.cols: list[np.ndarray] = []

    def face(self, pts: list, col: np.ndarray, inside: np.ndarray | None = None) -> None:
        """A flat polygon, as a fan; `inside` is a point behind it, which turns its triangles outward."""
        p = [np.asarray(q, dtype=float) for q in pts]
        for i in range(1, len(p) - 1):
            t = np.array([p[0], p[i], p[i + 1]])
            if inside is not None and np.dot(np.cross(t[1] - t[0], t[2] - t[0]), t[0] - inside) < 0:
                t = t[[0, 2, 1]]
            self.tris.append(t)
            self.cols.append(col)

    def box(self, x: float, y: float, z: float, l: float, d: float, h: float, a: float, col: np.ndarray, tilt: tuple[float, float] | None = None) -> None:
        """A box centred on (x, y, z), `l` along ground direction `a`, `d` across it, `h` high; `tilt` tips it (a fallen stone)."""
        u = np.array([math.cos(a), math.sin(a), 0.0])
        v = np.array([-math.sin(a), math.cos(a), 0.0])
        w = np.array([0.0, 0.0, 1.0])
        if tilt:
            for ang, (p, q) in zip(tilt, ((v, w), (u, w))):
                c, s = math.cos(ang), math.sin(ang)
                if p is v:
                    v, w = c * v + s * w, -s * v + c * w
                else:
                    u, w = c * u + s * w, -s * u + c * w
        c0 = np.array([x, y, z])
        corner = lambda i, j, k: c0 + u * (i * l / 2) + v * (j * d / 2) + w * (k * h / 2)  # noqa: E731
        for axis, sign in ((0, 1), (0, -1), (1, 1), (1, -1), (2, 1), (2, -1)):
            quad = []
            for p, q in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                idx = [p, q]
                idx.insert(axis, sign)
                quad.append(corner(*idx))
            self.face(quad, col, c0)

    def prism(self, poly: list[tuple[float, float]], z0: float, z1: float, col: np.ndarray, top: np.ndarray | None = None) -> None:
        """A prism on a ground polygon, walls and top."""
        cx, cy = np.mean(poly, axis=0)
        inside = np.array([cx, cy, (z0 + z1) / 2])
        for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
            self.face([(ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1)], col, inside)
        self.face([(x, y, z1) for x, y in poly], col if top is None else top, inside)

    def arrays(self) -> tuple[np.ndarray, np.ndarray]:
        return (np.array(self.tris), np.array(self.cols)) if self.tris else (np.zeros((0, 3, 3)), np.zeros((0, 3)))

    def obj(self) -> str:
        """As a Wavefront OBJ (Y up, Z towards the viewer's south), to open the scene in a 3D tool."""
        tris, _ = self.arrays()
        lines = [f'v {p[0]:.2f} {p[2]:.2f} {p[1]:.2f}' for t in tris for p in t]
        lines += [f'f {i * 3 + 1} {i * 3 + 2} {i * 3 + 3}' for i in range(len(tris))]
        return '\n'.join(lines) + '\n'


def normals(tris: np.ndarray) -> np.ndarray:
    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    return n / np.maximum(1e-9, np.linalg.norm(n, axis=1, keepdims=True))


def rasterize(xy: np.ndarray, depth: np.ndarray, w: int, h: int, fill) -> np.ndarray:
    """Draws triangles (screen `xy`, `depth` at each corner, bigger is nearer); `fill(i, mask, ys, xs)` paints what's in front. Returns the depth buffer."""
    zbuf = np.full((h, w), -1e9)
    for i in range(len(xy)):
        (ax, ay), (bx, by), (cx, cy) = xy[i]
        x0 = max(int(min(ax, bx, cx)), 0)
        x1 = min(int(max(ax, bx, cx)) + 1, w - 1)
        y0 = max(int(min(ay, by, cy)), 0)
        y1 = min(int(max(ay, by, cy)) + 1, h - 1)
        if x0 > x1 or y0 > y1:
            continue
        area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
        if abs(area) < 1e-9:
            continue
        ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        px = xs + 0.5
        py = ys + 0.5
        l1 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area
        l2 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area
        l3 = 1 - l1 - l2
        inside = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
        if not inside.any():
            continue
        d = l1 * depth[i, 0] + l2 * depth[i, 1] + l3 * depth[i, 2]
        front = inside & (d > zbuf[y0:y1 + 1, x0:x1 + 1])
        if front.any():
            zbuf[y0:y1 + 1, x0:x1 + 1][front] = d[front]
            if fill:
                fill(i, front, y0, x0)
    return zbuf


class ShadowMap:
    """How far along the sun each spot of ground is covered, built up from any number of meshes."""

    def __init__(self, bounds: tuple[float, float, float, float]) -> None:
        self.e1 = np.cross(SUN, [0.0, 0.0, 1.0])
        self.e1 /= np.linalg.norm(self.e1)
        self.e2 = np.cross(SUN, self.e1)
        self.u0, self.u1, self.v0, self.v1 = bounds
        self.w = int((self.u1 - self.u0) * SHADOW_RES)
        self.h = int((self.v1 - self.v0) * SHADOW_RES)
        self.map = np.full((self.h, self.w), -1e9)

    def project(self, p: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        return (p @ self.e1 - self.u0) * SHADOW_RES, (p @ self.e2 - self.v0) * SHADOW_RES, p @ SUN

    def add(self, tris: np.ndarray) -> 'ShadowMap':
        if len(tris):
            keep = normals(tris) @ SUN > 0
            t = tris[keep]
            u, v, w = self.project(t)
            self.map = np.maximum(self.map, rasterize(np.stack([u, v], axis=-1), w, self.w, self.h, None))
        return self

    def merged(self, other: 'ShadowMap') -> 'ShadowMap':
        out = ShadowMap((self.u0, self.u1, self.v0, self.v1))
        out.map = np.maximum(self.map, other.map)
        return out

    def lit(self, pts: np.ndarray) -> np.ndarray:
        """How much sun reaches each point: 0 to 1, softened over four samples."""
        u, v, w = self.project(pts)
        out = np.zeros(len(pts))
        for du, dv in ((-0.8, -0.8), (0.8, -0.8), (-0.8, 0.8), (0.8, 0.8)):
            iu = np.clip((u + du).astype(int), 0, self.w - 1)
            iv = np.clip((v + dv).astype(int), 0, self.h - 1)
            out += w >= self.map[iv, iu] - SHADOW_BIAS
        return out / 4


def blur(a: np.ndarray, r: int) -> np.ndarray:
    """A box blur, r pixels either way."""
    c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
    a = (c[2 * r + 1:] - c[:-(2 * r + 1)]) / (2 * r + 1)
    c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
    return (c[:, 2 * r + 1:] - c[:, :-(2 * r + 1)]) / (2 * r + 1)


def render(tris: np.ndarray, cols: np.ndarray, shadow: ShadowMap | None, scale: int = 3, margin: int = 6) -> tuple[np.ndarray, int, int]:
    """Draws a mesh; an RGBA array `scale` times the world's pixels, and where its top-left falls in the world."""
    sx = tris[..., 0]
    sy = tris[..., 1] - tris[..., 2]
    x0 = math.floor(sx.min()) - margin
    y0 = math.floor(sy.min()) - margin
    w = (math.ceil(sx.max()) + margin - x0) * scale
    h = (math.ceil(sy.max()) + margin - y0) * scale
    n = normals(tris)
    show = n @ VIEW > 1e-6
    tris, cols, n = tris[show], cols[show], n[show]
    xy = np.stack([(tris[..., 0] - x0) * scale, (tris[..., 1] - tris[..., 2] - y0) * scale], axis=-1)
    depth = tris[..., 1] + tris[..., 2]
    albedo = np.zeros((h, w, 3))
    sunny = np.zeros((h, w))
    sky = np.zeros((h, w))
    facing = np.maximum(0, n @ SUN)
    up = 0.5 + 0.5 * n[:, 2]

    def fill(i: int, mask: np.ndarray, y: int, x: int) -> None:
        hh, ww = mask.shape
        albedo[y:y + hh, x:x + ww][mask] = cols[i]
        sunny[y:y + hh, x:x + ww][mask] = facing[i]
        sky[y:y + hh, x:x + ww][mask] = up[i]

    zbuf = rasterize(xy, depth, w, h, fill)
    drawn = zbuf > -1e8
    light = AMBIENT + SKY * sky
    if shadow is not None and drawn.any():
        ys, xs = np.nonzero(drawn)
        gx = xs / scale + x0
        scr = ys / scale + y0
        d = zbuf[ys, xs]
        gy = (scr + d) / 2
        z = (d - scr) / 2
        sunny = sunny.copy()
        sunny[ys, xs] *= shadow.lit(np.stack([gx, gy, z], axis=1))
    # Ambient occlusion: a spot lying deeper than what's round it gets less light, which is what opens up the joints between stones.
    filled = np.where(drawn, zbuf, np.nan)
    base = np.nan_to_num(filled, nan=float(np.nanmin(filled)) if drawn.any() else 0)
    r = AO['radius'] * scale // 3 + 1
    occl = np.clip(1 - AO['strength'] * np.maximum(0, blur(base, r) - base), AO['floor'], 1)
    shade = (light + SUN_LIGHT * sunny) * occl
    rgb = np.clip(albedo * shade[..., None], 0, 1)
    rgb = rgb ** (1 / 1.25)
    out = np.dstack([rgb, drawn.astype(float)])
    return (out * 255).astype(np.uint8), x0, y0
