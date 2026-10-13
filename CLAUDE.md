# Substitutor

A phone-first web app that helps a coach make fair substitutions in kids' sports matches. It's used live at the sideline, so reliability during a match matters more than features.

- **Live:** https://dbugger85.github.io/substitutor/
- **Repo:** https://github.com/dbugger85/substitutor (public, branch `main`)
- **Owner:** a beginner "vibe coder". Explain changes in plain language and avoid jargon in user-facing text.

## Commands

```sh
npm start        # serve at http://localhost:8000 (python3 http.server; ES modules don't work from file://)
npm test         # unit tests for js/match.js and js/share.js (node --test), no install needed
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
- Light and dark themes. Light is the default and stays high-contrast for sunlight. All colours are CSS variables: the light set is in `:root`, and the dark set is repeated in `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`, so change both when you change one. Never hard-code colours in rules. Tap targets are at least 48px, and the layout is designed for a phone around 390px wide.
- The look is "glass", styled after the owner's PrimeTime app: a warm off-white page (navy in dark mode), a logo tile plus an uppercase Barlow Condensed title and a tagline (hidden on the match screen), and see-through, blurred panels (`backdrop-filter`) with a rim light over a still colour glow (`body::before`, still to save battery during a match), in the Glass section near the end of `style.css`. Real blur only on the big panels and popups; buttons and inputs fake it. The app works for any sport, so no football-specific pictures or words.
- Never use the browser's own `alert`/`confirm`/`prompt` or `<select>` dropdowns: use `ask()` and `playerPicker()`. The e2e test fails if a browser popup appears. Checkboxes and radio buttons are custom-drawn (`.choices input`).
- Keep `js/match.js` free of DOM code so it stays unit-testable. Add a test in `test/match.test.js` for any rule change.

## Files

| File | Purpose |
|---|---|
| `index.html` | A tiny inline script that applies the saved theme before the page draws, plus all three screens (`#screen-team`, `#screen-setup`, `#screen-match`) and six `<dialog>`s: swap, player picker (used by the swap popup), player actions, summary, `ask-dialog` (the app's own confirm/name popup, `ask()` in `app.js`) and `ios-install-dialog` (install steps for iPhone/iPad) |
| `style.css` | All styles; colours are CSS variables (light and dark sets) |
| `js/app.js` | UI: rendering, event handlers, the 500 ms tick (`updateClock`) that updates clocks and opens the substitution popup |
| `js/match.js` | Pure match logic: time accounting, ranking, swaps |
| `js/storage.js` | localStorage load and save |
| `js/share.js` | Packs the team and match into a link and reads it back (no DOM code) |
| `js/alerts.js` | Beep (Web Audio), vibration, Screen Wake Lock |
| `fonts/` | Inter and Barlow Condensed (bold), stored with the app so they work offline (both under the SIL Open Font License) |
| `sw.js` | Service worker for offline use: network first, falls back to the cache after 3 s or when offline |
| `manifest.webmanifest`, `icons/` | Makes the app installable. An install card on the team screen (`setupInstall()` in `app.js`) uses Chrome's `beforeinstallprompt`, or on iPhone/iPad opens `#ios-install-dialog` with the Share → Add to Home Screen steps; it's hidden in the installed app and after "Not now" (`substitutor.installHidden`). `icons/icon.svg` is the source; the PNGs are made from it with `rsvg-convert` |
| `test/match.test.js` | Unit tests for the rules |
| `test/share.test.js` | Unit tests for share links |
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
- **Next match's starters:** when a match ends, each player's minutes are saved as `team.lastMinutes`. Match setup then ticks the players who played least as starters (`suggestStarters`). The goalkeeper is still chosen by hand, and players who weren't in the last match count as 0 minutes. The suggestion updates when the GK or field size changes, until the coach ticks or unticks someone (`autoStarters` becomes false). The "Suggest starters from last match" link turns it back on.
- The match is open-ended with Pause. There's one team, and no history: the end-of-match summary is shown once, then the match is deleted (only the minutes are kept, for suggesting the next starters).

