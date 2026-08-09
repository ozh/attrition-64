# Adding a level

A level is one file. Pick an everyday item and something it threatens, draw the
target in a 64×64 character grid and the item as a small paddle sprite, and add
one line to the registry.

## Two steps

1. Create `src/levels/data/<your-title>.js` (see the template below).
2. Add its filename to the `LEVEL_FILES` array in `src/levels/index.js`.

If you can, run `node --test 'test/*.test.js'`. The validator checks your level and
names the exact field if anything is wrong.

## See it before you play it

Open **`tools/preview.html`** on your local web server. Paste your
level file into the textarea. It renders as you type and reports what you
cannot see by looking:

- whether it passes validation, and the exact error if not
- filled cell count and **estimated hits to clear**, against the allowed range
- the trimmed paddle size the engine will actually use
- every block type with its colour, hit points, blast radius and drop chance
- every paddle pixel character with its colour and how often it is used

The preview tool loads the first level so you can see how things works.

## Naming your level

Two names, doing different jobs:

- **`title`** is what the player sees, centred in the HUD. Make it a **plain,
  everyday phrase** — `SMOKE BREAK`, `HAPPY HOUR`, `SCREEN TIME`, `THE COMMUTE`.
  Name the ordinary activity, not the consequence. The picture is already
  showing something being destroyed; the game does not also need to say so, and
  a title that comments (`BAD HABIT`, `THINK OF YOUR LUNGS`) breaks the tone the
  whole project is built around. Maximum 24 characters.
- **The filename** is the title, lower-cased and hyphenated: `WEEKEND JOBS`
  lives in `weekend-jobs.js`. It becomes the level's id automatically, add it at
  the end of `LEVEL_FILES` array in `src/levels/index.js`.

## Block types

Each character in `grid` maps to one entry in `types`.

| Field | Meaning |
| --- | --- |
| `color` | **Required.** `#rgb` or `#rrggbb`. |
| `hp` | Hits to destroy. Default `1`. |
| `points` | Score on destruction. Default `10 × hp`. |
| `damage` | Optional array of colours, one per hit point, **`damage[0]` at full health** and `damage[hp-1]` one hit from breaking. Length must equal `hp`. Overrides `color` for drawing. |
| `explode` | On destruction, also destroys every cell within this square radius. |
| `chain` | Whether this block's explosion sets off other explosive blocks. Default `true`. |
| `powerup` | Drop chance. A number is shorthand for `{ chance: n }` with a random kind. Also `{ chance, kind }` or `{ chance, kinds: [...] }`. Kinds: `multiball`, `widePaddle`, `slowBall`, `fastBall`, `sticky`, `laser`, `piercing`, `shield`. |
| `solid` | Indestructible. Bounces the ball, never breaks, excluded from the clear condition. |

The level is cleared when no destructible blocks remain.

## Level length

A 64×64 silhouette easily holds **1,500 cells**. At one cell per hit that is a
twenty-minute level. The fix is to give your bulk block a blast radius and add powerups.

The validator rejects anything outside **80–600** estimated hits.
