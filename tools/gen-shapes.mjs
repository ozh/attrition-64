// Silhouette generators for the shipped levels. Run with a shape name:
//   node tools/gen-shapes.mjs lungs
// Prints 64 rows of 64 characters, ready to paste into a level's `grid`.
//
// Each shape is built from ellipse and polygon tests, despeckled to drop
// stray single cells, then scattered with the special block types at fixed
// offsets. Output is deterministic: regenerating a shape reproduces the
// committed art exactly.

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


/** Superellipse — n=2 is an ellipse, higher n squares the corners off. */
const superEllipse = (x, y, cx, cy, rx, ry, n = 4) =>
  (Math.abs(x - cx) / rx) ** n + (Math.abs(y - cy) / ry) ** n <= 1;

/**
 * Turn the rim of a filled shape into an outline character.
 *
 * This is what gives the reference art its look: a dark keyline around every
 * form, with flat tones inside. Read from a copy so the outline does not eat
 * itself as it goes.
 */
function markOutline(g, char = 'o') {
  const src = g.map((r) => r.slice());
  const empty = (x, y) => !src[y]?.[x] || src[y][x] === '.';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (src[y][x] === '.') continue;
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) g[y][x] = char;
    }
  }
}

/** Recolour filled cells, leaving empties and any protected characters alone. */
function shade(g, char, test, protect = 'o') {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (g[y][x] === '.' || protect.includes(g[y][x])) continue;
      if (test(x, y)) g[y][x] = char;
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


// ------------------------------------------------------------------- lungs
// Ported verbatim from the original gen-lungs.mjs, `put` helper included:
// gen-shapes' `scatter` falls back to a neighbouring cell when its target is
// empty, which would move the special blocks and change the shipped art.
function lungs() {
  const g = blank();

  const inLobe = (x, y) => ((x - 18.5) / 17.0) ** 2 + ((y - 34.0) / 22.5) ** 2 <= 1;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x <= 31; x++) {
      if (!inLobe(x, y)) continue;
      const gap = 2.0 + Math.max(0, y - 13) * 0.17;
      if (CX - x < gap) continue;
      const d = CX - x;
      const notch = Math.sin(d * 0.85) * 1.5 + Math.sin(d * 0.37) * 1.3;
      if (y > 51.5 + notch) continue;
      g[y][x] = '#';
    }
  }

  // despeckle: drop any cell with fewer than 2 orthogonal neighbours
  for (let pass = 0; pass < 2; pass++) {
    const keep = g.map((r) => r.slice());
    for (let y = 0; y < N; y++) {
      for (let x = 0; x <= 31; x++) {
        if (g[y][x] === '.') continue;
        const n = [[0, -1], [0, 1], [-1, 0], [1, 0]]
          .filter(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.').length;
        if (n < 2) keep[y][x] = '.';
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x <= 31; x++) g[y][x] = keep[y][x];
  }

  for (let y = 0; y < N; y++) for (let x = 0; x <= 31; x++) g[y][63 - x] = g[y][x];

  // trachea
  for (let y = 2; y <= 12; y++) for (let x = 30; x <= 33; x++) g[y][x] = 'B';

  // primary bronchi
  for (let i = 0; i <= 14; i++) {
    const y = 12 + Math.round(i * 0.85);
    const dx = 2 + i * 1.1;
    for (const dir of [-1, 1]) {
      for (let t = 0; t < 2; t++) {
        const x = Math.round(CX + dir * (dx + t));
        if (g[y]?.[x] === '#') g[y][x] = 'B';
      }
    }
  }
  // secondary branches
  for (let i = 0; i <= 10; i++) {
    const y = 24 + i;
    for (const dir of [-1, 1]) {
      for (const off of [16 + i * 0.35, 9 + i * 0.9]) {
        const x = Math.round(CX + dir * off);
        if (g[y]?.[x] === '#') g[y][x] = 'B';
      }
    }
  }

  // Explosive cores and powerup blocks, placed symmetrically at fixed offsets.
  const put = (ch, y, dx) => {
    for (const dir of [-1, 1]) {
      const x = Math.round(CX + dir * dx);
      if (g[y]?.[x] === '#') g[y][x] = ch;
    }
  };
  for (const [y, dx] of [[19, 11], [24, 20], [29, 7], [33, 17], [38, 12], [42, 23], [46, 8], [49, 18]]) put('*', y, dx);
  for (const [y, dx] of [[16, 8], [21, 17], [26, 12], [31, 22], [36, 6], [40, 19], [44, 14], [48, 24], [50, 10]]) put('p', y, dx);

  return g;
}


// ------------------------------------------------------------ brain (shaded)
// Outline plus three tones, the way the reference icons are built. The gyri are
// darker *blocks* rather than holes: in a grid where every cell is something the
// ball can destroy, carving them out would only weaken the shape.
function brainShaded() {
  const g = blank();
  const cerebrum = (x, y) => ellipse(x, y, 29, 25, 20, 15) && y < 40;
  const cerebellum = (x, y) => ellipse(x, y, 44, 41, 9, 6.5);
  const stem = (x, y) => x >= 29 && x <= 33 && y >= 37 && y <= 52;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cerebrum(x, y) || stem(x, y)) g[y][x] = 'b';
    }
  }
  // Carve a gap before adding the cerebellum, so markOutline gives each lobe its
  // own keyline instead of fusing them into one blob.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cerebellum(x - 1, y) || cerebellum(x + 1, y) || cerebellum(x, y - 1)
        || cerebellum(x, y + 1) || cerebellum(x, y)) g[y][x] = '.';
    }
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (cerebellum(x, y)) g[y][x] = 'b';
  }
  despeckle(g);

  // Highlight first, so the folds drawn next sit on top of it.
  shade(g, 'h', (x, y) => cerebrum(x, y) && ellipse(x, y, 24, 19, 13, 9));

  // Gyri: single-cell sine furrows across the cerebrum only.
  for (let band = 0; band < 6; band++) {
    for (let x = 0; x < N; x++) {
      const y = Math.round(12 + band * 4.6 + Math.sin((x - 10) * 0.38) * 2.4);
      if (g[y]?.[x] && g[y][x] !== '.' && cerebrum(x, y)) g[y][x] = 's';
    }
  }

  // The cerebellum is more tightly folded than the cerebrum: closer banding.
  for (let y = 34; y <= 48; y += 2) {
    for (let x = 0; x < N; x++) if (g[y]?.[x] && g[y][x] !== '.' && cerebellum(x, y)) g[y][x] = 's';
  }

  markOutline(g, 'o');
  scatter(g, '*', [[18, 20], [40, 16], [24, 31], [44, 41], [13, 27], [31, 47]]);
  scatter(g, 'p', [[24, 14], [36, 26], [15, 33], [46, 37], [30, 11], [31, 42]]);
  return g;
}

