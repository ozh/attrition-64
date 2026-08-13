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
  const touch = (type, clientX, target = null) => win.handlers[type]({
    touches: [{ clientX }],
    target,
    preventDefault: () => { prevented++; },
  });
  return { input, key, touch, win, canvas, prevented: () => prevented };
}

/** An element that is not inside a link, as far as onTouchStart can tell. */
const bareTarget = { closest: () => null };
const linkTarget = { closest: (sel) => (sel === 'a' ? {} : null) };

// --- mouse -----------------------------------------------------------------

test('the mouse is tracked on the window, so it works off the canvas', () => {
  const { canvas } = harness();
  assert.equal(canvas.handlers.mousemove, undefined, 'not bound to the canvas');
  assert.equal(canvas.handlers.mousedown, undefined, 'not bound to the canvas');
});

test('a click anywhere on the page sets the action intent', () => {
  const { input, win } = harness();
  win.handlers.mousedown({});
  assert.equal(input.read().action, true);
  assert.equal(input.read().action, false, 'reading consumes the click');
});

test('the first mouse move only establishes a reference point', () => {
  const { input, win } = harness();
  win.handlers.mousemove({ clientX: 256 });
  assert.equal(input.read().dragDelta, 0);
});

test('mouse movement steers by its distance, scaled to the canvas', () => {
  const { input, win } = harness();
  win.handlers.mousemove({ clientX: 256 });
  win.handlers.mousemove({ clientX: 128 });
  assert.equal(input.read().dragDelta, -FIELD_W / 4, 'a quarter of the canvas, leftwards');
});

test('movement far outside the canvas still steers', () => {
  const { input, win } = harness();
  // Both positions are off the right of a 512px-wide canvas, where an absolute
  // mapping would clamp to the wall and the paddle would not move at all.
  win.handlers.mousemove({ clientX: 2000 });
  win.handlers.mousemove({ clientX: 1872 });
  assert.equal(input.read().dragDelta, -FIELD_W / 4);
});

test('movement accumulates between reads and is consumed by one', () => {
  const { input, win } = harness();
  win.handlers.mousemove({ clientX: 0 });
  win.handlers.mousemove({ clientX: 128 });
  win.handlers.mousemove({ clientX: 256 });
  assert.equal(input.read().dragDelta, FIELD_W / 2);
  assert.equal(input.read().dragDelta, 0);
});

test('leaving the window drops the reference, so re-entry is not a jump', () => {
  const { input, win } = harness();
  win.handlers.mousemove({ clientX: 500 });
  win.handlers.mouseout({ relatedTarget: null });
  win.handlers.mousemove({ clientX: 10 });
  assert.equal(input.read().dragDelta, 0, 're-entry re-establishes the reference');
});

test('crossing between elements inside the page keeps the reference', () => {
  const { input, win } = harness();
  win.handlers.mousemove({ clientX: 256 });
  win.handlers.mouseout({ relatedTarget: {} });
  win.handlers.mousemove({ clientX: 128 });
  assert.equal(input.read().dragDelta, -FIELD_W / 4);
});

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

// --- touch -----------------------------------------------------------------

test('touch is handled on the window, so a drag can start off the canvas', () => {
  const { canvas } = harness();
  assert.equal(canvas.handlers.touchstart, undefined, 'not bound to the canvas');
  assert.equal(canvas.handlers.touchmove, undefined, 'not bound to the canvas');
});

test('a drag started outside the canvas still steers', () => {
  const { input, touch } = harness();
  // 900 is well past the right edge of a 512px-wide canvas.
  touch('touchstart', 900, bareTarget);
  touch('touchmove', 772);
  assert.equal(input.read().dragDelta, -FIELD_W / 4);
});

test('a tap sets the action intent and is swallowed', () => {
  const { input, touch, prevented } = harness();
  touch('touchstart', 100, bareTarget);
  assert.equal(input.read().action, true);
  assert.equal(prevented(), 1, 'a tap must not also click through or scroll');
});

test('a touch on a link is left alone, so the credits stay tappable', () => {
  const { input, touch, prevented } = harness();
  touch('touchstart', 100, linkTarget);
  assert.equal(prevented(), 0, 'the synthesised click must survive');
  assert.equal(input.read().action, false);
});

test('a drag that began on a link does not steer', () => {
  const { input, touch } = harness();
  touch('touchstart', 100, linkTarget);
  touch('touchmove', 228);
  assert.equal(input.read().dragDelta, 0);
});

test('moving without a drag in progress does nothing', () => {
  const { input, touch } = harness();
  touch('touchmove', 300);
  assert.equal(input.read().dragDelta, 0);
});

test('lifting the finger ends the drag', () => {
  const { input, touch, win } = harness();
  touch('touchstart', 100, bareTarget);
  win.handlers.touchend({});
  touch('touchmove', 228);
  assert.equal(input.read().dragDelta, 0);
});
