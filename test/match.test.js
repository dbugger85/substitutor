import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/match.js';

const MIN = 60000;
const team = ['GK', 'A', 'B', 'C', 'D', 'E', 'F'].map((name) => ({ id: name, name }));

function newMatch(perSub = 2) {
  // 5 on the field including GK: GK + A, B, C, D. Bench: E, F.
  return M.createMatch(team, { fieldSize: 5, intervalMin: 5, perSub, gkId: 'GK', starterIds: ['A', 'B', 'C', 'D'] }, 0);
}
const status = (m) => Object.fromEntries(m.players.map((p) => [p.id, p.status]));

test('starts with goalkeeper, starters and bench', () => {
  const m = newMatch();
  assert.deepEqual(status(m), { GK: 'gk', A: 'field', B: 'field', C: 'field', D: 'field', E: 'bench', F: 'bench' });
});

test('takes off the most played and brings on the least played, never the GK', () => {
  const m = newMatch();
  const pairs = M.pickSubstitution(m.players, 2, 5 * MIN);
  assert.deepEqual(pairs, [{ offId: 'A', onId: 'E' }, { offId: 'B', onId: 'F' }]);
  M.applySwaps(m, pairs, 5 * MIN);
  assert.deepEqual(status(m), { GK: 'gk', A: 'bench', B: 'bench', C: 'field', D: 'field', E: 'field', F: 'field' });

  // Next time C and D (5 min each so far, now 10) come off, A and B come back.
  const next = M.pickSubstitution(m.players, 2, 10 * MIN);
  assert.deepEqual(next, [{ offId: 'C', onId: 'A' }, { offId: 'D', onId: 'B' }]);
});

test('playing time evens out over a match', () => {
  const m = newMatch(2);
  for (let t = 5 * MIN; t <= 60 * MIN; t += 5 * MIN) {
    M.applySwaps(m, M.pickSubstitution(m.players, 2, t), t);
  }
  const mins = m.players.filter((p) => p.id !== 'GK').map((p) => M.fieldTime(p, 60 * MIN) / MIN);
  assert.ok(Math.max(...mins) - Math.min(...mins) <= 5, `uneven minutes: ${mins}`);
});

test('substitutes no more than the bench has', () => {
  const m = newMatch();
  assert.equal(M.pickSubstitution(m.players, 4, MIN).length, 2);
});

test('no substitution when the bench is empty', () => {
  const m = newMatch();
  M.setStatus(m.players.find((p) => p.id === 'E'), 'out', 0);
  M.setStatus(m.players.find((p) => p.id === 'F'), 'out', 0);
  assert.deepEqual(M.pickSubstitution(m.players, 2, MIN), []);
});

test('pausing stops the clock and playing time', () => {
  const m = newMatch();
  M.pause(m, 2 * MIN);
  assert.equal(M.elapsed(m, 30 * MIN), 2 * MIN);
  M.resume(m, 30 * MIN);
  assert.equal(M.elapsed(m, 31 * MIN), 3 * MIN);
  assert.equal(M.fieldTime(m.players[1], M.elapsed(m, 31 * MIN)), 3 * MIN);
});

test('next substitution is counted from when it was confirmed', () => {
  const m = newMatch();
  M.scheduleNext(m, 6 * MIN); // confirmed 1 minute late
  assert.equal(m.nextSubAt, 11 * MIN);
});

test('swapping the goalkeeper makes the new player goalkeeper', () => {
  const m = newMatch();
  M.applySwaps(m, [{ offId: 'GK', onId: 'E' }], MIN);
  assert.equal(status(m).E, 'gk');
  assert.equal(status(m).GK, 'bench');
});

test('an injured player goes out of the match', () => {
  const m = newMatch();
  M.applySwaps(m, [{ offId: 'C', onId: 'E' }], MIN, 'C');
  assert.equal(status(m).C, 'out');
  assert.equal(status(m).E, 'field');
});

test('make goalkeeper swaps places with the old goalkeeper', () => {
  const m = newMatch();
  M.makeGoalkeeper(m, 'A', MIN);
  assert.equal(status(m).A, 'gk');
  assert.equal(status(m).GK, 'field');
});

test('a late player joins the bench and comes on next', () => {
  const m = newMatch(1);
  M.addPlayer(m, { id: 'Late', name: 'Late' }, 3 * MIN);
  const [pair] = M.pickSubstitution(m.players, 1, 5 * MIN);
  assert.equal(pair.onId, 'E'); // E and F have also played 0 and waited longer
  M.applySwaps(m, [pair], 5 * MIN);
  M.applySwaps(m, M.pickSubstitution(m.players, 1, 10 * MIN), 10 * MIN); // F
  assert.equal(M.pickSubstitution(m.players, 1, 15 * MIN)[0].onId, 'Late');
});

test('invalid swaps are rejected', () => {
  const m = newMatch();
  assert.throws(() => M.applySwaps(m, [{ offId: 'E', onId: 'F' }], MIN));
});
