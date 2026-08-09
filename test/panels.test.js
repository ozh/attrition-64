import test from 'node:test';
import assert from 'node:assert/strict';
import { WELCOME, FAREWELL, panelWidth } from '../src/render/panels.js';
import { glyph, textWidth } from '../src/render/hud.js';
import { BASE_W } from '../src/config.js';

const TOFU = [7, 5, 5, 5, 7];
const PANELS = { WELCOME, FAREWELL };
const FOOTER = 'HIGH SCORE 999999 - PRESS SPACE OR TAP';

test('every character in the panel copy exists in the font', () => {
  // A missing glyph does not throw — it renders as the unknown box. Copy is the
  // easiest place to introduce one by accident: an em dash, a slash, a bracket.
  for (const [name, panel] of Object.entries(PANELS)) {
    for (const line of [panel.title, ...panel.lines, FOOTER]) {
      for (const ch of line) {
        if ('0O'.includes(ch.toUpperCase())) continue;   // legitimately that shape
        assert.notDeepEqual(glyph(ch), TOFU,
          `${name}: '${ch}' (U+${ch.codePointAt(0).toString(16).toUpperCase()}) in "${line}"`);
      }
    }
  }
});

test('no panel is wider than the screen', () => {
  for (const [name, panel] of Object.entries(PANELS)) {
    const width = panelWidth(panel, FOOTER);
    assert.ok(width <= BASE_W, `${name} is ${width}px wide, screen is ${BASE_W}px`);
  }
});

test('body lines stay narrower than the heading is tall enough to carry', () => {
  // Purely a readability guard: this font has no lowercase, and long all-caps
  // lines are where it stops being comfortable to read.
  for (const [name, panel] of Object.entries(PANELS)) {
    for (const line of panel.lines) {
      assert.ok(line.length <= 40, `${name}: "${line}" is ${line.length} characters`);
    }
  }
});

test('panels keep their blank separator lines', () => {
  // The blanks are the only paragraph breaks the layout has.
  for (const [name, panel] of Object.entries(PANELS)) {
    assert.ok(panel.lines.includes(''), `${name} has no blank line to break it up`);
  }
});
