import { createRenderer } from './render/canvas.js';
import { surroundColor } from './render/surround.js';
import { createFieldCache, drawField } from './render/field.js';
import {
  drawPaddle, drawBalls, drawDrops, drawShots, drawFlashes, drawShield, DROP_COLORS,
} from './render/entities.js';
import { drawHud } from './render/hud.js';
import { drawScreens } from './render/screens.js';
import { createInput } from './input.js';
import { createStorage } from './storage.js';
import { createAudio } from './audio.js';
import { loadLevels } from './levels/index.js';
import { createGame, NEUTRAL_INTENT } from './game.js';
import { STEP, MAX_STEPS_PER_FRAME } from './config.js';

const canvas = document.getElementById('game');
// Height of the strip under the canvas, so the fit leaves room for it.
const CHROME_HEIGHT = 26;
const creditEl = document.getElementById('credit');
const renderer = createRenderer(canvas, window, { reservedH: CHROME_HEIGHT });
const fieldCache = createFieldCache(window);
const storage = createStorage(window.localStorage);
const audio = createAudio(storage, window);
const input = createInput(canvas, window);
const game = createGame({ levels: await loadLevels(), storage, audio });

renderer.fit();
window.addEventListener('resize', () => renderer.fit());
window.addEventListener('orientationchange', () => renderer.fit());

// Hide the pointer only while the paddle is under the player's control. The
// hold states are included so the cursor does not blink back for a second
// between losing a life and serving again.
// The page behind the canvas, tinted from the level's own background so the
// playfield always has a visible edge. Only written when the level changes.
let surround = null;
let credit = null;

function updateCredit() {
  const author = game.level?.author;
  const text = author ? `level by ${author}` : '';
  if (text === credit) return;
  credit = text;
  creditEl.textContent = text;
}

function updateSurround() {
  const wanted = surroundColor(game.level?.background);
  if (wanted === surround) return;
  surround = wanted;
  document.body.style.background = wanted;
}

const CURSOR_HIDDEN_STATES = new Set(['serve', 'playing', 'lifeLost', 'levelClear']);
let cursorHidden = null;

function updateCursor() {
  const hide = CURSOR_HIDDEN_STATES.has(game.state);
  if (hide === cursorHidden) return;      // avoid touching the DOM every frame
  cursorHidden = hide;
  canvas.classList.toggle('hide-cursor', hide);
}

let accumulator = 0;
let previous = performance.now();

function render() {
  updateCursor();
  updateSurround();
  updateCredit();
  renderer.clear(game.level?.background ?? '#000000');
  if (game.grid) {
    drawField(renderer, fieldCache, game.grid);
    drawPaddle(renderer, game.paddle);
    // Tinted while piercing: the state has a short, trip-based window, so it
    // needs to be visible at a glance rather than counted.
    drawBalls(renderer, game.balls,
      game.piercing ? DROP_COLORS.piercing : game.level.ballColor);
    drawDrops(renderer, game.drops);
    drawShots(renderer, game.shots);
    drawFlashes(renderer, game.flashes);
    drawShield(renderer, game.shield);
    drawHud(renderer, {
      score: game.score,
      high: game.high,
      lives: game.lives,
      title: game.level.title,
      muted: audio.muted,
    });
  }
  drawScreens(renderer, game);
}

function frame(now) {
  const elapsed = Math.min(0.25, (now - previous) / 1000);
  previous = now;
  accumulator += elapsed;

  // Edge-triggered presses must fire on exactly one substep, never on all of them.
  let intent = input.read();
  let steps = 0;
  while (accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
    game.update(STEP, intent);
    intent = NEUTRAL_INTENT;
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
