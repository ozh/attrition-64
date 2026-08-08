import { STORAGE_PREFIX } from './config.js';

/**
 * localStorage wrapper. The backing store is a parameter so this is testable
 * under Node, and every access is guarded: Safari private mode throws on
 * setItem, and a storage failure must never take down the game loop.
 */
export function createStorage(backing) {
  const key = (name) => `${STORAGE_PREFIX}${name}`;

  const read = (name) => {
    try {
      return backing?.getItem(key(name)) ?? null;
    } catch {
      return null;
    }
  };

  const write = (name, value) => {
    try {
      backing?.setItem(key(name), String(value));
    } catch {
      // Storage is unavailable or full. The score simply is not persisted.
    }
  };

  return {
    getNumber(name, fallback = 0) {
      const raw = read(name);
      const value = Number(raw);
      return raw !== null && Number.isFinite(value) ? value : fallback;
    },
    setNumber(name, value) {
      write(name, value);
    },
    getBool(name, fallback = false) {
      const raw = read(name);
      return raw === null ? fallback : raw === 'true';
    },
    setBool(name, value) {
      write(name, value ? 'true' : 'false');
    },
  };
}
