# ATTRITION 64 — Design notes

## Concept

A pixel-art breakout game. The paddle is an everyday item; the blocks form the
silhouette of something that item is a threat to. The first level is a cigarette
paddle against a wall of lung-shaped blocks.

The game makes no argument about it. There is no commentary, no message screen,
no level titles — the sprites carry the whole idea and the player draws their own
conclusion. The only text in the game is the HUD (score, lives, level title) and
the panels that open and close a run.

The project is built to accept levels from strangers. Adding a new item/target
pair is a single new file plus a one-line registry edit, and a load-time
validator makes that PR cheap to review.

## Goals

- A breakout that is genuinely good to play, not a demo of an idea.
- New levels contributed by PR, with no engine changes required.
- Runs as static files on GitHub Pages.
- Playable on a phone.
- No build step, no dependencies.

## Hosting and local development

The game is static files loaded as ES modules. Two consequences bind the whole
design:

- **Relative paths only.** Never a leading `/`. GitHub Pages serves the project
  from `/<repo>/`, so absolute paths break there while working locally.
- **It must be served over HTTP,** not opened from `file://`, because ES modules
  are subject to CORS.

Any static server satisfies this — `python3 -m http.server` is enough. The
project is developed against a local static server and deployed to GitHub Pages
unchanged.

Tests run with Node's built-in runner (`node --test`), which needs no
dependencies and never touches the browser.

## Geometry

One **cell** is the atomic unit of both layout and physics. The playfield is
**64 wide × 100 tall** cells.

| Rows   | Contents                                        |
| ------ | ----------------------------------------------- |
| 0–4    | HUD: score, lives, level                        |
| 5–68   | block grid — the authored 64×64, mapped 1:1      |
| 69–89  | open play space                                 |
| 90–99  | paddle band                                     |
| ≥100   | drain (ball lost)                               |

Authored grid row `r` renders at playfield row `5 + r`. The paddle's trimmed
sprite rests with its bottom edge on row 97.

### Rendering

The backing canvas is **4 pixels per cell** (256 × 400). Each block is drawn as a
3×3 square inside its 4×4 cell, leaving a 1px gap — this gap is what produces the
fine grid texture of the reference image. The canvas is upscaled by an **integer
factor** with `image-rendering: pixelated`, so pixels stay square and crisp at any
size. A non-integer fit is deliberately avoided; the canvas is letterboxed instead.

The integer factor is computed in **device pixels, not CSS pixels**.

## Level file format

One ES module per level in `src/levels/`, default-exporting a plain object.
Registered by adding its filename to the `LEVEL_FILES` array in
`src/levels/index.js`.

The list is kept by hand because it has to be. A browser has no directory API,
and GitHub Pages returns 404 for a directory with no `index.html`. Local servers
generally *do* serve a listing, so discovering levels by scraping one would pass
every test and then fail only in production. Instead `test/levels.test.js`
compares the array against the directory — Node can see both — so an unregistered
file fails the suite rather than disappearing silently.

Imports are dynamic for a reason beyond that. A **static** import of a level with
a syntax error fails the whole module, taking every other level down with it,
which defeats the per-level validation below. Importing each file separately
means a broken contribution is reported and skipped like any other bad level.

### Why a character grid

A 64-row char grid diffs legibly: a reviewer reading the PR literally sees the
shape. A PNG would be easier to draw but is binary and unreviewable. JSON was
rejected for forbidding comments and trailing commas, which matters when
hand-editing 64 rows.

### The paddle canvas

`paddle.grid` is up to 64×48 — that is *authoring room*, not the paddle's size,
exactly as the 64×64 block canvas is not expected to be filled. A 10×1 cigarette
and a 20×5 chainsaw are both drawn on the same canvas. `sprite.js` trims to the
filled bounding box, and that box is the collision box: the shape you draw is the
shape that hits.

## Contribution safety: `validate.js`

Every level passes through the validator at load. This is what makes merging a
stranger's PR cheap — the reviewer checks that the art looks right, and the
validator checks everything else. Failures throw `LevelValidationError` naming
the level id and the offending field.

Rules:

- `id` non-empty and unique across the registry.
- `grid` has exactly 64 entries, each exactly 64 characters.
- Every non-empty character in `grid` has an entry in `types`.
- Type entries: `color` a valid `#rgb`/`#rrggbb`; `hp` an integer ≥ 1 unless
  `solid`; `damage` length equals `hp` with all colours valid; `explode` an
  integer ≥ 1; `chain` a boolean; `powerup.chance` within `[0, 1]` and every
  `kind` a known powerup.
