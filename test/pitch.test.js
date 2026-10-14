import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORTS, COLORS, sportOf, colorOf } from '../js/pitch.js';

test('each sport has a name, lines and a colour that exists', () => {
  for (const sport of Object.values(SPORTS)) {
    assert.ok(sport.name && sport.lines.includes('<'));
    assert.ok(COLORS[sport.color], sport.name);
  }
});

test('football and green unless chosen; a sport brings its own colour', () => {
  assert.equal(sportOf({}), 'football');
  assert.equal(colorOf({}), 'green');
  assert.equal(colorOf({ sport: 'icehockey', pitchColor: null }), 'ice');
  assert.equal(colorOf({ sport: 'icehockey', pitchColor: 'red' }), 'red');
  assert.equal(sportOf({ sport: 'quidditch' }), 'football');
  assert.equal(colorOf({ pitchColor: 'pink' }), 'green');
});
