// Packs the team and the match into a link, so another phone can carry on.
// No DOM code, so it can be tested with `npm test`.
//
// The data goes after "#share=" in the link. That part of a link is never sent
// to a server. It's compressed and base64url-encoded: "z" + data when the
// browser can compress, "j" + data (plain JSON) when it can't.

const MARK = '#share=';

const toB64 = (bytes) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes, Stream) {
  const stream = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function makeLink(base, team, match, now = Date.now()) {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, at: now, team, match: match ?? null }));
  const data = typeof CompressionStream === 'function'
    ? 'z' + toB64(await pipe(bytes, CompressionStream))
    : 'j' + toB64(bytes);
  return base.split('#')[0] + MARK + data;
}

export const hasShare = (text) => typeof text === 'string' && text.includes(MARK);

// { team, match, at } from a link (or pasted text containing one), or null if it can't be read.
export async function readLink(text) {
  if (!hasShare(text)) return null;
  try {
    const data = text.slice(text.indexOf(MARK) + MARK.length).trim();
    let bytes = fromB64(data.slice(1));
    if (data[0] === 'z') bytes = await pipe(bytes, DecompressionStream);
    else if (data[0] !== 'j') return null;
    const shared = JSON.parse(new TextDecoder().decode(bytes));
    return isValid(shared) ? { team: shared.team, match: shared.match, at: shared.at } : null;
  } catch {
    return null;
  }
}

const isPlayer = (p) => p && typeof p.id === 'string' && typeof p.name === 'string';

function isValid(s) {
  if (!s || s.v !== 1) return false;
  const { team, match } = s;
  if (!team || team.v !== 1 || !Array.isArray(team.players) || !team.players.every(isPlayer)) return false;
  if (match == null) return true;
  return match.v === 1 && !!match.settings && Array.isArray(match.players) && match.players.every(isPlayer);
}
