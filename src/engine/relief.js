import { ENDGAME_RELIEF } from '../config.js';

/**
 * Seconds between endgame powerup drops at this much of the grid remaining,
 * or null when there is still plenty to hit.
 *
 * Tiers are ordered loosest first and the tightest match wins, so the bands
 * read in the order a player meets them and adding one is a single line.
 */
export function reliefInterval(fraction) {
  let interval = null;
  for (const tier of ENDGAME_RELIEF) {
    if (fraction <= tier.remaining) interval = tier.everySeconds;
  }
  return interval;
}

export function createRelief() {
  return { timer: null, interval: null };
}

/**
 * Advance the relief clock.
 * @returns true on the tick a drop is due.
 */
export function tickRelief(relief, dt, fraction) {
  const interval = reliefInterval(fraction);

  if (interval === null) {
    relief.interval = null;
    relief.timer = null;
    return false;
  }

  if (relief.interval === null) {
    // Just crossed into the band: wait a full interval before the first drop.
    relief.timer = interval;
  } else if (interval < relief.interval) {
    // Tightened a tier. Shorten the wait already in progress rather than
    // letting the player sit out the old, slower cadence.
    relief.timer = Math.min(relief.timer, interval);
  }
  relief.interval = interval;

  relief.timer -= dt;
  if (relief.timer > 0) return false;

  relief.timer = interval;
  return true;
}
