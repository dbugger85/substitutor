import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/match.js';
import { makeLink, readLink, hasShare } from '../js/share.js';

const BASE = 'https://dbugger85.github.io/substitutor/';
const players = Array.from({ length: 15 }, () => ({ id: M.newId(), name: 'Player name' }));
const team = {
  v: 1,
  players,
  settings: { fieldSize: 7, intervalMin: 5, perSub: 2, gkId: players[0].id, starterIds: players.slice(1, 7).map((p) => p.id), autoStarters: false },
  lastMinutes: Object.fromEntries(players.map((p, i) => [p.id, i * 60000])),
};

test('a link brings back the same team and match', async () => {
  const match = M.createMatch(team.players, team.settings, 1000);
  M.applySwaps(match, M.pickSubstitution(match.players, 2, 300000), 300000);
  const link = await makeLink(BASE, team, match);
  assert.ok(link.startsWith(BASE + '#share=z'));
  assert.ok(hasShare(link));
  const shared = await readLink(link);
  assert.deepEqual(shared.team, team);
  assert.deepEqual(shared.match, match);
});

test('a team without a match', async () => {
  const shared = await readLink(await makeLink(BASE + '#old', team, null));
  assert.deepEqual(shared.team, team);
  assert.equal(shared.match, null);
});

test('the link stays short enough to send in a message', async () => {
  const link = await makeLink(BASE, team, M.createMatch(team.players, team.settings));
  assert.ok(link.length < 2500, `link is ${link.length} characters`);
});

test('works in pasted text with words around it', async () => {
  const link = await makeLink(BASE, team, null);
  assert.deepEqual((await readLink(`Here you go: ${link}\n`)).team, team);
});

test('broken or foreign links are refused', async () => {
  const link = await makeLink(BASE, team, null);
  assert.equal(await readLink(BASE), null);
  assert.equal(await readLink(link.slice(0, -20)), null);
  assert.equal(await readLink(BASE + '#share=zhello'), null);
  assert.equal(await readLink(BASE + '#share=j' + btoa(JSON.stringify({ v: 1, team: { v: 1, players: 'x' } }))), null);
});
