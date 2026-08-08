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
  const state = { pointerCenter: null, dragDelta: 0, action: false, mute: false };
  let dragging = false;
  let lastDragCell = 0;

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

  const onMouseMove = (event) => {
    state.pointerCenter = clientXToCell(event.clientX, canvas.getBoundingClientRect());
  };
  const onMouseDown = () => { state.action = true; };

  const onTouchStart = (event) => {
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
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);

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
        pointerCenter: state.pointerCenter,
        dragDelta: state.dragDelta,
        action: state.action,
        mute: state.mute,
      };
      state.pointerCenter = null;
      state.dragDelta = 0;
      state.action = false;
      state.mute = false;
      return intent;
    },
    dispose() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    },
  };
}
