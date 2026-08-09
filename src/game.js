import { createGrid, isCleared } from './engine/grid.js';
import { createBall, setBallAngle } from './engine/ball.js';
import { createPaddle, paddleBox, movePaddle, setPaddleCenter, setPaddleScale } from './engine/paddle.js';
import { createEffects, tickEffects, hasEffect, clearEffects } from './engine/effects.js';
import { createSimulation } from './simulation.js';
import { createRelief } from './engine/relief.js';
import { timeSpeedFactor } from './engine/speed.js';
import * as C from './config.js';

export const NEUTRAL_INTENT = {
  moveDir: 0, pointerCenter: null, dragDelta: 0, action: false, mute: false,
};

/**
 * The run: states, lives, level progression, scoring totals.
 * Per-frame world stepping lives in simulation.js.
 */
export function createGame({ levels, storage, audio, random = Math.random }) {
  const game = {
    state: levels.length ? 'title' : 'error',
    score: 0,
    high: storage.getNumber(C.KEY_HIGHSCORE, 0),
    lives: C.LIVES,
    levelIndex: 0,
    level: null,
    grid: null,
    paddle: null,
    balls: [],
    drops: [],
    shots: [],
    effects: createEffects(),
    relief: createRelief(),
    flashes: [],
    shield: false,
    piercing: false,
    piercingArmed: false,
    hold: 0,
    playTime: 0,
    initialBlocks: 1,
    laserCooldown: 0,
    update,
    // Test seams. They mutate the same state the game does, nothing more.
    hitCell: (cx, cy) => sim.hitCell(cx, cy),
    clearGridForTest() { game.grid.remaining = 0; },
    endRunForTest: endRun,
  };

  const clearedFraction = () => 1 - game.grid.remaining / game.initialBlocks;

  function targetSpeed() {
    const ramp = 1 + C.BALL_SPEED_RAMP * clearedFraction();
    const effect = hasEffect(game.effects, 'slowBall') ? C.SLOW_BALL_MUL
      : hasEffect(game.effects, 'fastBall') ? C.FAST_BALL_MUL : 1;
    return C.BALL_SPEED * ramp * effect * timeSpeedFactor(game.playTime);
  }

  const scoreMultiplier = () => (hasEffect(game.effects, 'fastBall') ? C.FAST_BALL_SCORE_MUL : 1);

  const sim = createSimulation({
    game, audio, targetSpeed, scoreMultiplier, clearedFraction, random,
    onAllBallsLost: loseLife,
  });

  function loadLevel(index) {
    game.level = levels[index];
    game.grid = createGrid(game.level);
    game.paddle = createPaddle(game.level);
    game.initialBlocks = Math.max(1, game.grid.remaining);
    resetForServe();
  }

  function resetForServe() {
    clearEffects(game.effects);
    setPaddleScale(game.paddle, 1);
    setPaddleCenter(game.paddle, C.FIELD_W / 2);
    game.drops = [];
    game.shots = [];
    game.flashes = [];
    game.relief = createRelief();
    game.shield = false;
    game.piercing = false;
    game.piercingArmed = false;
    game.playTime = 0;
    game.laserCooldown = 0;

    const box = paddleBox(game.paddle);
    const ball = createBall(box.x + box.w / 2 - C.BALL_SIZE / 2, box.y - C.BALL_SIZE, targetSpeed(), 0);
    ball.stuck = true;
    ball.stickOffset = ball.x - game.paddle.x;
    game.balls = [ball];
    game.state = 'serve';
  }

  function update(dt, intent) {
    if (game.state === 'error') return;
    if (intent.mute) audio.toggleMute();

    switch (game.state) {
      case 'title':
        if (intent.action) startRun();
        break;
      case 'serve':
        steer(intent, dt);
        followPaddle();
        if (intent.action) launch();
        break;
      case 'playing':
        // Only while a ball is actually live: holds and menus are not stalling.
        game.playTime += dt;
        steer(intent, dt);
        expireEffects(dt);
        followPaddle();
        sim.step(dt, intent);
        checkCleared();
        break;
      case 'lifeLost':
      case 'levelClear':
        game.hold -= dt;
        if (game.hold <= 0) (game.state === 'lifeLost' ? afterLifeLost : afterLevelClear)();
        break;
      case 'gameOver':
      case 'win':
        if (intent.action) game.state = 'title';
        break;
      default:
        break;
    }
  }

  function startRun() {
    game.score = 0;
    game.lives = C.LIVES;
    game.levelIndex = 0;
    loadLevel(0);
  }

  function steer(intent, dt) {
    if (intent.moveDir) movePaddle(game.paddle, intent.moveDir, dt);
    if (intent.pointerCenter !== null) setPaddleCenter(game.paddle, intent.pointerCenter);
    if (intent.dragDelta) {
      setPaddleCenter(game.paddle, game.paddle.x + paddleBox(game.paddle).w / 2 + intent.dragDelta);
    }
  }

  function expireEffects(dt) {
    for (const kind of tickEffects(game.effects, dt)) {
      if (kind === 'widePaddle') setPaddleScale(game.paddle, 1);
      if (kind === 'sticky') sim.releaseStuck();
    }
  }

  function followPaddle() {
    const box = paddleBox(game.paddle);
    for (const ball of game.balls) {
      if (!ball.stuck) continue;
      ball.x = Math.min(Math.max(game.paddle.x + ball.stickOffset, 0), C.FIELD_W - C.BALL_SIZE);
      ball.y = box.y - C.BALL_SIZE;
    }
  }

  function launch() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    for (const ball of game.balls) {
      ball.stuck = false;
      setBallAngle(ball, direction * C.SERVE_ANGLE, targetSpeed());
    }
    game.state = 'playing';
  }

  function checkCleared() {
    if (game.state !== 'playing' || !isCleared(game.grid)) return;
    audio.play('level-clear');
    game.state = 'levelClear';
    game.hold = C.LEVEL_CLEAR_HOLD;
  }

  function loseLife() {
    game.lives -= 1;
    audio.play('life-lost');
    game.state = 'lifeLost';
    game.hold = C.LIFE_LOST_HOLD;
  }

  function afterLifeLost() {
    if (game.lives <= 0) {
      audio.play('game-over');
      endRun();
      game.state = 'gameOver';
      return;
    }
    resetForServe();      // block damage is deliberately not reset
  }

  function afterLevelClear() {
    game.levelIndex += 1;
    if (game.levelIndex >= levels.length) {
      endRun();
      game.state = 'win';
      return;
    }
    loadLevel(game.levelIndex);
  }

  function endRun() {
    if (game.score > game.high) {
      game.high = game.score;
      storage.setNumber(C.KEY_HIGHSCORE, game.high);
    }
  }

  // Load the first level immediately so its art sits behind the title screen.
  // Otherwise the title is a bare black rectangle and the game's only visual
  // idea stays hidden until the player commits to a run.
  if (levels.length) {
    loadLevel(0);
    game.state = 'title';
  }

  return game;
}
