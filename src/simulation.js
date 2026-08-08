import { blocksAt, damageAt } from './engine/grid.js';
import { detonate } from './engine/explode.js';
import { createBall, stepBall, ballSpeed, setBallAngle } from './engine/ball.js';
import { paddleBox, setPaddleScale, ballHitsPaddle, deflect } from './engine/paddle.js';
import { applyEffect, hasEffect } from './engine/effects.js';
import { rollPowerup, createDrop, stepDrops } from './engine/powerups.js';
import { createShot, stepShots } from './engine/lasers.js';
import * as C from './config.js';

/**
 * One frame of the PLAYING state: balls, block destruction, drops, shots.
 *
 * Split out of game.js, which owns the run lifecycle instead — states, lives,
 * level progression and scoring totals. Everything this module needs from that
 * side arrives as an explicit dependency rather than a shared closure.
 */
export function createSimulation({ game, audio, targetSpeed, scoreMultiplier, onAllBallsLost }) {
  function step(dt, intent) {
    game.laserCooldown = Math.max(0, game.laserCooldown - dt);
    if (intent.action) handleAction();
    stepBalls(dt);
    stepPowerups(dt);
    stepLasers(dt);
  }

  /** Space is overloaded: release a held ball first, otherwise fire. */
  function handleAction() {
    if (game.balls.some((ball) => ball.stuck)) {
      releaseStuck();
      return;
    }
    if (hasEffect(game.effects, 'laser') && game.laserCooldown <= 0) {
      const box = paddleBox(game.paddle);
      game.shots.push(createShot(box.x + 1, box.y), createShot(box.x + box.w - 1, box.y));
      game.laserCooldown = C.LASER_COOLDOWN;
      audio.play('laser');
    }
  }

  function releaseStuck() {
    for (const ball of game.balls) {
      if (!ball.stuck) continue;
      ball.stuck = false;
      setBallAngle(ball, 0, targetSpeed());
      deflect(ball, game.paddle);
    }
  }

  function stepBalls(dt) {
    const speed = targetSpeed();
    const world = {
      isBlocked: (cx, cy) => blocksAt(game.grid, cx, cy),
      onHitCell: hitCell,
      onWall: () => audio.play('bounce-wall'),
    };

    const survivors = [];
    for (const ball of game.balls) {
      // Re-normalise to the current target speed so the ramp and the slow/fast
      // effects apply without accumulating floating-point drift.
      if (!ball.stuck) setBallAngle(ball, Math.atan2(ball.vx, -ball.vy), speed);
      const { drained } = stepBall(ball, dt, world);
      if (drained) continue;

      if (ballHitsPaddle(ball, game.paddle)) {
        ball.y = paddleBox(game.paddle).y - C.BALL_SIZE;
        if (hasEffect(game.effects, 'sticky')) {
          ball.stuck = true;
          ball.stickOffset = ball.x - game.paddle.x;
        } else {
          deflect(ball, game.paddle);
        }
        audio.play('bounce-paddle');
      }
      survivors.push(ball);
    }
    game.balls = survivors;

    if (game.balls.length === 0) onAllBallsLost();
  }

  function hitCell(cx, cy) {
    const hit = damageAt(game.grid, cx, cy);
    if (!hit) return;

    if (!hit.destroyed) {
      audio.play('block-hit');
      return;
    }
    game.score += hit.points * scoreMultiplier();
    audio.play('block-break');
    maybeDrop(hit);

    if (hit.spec?.explode) {
      const blast = detonate(game.grid, cx, cy, hit.spec.explode, hit.spec.chain !== false);
      game.score += blast.points * scoreMultiplier();
      for (const cell of blast.cells) maybeDrop(cell);
      if (blast.cells.length > 0) audio.play('explode');
    }
  }

  function maybeDrop(hit) {
    const kind = rollPowerup(hit.spec);
    if (kind) game.drops.push(createDrop(kind, hit.px, hit.py));
  }

  function stepPowerups(dt) {
    const { drops, caught } = stepDrops(game.drops, dt, game.paddle);
    game.drops = drops;
    for (const kind of caught) {
      audio.play('powerup-catch');
      grantPowerup(kind);
    }
  }

  function grantPowerup(kind) {
    if (kind === 'multiball') {
      splitBalls();
      return;
    }
    applyEffect(game.effects, kind);
    if (kind === 'widePaddle') setPaddleScale(game.paddle, C.WIDE_PADDLE_SCALE);
  }

  function splitBalls() {
    const extra = [];
    for (const ball of game.balls) {
      if (game.balls.length + extra.length >= C.MAX_BALLS) break;
      const angle = Math.atan2(ball.vx, -ball.vy);
      for (const delta of [-C.MULTIBALL_SPREAD, C.MULTIBALL_SPREAD]) {
        if (game.balls.length + extra.length >= C.MAX_BALLS) break;
        extra.push(createBall(ball.x, ball.y, ballSpeed(ball), angle + delta));
      }
    }
    game.balls.push(...extra);
  }

  function stepLasers(dt) {
    const { shots, hits } = stepShots(game.shots, dt, (cx, cy) => blocksAt(game.grid, cx, cy));
    game.shots = shots;
    for (const [cx, cy] of hits) hitCell(cx, cy);
  }

  return { step, hitCell, releaseStuck };
}
