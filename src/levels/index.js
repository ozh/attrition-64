import { validateLevel, LevelValidationError } from './validate.js';

/**
 * Adding a level: put the file in `data/` and add its name here. That is the
 * whole registration step.
 *
 * A level has exactly one name, and this is it. The file is named after its
 * title — `SMOKE BREAK` lives in `smoke-break.js` — and that filename is also
 * its id. There is no second, descriptive vocabulary for the same level, and no
 * ordering prefix: order is this array and only this array, so a filename never
 * makes a claim about position that merging could falsify.
 *
 * Why a hand-kept list and not the directory contents: a browser cannot list a
 * directory, and GitHub Pages serves no index for one. Local servers usually
 * do, so scraping a listing would pass every test here and 404 in production.
 * `test/levels.test.js` compares this array against `data/` instead, so
 * forgetting a line fails loudly at the only point that can see both.
 */
export const LEVEL_FILES = [
  'smoke-break.js',
  'happy-hour.js',
  'screen-time.js',
  'the-commute.js',
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
