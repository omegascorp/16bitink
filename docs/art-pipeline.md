# Pen & ink art pipeline

The game currently draws **procedural placeholder ink**: jittered, re-traced strokes, hatching and 3-frame line boil (`games/inkfish/src/art/`). Swapping in real drawings needs no gameplay changes. Load an atlas whose frame names match the generated texture keys, then remove the `generateInkTextures()` call in `BootScene`.

## Texture keys to draw

| Key pattern | Size (px) | Notes |
|---|---|---|
| `fish-<species>-light-<0..2>` | 200×200, fish ~130 px long, facing **right** | Prey/peer look: light hatching |
| `fish-<species>-heavy-<0..2>` | 200×200 | Predator look: dense cross-hatch, angry brow |
| `fish-inkling-light-<0..2>` | 200×200 | The player (blue ink) |
| `jelly-<0..2>`, `hook-<0..2>`, `weed-<0..2>` | 128², 48×76, 120×220 | Hook barb near the bottom-left |
| `pu-speed-<0..2>`, `pu-shrink-<0..2>` | 80² | Power-up badges |
| `rock-<0..2>`, `bubble`, `paper` | 220×110, 16², 512² tile | Paper must tile seamlessly |

Species: `minnow`, `perch`, `puffer`, `pike`, `angler`, `eel`. Sprites scale with fish size, so draw at 2× and let the GPU downscale.

## Process

1. **Draw** on smooth bristol with a fineliner or dip pen. Draw each pose **three times** by tracing over the previous one; the small differences make the line boil.
2. **Scan** at 600 dpi greyscale (a flatbed beats a phone camera).
3. **Clean** in Krita/GIMP/Photoshop: apply Levels → near-threshold, keeping slight grey anti-aliasing. Make paper white transparent, then add watercolour washes on a separate layer if wanted.
4. **Keep raster.** Vectorising (Potrace etc.) kills the line character.
5. **Pack:** free-tex-packer (free) or TexturePacker (paid), Phaser JSON hash format. Use ≤ 2048 px pages for mobile, exported as WebP.
6. Load in `BootScene.preload()` with `this.load.atlas(...)`.
