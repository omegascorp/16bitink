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

- A face turned south shows at full size, and a face turned due east or west is edge-on and can't be seen. **The gate uses this on purpose (user):** the gatehouse stands in the line of the wall with its door facing west to the attacker, so a shut gate shows no door at all, only two turrets and the dark gap between them. The bridge lowering is what shows it open. Don't turn the door towards the camera: a gate facing the viewer looks the wrong way, and one turned to the lower left was tried and replaced.
- The ground has full depth, so a real circle shows as a full circle. Round towers are squashed north to south (`ROUND`) or their tops look like plates.
- A wall coming towards the viewer from a tower passes in front of it, so the walk runs into the tower's body. If the tower is drawn over that wall instead, its foot lands on the walk and it seems to sit on the wall.

## The parts

Each is modular: it's rendered alone, and the game swaps its state in place. Keys are `<part>-<state>`.

| Part | States | What it is |
|---|---|---|
| `wallNorth`, `wallSouth` | 2 whole, 1 cracked, 0 breached | The breakable stretches |
| `wallGateNorth`, `wallGateSouth` | 2, 1, 0 | The round towers either side of the gate. These are the game's two stretches beside the gate |
| `gate` | 1 whole, 0 broken | The gatehouse: two square turrets on the gate's hex with the passage between them |
| `keep`, `towerNorth`, `towerSouth` | 1, 0 | The towers companies stand on. The keep includes its steps |
| `wallNorthInner`, `wallSouthInner`, `wallSouthEnd`, `farWall` | 2 | Never break |
| `nearWall` | 2 | The wall along the field's bottom edge, nearest the viewer. Never breaks, and the game shows it see-through |

The names and states are what `src/logic/siege.ts` and `src/scenes/battle/siegeView.ts` expect. A new castle can look like anything, but the hexes in `WALL_COL` must stay covered by the same parts.

## Making a new castle

1. **Copy the scene.** `cp castle_greek.py castle_egypt.py`. Keep `PARTS`, `WALL_COL` and the part positions. Change `OUT`, `STONE`, the proportions and the shapes in `gate`, `wall` and `tower`. Faction character belongs here: sloped walls, pylons, a different gate.
2. **Look at the model first.** `python3 dev/pixel/siege3d/castle_egypt.py --view` renders it whole and fully broken in about 15 seconds. Fix the shape now: paint won't. Check that a shut gate shows no door, battlements are on the outside, walls run into towers, nothing hides a hex that units walk on, and the broken version looks like a collapse.
3. **Render every part.** `python3 dev/pixel/siege3d/castle_egypt.py` (about 3 minutes). Add `--obj` to also write each part as an OBJ file, for opening the scene in a 3D tool.
4. **Pack the sheets.** `python3 dev/pixel/siege3d/sheets.py pack egypt` writes `out/egypt/sheet-N.png`. The Greek castle's first 25 pieces fit on two.
5. **Paint each sheet.** Upload it (`get_upload_url`, then curl) and call PixelLab `edit_image`, 512 x 512, `no_background: true`, the same seed for every sheet, about 25 generations each. Use the prompt below. Save the results as `paint/egypt/sheet-N.png`. Sheets take about 2 minutes.
6. **Paint the ground.** The court with `create_image_pro`, 512 x 512, `no_background: false`, with the town's art as `style_image`: about 25 generations and 7 minutes. It's placed so a road in it starts at the gate (`COURT_AT`). Moat and bridge: `edit_image` on the Greek sprites with a new description, transparent. Reuse them if they suit the faction.
7. **Cut and install.** `python3 dev/pixel/siege3d/sheets.py cut egypt`, then `python3 dev/pixel/siege3d/install.py egypt`. `cut` prints its worst match, which should be above 0.9. Lower means PixelLab moved or reshaped something: look at that sheet and paint it again with another seed.
8. **Set the perches.** If tower heights changed, update `TOWER_FEET` in `src/scenes/battle/pixelLayout.ts`: `y` is the tower's foot minus its top. Update `PART_AT` in `siegeView.ts` if the gate moved.
9. **Check it.** Open `dev/battle.html?siege=castle&terrain=dirt&machine=catapult3&towers=bowman:22,bowman:8,bowman:6` and press Auto. Also try `siege=fort`, `siege=citadel`, grass and snow, and a phone size. Look at it zoomed in, at the gate and at every tower join.

**Changing a few parts later:** render again, then `python3 dev/pixel/siege3d/sheets.py pack greek gate nearWall` packs only those parts on a new sheet and leaves the others where they are. Paint that sheet alone (about 25 generations), then cut and install as usual. The Greek castle's `sheet-2.png` and `sheet-3.png` were made this way.

Today the game has one castle, so `install.py` writes `src/art/pixel/siege/` directly. The second faction needs that split by faction, and `SiegeView` told which set to load.

### The painting prompt

Ask for the surface only, and list what must not change. The sentence about staying in place and transparent matters most.

> Turn this 3D render of separate castle parts into masterful, richly detailed painterly pixel art for a Heroes of Might and Magic style strategy game. Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the same light and shadow; add nothing new; transparent stays transparent, with no ground. Replace the plain blocks with hand-painted ancient Greek masonry: weathered honey and cream limestone, uneven courses, deep mortar lines, chips and worn edges, darker stained bases, a little ivy and moss at the foot of walls. Broken parts show rough torn stone, dark rubble core and scattered fallen blocks. The dark gap between the two square turrets stays deep black shadow, and the terracotta banner stays. Strong warm sunlight from the left.

