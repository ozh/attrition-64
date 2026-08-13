import { FIELD_W } from './config.js';

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);

/** Pure: a client X coordinate and the canvas rect give a playfield cell. */
export function clientXToCell(clientX, rect) {
  if (!rect.width) return 0;
  return ((clientX - rect.left) / rect.width) * FIELD_W;
}

export function createInput(canvas, win = window) {
  const held = new Set();
  const state = { dragDelta: 0, action: false, mute: false };
  let dragging = false;
  let lastDragCell = 0;
  let lastMouseCell = null;

  const onKeyDown = (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space') {
      state.action = true;
      event.preventDefault();
    }
    if (event.code === 'KeyM') state.mute = true;
  };
  const onKeyUp = (event) => held.delete(event.code);

  /**
   * Relative like touch, and listened for on the window rather than the canvas,
   * so the mouse steers from anywhere on the page. An absolute position cannot:
   * once the cursor is past the canvas edge it maps off the end of the field and
   * the paddle stays pinned to that wall however far the mouse then travels.
   * The movement is still canvas-scaled, so it stays 1:1 with the cursor.
   */
  const onMouseMove = (event) => {
    const cell = clientXToCell(event.clientX, canvas.getBoundingClientRect());
    if (lastMouseCell !== null) state.dragDelta += cell - lastMouseCell;
    lastMouseCell = cell;
  };
  /** Left the window (no relatedTarget): forget where the cursor was, so coming
   *  back in on the far side is not one enormous jump. */
  const onMouseOut = (event) => { if (!event.relatedTarget) lastMouseCell = null; };
  const onMouseDown = () => { state.action = true; };

  /**
   * A drag starts anywhere on the page, not just on the canvas, to match the
   * mouse. Links are the one exception: swallowing the touch there would also
   * swallow the click the browser synthesises from it, leaving the credit links
   * untappable on a phone.
   */
  const onTouchStart = (event) => {
    if (event.target?.closest?.('a')) return;
    dragging = true;
    lastDragCell = clientXToCell(event.touches[0].clientX, canvas.getBoundingClientRect());
    state.action = true;
    event.preventDefault();
  };
  const onTouchMove = (event) => {
    if (!dragging) return;
    const cell = clientXToCell(event.touches[0].clientX, canvas.getBoundingClientRect());
    // Relative, not absolute: the paddle must not sit under the player's thumb.
    state.dragDelta += cell - lastDragCell;
    lastDragCell = cell;
    event.preventDefault();
  };
  const onTouchEnd = () => { dragging = false; };

  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);
  win.addEventListener('mousemove', onMouseMove);
  win.addEventListener('mouseout', onMouseOut);
  // On the window like the movement: with the cursor hidden and steering from
  // anywhere, "click to serve" has to work anywhere too, or the player has to
  // find a canvas they can no longer see the cursor over.
  win.addEventListener('mousedown', onMouseDown);
  win.addEventListener('touchstart', onTouchStart, { passive: false });
  win.addEventListener('touchmove', onTouchMove, { passive: false });
  win.addEventListener('touchend', onTouchEnd);
  win.addEventListener('touchcancel', onTouchEnd);

  return {
    /** Reading consumes the edge-triggered presses, so one tap is one action. */
    read() {
      let moveDir = 0;
      for (const code of held) {
        if (LEFT_KEYS.has(code)) moveDir -= 1;
        if (RIGHT_KEYS.has(code)) moveDir += 1;
      }
      const intent = {
        moveDir: Math.sign(moveDir),
        dragDelta: state.dragDelta,
        action: state.action,
        mute: state.mute,
      };
      state.dragDelta = 0;
      state.action = false;
      state.mute = false;
      return intent;
    },
    dispose() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('mousemove', onMouseMove);
      win.removeEventListener('mouseout', onMouseOut);
      win.removeEventListener('mousedown', onMouseDown);
      win.removeEventListener('touchstart', onTouchStart);
      win.removeEventListener('touchmove', onTouchMove);
      win.removeEventListener('touchend', onTouchEnd);
      win.removeEventListener('touchcancel', onTouchEnd);
    },
  };
}
