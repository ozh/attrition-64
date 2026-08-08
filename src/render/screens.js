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

  const prompt = (top) => {
    panel(top - 3, 22);
    drawTextCentered(renderer, 'PRESS SPACE OR TAP', top, '#ffffff');
    drawTextCentered(renderer, `HI ${game.high}`, top + 9, '#8899aa');
  };

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
      // Below the block grid, above the paddle, so the art stays visible.
      prompt(288);
      break;
    case 'serve':
      panel(BASE_H - 27, 11);
      drawTextCentered(renderer, 'PRESS SPACE OR TAP', BASE_H - 24, '#66788a');
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
