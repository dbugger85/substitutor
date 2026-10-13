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

test('a long-time goalkeeper who moves out to the field is not taken off straight away', () => {
  const m = newMatch(1);
  // Goalkeeper for the first 20 minutes, then A takes over in goal.
  M.makeGoalkeeper(m, 'A', 20 * MIN);
  assert.equal(status(m).GK, 'field');
  // At 25 min the old goalkeeper has the most total time (25 min) but has
  // only been out on the field for 5, so B (25 min on, since kick-off) goes off.
  const [pair] = M.pickSubstitution(m.players, 1, 25 * MIN);
  assert.equal(pair.offId, 'B');
  assert.equal(pair.onId, 'E');
});

test('the player who waited longest on the bench comes on', () => {
  const m = newMatch(1);
  M.applySwaps(m, [{ offId: 'A', onId: 'E' }], 5 * MIN); // A to the bench at 5 min (F has waited since 0)
  assert.deepEqual(M.rankOn(m.players, 10 * MIN).map((p) => p.id), ['F', 'A']);
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

test('players who played least last match start the next one', () => {
  const m = newMatch(2);
  M.applySwaps(m, M.pickSubstitution(m.players, 2, 5 * MIN), 5 * MIN); // A, B off; E, F on
  const minutes = M.minutesPlayed(m, 8 * MIN);
  assert.deepEqual(minutes, { GK: 8 * MIN, A: 5 * MIN, B: 5 * MIN, C: 8 * MIN, D: 8 * MIN, E: 3 * MIN, F: 3 * MIN });

  // Same goalkeeper: E and F (3 min) start, then A and B (5 min).
  assert.deepEqual(M.suggestStarters(team, minutes, 'GK', 4), ['E', 'F', 'A', 'B']);
  // New goalkeeper C: the old GK played the whole match, so they rest.
  assert.deepEqual(M.suggestStarters(team, minutes, 'C', 4), ['E', 'F', 'A', 'B']);
  // A new player who wasn't in last match counts as 0 minutes and starts.
  const bigger = [...team, { id: 'N', name: 'N' }];
  assert.deepEqual(M.suggestStarters(bigger, minutes, 'GK', 2), ['N', 'E']);
});

// Positions: GK + 4 outfield spots
function positionMatch() {
  return M.createMatch(team, {
    fieldSize: 5, intervalMin: 5, perSub: 1, gkId: 'GK', starterIds: ['A', 'B', 'C', 'D'],
    usePositions: true, positions: ['LB', 'RB', '', 'FW'], posIds: ['D', 'C', 'B', 'A'],
  }, 0);
}
const spots = (m) => Object.fromEntries(m.players.filter((p) => p.pos != null).map((p) => [m.settings.positions[p.pos], p.id]));

test('positions: starters get their chosen spots, and empty names get a default', () => {
  const m = positionMatch();
  assert.deepEqual(m.settings.positions, ['LB', 'RB', 'Position 3', 'FW']);
  assert.deepEqual(spots(m), { LB: 'D', RB: 'C', 'Position 3': 'B', FW: 'A' });
  assert.equal(M.positionName(m, m.players[0]), null); // the goalkeeper has no spot
});

test('positions: no positions unless switched on', () => {
  const m = newMatch();
  assert.equal(m.settings.positions, undefined);
  assert.ok(m.players.every((p) => !('pos' in p)));
});

test('positions: the player coming on takes the spot of who went off', () => {
  const m = positionMatch();
  M.applySwaps(m, [{ offId: 'C', onId: 'E' }], MIN);
  assert.equal(spots(m).RB, 'E');
  const c = m.players.find((p) => p.id === 'C');
  assert.equal(c.pos, null);
  assert.equal(M.lastPositionName(m, c), 'RB'); // shown on the bench
});

test('positions: two players can swap', () => {
  const m = positionMatch();
  M.swapPositions(m, 'A', 'D');
  assert.deepEqual(spots(m), { LB: 'A', RB: 'C', 'Position 3': 'B', FW: 'D' });
});

test('positions: the old goalkeeper takes the new goalkeeper\'s spot', () => {
  const m = positionMatch();
  M.makeGoalkeeper(m, 'B', MIN);
  assert.equal(spots(m)['Position 3'], 'GK');
  const b = m.players.find((p) => p.id === 'B');
  assert.equal(b.pos, null);
  // If B later goes to the bench, they last played in goal.
  M.applySwaps(m, [{ offId: 'B', onId: 'E' }], 2 * MIN);
  assert.equal(M.lastPositionName(m, b), 'GK');
  assert.equal(M.lastPositionName(m, m.players.find((p) => p.id === 'F')), null); // never played
});

test('positions: an injured player\'s spot is filled when someone is put on', () => {
  const m = positionMatch();
  M.setStatus(m.players.find((p) => p.id === 'A'), 'out', MIN);
  M.fillSpots(m);
  assert.equal(spots(m).FW, undefined);
  M.setStatus(m.players.find((p) => p.id === 'F'), 'field', 2 * MIN);
  M.fillSpots(m);
  assert.equal(spots(m).FW, 'F');
});

test('positions: setup keeps earlier choices and fills the gaps', () => {
  assert.deepEqual(M.assignSpots(['A', 'B', 'C'], ['C', 'X', 'A'], 3), ['C', 'B', 'A']);
  assert.deepEqual(M.assignSpots(['A'], [], 3), ['A', null, null]);
});