## Traps

- **Paint separate parts, on transparent sheets.** A whole castle on one canvas gets invented walls and painted ground, and it can't be cut apart cleanly: what's hidden behind a tower was never painted, so a hole opens when the tower falls. Separate parts have no hidden pixels.
- **Battlements face away from the court.** `wall()` works out which side that is from `INSIDE`, a point in the court, so keep that point inside a new castle's walls. Setting the side by hand put three walls' battlements on the court side.
- **The near wall stands in front of the bottom row.** It would hide those figures, so `ghost` in `install.py` bakes its transparency into the sprite: 34% for the face, 50% for the walk and battlements, so its line still reads. It sorts over every figure, so it's cut around the south tower rather than drawn over it. `COURT_END` stops the court at its foot.
- **Keep the model's outline.** `sheets.py` takes only colour from the painting. PixelLab drifts and redraws edges a little, and the model's outline keeps everything on the hexes.
- **Sorting is art direction.** `SORT` in `install.py` sets where each part sits among the figures. It isn't always its true foot: the upper arm and the gate sort early, or a figure outside them would be hidden. The keep and south tower sort just behind the company standing on them.
- **The keep stands behind the last column (user), level with the gate,** so it hides no one and can stay tall. A company needs a hex, so the keep holds `hexAt(14, 5)`, the outermost hex of its row, and its steps cover that hex so the block makes sense on screen. The defender's hero stood there, so at a siege it stands below the keep (`heroFeet`). The formation row on that hex starts one column forward (`KEEP_ROW`).
- **Keep the corner towers low.** The north tower's company must stay on a 16:9 screen, whose top edge is `y = 0`. The south tower stands a row past the arm's last hex, so its foot may run off the screen, which is fine (user). It stays low so it doesn't hide the court hex behind it. Its hex is still row 10's, which `src/logic/siege.ts` calls `towerSouth`.
- **The bridge is the gate's only moving part.** `SiegeView` lowers it when a defender's path crosses the gate or the bridge (`throughGate`), keeps it down while anyone stands there, and leaves it down once the gate falls. It shows at a town with no moat too, or a gate opening there couldn't be seen.
- **The moat is painted around the gate.** It bows out to the west at the gate's row, so the gatehouse stands in its inner edge and the bridge's end lands on the far bank. It stops at `y = 540`, above the south tower's foot, which only tall phones see.
- **The ground shadow is baked.** `install.py` darkens the court with the shadow the whole model casts. Only the keep's shadow is separate, because it stands alone and would be missed when it falls.
- **A fort shows every tower.** A tower a town's level gives no place for still stands, unmanned, since the walls end on it. A plain fort differs from a castle by its moat and archers, not its shape.
- **Don't load 3D libraries from a CDN.** The first try used Three.js that way, and it was blocked. `render3d.py` needs only numpy and Pillow and gives the same picture every run.

## The Norse ring fort

The second castle (`castle_norse.py`, `paint/norse/`, `ground_norse.py`), made 2026-11-11 with 52 PixelLab generations. What differed from the Greek recipe:

- **Model.** Same parts, states, `WALL_COL` and positions. A wall is an earth bank (sloped faces, snow on top) under two rows of upright sharpened logs, with rails and a plank walk (`palisade`); broken states cut the logs to splinters and char them (`burn`). Round towers are staves with iron bands, a hoarding and a stake ring; the floor stays at the Greek height, so `TOWER_FEET` of the corner towers is unchanged. The gatehouse is two log blockhouses with snowy gable roofs, the door still facing west (invisible shut). The keep is a longhouse with a log loft at its west end: the company stands on the loft (`TOWER_FEET_NORSE[0]`, y 226), not a roof.
- **Snow is white on the white preview.** Look at renders on a mid-grey background (roofs and caps vanish on white).
- **Sheets.** The bank makes pieces wider: pack with `GAP = 5` (`sheets.GAP = 5` before `pack`) to fit two 512 sheets; at 25 generations each that is 50. Painted prompt: Viking timberwork, snow on everything, charred timber for broken parts; same seed on both sheets. Cut worst match 0.88 and still clean.
- **Ground without PixelLab.** `ground_norse.py` draws the court from the game's own snow field (median-filtered, trodden mud patches, a plank street from the gate to the hall's steps), recolours the Greek moat into a frozen ditch with snowy earth banks, and reuses the Greek bridge (already timber). Generations saved for the sheets.
- **Install and pick.** `install.py norse` writes `src/art/pixel/siege-norse/` and `siege-norse.ts` (`SIEGE_ART_NORSE`); Greek stays where it was. `castleOf(state)` (`src/scenes/battle/castle.ts`) picks the castle from the people of the defender's companies (side 1): Norse unless more Greek or Egyptian companies stand there. `SiegeView`, `loadBattleArt`, `partAt` and `towerFeetOf` take the castle; Norse textures are keyed `px-siege-norse-*`.
- **Re-render only some parts.** `castle_norse.py --only=keep,gate` re-renders those parts and keeps the rest of `pieces.json`.
