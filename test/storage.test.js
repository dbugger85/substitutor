// Older saved teams and share links get the settings added since, without losing their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDefaults, loadTeam } from '../js/storage.js';

test('withDefaults fills in missing settings and keeps the saved ones', () => {
  const team = withDefaults({ v: 1, players: [{ id: 'a', name: 'Ada' }], settings: { fieldSize: 7, perSub: 2 } });
  assert.equal(team.settings.fieldSize, 7);
  assert.equal(team.settings.perSub, 2);
  assert.equal(team.settings.autoSwap, false);
  assert.equal(team.settings.autoSwapSec, 10);
  assert.equal(team.settings.showNext, true);
  assert.equal(team.players.length, 1);
});

test('loadTeam works without storage (an empty team with defaults)', () => {
  const team = loadTeam(); // node has no localStorage: read() returns nothing
  assert.deepEqual(team.players, []);
  assert.equal(team.settings.intervalMin, 5);
});
