import { validateLevel, LevelValidationError } from './validate.js';

/**
 * Adding a level: put the file in `data/` and add its name here.
 */
export const LEVEL_FILES = [
  'smoke-break.js',
  'we-are-friends.js',
  'the-commute.js',
  'take-away.js',
  'sick-day.js',
  'no-mistake.js',
  'screen-time.js',
  'business-as-usual.js',
  'sla-ukr.js',
];

export const LEVEL_DIR = 'data';

/**
 * Load and validate every level independently.
 *
 * Imports are dynamic rather than static so that one broken contribution is
 * skipped instead of taking the whole game with it. A static import of a file
 * with a syntax error fails the entire module — every other level included —
 * which is exactly the failure the per-level validation was meant to prevent.
 *
 * Ids are filenames, so they cannot collide: the filesystem already guarantees
 * uniqueness, and a collision now means two levels genuinely share a title.
 */
export async function loadLevels(log = console) {
  const levels = [];

  for (const file of LEVEL_FILES) {
    const id = file.replace(/\.js$/, '');
    try {
      const module = await import(`./${LEVEL_DIR}/${file}`);
      if (!module.default || typeof module.default !== 'object') {
        throw new Error('the file has no default export, or it is not an object');
      }
      // id last: the filename wins over anything the file might declare.
      const level = { ...module.default, id };
      validateLevel(level);
      levels.push(level);
    } catch (error) {
      log.error(error instanceof LevelValidationError
        ? error.message
        : `Level "${id}" — could not be loaded: ${error.message}`);
    }
  }
  return levels;
}
