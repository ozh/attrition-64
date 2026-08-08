import { validateLevel, LevelValidationError } from './validate.js';

/**
 * Adding a level: put the file in this directory and add its name here.
 * That is the whole registration step — the filename is the level's identity,
 * so there is no id to keep in sync inside the file.
 *
 * Why a hand-kept list and not the directory contents: a browser cannot list a
 * directory, and GitHub Pages serves no index for one. Local servers usually
 * do, so scraping a listing would pass every test here and 404 in production.
 * `test/levels.test.js` compares this array against the directory instead, so
 * forgetting a line fails loudly at the only point that can see both.
 */
export const LEVEL_FILES = [
  '01-cigarette-lungs.js',
  '02-bottle-liver.js',
  '03-phone-brain.js',
  '04-car-iceberg.js',
];

/** '01-cigarette-lungs.js' -> 'cigarette-lungs'. The leading number is ordering only. */
export function idFromFilename(file) {
  return file.replace(/\.js$/, '').replace(/^\d+[-_]/, '');
}

/**
 * Load and validate every level independently.
 *
 * Imports are dynamic rather than static so that one broken contribution is
 * skipped instead of taking the whole game with it. A static import of a file
 * with a syntax error fails the entire module — every other level included —
 * which is exactly the failure the per-level validation was meant to prevent.
 *
 * Ids come from filenames, so they cannot collide: the filesystem already
 * guarantees uniqueness.
 */
export async function loadLevels(log = console) {
  const levels = [];

  for (const file of LEVEL_FILES) {
    const id = idFromFilename(file);
    try {
      const module = await import(`./${file}`);
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