- **Estimated hits to clear is within 80–600.** Computed at load from filled
  cells, hit points, and blast radii. This is the rule that catches the failure
  mode a contributor is most likely to ship — a beautiful 1,700-cell silhouette
  that takes twenty minutes to clear — and it catches it before a human reviewer
  has to play the level to notice.
- At least one destructible block exists.
- `paddle.grid` has 1–48 rows of ≤ 64 characters; every non-empty character has
  an entry in `paddle.colors`.
- The paddle's **trimmed** bounding box is 10–24 cells wide and 1–8 cells tall.
  The width range is a balance guardrail (the playfield is 64 wide, so this is
  roughly an eighth to a third of the screen). The height cap exists because the
  authoring canvas is 48 tall and an untrimmed paddle would consume the
  playfield.
- `background` and `ballColor` are valid colours.

### Load failure behaviour

The registry loader validates each level independently. An invalid level is
logged to the console with its `LevelValidationError` and excluded from the
rotation, so one bad contribution cannot white-screen the game. If no valid
levels remain, the canvas renders an error message.

## Physics

A fixed timestep of **1/120 s**, with the accumulator pattern so behaviour does
not vary with frame rate. Within a step, motion is subdivided so that no substep
moves the ball more than **0.5 cell** — this is what prevents a fast ball from
tunnelling through a one-cell wall.

Collision resolves **one axis at a time**: apply the X displacement, test the
cells the ball's AABB now overlaps, and if any are occupied, back the ball out to
the boundary and negate `vx`; then repeat for Y. Resolving separately is what
produces correct normals at corners, where a naive single test picks an arbitrary
axis.

Every cell the ball backs out of takes one point of damage.

### Paddle

Horizontal movement only, accelerating to a maximum speed, clamped to the
playfield. Deflection uses the hit offset rather than a mirror reflection, which
is what makes breakout feel like a game of skill:

```
offset = clamp((ballCenterX - paddleCenterX) / (paddleWidth / 2), -1, 1)
angle  = offset * 60°
v      = speed * (sin angle, -cos angle)
```
Paddle width is deliberately **not** normalised. It ranges from 16% of the
playfield to 28% across the shipped levels, which is a real difficulty spread —
but it is a per-level design choice, like the powerup density and the blast
radii, not an oversight to be flattened.

### Ball

Speed is preserved through the bounce. Base speed ramps to **+25%** as the level
is cleared, so the last few blocks are tense rather than tedious, then is
multiplied by any active speed effect.

Speed also compounds with time. A life that has run three minutes is
about 27% faster than a fresh one — `TIME_ACCEL_STEP` per `TIME_ACCEL_SECONDS`,
capped at `TIME_ACCEL_MAX`. Continuous rather than stepped, because a jump every
fifteen seconds reads as a glitch with no visible cause.

The clock is per life *and* per level, cleared in `resetForServe()`. That makes
stalling the thing that kills you, which is what gives three lives any weight:
without it, a careful player faces the same level three identical times. It
multiplies with the clear ramp above, so a nearly-empty grid three minutes in
runs at roughly +59%.

## Explosions

When a block reaches zero hp and its type has `explode: N`, every cell within
Chebyshev distance `N` is destroyed too. Destroyed cells that themselves explode
enqueue their own neighbourhoods. Processing is a queue with a visited set, so
overlapping explosive blocks chain without looping. `solid` cells are immune.
Every cell destroyed in a chain awards its points.

Explosive blocks are the level author's pacing lever, and `chain` is what makes
that lever controllable.

A 64×64 silhouette holds well over a thousand cells — the shipped lungs are 1,758
— so clearing one cell per hit is not viable. But sparse chaining explosives do
not fix it either. Raising their density enough to matter (roughly one cell in
eight) pushes the grid past a percolation threshold: each blast catches several
more explosives, which catch more, so the level flips from twenty minutes to
cleared-by-the-first-lucky-hit with almost no stable range between.

The two roles are therefore separated:

- **Bulk blocks** uses a small non-chaining blast — `{ explode: 1, chain: false }`
  — so every hit reliably clears a 3×3 pocket. This is a predictable
  cells-per-hit dial: a 1,758-cell level becomes roughly 200 hits. The ball
  visibly tunnels through the mass, which was the appeal of the fine grid.
