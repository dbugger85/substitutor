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

test('positions: swapping with the goalkeeper puts the other player in goal', () => {
  const m = positionMatch();
  const gk = m.players.find((p) => p.status === 'gk').id;
  M.swapPositions(m, gk, 'B', MIN);
  assert.equal(m.players.find((p) => p.id === 'B').status, 'gk');
  assert.equal(spots(m)['Position 3'], 'GK');
  M.swapPositions(m, 'A', 'B', 2 * MIN); // either way round
  assert.equal(m.players.find((p) => p.id === 'A').status, 'gk');
  assert.equal(m.players.find((p) => p.id === 'B').status, 'field');
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

test('field view: default layout puts every spot on the field, in rows of up to three', () => {
  for (let n = 1; n <= 10; n++) {
    const { gk, spots } = M.defaultLayout(n);
    assert.equal(spots.length, n);
    for (const s of [gk, ...spots]) assert.ok(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1);
    assert.ok(new Set(spots.map((s) => s.y)).size === Math.ceil(n / 3), `rows for ${n}`);
  }
  assert.deepEqual(M.defaultLayout(4).spots.map((s) => s.y), [0.68, 0.68, 0.18, 0.18]);
});

test('field view: saved places are kept, new or renamed spots get a guess', () => {
  const names = ['One', 'Two', 'Three'];
  let saved = M.placeSpot(undefined, names, 0, { x: 0.1, y: 0.2 });
  saved = M.placeSpot(saved, names, 'gk', { x: 0.4, y: 0.9 });
  const layout = M.layoutFor(saved, names);
  assert.deepEqual(layout.spots[0], { x: 0.1, y: 0.2 });
  assert.deepEqual(layout.spots[1], M.defaultLayout(3).spots[1]);
  assert.deepEqual(layout.gk, { x: 0.4, y: 0.9 });
  assert.deepEqual(M.layoutFor(saved, ['Spiss', 'Two', 'Three']).spots[0], M.guessLayout(['Spiss', 'Two', 'Three']).spots[0]);
  assert.deepEqual(M.layoutFor(JSON.parse(JSON.stringify(saved)), names).spots[0], { x: 0.1, y: 0.2 });
});

test('field view: guesses where positions go from their names', () => {
  const place = (n) => M.guessPlace(n);
  assert.deepEqual(place('Spiss'), { depth: 'front', side: null });
  assert.deepEqual(place('Høyre back'), { depth: 'back', side: 'right' });
  assert.deepEqual(place('venstreback'), { depth: 'back', side: 'left' });
  assert.deepEqual(place('V. kant'), { depth: 'wing', side: 'left' });
  assert.deepEqual(place('HK'), { depth: 'wing', side: 'right' });
  assert.deepEqual(place('Midtstopper'), { depth: 'back', side: null });
  assert.deepEqual(place('Sentral midtbane'), { depth: 'mid', side: null });
  assert.deepEqual(place('LB'), { depth: 'back', side: 'left' });
  assert.deepEqual(place('Right wing'), { depth: 'wing', side: 'right' });
  assert.deepEqual(place('CDM'), { depth: 'dm', side: null });
  assert.deepEqual(place('Centre forward'), { depth: 'front', side: null });
  assert.deepEqual(place('Wingback'), { depth: 'back', side: null });
  assert.deepEqual(place('Anna'), { depth: null, side: null });
});

test('field view: a guessed layout has the front on top, sides apart, and no two spots on top of each other', () => {
  const { spots } = M.guessLayout(['Venstre back', 'Høyre back', 'Midtbane', 'Venstre kant', 'Høyre kant', 'Spiss']);
  const [vb, hb, mb, vk, hk, sp] = spots;
  assert.ok(vb.x < hb.x && vb.y === hb.y);
  assert.ok(sp.y < vk.y && vk.y < mb.y && mb.y < vb.y);
  assert.ok(vk.x < mb.x && mb.x < hk.x);
  // Two centre backs side by side, and names it can't read go in the middle
  const two = M.guessLayout(['Back', 'Back', 'Spiss', 'Anna']).spots;
  assert.ok(two[0].x < two[1].x && two[0].y === two[1].y);
  assert.equal(two[3].y, M.guessLayout(['Midt']).spots[0].y);
  for (let n = 3; n <= 7; n++) {
    const names = ['Back', 'Back', 'Midt', 'Midt', 'Midt', 'Spiss', 'Spiss'].slice(0, n);
    const all = M.guessLayout(names).spots;
    assert.equal(new Set(all.map((s) => `${s.x},${s.y}`)).size, n, `overlap with ${n}`);
  }
  // Nothing it can read: the plain rows
  assert.deepEqual(M.guessLayout(['Position 1', 'Position 2']), M.defaultLayout(2));
});

test('settings during a match: positions on, renamed, off and on again', () => {
  const players = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: name, name }));
  const match = M.createMatch(players, { fieldSize: 4, intervalMin: 5, perSub: 1, gkId: 'A', starterIds: ['B', 'C', 'D'] });
  assert.equal(match.settings.positions, undefined);
  M.setPositions(match, true, ['Spiss', '', 'Back']);
  assert.deepEqual(match.settings.positions, ['Spiss', 'Position 2', 'Back']);
  assert.deepEqual(['B', 'C', 'D'].map((id) => match.players.find((p) => p.id === id).pos), [0, 1, 2]);
  M.renamePosition(match, 1, 'Midt ');
  assert.equal(M.positionName(match, match.players[2]), 'Midt');
  M.renamePosition(match, 1, '');
  assert.equal(match.settings.positions[1], 'Position 2');
  // Off: no tags. A swap meanwhile, then on again: the new player gets the free spot
  M.setPositions(match, false);
  assert.equal(M.positionName(match, match.players[1]), null);
  M.applySwaps(match, [{ offId: 'C', onId: 'E' }], 1000);
  M.setPositions(match, true, ['X', 'Y', 'Z']);
  assert.deepEqual(match.settings.positions, ['X', 'Y', 'Z']);
  assert.deepEqual(['B', 'E', 'D'].map((id) => match.players.find((p) => p.id === id).pos), [0, 1, 2]);
  assert.equal(match.players.find((p) => p.id === 'C').pos, null);
});

