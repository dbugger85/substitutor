# Substitutor

A phone-first web app that helps a coach make fair substitutions in kids' football matches. It's used live at the sideline, so reliability during a match matters more than features.

- **Live:** https://dbugger85.github.io/substitutor/
- **Repo:** https://github.com/dbugger85/substitutor (public, branch `main`)
- **Owner:** a beginner "vibe coder". Explain changes in plain language and avoid jargon in user-facing text.

## Commands

```sh
npm start        # serve at http://localhost:8000 (python3 http.server; ES modules don't work from file://)
npm test         # unit tests for js/match.js (node --test), no install needed
npm install      # only needed for the browser test
npm run e2e      # browser test of a full match in headless Chromium (/usr/bin/chromium)
BASE_URL=https://dbugger85.github.io/substitutor/ npm run e2e   # same test against the live site
```

Run `npm test` and `npm run e2e` after any change. The e2e test saves phone-sized screenshots to `test/screenshots/` (gitignored). Look at them after UI changes.

## Deploying

GitHub Pages serves `main` / root as-is, with no build step. `git push` redeploys the site in about a minute. Check it with `curl -sI https://dbugger85.github.io/substitutor/` or the live e2e run above. Commit and push only when the user asks.

## Stack and rules

- Plain HTML, CSS and JavaScript ES modules. **No framework, no bundler, no runtime dependencies.** `playwright-core` is a dev dependency used only for the e2e test.
- Only relative paths (`./style.css`, `./js/app.js`), because the site lives under `/substitutor/`.
- Light theme only, with high contrast for sunlight. Tap targets are at least 48px, and the layout is designed for a phone around 390px wide.
- Keep `js/match.js` free of DOM code so it stays unit-testable. Add a test in `test/match.test.js` for any rule change.

## Files

| File | Purpose |
|---|---|
| `index.html` | All three screens (`#screen-team`, `#screen-setup`, `#screen-match`) and three `<dialog>`s: swap, player actions, summary |
| `style.css` | All styles; colours are CSS variables in `:root` |
| `js/app.js` | UI: rendering, event handlers, the 500 ms tick (`updateClock`) that updates clocks and opens the substitution popup |
| `js/match.js` | Pure match logic: time accounting, ranking, swaps |
| `js/storage.js` | localStorage load and save |
| `js/alerts.js` | Beep (Web Audio), vibration, Screen Wake Lock |
| `test/match.test.js` | Unit tests for the rules |
| `test/e2e.mjs` | Playwright browser test |
| `PLAN.md` | The original plan and the user's decisions |

## How it works

### Rules (decided by the user)
- "Players on the field" **includes** the goalkeeper. Outfield starters = fieldSize − 1.
- The goalkeeper is never substituted automatically. They can be swapped ad hoc (the incoming player becomes GK), or changed via "Make goalkeeper".
- **Fairness:** the players who come off are the ones with the **most total field time** (tie-break: longest current stint, then roster order). The players who come on are the bench players with the **least total field time** (tie-break: waited longest). See `rankOff`, `rankOn` and `pickSubstitution`.
- The number of players swapped each time is min(perSub, outfield on the field, bench). If the bench is empty, the timer restarts with a toast and no popup.
- The suggested swaps can be edited, added or removed in the popup before confirming.
- Ad-hoc swaps (the Swap button, or tapping a player) do **not** reset the countdown. An injured player goes to status `out`.
- The match is open-ended with Pause. There's one team, and no history: the end-of-match summary is shown once, then the match is deleted.

### Time
- Everything is **match time** in ms, meaning time the clock has run excluding pauses: `elapsed = clockMs + (now − runningSince)`. `runningSince` is null while paused.
- Timing uses timestamps, never tick counting, so it stays correct when the screen is locked, the tab is in the background, or the page reloads.
- Each player has `fieldMs` / `benchMs` plus `since` (the match time of their last status change). `setStatus()` settles the elapsed time into the old status before switching. Never change `status` directly.
- `nextSubAt` is the match time of the next substitution. While the popup waits, the clock keeps running and players keep accruing minutes. Done or Skip calls `scheduleNext()`, so the next interval starts from the moment of confirmation.
- The alarm beeps and vibrates every 5 s until the popup is answered. A scheduled popup can't be dismissed with Escape or the back button.

### State (localStorage)
- `substitutor.team`: `{ v: 1, players: [{id, name}], settings: {fieldSize, intervalMin, perSub, gkId, starterIds} }`. Saved on every edit.
- `substitutor.match`: `{ v: 1, settings: {fieldSize, intervalMs, perSub}, players: [{id, name, status: 'gk'|'field'|'bench'|'out', fieldMs, benchMs, since}], clockMs, runningSince, nextSubAt }`. Saved after every change. If present on load, the app goes straight back to the match screen.
- Data with a different `v` is ignored. If you change the saved shape, bump `v` or migrate it in `storage.js`.

### Browser gotchas
- Sound needs a user gesture first, so `unlockAudio()` runs on every pointerdown and click. iPhones play no sound in silent mode, and iOS ignores `navigator.vibrate`.
- Wake Lock needs HTTPS or localhost and is released when the page is hidden, so it's re-requested on `visibilitychange`.
- `crypto.randomUUID` needs a secure context. `newId()` has a fallback for testing over a LAN on http.

## Ideas not built yet
- A PWA manifest and service worker for offline use and installing as an app
- Several teams
- Match history
- Showing bench waiting time
