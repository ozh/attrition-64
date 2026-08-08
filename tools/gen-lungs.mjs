const N = 64;
const g = Array.from({ length: N }, () => Array(N).fill('.'));
const CX = 31.5;

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

const rows = g.map((r) => r.join(''));
console.log(rows.join('\n'));
const counts = g.flat().reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
console.log('\ncounts:', JSON.stringify(counts));
console.log('rows all 64 wide:', rows.every((r) => r.length === 64), '| row count:', rows.length);
