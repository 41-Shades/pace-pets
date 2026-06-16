# Push Harder Fish Tank

Status: reference.

The Push harder fish tank is a dashboard-only accent for the `strongAhead` pace
state. It extends the existing sweat-and-water presentation: falling sweat drops
still land in the status card pool, and the pool gradually becomes a small fish
tank as it fills.

## Intent

- Accentuate the existing Push harder status card without turning it into a
  separate mini-game.
- Keep the card readable first: title, copy, pace ratio, and status icon remain
  the dominant information.
- Use only a small subset of ocean icons at once. Variety comes from restrained
  random selection and slow movement, not density.
- Tie appearance to pool fill level, not sweat pulse intensity. Normal, extreme,
  and rare Push harder pulses can continue to own the dog stretch and sweat
  behavior without also controlling fish spawning.

## Runtime Ownership

- `collector/extension/dashboard-push-stretch-methods.js` starts and stops the
  Push harder effect.
- `collector/extension/dashboard-push-water-renderer.js` owns the card-sized
  water canvas, pool rise, ripple, water clipping path, and surface line.
- `collector/extension/dashboard-push-tank-data.js` owns tank asset metadata,
  staged slots, and special visitor timing ranges.
- `collector/extension/dashboard-push-tank-visitors.js` owns shark and whale
  visitor scheduling, hold timing, travel progress, and drawing.
- `collector/extension/dashboard-push-tank-renderer.js` owns regular fish-tank
  entity selection, image preloading, staged thresholds, movement, opacity, and
  orientation.
- `collector/extension/runtime-manifest.js` must load
  `dashboard-push-tank-data.js` before `dashboard-push-tank-visitors.js`,
  `dashboard-push-tank-visitors.js` before
  `dashboard-push-tank-renderer.js`, and `dashboard-push-tank-renderer.js`
  before `dashboard-push-water-renderer.js`.

The tank is drawn inside the existing water layer behind the status-card
content. The water renderer fills the pool first, clips to the water path, asks
the tank renderer to draw submerged contents, releases that clip for surface
visitors such as the whale, then redraws the wave line so the surface stays
legible.

The water renderer also exposes the current normalized pool level to the sweat
renderer. Sweat drops use that level as their landing surface, so they fade at
the top of the water instead of continuing through the filled tank. Previous
pulse sweat trails, including rare pulse trails, continue until their selected
drop tracks have actually completed.

Dev Controls can send a one-shot Rare sweat request while Push harder is active;
the next pulse cycle uses the rare sweat profile, then normal weighted selection
resumes.

Reduced-motion mode skips the Push harder motion effect, so the tank is not
attached in that mode.

## Assets

Ocean assets live under:

```text
collector/extension/themes/default/ocean-icons/
```

The active tank subset is intentionally smaller than the full extracted palette:

- Swimmers: `clownfish`, `yellow_tang`, `blue_tang`, `seahorse`, `jellyfish`,
  `sea_turtle`, `pufferfish`
- Bottom/decor: `seaweed`, `coral`, `crab`, `shrimp`, `starfish`, `sea_urchin`
- Special visitors: `shark`, `whale`

The active runtime file mapping for those icons lives in
`collector/extension/themes/default/asset-manifest.js`; this module owns tank
staging and movement metadata, not themed asset paths.

Unused extracted assets can remain available for future tuning, but adding them
to the active subset should be deliberate. The card becomes noisy quickly.

## Fill Stages

The implementation uses `stage = currentPoolLevel / maxPoolLevel`.

- Around `0.22`: first small swimmer can appear.
- Around `0.38`: a second swimmer can appear.
- Around `0.56`: a slow drifter can appear.
- Around `0.58`: bottom decor can appear.
- Around `0.74`: a bottom crawler can appear.
- Around `0.76`: a larger swimmer can appear.
- Around `0.88`: final bottom accent can appear.
- Around `0.98`: shark and whale visitor choreography becomes eligible.

These stages should stay sparse. Prefer moving a stage later or lowering opacity
over adding more entities.

## Movement And Orientation

Fish direction is explicit, not inferred from filenames. The renderer keeps
per-asset metadata so horizontally mirrored icons face their travel direction and
front-facing or static assets are not flipped:

```text
facing: -1 | 0 | 1
movement: "bidirectional" | "fixed" | "drift" | "crawler" | "static"
scale: optional per-asset size multiplier
waterBand: "surface" | "mid" | "bottom"
```

Current behavior:

- Bidirectional swimmers: clownfish, tangs, turtle, pufferfish.
- Normal swimmers start just outside their entry edge. They reroll their
  selected asset, lane, scale, speed, phase, and direction when they wrap
  offscreen and re-enter the tank.
- Special swimmer: shark. It uses the same pass-through visitor timing as the
  whale, but rerolls its delay, duration, lane, and slow vertical glide during
  each crossing.
- Drifters: seahorse and jellyfish. They should move slowly and can read well
  without frequent direction changes.
- Fixed special: whale. It uses an unclipped surface pass so the spout can breach
  the waterline without being sliced by the water-path clip. It crosses much
  more slowly than the shark and can briefly hold position during a pass, hinting
  at spout behavior with a small vertical bobble instead of another animation.
- Bottom crawler: crab or shrimp, but not both at high frequency.
- Static decor: seaweed, coral, starfish, sea urchin.

The crab is front-facing, so mirroring does not meaningfully communicate travel;
it uses crawler movement without horizontal flipping.

## Randomness

The tank uses restrained randomness to avoid obvious looping while keeping the
card quiet:

- Initial entity choices are randomized by stage slot.
- Swimmers enter from an edge and reroll mild variation only after leaving the
  visible tank.
- Special visitors keep mutable schedules. Each shark or whale appearance gets a
  fresh delay, duration, and lane; shark also gets a fresh vertical glide, while
  whale can get a short travel hold.
- Bottom entities remain mostly stable for the renderer lifetime so the tank
  floor reads as decor rather than constant churn.

## Known Refinements

- `crab.png` was cleaned at the asset level to remove the near-white matte patch
  that showed against the blue water. Keep future matte fixes in the PNGs rather
  than masking artifacts in the renderer.
- New tank assets should be added through per-asset metadata first, including
  `facing`, `movement`, `waterBand`, and any bottom `floorSink` adjustment.
- The tank should keep avoiding pulse-driven spawns unless a later design needs
  a very subtle activity boost. The core rule is fill-level staging, not pulse
  staging.