test('settings during a match: a new interval waits for the next substitution', () => {
  const players = ['A', 'B', 'C'].map((name) => ({ id: name, name }));
  const match = M.createMatch(players, { fieldSize: 2, intervalMin: 5, perSub: 1, gkId: 'A', starterIds: ['B'] }, 0);
  M.setIntervalMin(match, 2.5);
  assert.equal(match.settings.intervalMs, 150000);
  assert.equal(match.nextSubAt, 300000);
  M.scheduleNext(match, 60000);
  assert.equal(match.nextSubAt, 60000 + 150000);
});

test('field view: position names follow the sport', () => {
  assert.deepEqual(M.guessPlace('Venstre back', 'handball'), { depth: 'mid', side: 'left' });
  assert.deepEqual(M.guessPlace('Høyre fløy', 'handball'), { depth: 'front', side: 'right' });
  assert.deepEqual(M.guessPlace('Strek', 'handball'), { depth: 'front', side: null });
  assert.deepEqual(M.guessPlace('C', 'icehockey'), { depth: 'front', side: null });
  assert.deepEqual(M.guessPlace('LD', 'icehockey'), { depth: 'back', side: 'left' });
  assert.deepEqual(M.guessPlace('Center', 'floorball'), { depth: 'mid', side: null });
  assert.deepEqual(M.guessPlace('Fixo', 'futsal'), { depth: 'back', side: null });
  assert.deepEqual(M.guessPlace('Halvback', 'bandy'), { depth: 'dm', side: null });
  // Football is the default, where a back defends
  assert.deepEqual(M.guessPlace('Venstre back'), { depth: 'back', side: 'left' });
  const names = ['Venstre back', 'Strek'];
  assert.ok(M.layoutFor({}, names, 'handball').spots[0].y < M.layoutFor({}, names).spots[0].y);
});

test('the next swaps are the suggestion until the coach chooses them', () => {
  const m = newMatch(2);
  assert.deepEqual(M.nextSwaps(m, MIN), M.pickSubstitution(m.players, 2, MIN));
  m.plan = [{ offId: 'D', onId: 'F' }];
  assert.deepEqual(M.nextSwaps(m, MIN), [{ offId: 'D', onId: 'F' }]);
});

