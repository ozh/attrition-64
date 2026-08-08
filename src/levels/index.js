import { validateLevel, LevelValidationError } from './validate.js';
import cigaretteLungs from './01-cigarette-lungs.js';
import bottleLiver from './02-bottle-liver.js';
import phoneBrain from './03-phone-brain.js';
import carIceberg from './04-car-iceberg.js';

// Adding a level: import it above, then add it to this array. Nothing else.
const CANDIDATES = [
  cigaretteLungs,
  bottleLiver,
  phoneBrain,
  carIceberg,
];

/**
 * Validate every candidate independently. An invalid contribution is reported
 * and skipped rather than allowed to white-screen the game — one bad PR must
 * not break the levels either side of it.
 */
export function loadLevels(log = console) {
  const levels = [];
  const seen = new Set();

  for (const level of CANDIDATES) {
    try {
      validateLevel(level);
      if (seen.has(level.id)) {
        throw new LevelValidationError(level.id, 'id', 'is already used by another level');
      }
      seen.add(level.id);
      levels.push(level);
    } catch (error) {
      if (!(error instanceof LevelValidationError)) throw error;
      log.error(error.message);
    }
  }
  return levels;
}