// -------------------------------------------------------------- intestines
// A bumpy ring for the colon with a coiled small intestine inside it.
function intestines() {
  const g = blank();
  const CY = 33;
  const inside = (x, y) => superEllipse(x, y, CX, CY, 16.5, 13, 4);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Haustra: the outer edge bulges, so the ring is lumpy, not smooth.
      const angle = Math.atan2(y - CY, x - CX);
      const bump = 1 + Math.sin(angle * 9) * 0.045;
      const outer = superEllipse(x, y, CX, CY, 25 * bump, 21 * bump, 4);
      const inner = superEllipse(x, y, CX, CY, 18, 14.5, 4);
      if (outer && !inner) g[y][x] = 'b';
    }
  }

  // The coil is three cells thick on purpose: at two, every cell is on the rim
  // and markOutline turns the whole thing into a keyline with no fill left.
  const COIL_THICK = 3;
  for (let band = 0; band < 3; band++) {
    const base = 23 + band * 8;
    for (let x = 15; x <= 48; x++) {
      const y = Math.round(base + Math.sin((x - 15) * 0.5) * 2);
      for (let t = 0; t < COIL_THICK; t++) if (inside(x, y + t) && g[y + t]?.[x] === '.') g[y + t][x] = 's';
    }
    if (band === 2) continue;
    const endX = band % 2 === 0 ? 44 : 17;
    for (let y = base; y <= base + 8; y++) {
      for (let t = 0; t < COIL_THICK; t++) {
        if (inside(endX + t, y) && g[y]?.[endX + t] === '.') g[y][endX + t] = 's';
      }
    }
  }

  // The exit, dropping out of the bottom of the ring.
  for (let y = 50; y <= 57; y++) for (let x = 29; x <= 34; x++) if (g[y]) g[y][x] = 'b';

  despeckle(g, 1);
  shade(g, 'h', (x, y) => x + y < 50, 'os');
  markOutline(g, 'o');

  scatter(g, '*', [[12, 26], [52, 26], [32, 15], [12, 42], [52, 42], [32, 52]]);
  scatter(g, 'p', [[19, 18], [45, 18], [32, 33], [19, 48], [45, 48], [24, 33]]);
  return g;
}


