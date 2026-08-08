# Lungs

A pixel breakout game where the paddle is an everyday item and the blocks form
the silhouette of something that item is a threat to. A cigarette against a wall
of lung-shaped blocks; a bottle against a liver; a phone against a brain; a car
against an iceberg.

The game makes no argument about any of it. There is no commentary and no
message screen — the sprites are the whole idea.

New pairings are welcome as pull requests. Adding one is a single new file plus
one line in a registry: see [docs/ADDING_A_LEVEL.md](docs/ADDING_A_LEVEL.md).

## Playing

| Action | Keyboard | Mouse | Touch |
| --- | --- | --- | --- |
| Move the paddle | ← → or A D | move | drag |
| Serve, release a held ball, fire the laser | Space | click | tap |
| Mute | M | — | — |

Three lives. A life is lost only when the *last* ball drains, so multiball is a
real safety net. Damage to the blocks persists when you die — dying never undoes
progress.

Blocks drop six kinds of pickup, colour-coded so you can decline one: multiball,
wide paddle, slow ball, fast ball (which also doubles your score while active),
sticky paddle, and lasers.

## Running it

The game is static files loaded as ES modules, so it must be served over HTTP.
Opening `index.html` from `file://` will not work — browsers block module loading
over that scheme.

Any static server will do:

```sh
python3 -m http.server 8000     # then open http://localhost:8000/
```

On this machine the `dev-web` container already serves the project directory, so
it is reachable at **http://localhost/lungs/** with nothing to start.

Every path in the project is relative, so the same files work unchanged when
served from a subdirectory such as GitHub Pages' `/<repo>/`.

## Tests

No dependencies and no test framework — Node's built-in runner, Node 18 or newer:

```sh
node --test 'test/*.test.js'
```

163 tests cover the engine, the level validator, the screen-fit calculation and
the storage wrapper. Rendering, audio and touch input are verified by playing the
game; everything they depend on is pure and tested.

## Sound

`assets/sfx/` ships empty, and the game runs silently until you fill it. Drop in
`.wav` files with these names and they are picked up automatically:

```
bounce-wall  bounce-paddle  block-hit  block-break  explode
powerup-catch  laser  life-lost  level-clear  game-over
```

A missing file is not an error — it is logged once at debug level and that effect
stays silent.

## Layout

```
index.html            page shell
src/config.js         every tunable constant
src/game.js           state machine and rules
src/engine/           DOM-free game logic, unit-tested
src/render/           canvas drawing
src/levels/           one module per level, plus the validator
tools/                shape generators for the shipped level art
test/                 node --test suites
```

`src/engine/` never touches the DOM. That is what lets the interesting logic —
collision, explosions, effect timers — be tested under Node without a browser.
