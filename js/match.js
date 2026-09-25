// Match logic with no DOM code, so it can be tested with `npm test`.
//
// All times are "match time" in milliseconds: time the match clock has been
// running, not counting pauses. It is derived from Date.now() timestamps, so
// it stays correct when the phone locks or the page is reloaded.

export function newId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const onPitch = (status) => status === 'field' || status === 'gk';

export function createMatch(players, { fieldSize, intervalMin, perSub, gkId, starterIds }, now = Date.now()) {
  const intervalMs = Math.round(intervalMin * 60000);
  return {
    v: 1,
    settings: { fieldSize, intervalMs, perSub },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.id === gkId ? 'gk' : starterIds.includes(p.id) ? 'field' : 'bench',
      fieldMs: 0,
      benchMs: 0,
      since: 0,
    })),
    clockMs: 0,
    runningSince: now,
    nextSubAt: intervalMs,
  };
}

export function elapsed(match, now = Date.now()) {
  return match.clockMs + (match.runningSince != null ? now - match.runningSince : 0);
}

export function isRunning(match) {
  return match.runningSince != null;
}

export function pause(match, now = Date.now()) {
  if (match.runningSince == null) return;
  match.clockMs += now - match.runningSince;
  match.runningSince = null;
}

export function resume(match, now = Date.now()) {
  if (match.runningSince == null) match.runningSince = now;
}

export function scheduleNext(match, now = Date.now()) {
  match.nextSubAt = elapsed(match, now) + match.settings.intervalMs;
}

export function fieldTime(p, t) {
  return p.fieldMs + (onPitch(p.status) ? t - p.since : 0);
}

export function benchTime(p, t) {
  return p.benchMs + (p.status === 'bench' ? t - p.since : 0);
}

// Move a player to a new status, first adding the time spent in the old one.
export function setStatus(p, status, t) {
  if (onPitch(p.status)) p.fieldMs += t - p.since;
  else if (p.status === 'bench') p.benchMs += t - p.since;
  p.status = status;
  p.since = t;
}

// Outfield players on the field, best candidate to come off first:
// most total playing time, then longest current stint, then roster order.
export function rankOff(players, t) {
  return players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'field')
    .sort((a, b) => fieldTime(b.p, t) - fieldTime(a.p, t) || a.p.since - b.p.since || a.i - b.i)
    .map(({ p }) => p);
}

// Bench players, best candidate to come on first:
// least total playing time, then waited longest, then roster order.
export function rankOn(players, t) {
  return players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'bench')
    .sort((a, b) => fieldTime(a.p, t) - fieldTime(b.p, t) || a.p.since - b.p.since || a.i - b.i)
    .map(({ p }) => p);
}

// Suggested swaps: [{ offId, onId }]. Empty if nobody can be swapped.
export function pickSubstitution(players, perSub, t) {
  const off = rankOff(players, t);
  const on = rankOn(players, t);
  const k = Math.max(0, Math.min(perSub, off.length, on.length));
  return Array.from({ length: k }, (_, i) => ({ offId: off[i].id, onId: on[i].id }));
}

// Apply swaps. A goalkeeper who comes off is replaced as goalkeeper.
// The player with id `injuredId` goes out of the match instead of to the bench.
export function applySwaps(match, pairs, t, injuredId = null) {
  const byId = (id) => match.players.find((p) => p.id === id);
  for (const { offId, onId } of pairs) {
    const off = byId(offId);
    const on = byId(onId);
    if (!off || !on || !onPitch(off.status) || on.status !== 'bench') {
      throw new Error('Invalid swap');
    }
    const role = off.status;
    setStatus(off, off.id === injuredId ? 'out' : 'bench', t);
    setStatus(on, role, t);
  }
}

// Make a field or bench player the goalkeeper. The old goalkeeper takes
// their place (field or bench).
export function makeGoalkeeper(match, id, t) {
  const p = match.players.find((x) => x.id === id);
  const oldGk = match.players.find((x) => x.status === 'gk');
  const place = p.status;
  if (oldGk) setStatus(oldGk, place, t);
  setStatus(p, 'gk', t);
}

export function addPlayer(match, { id, name }, t) {
  match.players.push({ id, name, status: 'bench', fieldMs: 0, benchMs: 0, since: t });
}
