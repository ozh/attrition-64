// Geometry — all distances are in playfield cells unless named *_PX.
export const CELL = 4;                 // backing-store pixels per cell
export const FIELD_W = 64;             // playfield width in cells
export const FIELD_H = 100;            // playfield height in cells
export const BASE_W = FIELD_W * CELL;  // 256
export const BASE_H = FIELD_H * CELL;  // 400
export const BLOCK_PX = 3;             // drawn size inside a 4px cell; the 1px remainder is the grid gap

export const HUD_ROWS = 5;             // rows 0-4
export const GRID_TOP = 5;             // playfield row of authored grid row 0
export const GRID_ROWS = 64;
export const GRID_COLS = 64;
export const CEILING = HUD_ROWS;       // ball bounces here, never enters the HUD
export const PADDLE_BAND_TOP = 90;
export const PADDLE_BOTTOM = 98;       // playfield row just past the paddle's bottom edge
export const DRAIN_ROW = 100;          // a ball whose top passes this is lost

// Ball
export const BALL_SIZE = 1;            // AABB side, in cells
export const BALL_SPEED = 42;          // cells per second
export const BALL_SPEED_RAMP = 0.25;   // +25% by the time the grid is cleared
export const BALL_MAX_ANGLE = Math.PI / 3;   // 60 degrees off vertical
export const SERVE_ANGLE = Math.PI / 8;
export const STEP = 1 / 120;           // fixed physics timestep, seconds
export const MAX_STEPS_PER_FRAME = 8;  // spiral-of-death guard
export const MAX_SUBSTEP_DIST = 0.5;   // cells; below 1 so the ball cannot tunnel

// Paddle
export const PADDLE_SPEED = 60;        // cells per second, keyboard
export const PADDLE_MIN_W = 10;
export const PADDLE_MAX_W = 24;
export const PADDLE_MAX_H = 8;
export const PADDLE_GRID_MAX_ROWS = 48;
export const PADDLE_GRID_MAX_COLS = 64;

// Run
export const LIVES = 3;
export const MAX_BALLS = 9;
export const LIFE_LOST_HOLD = 1.0;     // seconds
export const LEVEL_CLEAR_HOLD = 1.5;

// Powerups
export const POWERUP_KINDS = ['multiball', 'widePaddle', 'slowBall', 'fastBall', 'sticky', 'laser'];
export const DROP_SPEED = 20;          // cells per second
export const DROP_SIZE = 1;
export const EFFECT_DURATION = { widePaddle: 15, slowBall: 12, fastBall: 12, sticky: 12, laser: 12 };
export const WIDE_PADDLE_SCALE = 1.5;
export const SLOW_BALL_MUL = 0.7;
export const FAST_BALL_MUL = 1.4;
export const FAST_BALL_SCORE_MUL = 2;
export const MULTIBALL_SPREAD = 25 * Math.PI / 180;
export const LASER_SPEED = 80;
export const LASER_COOLDOWN = 0.3;

// Level authoring
export const EMPTY_CHARS = '. ';
export const DEFAULT_POINTS_PER_HP = 10;

// Persistence
export const STORAGE_PREFIX = 'lungs:';
export const KEY_HIGHSCORE = 'highscore';
export const KEY_MUTED = 'muted';

// Audio
export const SFX_PATH = 'assets/sfx/';
export const SFX_NAMES = [
  'bounce-wall', 'bounce-paddle', 'block-hit', 'block-break', 'explode',
  'powerup-catch', 'laser', 'life-lost', 'level-clear', 'game-over',
];
export const SFX_POOL_SIZE = 4;
export const SFX_RETRIGGER_MS = 12;    // collapses a mass break into one sound