- **Feature blocks** are sparse, chaining, and large-radius, for spectacle.
  Because the bulk is non-chaining, a big blast cannot cascade across the level.

A contributor tunes level length almost entirely with the bulk block's `explode`
radius. `ADDING_A_LEVEL.md` documents this as the primary balancing tool, with
the arithmetic: *hits ≈ filled cells ÷ (2·radius+1)²*.

## Powerups

A block destroyed by any means — ball, laser, or explosion — rolls its `powerup`
chance. A hit spawns a falling 3×3 pickup at that cell, colour-coded by kind so
the player can choose whether to catch it. It is caught when it overlaps the
paddle's bounding box and despawns below the drain line.

| Kind         | Effect                                                                                                                                                                                                                                         |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `multiball`  | Instant. Each active ball splits into 3, spread ±25°, up to a hard cap of 9 balls in play.                                                                                                                                                     |
| `widePaddle` | Paddle scales to 1.5× for 15 s; the sprite stretches horizontally.                                                                                                                                                                             |
| `slowBall`   | Ball speed ×0.7 for 12 s.                                                                                                                                                                                                                      |
| `fastBall`   | Ball speed ×1.4 for 12 s, and score counts double while active.                                                                                                                                                                                |
| `sticky`     | 12 s. The ball is caught on contact; Space re-launches it at the deflection angle it would have taken. Lets the player aim into a carved tunnel.                                                                                               |
| `laser`      | 12 s. Space fires upward, 0.3 s cooldown; a shot deals one point of damage to the first block it meets, then despawns.                                                                                                                         |
| `piercing`   | Instant. The ball stops bouncing off destructible blocks and ploughs through, damaging everything it crosses. Indestructible blocks still turn it back, or a level built with walls would leak balls into places its author never planned for. |
| `shield`     | Held, not timed. A one-shot floor at row 99 that bounces a single draining ball and is then spent. Drawn across the playfield while held, so it needs no HUD legend: it is a thing in the world, shown where it acts.                          |

Timers **refresh** rather than stack — catching a second `widePaddle` restarts
its 15 s instead of granting 30. `slowBall` and `fastBall` are mutually
exclusive; each cancels the other.

Space key releases a stuck ball if one is held, fires the laser if the laser is active, otherwise it serves.

## Input

- **Keyboard:** Left/Right or A/D move; Space serves, releases, and fires; M mutes.
- **Mouse:** the paddle moves by however far the cursor moves, anywhere on the
  page; a click anywhere on the page acts. The cursor itself is hidden while the
  paddle is under the player's control, since the paddle is the pointer then.
- **Touch:** drag to move, tap to serve/release/fire — anywhere on the page, not
  only over the canvas. Touches that land on a link are left to the browser.

**Every keyboard action has a pointer equivalent**, which is what keeps the game
whole on a phone: Space's three jobs (serve, release a stuck ball, fire the
laser) are all reachable by tapping.

## Mobile

Mobile is a target, not a fallback. The 64×100 playfield is already portrait, so
no separate layout is needed — the work is in fitting and touch handling:

- Device-pixel integer scaling, as described under Rendering.
- `<meta name="viewport" content="width=device-width, initial-scale=1,
  viewport-fit=cover, user-scalable=no">`, plus `touch-action: none` on the
  canvas so dragging the paddle never scrolls or pinch-zooms the page.
- The canvas is centred and letterboxed against the background colour, respecting
  `env(safe-area-inset-*)` so nothing hides under a notch or home indicator.
- Drag moves the paddle by *relative* finger movement rather than snapping the
  paddle to the finger, so the player's thumb never covers the paddle it is
  controlling.
- Re-fit on `resize` and `orientationchange`.

## High score

A single high score, persisted in `localStorage` and displayed on the TITLE and
GAME_OVER/WIN screens. Beaten mid-run, the HUD's score simply overtakes it; there
is no announcement, consistent with the no-commentary tone.

Keys are namespaced: **`attrition64:highscore`** and **`attrition64:muted`**. This is not
cosmetic — GitHub Pages serves every project under one origin
(`username.github.io`), so all of them share one `localStorage`. An unprefixed
`highscore` key would collide with any other game hosted from the same account.

`src/storage.js` wraps access and takes the storage object as a parameter, so it
is unit-tested without a browser. All reads and writes are wrapped in try/catch:
Safari private mode throws on `setItem`, and a thrown quota error must never take
down the game loop. A corrupt or non-numeric stored value is treated as zero.

