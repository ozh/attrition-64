import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';
import { STORAGE_PREFIX, KEY_HIGHSCORE } from '../src/config.js';

/** Minimal localStorage stand-in. */
function fake(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

test('keys are written under the attrition64: prefix', () => {
  const backing = fake();
  createStorage(backing).setNumber(KEY_HIGHSCORE, 1234);
  assert.equal(backing.data[`${STORAGE_PREFIX}${KEY_HIGHSCORE}`], '1234');
  assert.equal(backing.data[KEY_HIGHSCORE], undefined,
    'an unprefixed key would collide with other projects on username.github.io');
});

test('a stored number round-trips', () => {
  const s = createStorage(fake());
  s.setNumber(KEY_HIGHSCORE, 4200);
  assert.equal(s.getNumber(KEY_HIGHSCORE, 0), 4200);
});

test('a missing key returns the fallback', () => {
  assert.equal(createStorage(fake()).getNumber(KEY_HIGHSCORE, 7), 7);
});

test('a corrupt value reads as the fallback rather than NaN', () => {
  const s = createStorage(fake({ [`${STORAGE_PREFIX}${KEY_HIGHSCORE}`]: 'not-a-number' }));
  assert.equal(s.getNumber(KEY_HIGHSCORE, 0), 0);
});

test('booleans round-trip', () => {
  const s = createStorage(fake());
  s.setBool('muted', true);
  assert.equal(s.getBool('muted', false), true);
  s.setBool('muted', false);
  assert.equal(s.getBool('muted', true), false);
});

test('a throwing setItem does not propagate', () => {
  // Safari in private mode throws on setItem; a quota error must never kill the game loop.
  const backing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  const s = createStorage(backing);
  assert.doesNotThrow(() => s.setNumber(KEY_HIGHSCORE, 1));
});

test('a throwing getItem falls back instead of propagating', () => {
  const backing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
  assert.equal(createStorage(backing).getNumber(KEY_HIGHSCORE, 99), 99);
});

test('a null backing store behaves as empty rather than crashing', () => {
  const s = createStorage(null);
  assert.doesNotThrow(() => s.setNumber(KEY_HIGHSCORE, 5));
  assert.equal(s.getNumber(KEY_HIGHSCORE, 3), 3);
});
