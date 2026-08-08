// Silhouette generators for levels 2-4. Run with a shape name:
//   node tools/gen-shapes.mjs liver
// Prints 64 rows of 64 characters, ready to paste into a level's `grid`.
//
// Same approach as gen-lungs.mjs: build the shape from ellipse/polygon tests,
// despeckle, then scatter the special block types at fixed offsets.

const N = 64;
const CX = 31.5;

const blank = () => Array.from({ length: N }, () => Array(N).fill('.'));
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/** Drop any cell with fewer than two orthogonal neighbours. */
function despeckle(g, passes = 2) {
  for (let p = 0; p < passes; p++) {
    const keep = g.map((r) => r.slice());
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (g[y][x] === '.') continue;
        const n = [[0, -1], [0, 1], [-1, 0], [1, 0]]
          .filter(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.').length;
        if (n < 2) keep[y][x] = '.';
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g[y][x] = keep[y][x];
  }
}

/**
 * Scatter special characters over existing bulk cells.
 * A requested spot may land in a carved furrow, so fall back to the nearest
 * filled cell within a small radius rather than silently dropping the block.
 */
function scatter(g, char, spots) {
  const isBulk = (x, y) => g[y]?.[x] && g[y][x] !== '.' && g[y][x] !== char;
  for (const [x, y] of spots) {
    let placed = false;
    for (let r = 0; r <= 3 && !placed; r++) {
      for (let dy = -r; dy <= r && !placed; dy++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!isBulk(x + dx, y + dy)) continue;
          g[y + dy][x + dx] = char;
          placed = true;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- liver
function liver() {
  const g = blank();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Broad wedge: full on the left, tapering to the right.
      if (!ellipse(x, y, 26, 33, 27, 15)) continue;
      // Shave the upper right so the shape reads as a wedge, not an ellipse.
      if (x > 34 && y < 26 + (x - 34) * 0.55) continue;
      g[y][x] = '#';
    }
  }
  // Falciform notch dividing the lobes.
  for (let y = 18; y < 30; y++) for (let x = 37; x <= 39; x++) if (g[y]) g[y][x] = '.';
  despeckle(g);

  // Portal vein structure entering from the underside.
  for (let i = 0; i <= 10; i++) {
    const y = 40 - Math.round(i * 0.9);
    for (const dir of [-1, 1]) {
      const x = Math.round(28 + dir * (1 + i * 1.2));
      if (g[y]?.[x] === '#') g[y][x] = 'B';
    }
  }
  for (let x = 26; x <= 30; x++) for (let y = 40; y <= 45; y++) if (g[y]?.[x] === '#') g[y][x] = 'B';

  scatter(g, '*', [[12, 28], [20, 40], [33, 24], [30, 38], [44, 34], [50, 32], [16, 36], [40, 42]]);
  scatter(g, 'p', [[10, 33], [18, 25], [24, 44], [36, 30], [43, 28], [48, 38], [14, 42], [28, 22]]);
  return g;
}

// ---------------------------------------------------------------- brain
function brain() {
  const g = blank();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!ellipse(x, y, CX, 28, 22, 19)) continue;
      if (y > 44) continue;                     // flat underside
      g[y][x] = '#';
    }
  }
  // Despeckle the solid mass FIRST. Carving the furrows before this point lets
  // despeckle eat the thin ridges between them and the brain falls apart.
  despeckle(g);

  // Longitudinal fissure.
  for (let y = 9; y <= 30; y++) for (const x of [31, 32]) if (g[y]?.[x]) g[y][x] = '.';

  // Gyri: single-cell furrows, far enough apart to leave solid ridges between.
  for (let y = 15; y <= 42; y += 5) {
    for (let x = 0; x < N; x++) {
      const wobble = Math.round(Math.sin((x - CX) * 0.4) * 1.4);
      const row = g[y + wobble];
      if (row?.[x] === '#') row[x] = '.';
    }
  }

  // Brain stem below the flat underside.
  for (let y = 45; y <= 55; y++) {
    const halfWidth = y < 49 ? 3 : 2;
    for (let x = Math.round(CX - halfWidth); x <= Math.round(CX + halfWidth); x++) g[y][x] = 'B';
  }
  for (let y = 40; y <= 44; y++) for (let x = 29; x <= 34; x++) if (g[y]?.[x] === '#') g[y][x] = 'B';

  scatter(g, '*', [[16, 20], [46, 20], [24, 32], [40, 32], [20, 40], [44, 40], [31, 12], [12, 28]]);
  scatter(g, 'p', [[22, 16], [42, 16], [14, 24], [50, 26], [27, 24], [37, 36], [18, 36], [46, 34]]);
  return g;
}

// -------------------------------------------------------------- iceberg
const WATERLINE = 24;

function iceberg() {
  const g = blank();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (y < WATERLINE) {
        // Jagged peak above the surface.
        const halfWidth = (y - 6) * 0.75;
        const jag = Math.sin(x * 1.7) * 0.8 + Math.sin(x * 0.6) * 1.2;
        if (y >= 6 && Math.abs(x - CX) <= halfWidth + jag) g[y][x] = '#';
      } else if (ellipse(x, y, CX, 40, 26, 17)) {
        // The nine-tenths below.
        g[y][x] = 'D';
      }
    }
  }
  despeckle(g);

  scatter(g, '*', [[20, 34], [44, 34], [31, 46], [14, 42], [50, 42], [26, 52], [38, 52], [31, 30]]);
  scatter(g, 'p', [[24, 40], [40, 40], [31, 36], [18, 48], [46, 48], [31, 20], [28, 16], [35, 16]]);
  return g;
}

const SHAPES = { liver, brain, iceberg };

const name = process.argv[2];
if (!SHAPES[name]) {
  console.error(`usage: node tools/gen-shapes.mjs <${Object.keys(SHAPES).join('|')}>`);
  process.exit(1);
}

const grid = SHAPES[name]();
const rows = grid.map((r) => r.join(''));
console.log(rows.join('\n'));
console.error('counts:', JSON.stringify(grid.flat().reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {})));
console.error('rows:', rows.length, '| all 64 wide:', rows.every((r) => r.length === 64));
