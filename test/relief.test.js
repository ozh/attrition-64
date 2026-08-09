import test from 'node:test';
import assert from 'node:assert/strict';
import { reliefInterval, createRelief, tickRelief } from '../src/engine/relief.js';
import { ENDGAME_RELIEF } from '../src/config.js';

// Derived from the table rather than destructured: the number of tiers is a
// tuning decision and has already changed once.
const LOOSE = ENDGAME_RELIEF[0];
const TIGHT = ENDGAME_RELIEF[ENDGAME_RELIEF.length - 1];

/** What the tightest-match rule should return, computed from the table. */
const expected = (fraction) => ENDGAME_RELIEF
  .filter((tier) => fraction <= tier.remaining)
  .map((tier) => tier.everySeconds)
  .at(-1) ?? null;

test('no relief while there is still plenty of grid left', () => {
  for (const fraction of [1, LOOSE.remaining + 0.2, LOOSE.remaining + 0.001]) {
    assert.equal(reliefInterval(fraction), null, `fraction ${fraction}`);
  }
});

test('the tightest matching tier wins, at every tier', () => {
  for (const tier of ENDGAME_RELIEF) {
    assert.equal(reliefInterval(tier.remaining), expected(tier.remaining),
      `at the ${tier.remaining} threshold`);
    assert.equal(reliefInterval(tier.remaining + 0.001), expected(tier.remaining + 0.001),
      `just above the ${tier.remaining} threshold`);
  }
  assert.equal(reliefInterval(0), TIGHT.everySeconds, 'an empty grid still resolves');
  assert.equal(reliefInterval(LOOSE.remaining), LOOSE.everySeconds, 'the first tier is reachable');
});

test('the cadence tightens rather than loosening', () => {
  const intervals = ENDGAME_RELIEF.map((t) => t.everySeconds);
  assert.deepEqual(intervals, [...intervals].sort((a, b) => b - a),
    'thresholds must be ordered loosest first with decreasing intervals');
});

test('the first drop comes a full interval after entering the band', () => {
  const relief = createRelief();
  const f = LOOSE.remaining;
  assert.equal(tickRelief(relief, LOOSE.everySeconds - 0.5, f), false);
  assert.equal(tickRelief(relief, 0.4, f), false);
  assert.equal(tickRelief(relief, 0.2, f), true);
});

test('drops keep coming on the cadence', () => {
  const relief = createRelief();
  const f = LOOSE.remaining;
  let drops = 0;
  // Long enough for four intervals.
  for (let t = 0; t < LOOSE.everySeconds * 4; t += 0.5) {
    if (tickRelief(relief, 0.5, f)) drops++;
  }
  assert.equal(drops, 4);
});

test('tightening a tier shortens a wait already in progress', () => {
  const relief = createRelief();
  tickRelief(relief, 0.1, LOOSE.remaining);          // enter the loose band
  assert.ok(relief.timer > TIGHT.everySeconds, 'a long wait is pending');

  tickRelief(relief, 0.1, TIGHT.remaining);          // grid drops to the tight band
  assert.ok(relief.timer <= TIGHT.everySeconds,
    'the pending wait must be clamped to the new cadence, not run to the old one');
});

test('a tier does not extend a wait that is already shorter', () => {
  const relief = createRelief();
  tickRelief(relief, 0.1, TIGHT.remaining);
  const pending = relief.timer;
  tickRelief(relief, 0, TIGHT.remaining);
  assert.ok(relief.timer <= pending);
});

test('leaving the band clears the clock', () => {
  const relief = createRelief();
  tickRelief(relief, 1, TIGHT.remaining);
  assert.notEqual(relief.timer, null);

  // Only reachable by starting a fresh level, but it must not leak a timer.
  assert.equal(tickRelief(relief, 1, 1), false);
  assert.equal(relief.timer, null);
  assert.equal(relief.interval, null);
});

test('re-entering the band starts a fresh full wait', () => {
  const relief = createRelief();
  tickRelief(relief, LOOSE.everySeconds - 1, LOOSE.remaining);
  tickRelief(relief, 1, 1);                          // left the band
  assert.equal(tickRelief(relief, 1, LOOSE.remaining), false,
    'the old nearly-expired timer must not carry over into the new band');
});