Per-level bests are deliberately out of scope — one number, shown in two places.

## Sound

The engine emits named events; `src/audio.js` maps them to files in `assets/sfx/`
and owns a mute toggle persisted at `attrition64:muted`.

**The sound files are supplied separately and are not part of this work.** The
game must therefore be completely playable with `assets/sfx/` empty: a missing
file resolves to a no-op sound, logged once at debug level, never thrown and
never repeated per trigger. This is a hard requirement — a 404 on a sound must
not produce console spam or a broken frame.

The documented filenames:

| File                  | Trigger                                  |
| --------------------- | ---------------------------------------- |
| `bounce-wall.wav`     | Ball hits a wall or ceiling              |
| `bounce-paddle.wav`   | Ball hits the paddle                     |
| `block-hit.wav`       | Block damaged but not destroyed          |
| `block-break.wav`     | Block destroyed                          |
| `explode.wav`         | An `explode` block detonates             |
| `powerup-catch.wav`   | Pickup caught                            |
| `laser.wav`           | Laser fired                              |
| `life-lost.wav`       | Last ball drains                         |
| `level-clear.wav`     | Grid cleared                             |
| `game-over.wav`       | Lives exhausted                          |

Two implementation details drive the design. Browsers block audio until a user
gesture — the TITLE screen already requires a tap or Space to start, so that
gesture unlocks playback and no separate "click to enable sound" prompt is
needed. And a single `Audio` element will not retrigger while already playing,
which matters when a chain explosion breaks forty blocks at once: each effect
therefore keeps a small pool of pre-cloned elements, round-robined, with a
per-effect retrigger cooldown of a few milliseconds so a mass break is one solid
sound rather than forty stacked copies clipping.

Sounds are global, not per-level. A level file cannot override them.

## Testing

Unit tests with `node --test`, covering the DOM-free modules:

| File                    | Covers                                                          |
| ----------------------- | --------------------------------------------------------------- |
| `sprite.test.js`        | Trimming, palette mapping, empty and single-cell grids           |
| `validate.test.js`      | Each rule rejects its violation; a known-good level passes       |
| `grid.test.js`          | hp decrement, damage colour selection, clear detection ignoring `solid` |
| `explode.test.js`       | Radius, chaining, `solid` immunity, no infinite loop on overlap  |
| `collide.test.js`       | Per-axis resolution, corner normals, no tunnelling at max speed  |
| `paddle.test.js`        | Offset→angle mapping, speed preservation, clamping at the edges  |
| `effects.test.js`       | Refresh-not-stack, slow/fast exclusivity, expiry                 |
| `powerups.test.js`      | Drop rolls, catch detection, despawn                             |
| `scale.test.js`         | Integer factor from viewport and DPR; the 390pt/DPR 3 phone case; never scales past the viewport; never returns 0 |
| `storage.test.js`       | Namespaced keys, corrupt values read as zero, a throwing `setItem` does not propagate |

Rendering, audio, and input are verified by playing the game at
http://localhost:8000/, including at a phone viewport via device emulation.

## Decisions taken & reasons

| Decision                                      | Reason                                                                                                                            |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| No commentary or message framing              | Chosen tone: straight arcade. The sprite pairing is the whole statement.                                                          |
| 64×64 authored block grid                     | Matches the fine grid of the reference image. Per-block `explode` solves the resulting length problem without coarsening the art. |
| Per-block `hp`, `explode`, `powerup`          | Puts pacing in the level author's hands, so contributed levels can have their own rhythm without engine changes.                  |
| Char grid over PNG                            | Easy to design and review. PR diffs stay reviewable.                                                                              |
| One module per level                          | A contribution is one new file plus one registry line.                                                                            |
| Validator at load                             | Makes reviewing an unfamiliar contributor's level a matter of looking at the art.                                                 |
| DOM-free `engine/`                            | The interesting logic is testable without a browser or any test framework.                                                        |
| No build step                                 | GitHub Pages serves the repo directly; contributors need no toolchain.                                                            |
| Integer scale computed in device pixels       | The only way to fill a phone screen without giving up pixel-perfect rendering.                                                    |
| Game runs silently with no sound files        | The assets are supplied separately; the game must never depend on their presence.                                                 |
| Sounds global, not per-level                  | Keeps the level format to art and behaviour. Revisit only if a contributor actually needs it.                                     |
