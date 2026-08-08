// Generates the ten sound effects into assets/sfx/ as 16-bit mono WAV files.
//
//   node tools/gen-sfx.mjs
//
// These are deliberately plain square-wave and noise blips, to sit with the
// pixel art. Replace any file with a recording of your own — the game only
// cares about the filename, and an absent file is silently skipped.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');

// ---------------------------------------------------------------- synthesis

const TAU = Math.PI * 2;
const square = (phase) => (phase % 1 < 0.5 ? 1 : -1);
const triangle = (phase) => 4 * Math.abs((phase % 1) - 0.5) - 1;

/**
 * Seeded noise (mulberry32). Math.random would make the generator
 * non-reproducible, so every regeneration would rewrite explode.wav with
 * identical-sounding but byte-different data — a spurious diff in every PR.
 */
function seededNoise(seed = 0x9e3779b9) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Render `duration` seconds; fn receives (time, progress 0..1) and returns -1..1. */
function render(duration, fn) {
  const count = Math.floor(SR * duration);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = fn(i / SR, i / count);
  return out;
}

/** Phase accumulator for a frequency that changes over time. */
function sweeper(from, to, duration, curve = 1) {
  let phase = 0;
  let last = 0;
  return (t) => {
    const p = Math.min(1, t / duration);
    const freq = from + (to - from) * p ** curve;
    phase += freq * (t - last);
    last = t;
    return phase;
  };
}

const decay = (p, power = 3) => (1 - p) ** power;

/** Two-pole smoothing, so noise reads as a thud rather than a hiss. */
function lowpass(samples, amount = 0.5) {
  const out = new Float32Array(samples.length);
  let a = 0;
  let b = 0;
  for (let i = 0; i < samples.length; i++) {
    a += (samples[i] - a) * amount;
    b += (a - b) * amount;
    out[i] = b;
  }
  return out;
}

function arpeggio(notes, duration, wave = square) {
  const step = duration / notes.length;
  return render(duration, (t, p) => {
    const index = Math.min(notes.length - 1, Math.floor(t / step));
    const local = (t % step) / step;
    return wave(notes[index] * t) * decay(local, 2) * 0.5 * (1 - p * 0.3);
  });
}

// ------------------------------------------------------------------ effects

const EFFECTS = {
  'bounce-wall': () => render(0.05, (t, p) => square(200 * t) * decay(p) * 0.35),

  'bounce-paddle': () => render(0.06, (t, p) => square(320 * t) * decay(p) * 0.4),

  'block-hit': () => render(0.035, (t, p) => triangle(700 * t) * decay(p, 4) * 0.3),

  'block-break': () => {
    const sweep = sweeper(900, 400, 0.07);
    return render(0.07, (t, p) => square(sweep(t)) * decay(p, 2) * 0.35);
  },

  explode: () => {
    const rand = seededNoise();
    const noise = render(0.35, () => rand());
    const shaped = lowpass(noise, 0.22);
    return shaped.map((v, i) => v * decay(i / shaped.length, 2) * 2.2);
  },

  'powerup-catch': () => arpeggio([523, 659, 784], 0.18),

  laser: () => {
    const sweep = sweeper(1400, 300, 0.09, 0.5);
    return render(0.09, (t, p) => square(sweep(t)) * decay(p, 2) * 0.3);
  },

  'life-lost': () => {
    const sweep = sweeper(440, 110, 0.45, 1.5);
    return render(0.45, (t, p) => square(sweep(t)) * decay(p, 1.5) * 0.35);
  },

  'level-clear': () => arpeggio([523, 659, 784, 1047], 0.5, triangle),

  'game-over': () => {
    const sweep = sweeper(240, 60, 0.8, 1.2);
    return render(0.8, (t, p) => {
      const vibrato = 1 + Math.sin(TAU * 6 * t) * 0.02;
      return square(sweep(t) * vibrato) * decay(p, 1.2) * 0.35;
    });
  },
};

// ---------------------------------------------------------------- wav output

function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);          // fmt chunk size
  header.writeUInt16LE(1, 20);           // PCM
  header.writeUInt16LE(1, 22);           // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);      // byte rate
  header.writeUInt16LE(2, 32);           // block align
  header.writeUInt16LE(16, 34);          // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Fade the last few milliseconds to zero so nothing ends on a click. */
function deClick(samples) {
  const fade = Math.min(220, Math.floor(samples.length * 0.1));
  for (let i = 0; i < fade; i++) samples[samples.length - 1 - i] *= i / fade;
  for (let i = 0; i < Math.min(32, samples.length); i++) samples[i] *= i / 32;
  return samples;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(EFFECTS)) {
  const wav = toWav(deClick(Float32Array.from(make())));
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav);
  console.log(`${name}.wav`.padEnd(20), `${(wav.length / 1024).toFixed(1)} KB`);
}
