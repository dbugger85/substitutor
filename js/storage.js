// Saves the team and the match in progress in the browser (localStorage).

const TEAM_KEY = 'substitutor.team';
const MATCH_KEY = 'substitutor.match';
const THEME_KEY = 'substitutor.theme';
const INSTALL_KEY = 'substitutor.installHidden';
const KEYBOARD_KEY = 'substitutor.keyboard';
const BENCH_KEY = 'substitutor.benchLeft';

const DEFAULT_SETTINGS = { fieldSize: 5, intervalMin: 5, perSub: 1, gkId: null, starterIds: [], autoStarters: false, usePositions: false, positions: [], posIds: [], fieldView: false, rotatePositions: false, layout: {}, sport: 'football', pitchColor: null, showNext: true, autoSwap: false, autoSwapSec: 10, gloveMode: false, score: false, cards: false, teamName: '', opponent: '' };

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && value.v === 1 ? value : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (e.g. private mode); the app still works.
  }
}

// Settings added in later versions get their default, so older saved teams and share links still work.
export function withDefaults(team) {
  team.settings = { ...DEFAULT_SETTINGS, ...team.settings };
  return team;
}

export const loadTeam = () => withDefaults(read(TEAM_KEY) ?? { v: 1, players: [] });

export const saveTeam = (team) => write(TEAM_KEY, team);
export const loadMatch = () => read(MATCH_KEY);
export const saveMatch = (match) => write(MATCH_KEY, match);

export function clearMatch() {
  try {
    localStorage.removeItem(MATCH_KEY);
  } catch {}
}

// 'auto' (follow the phone), 'light' or 'dark'.
export function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveTheme(theme) {
  try {
    if (theme === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

// "Not now" on the install card: a plain '1'.
export function loadInstallHidden() {
  try {
    return localStorage.getItem(INSTALL_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveInstallHidden() {
  try {
    localStorage.setItem(INSTALL_KEY, '1');
  } catch {}
}

// A key was pressed on this device once: show the keyboard shortcuts in the cog. A plain '1'.
export function loadKeyboardSeen() {
  try {
    return localStorage.getItem(KEYBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

// Tablet upright: the bench beside the field on the left instead of the right. A plain '1'.
export function loadBenchLeft() {
  try {
    return localStorage.getItem(BENCH_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveBenchLeft(left) {
  try {
    if (left) localStorage.setItem(BENCH_KEY, '1');
    else localStorage.removeItem(BENCH_KEY);
  } catch {}
}

export function saveKeyboardSeen() {
  try {
    localStorage.setItem(KEYBOARD_KEY, '1');
  } catch {}
}