test('a chosen swap that no longer works is replaced by the next suggestion', () => {
  const m = newMatch(2);
  m.plan = [{ offId: 'D', onId: 'F' }, { offId: 'C', onId: 'E' }];
  // E comes on for B by hand: the second pair can't happen, the others stay
  M.applySwaps(m, [{ offId: 'B', onId: 'E' }], 2 * MIN);
  // Next suggestion not using D or F: A off (on longest), and B, who just went off, is the only one left on the bench
  assert.deepEqual(M.nextSwaps(m, 3 * MIN), [{ offId: 'D', onId: 'F' }, { offId: 'A', onId: 'B' }]);
});

test('correcting the match time moves everyone’s time but not the countdown, and not back past the last change', () => {
  const m = newMatch(1);
  // The clock was started 2 minutes late
  assert.equal(M.setElapsed(m, 3 * MIN, MIN), 3 * MIN);
  assert.equal(M.elapsed(m, MIN), 3 * MIN);
  assert.equal(M.fieldTime(m.players.find((p) => p.id === 'A'), 3 * MIN), 3 * MIN);
  assert.equal(m.nextSubAt - M.elapsed(m, MIN), 4 * MIN); // still 4 of the 5 minutes left
  // A swap at 4 min: the clock can't go back before it
  M.applySwaps(m, [{ offId: 'A', onId: 'E' }], 4 * MIN);
  assert.equal(M.setElapsed(m, 1 * MIN, 2 * MIN), 4 * MIN);
  assert.equal(M.elapsed(m, 2 * MIN), 4 * MIN);
});

test('half time stops the clock, and the next half starts with a full countdown', () => {
  const m = newMatch(1);
  M.startBreak(m, 20 * MIN);
  assert.ok(M.onBreak(m));
  assert.ok(!M.isRunning(m));
  assert.equal(M.elapsed(m, 30 * MIN), 20 * MIN);
  M.endBreak(m, 30 * MIN);
  assert.ok(!M.onBreak(m));
  assert.equal(M.halfOf(m), 2);
  assert.equal(M.elapsed(m, 31 * MIN), 21 * MIN);
  assert.equal(m.nextSubAt, 25 * MIN);
});

test('goals for both teams make the score, and the scorers are counted', () => {
  const m = newMatch();
  M.addEvent(m, { t: 2 * MIN, type: 'goal', playerId: 'A' });
  M.addEvent(m, { t: 5 * MIN, type: 'against' });
  const late = M.addEvent(m, { t: 3 * MIN, type: 'goal', playerId: 'og' }); // added afterwards, sorted by time
  assert.deepEqual(M.score(m), { us: 2, them: 1 });
  assert.deepEqual(M.scoreAt(m, late.id), { us: 2, them: 0 });
  assert.equal(M.goalsBy(m, 'A'), 1);
  assert.deepEqual(m.events.map((e) => e.t), [2 * MIN, 3 * MIN, 5 * MIN]);
});

test('a second yellow card is a red, and a sent-off player is never suggested again', () => {
  const m = newMatch(1);
  assert.equal(M.giveCard(m, 'E', 'yellow', MIN), false);
  assert.equal(M.giveCard(m, 'E', 'yellow', 2 * MIN), true);
  assert.ok(M.sentOff(m, 'E'));
  M.sendOff(m, 'E', 2 * MIN);
  assert.equal(m.players.find((p) => p.id === 'E').status, 'out');
  assert.deepEqual(M.rankOn(m.players, 5 * MIN).map((p) => p.id), ['F']);
  // Deleting the second yellow takes the red away too
  M.removeEvent(m, m.events.filter((e) => e.type === 'yellow')[1].id);
  assert.ok(!M.sentOff(m, 'E'));
  assert.equal(m.events.length, 1);
});

test('a red card on the field can be replaced from the bench', () => {
  const m = newMatch(1);
  assert.ok(M.giveCard(m, 'A', 'red', MIN));
  M.applySwaps(m, [{ offId: 'A', onId: 'E' }], MIN, 'A'); // like an injury: A goes out
  assert.equal(status(m).A, 'out');
  assert.equal(status(m).E, 'field');
});
