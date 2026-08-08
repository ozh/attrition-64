# Lungs

A pixel breakout game: the paddle is an everyday item, the blocks form the
silhouette of something that item threatens.

## Source of truth

Read these rather than duplicating them here — this file goes stale, they do not:

- `docs/superpowers/specs/2026-08-08-lungs-breakout-design.md` — the design and,
  more usefully, *why* each decision went the way it did
- `docs/ADDING_A_LEVEL.md` — the level format
- `README.md` — how to play and run

## Running

- **Tests:** `npm test`, which is `node --test 'test/*.test.js'`.
  `node --test test/` **does not work on Node 24** — it resolves the directory as
  a module and fails with `MODULE_NOT_FOUND`, which reads exactly like a missing
  import and sends you looking in the wrong place.
- **The game is already served.** The `dev-web` container mounts `/home/ozh/dev`
  at `/var/www/html`, so the project is live at http://localhost/lungs/ with
  nothing to start. Shell into it with `docker exec -it dev-web bash --login`.
- **Level previewer:** http://localhost/lungs/tools/preview.html — paste a level
  file, see it render, get its validation status and estimated length.

## Seeing the game

There is no browser automation installed, but Firefox can screenshot headlessly.
A throwaway profile and `--no-remote` are both required; without them it fails
with "Firefox is already running, but is not responding".

```sh
firefox --headless --profile /tmp/ff --no-remote --window-size=1400,900 \
  --screenshot /tmp/shot.png "http://localhost/lungs/?v=$(date +%s%N)"
```

Keep the cache-busting query — Firefox holds on to ES modules between runs and
will happily screenshot your previous code.

**The screenshot fires at load, before promises and timers settle.** `fetch`,
`setTimeout`, and even top-level `await` will not have completed. Anything you
intend to verify this way has to render synchronously. This produced three
separate false readings of "it's broken" in one session; if a page looks empty,
suspect this before suspecting the code.

`ffprobe` is available and is a genuine independent check on generated audio.

## Constraints that bite

- **Relative paths only.** Never a leading `/`. GitHub Pages serves from
  `/<repo>/`, so absolute paths work locally and break there.
- **`src/engine/`, `src/levels/validate.js`, `src/render/scale.js` and
  `src/storage.js` must stay DOM-free.** They are unit-tested under Node, which
  has no `window`, `document`, `localStorage` or `Audio`. Browser objects are
  injected as parameters.
- **Level art is generated.** `tools/gen-lungs.mjs` and `tools/gen-shapes.mjs`
  produce the 64-row grids; edit the generator and re-run rather than hand-editing
  64 rows. `tools/gen-sfx.mjs` does the same for the sound effects and is seeded,
  so regenerating produces byte-identical files.
- **Level length is the usual bug.** A silhouette can hold 1,700 cells; without a
  blast radius on the bulk block that is an unplayable level. The validator
  rejects anything outside 80–600 estimated hits. See the spec's Explosions
  section for why `chain: false` on bulk blocks is load-bearing.
