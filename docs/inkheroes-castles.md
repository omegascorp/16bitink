# InkHeroes: how to make a castle

How the siege castle is made, so the next faction's can be made the same way. The Greek castle is the worked example. It takes one sitting and about 50 PixelLab generations once the model is right.

Everything lives in `games/inkheroes/dev/pixel/siege3d/`:

| File | What it is | Reuse for a new castle |
|---|---|---|
| `render3d.py` | The 3D renderer, numpy only: triangles, depth buffer, sun shadows, ambient occlusion | As it is |
| `castle_greek.py` | **The 3D scene**: the Greek castle, stone by stone, every part and state | Copy and change |
| `sheets.py` | Packs parts onto sheets for PixelLab, cuts the painted sheets back up | As it is |
| `install.py` | Puts painted parts in the game and writes `src/art/pixel/siege.ts` | As it is, once it picks the faction's art |
| `paint/greek/` | What PixelLab painted: `sheet-N.png`, `court.png`, `moat.png`, `bridge.png` | One folder per castle |
| `out/` | Renders, rebuilt from the scene, not in git | Nothing to keep |

## Why it's done this way

Two attempts failed and each taught something. Don't repeat them.

- **Drawing walls in code:** no script comes close to the painted units and town. It read as a cheaper game.
- **Painting a 2D layout:** PixelLab paints a layout well but can't fix one. The joins were wrong (a tower sitting on a wall, a gate running into a wall), and they stayed wrong in the paint.

So the geometry comes from a real 3D model and only the surface comes from PixelLab. Joins, occlusion and shadows are right because the model is. A breach is the same stones with some taken away, and rubble is those stones on the ground. The model's outlines cut the painted parts, so every part still stands on its hexes.

## The field's projection

A point is `(gx, gy, z)` in native battle pixels: `gx, gy` is where it stands on the field, `z` its height. On screen it lands at `(gx, gy - z)`. There is no camera, which is why a model lands on the hexes exactly.

What follows from that:

- A face turned south shows at full size, and a face turned due east or west is edge-on and can't be seen. **So anything that must look at the attacker is turned to the lower left**: `GATE` runs at a slope of about 1:2, and its face shows. A gate square on to the camera looks the wrong way.
- The ground has full depth, so a real circle shows as a full circle. Round towers are squashed north to south (`ROUND`) or their tops look like plates.
- A wall coming towards the viewer from a tower passes in front of it, so the walk runs into the tower's body. If the tower is drawn over that wall instead, its foot lands on the walk and it seems to sit on the wall.

## The parts

Each is modular: it's rendered alone, and the game swaps its state in place. Keys are `<part>-<state>`.

| Part | States | What it is |
|---|---|---|
| `wallNorth`, `wallSouth` | 2 whole, 1 cracked, 0 breached | The breakable stretches |
| `wallGateNorth`, `wallGateSouth` | 2, 1, 0 | The round towers either side of the gate. These are the game's two stretches beside the gate |
| `gate` | 1 whole, 0 broken | A thick stretch of wall with a real passage and a portcullis |
| `keep`, `towerNorth`, `towerSouth` | 1, 0 | The towers companies stand on |
| `wallNorthInner`, `wallSouthInner`, `gateLink`, `gateTurret`, `farWall` | 2 | Never break |
| `nearWall` | 2 | The wall along the field's bottom edge, nearest the viewer. Never breaks, and the game shows it see-through |

The names and states are what `src/logic/siege.ts` and `src/scenes/battle/siegeView.ts` expect. A new castle can look like anything, but the hexes in `WALL_COL` must stay covered by the same parts.

## Making a new castle

