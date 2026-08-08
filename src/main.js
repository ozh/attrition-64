import { createRenderer } from './render/canvas.js';
import { createFieldCache, drawField } from './render/field.js';
import { drawPaddle, drawBalls, drawDrops, drawShots } from './render/entities.js';
import { drawHud } from './render/hud.js';
import { drawScreens } from './render/screens.js';
import { createInput } from './input.js';
import { createStorage } from './storage.js';
import { createAudio } from './audio.js';
import { loadLevels } from './levels/index.js';
import { createGame, NEUTRAL_INTENT } from './game.js';
import { STEP, MAX_STEPS_PER_FRAME } from './config.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas, window);
const fieldCache = createFieldCache(window);
const storage = createStorage(window.localStorage);
const audio = createAudio(storage, window);
const input = createInput(canvas, window);
const game = createGame({ levels: loadLevels(), storage, audio });

renderer.fit();
window.addEventListener('resize', () => renderer.fit());
window.addEventListener('orientationchange', () => renderer.fit());

let accumulator = 0;
let previous = performance.now();

function render() {
  renderer.clear(game.level?.background ?? '#000000');
  if (game.grid) {
    drawField(renderer, fieldCache, game.grid);
    drawPaddle(renderer, game.paddle);
    drawBalls(renderer, game.balls, game.level.ballColor);
    drawDrops(renderer, game.drops);
    drawShots(renderer, game.shots);
    drawHud(renderer, {
      score: game.score,
      high: game.high,
      lives: game.lives,
      level: game.levelIndex + 1,
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
