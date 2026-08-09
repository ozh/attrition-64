import test from 'node:test';
import assert from 'node:assert/strict';
import { clientXToCell, createInput } from '../src/input.js';
import { FIELD_W } from '../src/config.js';

const rect = { left: 100, width: 512 };

test('the left edge of the canvas maps to cell 0', () => {
  assert.equal(clientXToCell(100, rect), 0);
});

test('the right edge maps to the field width', () => {
  assert.equal(clientXToCell(612, rect), FIELD_W);
});

test('the centre maps to the middle of the field', () => {
  assert.equal(clientXToCell(356, rect), FIELD_W / 2);
});

test('the canvas offset on the page is accounted for', () => {
  assert.equal(clientXToCell(100, { left: 0, width: 512 }), FIELD_W * (100 / 512));
});

test('a zero-width rect does not produce NaN', () => {
  assert.equal(clientXToCell(50, { left: 0, width: 0 }), 0);
});

// --- keyboard --------------------------------------------------------------
// createInput needs a DOM, but only addEventListener and getBoundingClientRect.
// Stubbing those lets the key handling be tested under Node like everything
// else — otherwise the whole keyboard path ships with no coverage at all.


function stubTarget() {
  const handlers = {};
  return {
    handlers,
    node: {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, width: 512 }),
    },
  };
}

function harness() {
  const win = stubTarget();
  const canvas = stubTarget();
  const input = createInput(canvas.node, win.node);
  let prevented = 0;
  const key = (code, type = 'keydown', extra = {}) =>
    win.handlers[type]({ code, preventDefault: () => { prevented++; }, ...extra });
  return { input, key, canvas, prevented: () => prevented };
}

test('M sets the mute intent', () => {
  const { input, key } = harness();
  key('KeyM');
  assert.equal(input.read().mute, true);
});

test('mute is edge-triggered, so holding M does not toggle repeatedly', () => {
  const { input, key } = harness();
  key('KeyM');
  assert.equal(input.read().mute, true);
  assert.equal(input.read().mute, false, 'reading consumes the press');
});

test('a key repeat is ignored', () => {
  const { input, key } = harness();
  key('KeyM', 'keydown', { repeat: true });
  assert.equal(input.read().mute, false);
});

test('space sets the action intent and is swallowed', () => {
  const { input, key, prevented } = harness();
  key('Space');
  assert.equal(input.read().action, true);
  assert.equal(prevented(), 1, 'space must not also scroll the page');
});

test('both arrow keys and WASD steer', () => {
  for (const [code, expected] of [['ArrowLeft', -1], ['KeyA', -1], ['ArrowRight', 1], ['KeyD', 1]]) {
    const { input, key } = harness();
    key(code);
    assert.equal(input.read().moveDir, expected, code);
  }
});

test('movement is held until the key is released', () => {
  const { input, key } = harness();
  key('ArrowRight');
  assert.equal(input.read().moveDir, 1);
  assert.equal(input.read().moveDir, 1, 'still held');
  key('ArrowRight', 'keyup');
  assert.equal(input.read().moveDir, 0);
});

test('opposite keys held together cancel out', () => {
  const { input, key } = harness();
  key('ArrowLeft');
  key('ArrowRight');
  assert.equal(input.read().moveDir, 0);
});

test('an unmapped key does nothing', () => {
  const { input, key } = harness();
  key('KeyQ');
  const intent = input.read();
  assert.equal(intent.moveDir, 0);
  assert.equal(intent.action, false);
  assert.equal(intent.mute, false);
});