1. **Copy the scene.** `cp castle_greek.py castle_egypt.py`. Keep `PARTS`, `WALL_COL` and the part positions. Change `OUT`, `STONE`, the proportions and the shapes in `gate`, `wall` and `tower`. Faction character belongs here: sloped walls, pylons, a different gate.
2. **Look at the model first.** `python3 dev/pixel/siege3d/castle_egypt.py --view` renders it whole and fully broken in about 15 seconds. Fix the shape now: paint won't. Check that the gate faces the attacker, walls run into towers, nothing hides a hex that units walk on, and the broken version looks like a collapse.
3. **Render every part.** `python3 dev/pixel/siege3d/castle_egypt.py` (about 3 minutes). Add `--obj` to also write each part as an OBJ file, for opening the scene in a 3D tool.
4. **Pack the sheets.** `python3 dev/pixel/siege3d/sheets.py pack egypt` writes `out/egypt/sheet-N.png`. The Greek castle's first 25 pieces fit on two.
5. **Paint each sheet.** Upload it (`get_upload_url`, then curl) and call PixelLab `edit_image`, 512 x 512, `no_background: true`, the same seed for every sheet, about 25 generations each. Use the prompt below. Save the results as `paint/egypt/sheet-N.png`. Sheets take about 2 minutes.
6. **Paint the ground.** The court with `create_image_pro`, 512 x 512, `no_background: false`, with the town's art as `style_image`: about 25 generations and 7 minutes. It's placed so a road in it starts at the gate (`COURT_AT`). Moat and bridge: `edit_image` on the Greek sprites with a new description, transparent. Reuse them if they suit the faction.
7. **Cut and install.** `python3 dev/pixel/siege3d/sheets.py cut egypt`, then `python3 dev/pixel/siege3d/install.py egypt`. `cut` prints its worst match, which should be above 0.9. Lower means PixelLab moved or reshaped something: look at that sheet and paint it again with another seed.
8. **Set the perches.** If tower heights changed, update `TOWER_FEET` in `src/scenes/battle/pixelLayout.ts`: `y` is the tower's foot minus its top. Update `PART_AT` in `siegeView.ts` if the gate moved.
9. **Check it.** Open `dev/battle.html?siege=castle&terrain=dirt&machine=catapult3&towers=bowman:22,bowman:8,bowman:6` and press Auto. Also try `siege=fort`, `siege=citadel`, grass and snow, and a phone size. Look at it zoomed in, at the gate and at every tower join.

**Changing a few parts later:** render again, then `python3 dev/pixel/siege3d/sheets.py pack greek gateLink nearWall` packs only those parts on a new sheet and leaves the others where they are. Paint that sheet alone (about 25 generations), then cut and install as usual. The Greek castle's `sheet-2.png` was made this way.

Today the game has one castle, so `install.py` writes `src/art/pixel/siege/` directly. The second faction needs that split by faction, and `SiegeView` told which set to load.

### The painting prompt

Ask for the surface only, and list what must not change. The sentence about staying in place and transparent matters most.

> Turn this 3D render of separate castle parts into masterful, richly detailed painterly pixel art for a Heroes of Might and Magic style strategy game. Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the same light and shadow; add nothing new; transparent stays transparent, with no ground. Replace the plain blocks with hand-painted ancient Greek masonry: weathered honey and cream limestone, uneven courses, deep mortar lines, chips and worn edges, darker stained bases, a little ivy and moss at the foot of walls. Broken parts show rough torn stone, dark rubble core and scattered fallen blocks. The gate keeps its iron portcullis, carved pediment and terracotta banners. Strong warm sunlight from the left.

## Traps

- **Paint separate parts, on transparent sheets.** A whole castle on one canvas gets invented walls and painted ground, and it can't be cut apart cleanly: what's hidden behind a tower was never painted, so a hole opens when the tower falls. Separate parts have no hidden pixels.
- **Battlements face away from the court.** `wall()` works out which side that is from `INSIDE`, a point in the court, so keep that point inside a new castle's walls. Setting the side by hand put three walls' battlements on the court side.
- **The near wall stands in front of the bottom row.** It would hide those figures, so `ghost` in `install.py` bakes its transparency into the sprite: 34% for the face, 50% for the walk and battlements, so its line still reads. It sorts over every figure, so it's cut around the south tower rather than drawn over it. `COURT_END` stops the court at its foot.
- **Keep the model's outline.** `sheets.py` takes only colour from the painting. PixelLab drifts and redraws edges a little, and the model's outline keeps everything on the hexes.
- **Sorting is art direction.** `SORT` in `install.py` sets where each part sits among the figures. It isn't always its true foot: the upper arm and the gate sort early, or a figure outside them would be hidden. The keep and south tower sort just behind the company standing on them.
- **Keep towers low near the top of the field.** The north tower's company must stay on a 16:9 screen, so it's lower than the south tower. The world's top edge is `y = 0`.
- **The ground shadow is baked.** `install.py` darkens the court with the shadow the whole model casts. Only the keep's shadow is separate, because it stands alone and would be missed when it falls.
- **A fort shows every tower.** A tower a town's level gives no place for still stands, unmanned, since the walls end on it. A plain fort differs from a castle by its moat and archers, not its shape.
- **Don't load 3D libraries from a CDN.** The first try used Three.js that way, and it was blocked. `render3d.py` needs only numpy and Pillow and gives the same picture every run.
