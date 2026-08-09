import { estimateHitsToClear } from '../levels/validate.js';
import { BALL_SPEED } from '../config.js';

/** Cells still standing whose block type can drop a powerup. */
export function countPowerupCells(grid) {
  if (!grid) return 0;
  let total = 0;
  for (const ch of grid.chars) {
    if (ch && grid.types[ch]?.powerup !== undefined) total++;
  }
  return total;
}

const round = (n, places = 1) => Number(n.toFixed(places));
const seconds = (n) => `${round(n)}s`;

/**
 * A snapshot of everything worth watching change, as label/value pairs.
 *
 * Pure and DOM-free so it can be tested under Node like the rest of the engine;
 * main.js is the only thing that knows this ends up in an element.
 */
export function debugSnapshot(game, { fps = 0, levelCount = 0 } = {}) {
  const grid = game.grid;
  const initial = game.initialBlocks || 1;
  const remaining = grid ? grid.remaining : 0;
  const cleared = 1 - remaining / initial;

  const effects = [...(game.effects?.active ?? new Map())]
    .map(([kind, left]) => `${kind} ${round(left)}`)
    .join(', ');

  const held = [
    game.shield ? 'shield' : null,
    game.piercing ? `piercing${game.piercingArmed ? '' : ' (unarmed)'}` : null,
  ].filter(Boolean).join(', ');

  const speed = game.targetSpeed ? game.targetSpeed() : 0;

  return [
    ['fps', Math.round(fps)],
    ['state', game.state],
    ['level', `${game.levelIndex + 1}/${levelCount} ${game.level?.id ?? '-'}`],
    ['score', game.score],
    ['lives', game.lives],
    [],
    ['blocks', `${remaining} / ${initial}`],
    ['cleared', `${Math.round(cleared * 100)}%`],
    ['hits est.', game.level ? Math.round(estimateHitsToClear(game.level)) : '-'],
    ['powerup cells', countPowerupCells(grid)],
    [],
    ['life time', seconds(game.playTime ?? 0)],
    ['ball speed', `${round(speed)} cells/s`],
    ['vs base', `x${round(speed / BALL_SPEED, 2)}`],
    [],
    ['balls', game.balls?.length ?? 0],
    ['drops', game.drops?.length ?? 0],
    ['shots', game.shots?.length ?? 0],
    ['effects', effects || '-'],
    ['held', held || '-'],
    ['relief in', game.relief?.timer == null ? '-' : seconds(game.relief.timer)],
  ];
}