// ------------------------------------------------------------------ ocean
// Open water with fish in it. Three depth tones rather than one flat blue, a
// rolling surface so it reads as water and not a rectangle, and bubbles to
// break up the mass.
function ocean() {
  const g = blank();
  const SURFACE = 10;
  const FLOOR = 58;

  for (let x = 0; x < N; x++) {
    // Two sines of different periods so the surface never visibly repeats.
    const wave = Math.sin(x * 0.22) * 1.6 + Math.sin(x * 0.09) * 1.1;
    const top = Math.round(SURFACE + wave);
    // The tone boundaries wander too, or they read as painted stripes.
    const shallow = 24 + Math.round(Math.sin(x * 0.13) * 2);
    const deep = 41 + Math.round(Math.sin(x * 0.17 + 2) * 2);
    for (let y = top; y <= FLOOR; y++) {
      g[y][x] = y < shallow ? 's' : y < deep ? 'm' : 'd';
    }
  }

  /**
   * An ellipse body with a triangular tail behind it.
   * The tail starts at 2, not 3: at 3 it clears the body's narrowing top and
   * bottom rows and the fish comes out with a hole through its middle.
   */
  const fish = (fx, fy, dir) => {
    for (let y = fy - 3; y <= fy + 3; y++) {
      for (let x = fx - 6; x <= fx + 6; x++) {
        if (!g[y]?.[x] || g[y][x] === '.') continue;
        if (ellipse(x, y, fx, fy, 3.2, 1.8)) g[y][x] = 'f';
      }
    }
    for (let t = 0; t <= 2; t++) {
      for (let dy = -t; dy <= t; dy++) {
        const x = fx - dir * (2 + t);
        if (g[fy + dy]?.[x] && g[fy + dy][x] !== '.') g[fy + dy][x] = 'f';
      }
    }
    const eye = fx + dir * 2;
    if (g[fy - 1]?.[eye] && g[fy - 1][eye] !== '.') g[fy - 1][eye] = 'e';
  };

  for (const [x, y, dir] of [
    [15, 18, 1], [43, 16, -1], [27, 28, -1], [51, 31, 1], [11, 35, 1],
    [35, 41, -1], [52, 47, -1], [19, 50, 1], [38, 55, 1],
  ]) fish(x, y, dir);

  for (const [x, y] of [[8, 45], [9, 40], [10, 34], [30, 51], [31, 46], [57, 37], [56, 31], [23, 23]]) {
    if (g[y]?.[x] && !'fe.'.includes(g[y][x])) g[y][x] = 'b';
  }

  scatter(g, '*', [[6, 21], [58, 23], [32, 35], [12, 47], [50, 53], [23, 13], [45, 45], [31, 57]]);
  scatter(g, 'p', [[21, 31], [47, 27], [8, 53], [56, 45], [37, 21], [29, 47], [14, 27], [42, 35]]);
  return g;
}


// ------------------------------------------------------------------ earth
// A globe: ocean disc, continents, ice caps, and a terminator so it reads as a
// sphere rather than a flat circle.
//
// Continents are placed in normalised globe coordinates — u and v run -1..1
// across the disc — which is far easier to reason about than raw cell numbers,
// and keeps the layout correct if the radius ever changes.
function earth() {
  const g = blank();
  const CY = 32;
  const R = 27;

  // Roughly the Atlantic face. Not a map: enough landmass in the right places
  // for the disc to read as Earth rather than as a generic planet.
  const LAND = [
    [-0.56, -0.34, 0.30, 0.24],   // North America
    [-0.34, -0.02, 0.10, 0.08],   // Central America
    [-0.20, 0.36, 0.13, 0.30],    // South America
    [-0.18, -0.74, 0.13, 0.07],   // Greenland
    [0.10, -0.44, 0.13, 0.11],    // Europe
    [0.19, 0.16, 0.20, 0.32],     // Africa
    [0.56, -0.42, 0.34, 0.24],    // Asia
    [0.62, 0.50, 0.15, 0.09],     // Australia
  ];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x - CX) / R;
      const v = (y - CY) / R;
      if (u * u + v * v > 1) continue;

      const land = LAND.some(([cu, cv, ru, rv]) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1);
      const cap = Math.abs(v) > 0.82;
      const shadow = u * 0.62 + v * 0.62 > 0.40;

      g[y][x] = cap ? 'i' : land ? (shadow ? 'L' : 'l') : (shadow ? 'W' : 'w');
    }
  }
  despeckle(g, 1);

  scatter(g, '*', [[16, 32], [47, 32], [31, 14], [31, 50], [22, 21], [42, 43]]);
  scatter(g, 'p', [[31, 32], [20, 42], [44, 22], [13, 30], [50, 38], [31, 20]]);
  return g;
}

const SHAPES = { lungs, liver, brain, brainShaded, intestines, ocean, earth, iceberg };

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
