# Siege ramp sprites (Egypt's war machine, part 5)

`earth-{1,2,3}.png` (Earth Ramp: packed mud, wooden-grained slope, baskets of earth) and `brick-{1,2,3}.png`
(Brick Ramp: mudbrick body, plastered tan slope). Stage 1 = a low heap with baskets, 2 = about half height,
3 = the finished ramp reaching the wall top. Copies live in `src/art/ramp/`; `src/scenes/battle/rampView.ts` places them.

- 96 x 96 px RGBA, one canvas for every stage so they swap in place. Bottom row y = 86 (opaque rows end at y 87).
- A steep slope rising left to right, 1:1 only (no scaling): the high end is a vertical edge at x = 79 that stands
  against the wall's crest; stage 3 spans y 6-87 (about 80 px, the wall's height in the field projection).
- Anchors (canvas px): top of the slope / wall side (79, 7); foot on the sand (5, 86); the sprite sits so (79, 7) lands
  on the wall's crest edge: 8 px left of and 8 px above the stretch's wall hex centre (rampView's ANCHOR 87, 15).
  The north stretch's ramp is nudged (13, -70) up its diagonal wall, clear of the gate turret.
- Stage 3 earth: create_image_pixen (the grey wall it drew was cut off), brick-3 = edit_image_pixen of it; stages 1-2 are
  vertically squashed copies (earth-1 and brick-1 redrawn/squashed). Sources in `../../cand3/`.
