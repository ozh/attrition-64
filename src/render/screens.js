import { drawTextCentered } from './hud.js';
import { BASE_W, BASE_H } from '../config.js';

// The only text the game shows beyond the HUD. No commentary, per the design:
// status and prompts only.
export function drawScreens(renderer, game) {
  const { ctx } = renderer;

  // BASE_W/BASE_H, not canvas.width: the context is transformed into
  // backing-pixel space, so device dimensions would overdraw by the scale factor.
  const dim = (alpha) => {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  };

  // Text sits over the level art, which is busy at 3px per block. A solid strip
  // behind it is the difference between readable and not.
  const panel = (top, height) => {
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, top, BASE_W, height);
  };

  // Title and serve share this line, so pressing space does not make the prompt
  // jump — only the bar behind it shrinks. Below the block grid, above the
  // paddle, so the level art stays visible.
  const PROMPT_Y = 288;
  const promptLine = (color) => drawTextCentered(renderer, 'PRESS SPACE OR TAP', PROMPT_Y, color);

  const result = (word) => {
    dim(0.65);
    panel(BASE_H / 2 - 16, 44);
    drawTextCentered(renderer, word, BASE_H / 2 - 12, '#ffffff');
    drawTextCentered(renderer, String(game.score), BASE_H / 2, '#ffffff');
    drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H / 2 + 14, '#8899aa');
  };

  switch (game.state) {
    case 'title':
      dim(0.5);
      panel(PROMPT_Y - 3, 22);
      promptLine('#ffffff');
      drawTextCentered(renderer, `HIGH SCORE ${game.high}`, PROMPT_Y + 9, '#8899aa');
      break;
    case 'serve':
      panel(PROMPT_Y - 3, 11);
      promptLine('#66788a');
      break;
    case 'gameOver':
      result('GAME OVER');
      break;
    case 'win':
      result('CLEARED');
      break;
    case 'error':
      panel(BASE_H / 2 - 8, 22);
      drawTextCentered(renderer, 'NO VALID LEVELS', BASE_H / 2 - 4, '#ff5030');
      drawTextCentered(renderer, 'SEE CONSOLE', BASE_H / 2 + 6, '#8899aa');
      break;
    default:
      break;
  }
}
