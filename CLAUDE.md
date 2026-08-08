# ATTRITION 64

A pixel breakout game: the paddle is an everyday item, the blocks form the
silhouette of something that item threatens.

**If `.claude/local-setup.md` exists, read it too** — it holds machine-specific
notes (how this checkout is served, how to screenshot it) that are deliberately
kept out of the repository.

## Source of truth

Read these rather than duplicating them here — this file goes stale, they do not:

- `docs/DESIGN.md` — the design and, more usefully, *why* each decision went the
  way it did
- `docs/ADDING_A_LEVEL.md` — the level format
- `README.md` — how to play and run

## Running

- **Tests:** `npm test`, which is `node --test 'test/*.test.js'`.
  `node --test test/` **does not work on Node 24** — it resolves the directory as
  a module and fails with `MODULE_NOT_FOUND`, which reads exactly like a missing
  import and sends you looking in the wrong place.
- **The game needs an HTTP server**, not `file://` — ES modules are blocked over
  that scheme. `python3 -m http.server 8000` from the project root is enough.
- **Level previewer:** `tools/preview.html`, served the same way. Paste a level
  file, see it render, get its validation status and estimated length.

## Constraints that bite

- **Relative paths only.** Never a leading `/`. GitHub Pages serves from
  `/<repo>/`, so absolute paths work locally and break there.
- **`src/engine/`, `src/levels/validate.js`, `src/render/scale.js` and
  `src/storage.js` must stay DOM-free.** They are unit-tested under Node, which
  has no `window`, `document`, `localStorage` or `Audio`. Browser objects are
  injected as parameters.
- **Level art is generated.** `tools/gen-shapes.mjs <shape>` produces the 64-row
  grids; edit the generator and re-run rather than hand-editing 64 rows. `tools/gen-sfx.mjs` does the same for the sound effects and is seeded,
  so regenerating produces byte-identical files.
- **Level length is the usual bug.** A silhouette can hold 1,700 cells; without a
  blast radius on the bulk block that is an unplayable level. The validator
  rejects anything outside 80–600 estimated hits. See the spec's Explosions
  section for why `chain: false` on bulk blocks is load-bearing.
- **A level has one name.** The file in `src/levels/data/` is named after its
  title (`smoke-break.js`), and that filename is also its id. No ordering prefix,
  no descriptive second name — order lives in `LEVEL_FILES` alone.