### Time
- Everything is **match time** in ms, meaning time the clock has run excluding pauses: `elapsed = clockMs + (now − runningSince)`. `runningSince` is null while paused.
- Timing uses timestamps, never tick counting, so it stays correct when the screen is locked, the tab is in the background, or the page reloads.
- Each player has `fieldMs` / `benchMs` plus `since` (the match time of their last status change). `setStatus()` settles the elapsed time into the old status before switching. Never change `status` directly.
- `nextSubAt` is the match time of the next substitution. While the popup waits, the clock keeps running and players keep accruing minutes. Done or Skip calls `scheduleNext()`, so the next interval starts from the moment of confirmation.
- Players on the field also show a small grey **stint time** (`.stint`, time since they last came on: `t − since`), updated in `updateClock`. It's left blank while it equals their total (first time on), so starters only get it after they've been off once.
- The alarm beeps and vibrates every 5 s until the popup is answered. A scheduled popup can't be dismissed with Escape or the back button.

### State (localStorage)
- `substitutor.team`: `{ v: 1, players: [{id, name}], settings: {fieldSize, intervalMin, perSub, gkId, starterIds, autoStarters}, lastMinutes?: {[id]: ms} }`. Saved on every edit.
- `substitutor.match`: `{ v: 1, settings: {fieldSize, intervalMs, perSub}, players: [{id, name, status: 'gk'|'field'|'bench'|'out', fieldMs, benchMs, since}], clockMs, runningSince, nextSubAt }`. Saved after every change. If present on load, the app goes straight back to the match screen.
- `substitutor.theme`: `'light'` or `'dark'`, a plain string. If it's missing, the app follows the phone (Auto). The theme button in the top bar cycles Auto → Light → Dark (`applyTheme` in `app.js`).
- `substitutor.installHidden`: `'1'` after the coach taps ✕ ("Not now") on the install card, so it stays hidden on that phone.
- Data with a different `v` is ignored. If you change the saved shape, bump `v` or migrate it in `storage.js`.

### Moving to another phone
- "Move to another phone" (match screen) and "Share team" (team screen) call `shareLink()` in `app.js`: the phone's share menu (`navigator.share`), else copy to the clipboard, else an `ask()` popup showing the link.
- The link is `<app address>#share=` + `z` (deflate-raw via `CompressionStream`) or `j` (plain JSON, if the browser can't compress), base64url-encoded. It holds `{ v: 1, at, team, match }`: the same shapes as in localStorage. The part after `#` is never sent to a server. About 1,000 characters for 15 players.
- Opening the link, or "Paste a shared link" on the team screen, calls `loadShared()`. It asks first if this phone already has players or a match, then replaces both and calls `start()`. The `#share=` part is removed from the address bar so a reload doesn't load it again.
- The match keeps its absolute `runningSince` timestamp, so the clock carries on as if the match never stopped (assumes both phones' clocks are about right). A substitution that came due in between pops up straight away.
- The paste option exists because on iPhone an app installed on the home screen has its own storage, separate from Safari, so a tapped link would open in Safari instead.
- The old phone keeps its match until someone ends it there.
- The substitution popup waits while an `ask()` popup is open.

### Browser gotchas
- **When you add, rename or remove a file the app loads, update `FILES` in `sw.js`**, or it will be missing offline. Because the worker is network-first, you don't need to bump `CACHE` for normal changes.
- Sound needs a user gesture first, so `unlockAudio()` runs on every pointerdown and click. iPhones play no sound in silent mode, and iOS ignores `navigator.vibrate`.
- Wake Lock needs HTTPS or localhost and is released when the page is hidden, so it's re-requested on `visibilitychange`.
- `crypto.randomUUID` needs a secure context. `newId()` has a fallback for testing over a LAN on http.

## Ideas not built yet
- A QR code for share links (needs a hand-written QR generator, as there are no outside libraries)
- Several teams
- Match history
- Showing bench waiting time
