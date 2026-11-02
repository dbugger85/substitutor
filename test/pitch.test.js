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

import { defaultPositions, positionSuggestions, isDefaultLineup } from '../js/pitch.js';
import { guessLayout } from '../js/match.js';
import { POS_NO, POS_NO_SPORT } from '../js/i18n.js';

test('suggested positions: a line-up for every size, each name in its own spot on the field', () => {
  for (const sport of Object.keys(SPORTS)) {
    for (let n = 1; n <= 10; n++) {
      const names = defaultPositions(sport, n);
      if (!names.length && ['handball', 'icehockey', 'floorball'].includes(sport)) continue; // only their own sizes
      assert.equal(names.length, n, `${sport} ${n}`);
      const spots = guessLayout(names, sport).spots.map((p) => `${p.x},${p.y}`);
      assert.equal(new Set(spots).size, n, `${sport} ${n}: no two on the same spot`);
      const no = names.map((x) => POS_NO_SPORT[sport]?.[x] ?? POS_NO[x]);
      assert.ok(no.every(Boolean), `${sport} ${n}: Norwegian for every name`);
      assert.equal(JSON.stringify(guessLayout(no, sport).spots), JSON.stringify(guessLayout(names, sport).spots), `${sport} ${n}: Norwegian names go to the same spots`);
    }
  }
});

test('suggested positions: the dropdown has the sport’s own names first', () => {
  assert.equal(positionSuggestions('icehockey')[0], 'Defence');
  assert.ok(!positionSuggestions('icehockey').includes('Striker'));
  assert.ok(positionSuggestions('bandy').includes('Striker'));
  assert.deepEqual(defaultPositions('icehockey', 5), ['Left defence', 'Right defence', 'Left wing', 'Centre', 'Right wing']);
  assert.equal(new Set(positionSuggestions('football')).size, positionSuggestions('football').length);
});

test('a suggested line-up may be replaced, names the coach typed are kept', () => {
  assert.ok(isDefaultLineup([]));
  assert.ok(isDefaultLineup(['', ' ']));
  assert.ok(isDefaultLineup(['Left back', 'Right back', 'Left forward', 'Right forward']));
  assert.ok(isDefaultLineup(['Venstre back', 'Høyre back', 'Venstre spiss', 'Høyre spiss'], (x) => POS_NO[x]));
  assert.ok(!isDefaultLineup(['Left back', 'Right back', 'Left forward', 'Emil’s spot']));
  assert.ok(!isDefaultLineup(['Keeper helper']));
});
