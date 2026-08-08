import test from 'node:test';
import assert from 'node:assert/strict';
import { clientXToCell } from '../src/input.js';
import { FIELD_W } from '../src/config.js';

const rect = { left: 100, width: 512 };

test('the left edge of the canvas maps to cell 0', () => {
  assert.equal(clientXToCell(100, rect), 0);
});

test('the right edge maps to the field width', () => {
  assert.equal(clientXToCell(612, rect), FIELD_W);
});

test('the centre maps to the middle of the field', () => {
  assert.equal(clientXToCell(356, rect), FIELD_W / 2);
});

test('the canvas offset on the page is accounted for', () => {
  assert.equal(clientXToCell(100, { left: 0, width: 512 }), FIELD_W * (100 / 512));
});

test('a zero-width rect does not produce NaN', () => {
  assert.equal(clientXToCell(50, { left: 0, width: 0 }), 0);
});
