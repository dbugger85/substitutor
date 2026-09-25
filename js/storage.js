// Saves the team and the match in progress in the browser (localStorage).

const TEAM_KEY = 'substitutor.team';
const MATCH_KEY = 'substitutor.match';
const THEME_KEY = 'substitutor.theme';

const DEFAULT_SETTINGS = { fieldSize: 5, intervalMin: 5, perSub: 1, gkId: null, starterIds: [], autoStarters: false };

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

export function loadTeam() {
  const team = read(TEAM_KEY) ?? { v: 1, players: [] };
  team.settings = { ...DEFAULT_SETTINGS, ...team.settings };
  return team;
}

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
