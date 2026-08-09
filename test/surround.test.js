import test from 'node:test';
import assert from 'node:assert/strict';
import { surroundColor } from '../src/render/surround.js';

const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

test('the result is always a valid six-digit hex colour', () => {
  for (const bg of ['#000000', '#ffffff', '#02101c', '#111000', '#abc', '#7f7f7f']) {
    assert.match(surroundColor(bg), /^#[0-9a-f]{6}$/, `for ${bg}`);
  }
});

test('it never hands back the colour it was given', () => {
  // The whole point is an edge around the canvas. Returning the level's own
  // background would leave the playfield with no visible boundary.
  for (const bg of ['#000000', '#ffffff', '#02101c', '#111000', '#0c0410', '#808080']) {
    assert.notEqual(surroundColor(bg).toLowerCase(), bg.toLowerCase(), `for ${bg}`);
  }
});

test('dark backgrounds are lifted', () => {
  for (const bg of ['#000000', '#02101c', '#111000', '#0c0410']) {
    assert.ok(luma(parse(surroundColor(bg))) > luma(parse(bg)), `${bg} should lift`);
  }
});

test('light backgrounds are dropped instead of clamping to themselves', () => {
  // A fixed lift would saturate at white and return #ffffff for #ffffff.
  for (const bg of ['#ffffff', '#f0f0f0', '#e8f6ff']) {
    assert.ok(luma(parse(surroundColor(bg))) < luma(parse(bg)), `${bg} should drop`);
  }
});

test('the surround stays in the family of the level colour', () => {
  const blue = parse(surroundColor('#02101c'));
  assert.ok(blue[2] > blue[0], 'a blue background keeps a blue surround');

  const warm = parse(surroundColor('#111000'));
  assert.ok(warm[0] > warm[2], 'a warm background keeps a warm surround');
});

test('black lifts to something visible but still dark', () => {
  const grey = parse(surroundColor('#000000'));
  assert.ok(luma(grey) > 12, 'not so subtle it is invisible');
  assert.ok(luma(grey) < 60, 'not so bright it competes with the game');
});

test('anything unparseable falls back rather than throwing', () => {
  for (const bad of [undefined, null, '', 'black', '#12345', 42, {}]) {
    assert.match(surroundColor(bad), /^#[0-9a-f]{6}$/, `for ${JSON.stringify(bad)}`);
  }
});
