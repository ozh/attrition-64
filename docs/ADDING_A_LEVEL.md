# Adding a level

A level is one file. Pick an everyday item and something it threatens, draw the
target as a 64×64 character grid and the item as a small paddle sprite, and add
one line to the registry. No engine code changes.

## Two steps

1. Create `src/levels/data/<your-title>.js` (see the template below).
2. Add its filename to the `LEVEL_FILES` array in `src/levels/index.js`.

If you forget step 2 the test suite fails and tells you so — the registry is
compared against the directory. It cannot be built from the directory at run
time: browsers cannot list one, and GitHub Pages serves no index for it.

The filename is the level's identity. `05-chainsaw-tree.js` becomes the id
`chainsaw-tree` — the leading number is ordering only — so there is no id field
to keep in sync, and two levels can never collide.

Then run `node --test 'test/*.test.js'`. The validator checks your level and
names the exact field if anything is wrong.

## See it before you play it

Serve the project (`python3 -m http.server 8000` from the root) and open
**`tools/preview.html`** — `http://localhost:8000/tools/preview.html`. Paste your
level file into the textarea. It re-renders as you type and reports what you
cannot see by looking:

- whether it passes validation, and the exact error if not
- filled cell count and **estimated hits to clear**, against the allowed range
- the trimmed paddle size the engine will actually use
- every block type with its colour, hit points, blast radius and drop chance
- every paddle pixel character with its colour and how often it is used

Your level does not need to be registered first, and it still renders when it
fails validation — which is usually how you find out what is wrong. Work here
while drawing, and only add the file to `src/levels/` once it looks right.

## The file

```js
export default {
  title: 'WEEKEND JOBS',      // shown in the HUD; see "Naming your level" below
  author: 'your-name',
  background: '#000000',
  ballColor: '#ffffff',

  types: {
    '#': { color: '#3f7d3a', hp: 1, points: 10, explode: 1, chain: false },
    B:   { color: '#8a5a3a', hp: 3, points: 30,
           damage: ['#8a5a3a', '#5e3d28', '#331f14'] },
    '*': { color: '#ffb03a', hp: 1, points: 50, explode: 4 },
    p:   { color: '#cfe8b0', hp: 1, points: 20, explode: 1, chain: false, powerup: 0.35 },
  },

  grid: [
    // exactly 64 strings of exactly 64 characters
    // '.' and ' ' are empty
  ],

  paddle: {
    colors: { m: '#d8d8d8', h: '#ff8c00' },
    grid: [
      'hhhhmmmmmmmmmmmm',
      'hhhhmmmmmmmmmmmm',
    ],
  },
};
```

## Naming your level

Two names, doing different jobs:

- **`title`** is what the player sees, centred in the HUD. Make it a **plain,
  everyday phrase** — `SMOKE BREAK`, `HAPPY HOUR`, `SCREEN TIME`, `THE COMMUTE`.
  Name the ordinary activity, never the consequence. The picture is already
  showing something being destroyed; the game does not also need to say so, and
  a title that comments (`BAD HABIT`, `THINK OF YOUR LUNGS`) breaks the tone the
  whole project is built around. Maximum 24 characters.
- **The filename** is the title, lower-cased and hyphenated: `WEEKEND JOBS`
  lives in `weekend-jobs.js`. It becomes the level's id automatically. There is
  no number in front of it — play order is the `LEVEL_FILES` array and nothing
  else, so a filename can never claim a position that merging would falsify. If
  you retitle a level, rename its file to match.

Check both in `tools/preview.html`: the canvas draws the real HUD with sample
score and lives, so you can see exactly how your title sits in the bar.

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
| `powerup` | Drop chance. A number is shorthand for `{ chance: n }` with a random kind. Also `{ chance, kind }` or `{ chance, kinds: [...] }`. Kinds: `multiball`, `widePaddle`, `slowBall`, `fastBall`, `sticky`, `laser`. |
| `solid` | Indestructible. Bounces the ball, never breaks, excluded from the clear condition. |

The level is cleared when no destructible blocks remain.

## Level length — read this one

This is where a level most often goes wrong, and the mistake is invisible until
you play it.

A 64×64 silhouette easily holds **1,500 cells**. At one cell per hit that is a
twenty-minute level. The fix is to give your bulk block a blast radius:

> **hits ≈ filled cells ÷ (2·radius + 1)²**

Radius 1 clears a 3×3 pocket on every hit and divides the work by nine. That is
what every shipped level uses, and it is why the ball visibly tunnels through the
shape instead of nibbling at it.

**Set `chain: false` on your bulk block.** Without it a level dense in explosive
blocks percolates: one lucky hit cascades across the whole shape and clears it
instantly. Keep chaining for sparse, large-radius feature blocks only — that is
the `'*'` in every shipped level, and the bulk's `chain: false` is what stops one
of those wiping the board.

The validator rejects anything outside **80–600** estimated hits. For reference,
the shipped levels sit at 228, 131, 141 and 319.

## Drawing the target

64 rows of exactly 64 characters. Any fixed-width editor works. The shipped art
was generated mathematically instead — see `tools/gen-shapes.mjs` for
ellipse-based silhouettes with a despeckle pass. Either
way, the committed level file holds plain characters, so a reviewer sees your
shape directly in the pull request diff.

Coarse silhouettes read best. Test yours by squinting at it in the terminal: if
you cannot tell what it is at 64×64, neither can a player.

## Drawing the paddle

`paddle.grid` is up to 64 wide and 48 tall. That is *authoring room*, not the
paddle's size — only the filled area counts, exactly as the 64×64 block canvas is
not expected to be full. The engine trims to the filled bounding box, and **that
box is the collision box**: the shape you draw is the shape that hits.

Two rules the validator enforces:

- trimmed width between **10 and 24** cells (the playfield is 64 wide)
- trimmed height at most **8** cells

## Out of scope for a level

- **Sounds are global.** A level cannot ship or override its own audio.
- **`title` is the only text a level puts on screen**, and it belongs in the HUD,
  not in the playfield. Nothing else you write is drawn: `id` and `author` are
  metadata for the registry and this documentation.

## When the validator complains

Every error names the level and the field, for example:

```
Level "chainsaw-tree" — grid: takes about 1503 hits to clear, which is too long
(maximum 600). Give the bulk blocks an explode radius — hits fall by roughly (2r+1)^2.
```

Fix the level rather than the validator. If you believe a rule is genuinely
wrong for your level, say so in the pull request — that is a conversation worth
having, but it should be explicit.
