import { SFX_NAMES, SFX_PATH, SFX_POOL_SIZE, SFX_RETRIGGER_MS, KEY_MUTED } from './config.js';

/**
 * Sound effects, all optional.
 *
 * assets/sfx/ ships empty: a missing file marks its effect unavailable and is
 * reported once at debug level. A 404 must never throw, never repeat, and never
 * interrupt a frame.
 *
 * Each effect keeps a small pool of elements because a single Audio element
 * will not restart while it is already playing — and a chain explosion can
 * break forty blocks in one frame. The retrigger cooldown then collapses that
 * into one solid sound instead of forty clipped copies.
 */
export function createAudio(storage, win = window) {
  const effects = new Map();
  let muted = storage.getBool(KEY_MUTED, false);

  for (const name of SFX_NAMES) {
    const effect = { pool: [], next: 0, lastPlayed: -Infinity, available: true, warned: false };
    load(name, effect);
    effects.set(name, effect);
  }

  function load(name, effect) {
    if (typeof win.Audio !== 'function') {
      effect.available = false;
      return;
    }
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const element = new win.Audio(`${SFX_PATH}${name}.wav`);
      element.preload = 'auto';
      element.addEventListener('error', () => {
        effect.available = false;
        if (!effect.warned) {
          effect.warned = true;
          win.console?.debug?.(`[attrition64] no sound file for "${name}" — continuing silently`);
        }
      });
      effect.pool.push(element);
    }
  }

  return {
    get muted() { return muted; },

    toggleMute() {
      muted = !muted;
      storage.setBool(KEY_MUTED, muted);
      return muted;
    },

    play(name) {
      if (muted) return;
      const effect = effects.get(name);
      if (!effect || !effect.available || effect.pool.length === 0) return;

      const now = win.performance?.now?.() ?? Date.now();
      if (now - effect.lastPlayed < SFX_RETRIGGER_MS) return;
      effect.lastPlayed = now;

      const element = effect.pool[effect.next];
      effect.next = (effect.next + 1) % effect.pool.length;
      try {
        element.currentTime = 0;
        // Autoplay policy rejects until a user gesture; the title screen supplies one.
        element.play()?.catch(() => {});
      } catch {
        effect.available = false;
      }
    },
  };
}
