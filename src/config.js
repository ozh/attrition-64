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
export const BALL_SPEED = 50;          // cells per second
export const BALL_SPEED_RAMP = 0.25;   // +25% by the time the grid is cleared

// The ball also speeds up the longer a life lasts, so stalling costs something
// and three lives are three attempts rather than three goes at the same one.
// Applied continuously, not in steps: a jump every 15 seconds reads as a glitch
// with no visible cause. The cap only exists so the ball stays playable if
// someone digs in for ten minutes.
//
// This compounds with BALL_SPEED_RAMP above — a nearly-cleared grid three
// minutes in runs at roughly 1.25 x 1.27, about +59%.
export const TIME_ACCEL_STEP = 0.02;     // +2% ...
export const TIME_ACCEL_SECONDS = 15;    // ... every 15 seconds of play
export const TIME_ACCEL_MAX = 2.5;         // never faster than 2,5 initial speed
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
export const POWERUP_KINDS = [
  'multiball', 'widePaddle', 'slowBall', 'fastBall', 'sticky', 'laser', 'piercing', 'shield',
];
// Kinds that fire once instead of running on a timer, so they carry no duration.
export const INSTANT_POWERUPS = ['multiball', 'shield', 'piercing'];
export const DROP_SPEED = 20;          // cells per second
export const DROP_SIZE = 1;
export const EFFECT_DURATION = { widePaddle: 15, slowBall: 12, fastBall: 12, sticky: 12, laser: 12 };

// Piercing lasts one round trip — up, and back down to the paddle — rather than
// a number of seconds. A timer would be worth wildly different amounts at
// different ball speeds, and it could expire while the ball sits *inside* the
// block mass, where the collision resolver would snap it somewhere arbitrary.
// Ending on paddle contact always ends it in open space.
export const WIDE_PADDLE_SCALE = 1.5;
export const SLOW_BALL_MUL = 0.7;
export const FAST_BALL_MUL = 1.4;
export const FAST_BALL_SCORE_MUL = 2;
export const MULTIBALL_SPREAD = 25 * Math.PI / 180;
export const LASER_SPEED = 80;
export const LASER_COOLDOWN = 0.3;

// The shield is a one-shot floor: it saves a single draining ball and is spent.
// Held rather than timed, so it is worth catching early and keeping.
// One row above the drain. DRAIN_ROW - 2 would land exactly on PADDLE_BOTTOM.
export const SHIELD_ROW = DRAIN_ROW - 1;
export const SHIELD_BOUNCE_ANGLE = Math.PI / 5;

// Endgame relief.
//
// The last blocks of a level are isolated stragglers, and clearing them is
// mostly waiting for the ball to travel. Below each threshold — a fraction of
// the level's starting block count — a powerup drops from the top of the
// playfield on the matching cadence, and the cadence tightens as the grid
// empties. Guaranteed rather than rolled: a coin flip on a 25-second timer can
// leave a minute of nothing, which is the tedium this exists to end.
//
// Ordered loosest first; the tightest matching tier wins.
export const ENDGAME_RELIEF = [
  { remaining: 0.04, everySeconds: 25 },
  { remaining: 0.02, everySeconds: 15 },
  { remaining: 0.01, everySeconds: 8 },
];
// A drop appearing from nowhere reads as a bug, so the spawn point flashes.
export const RELIEF_FLASH_SECONDS = 0.4;
export const RELIEF_FLASH_WIDTH = 4;     // cells

// Level authoring
export const EMPTY_CHARS = '. ';
export const DEFAULT_POINTS_PER_HP = 10;

// Persistence
export const STORAGE_PREFIX = 'attrition64:';
export const KEY_HIGHSCORE = 'highscore';
export const KEY_MUTED = 'muted';

// Audio
export const SFX_PATH = 'assets/sfx/';
export const SFX_NAMES = [
  'bounce-wall', 'bounce-paddle', 'block-hit', 'block-break', 'explode',
  'powerup-catch', 'laser', 'life-lost', 'level-clear', 'game-over', 'shield-save',
];
export const SFX_POOL_SIZE = 4;
export const SFX_RETRIGGER_MS = 12;    // collapses a mass break into one sound
