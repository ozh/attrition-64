import { EFFECT_DURATION } from '../config.js';

/** Effects that cancel one another; catching either clears the other. */
const EXCLUSIVE = [['slowBall', 'fastBall']];

export function createEffects() {
  return { active: new Map() };
}

/**
 * Start or refresh an effect. Refreshing rather than accumulating is deliberate:
 * a second pickup restarts the clock, it does not double the duration.
 * @returns false for instant effects (multiball), which hold no timer.
 */
export function applyEffect(effects, kind) {
  const duration = EFFECT_DURATION[kind];
  if (typeof duration !== 'number') return false;

  for (const pair of EXCLUSIVE) {
    if (!pair.includes(kind)) continue;
    for (const other of pair) if (other !== kind) effects.active.delete(other);
  }
  effects.active.set(kind, duration);
  return true;
}

/** @returns the kinds that ran out on this tick. */
export function tickEffects(effects, dt) {
  const expired = [];
  for (const [kind, remaining] of effects.active) {
    const left = remaining - dt;
    if (left <= 0) {
      effects.active.delete(kind);
      expired.push(kind);
    } else {
      effects.active.set(kind, left);
    }
  }
  return expired;
}

export const hasEffect = (effects, kind) => effects.active.has(kind);
export const effectRemaining = (effects, kind) => effects.active.get(kind) ?? 0;
export const clearEffects = (effects) => effects.active.clear();
