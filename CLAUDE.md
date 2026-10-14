# Substitutor

A phone-first web app that helps a coach make fair substitutions in kids' sports matches. It's used live at the sideline, so reliability during a match matters more than features.

- **Live:** https://substitutor.no/ (the old https://dbugger85.github.io/substitutor/ redirects there, keeping any `#share=` part)
- **Repo:** https://github.com/dbugger85/substitutor (public, branch `main`)
- **Owner:** a beginner "vibe coder". Explain changes in plain language and avoid jargon in user-facing text.

## Commands

```sh
npm start        # serve at http://localhost:8000 (python3 http.server; ES modules don't work from file://)
npm test         # unit tests for js/match.js and js/share.js (node --test), no install needed
npm install      # only needed for the browser test
npm run e2e      # browser test of a full match in headless Chromium (/usr/bin/chromium)
BASE_URL=https://substitutor.no/ npm run e2e   # same test against the live site
npm run screenshots   # remake the README screenshots (screenshots/) and the link preview (icons/preview.png)
```

Run `npm test` and `npm run e2e` after any change. The e2e test saves phone-sized screenshots to `test/screenshots/` (gitignored). Look at them after UI changes.

## Deploying

GitHub Pages serves `main` / root as-is, with no build step. `git push` redeploys the site in about a minute. Check it with `curl -sI https://substitutor.no/` or the live e2e run above. Right after a push the live run can fail once while GitHub is half-way through updating; run it again. Commit and push only when the user asks. Never put the claude.ai session link in commits.

### Custom domain substitutor.no
- Bought 2026-10-13 at Domeneshop, live since 2026-10-14. DNS there: four A records for the bare domain (185.199.108–111.153) and `www` CNAME `dbugger85.github.io`. No AAAA records (the owner chose to skip them).
- GitHub Pages has the custom domain set (that's the `CNAME` file in the repo; don't delete it) and Enforce HTTPS on. The certificate covers both names and renews itself. `www` and the old github.io address redirect to https://substitutor.no/.
- Moving changed the site's origin, so phones started with an empty team there. The owner said that's fine (they'll retype the names). Old `#share=` links keep working, because the redirect keeps the part after `#`. All paths are relative, so nothing in the code had to change.

## Stack and rules

- Plain HTML, CSS and JavaScript ES modules. **No framework, no bundler, no runtime dependencies.** `playwright-core` is a dev dependency used only for the e2e test.
- Only relative paths (`./style.css`, `./js/app.js`), so the app works both at the domain root and under the old `/substitutor/` path.
- Light and dark themes. The field view has its own colours (`--pitch`, `--pitch-line`, `--chip*`), so markers stay readable in both. Light is the default and stays high-contrast for sunlight. All colours are CSS variables: the light set is in `:root`, and the dark set is repeated in `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`, so change both when you change one. Never hard-code colours in rules. Tap targets are at least 48px, and the layout is designed for a phone around 390px wide. Every screen ends just below its content: `main` has only 16px at the bottom (plus the home bar's safe area on iPhone/iPad only; Android reports its navigation bar as safe area but doesn't draw under it), and the field page trims the swipe box (`fitPages()`); no extra scrolling into empty space (owner's wish).
- The look is "glass", styled after the owner's PrimeTime app: a warm off-white page (navy in dark mode), a logo tile plus an uppercase Barlow Condensed title and a tagline (hidden on the match screen), and see-through, blurred panels (`backdrop-filter`) with a rim light over a still colour glow (`body::before`, still to save battery during a match), in the Glass section near the end of `style.css`. Real blur only on the big panels and popups; buttons and inputs fake it. The app works for any sport with a goalkeeper, so no football-specific pictures or words outside the field view; the field view draws the chosen sport's lines (see Field view).
- Never use the browser's own `alert`/`confirm`/`prompt` or `<select>` dropdowns: use `ask()` and `playerPicker()`. The e2e test fails if a browser popup appears. Checkboxes and radio buttons are custom-drawn (`.choices input`).
- Keep `js/match.js` free of DOM code so it stays unit-testable. Add a test in `test/match.test.js` for any rule change.

## Files

| File | Purpose |
|---|---|
| `index.html` | A tiny inline script that applies the saved theme before the page draws, plus all three screens (`#screen-team`, `#screen-setup`, `#screen-match`) and seven `<dialog>`s: swap, player picker (used by the swap popup and setup), player actions, summary, `ask-dialog` (the app's own confirm/name popup, `ask()` in `app.js`), `settings-dialog` (match settings, the cog; its content scrolls while Cancel and Done stay at the bottom, and Cancel restores copies of `team` and `match` taken when it opened) and `ios-install-dialog` (install steps for iPhone/iPad). The match screen holds two swipeable pages: the list and the field view (`#field-page`) |
| `style.css` | All styles; colours are CSS variables (light and dark sets) |
| `js/app.js` | UI, in sections: helpers (`el`, `ask`, `toast`), team screen (incl. renaming), match setup (incl. positions), match screen, field view, player options, swap popup, moving to another phone (`shareLink`, `loadShared`), theme, install card, and start-up. The 500 ms tick (`updateClock`) updates the clocks and opens the substitution popup |
| `js/match.js` | Pure match logic: time accounting, ranking (rotation), swaps, positions (`assignSpots`, `fillSpots`, `swapPositions`) and the field view's layout (guessed from position names, or plain rows) |
| `js/storage.js` | localStorage load and save |
| `js/share.js` | Packs the team and match into a link and reads it back (no DOM code) |
| `js/i18n.js` | English and Norwegian: `tr()` (English text is the key), `posLabel()`, the language choice (`?lang=`, saved choice, phone language), `setLang()` and `translatePage()` (no DOM code at import) |
| `js/pitch.js` | The field view's sports (name, default colour, SVG lines) and colour names; `sportOf()` / `colorOf()` (no DOM code) |
| `js/alerts.js` | Beep (Web Audio), vibration, Screen Wake Lock |
| `fonts/` | Inter and Barlow Condensed (bold), stored with the app so they work offline (both under the SIL Open Font License) |
| `sw.js` | Service worker for offline use: network first, falls back to the cache after 3 s or when offline |
| `manifest.webmanifest`, `icons/` | Makes the app installable. An install card on the team screen (`setupInstall()` in `app.js`) uses Chrome's `beforeinstallprompt`, or on iPhone/iPad opens `#ios-install-dialog` with the Share → Add to Home Screen steps; it's hidden in the installed app and after "Not now" (`substitutor.installHidden`). `icons/icon.svg` is the source; the PNGs are made from it with `rsvg-convert`. The manifest's `background_color`/`theme_color` are the dark navy on purpose (owner's choice, 2026-10-14): Android colours the bottom navigation strip of the installed app from the manifest, which can't follow light/dark mode, and a light strip made the handle grey. |
| `test/match.test.js` | Unit tests for the rules |
| `test/share.test.js` | Unit tests for share links |
| `test/pitch.test.js` | Unit tests for sports and colours |
| `test/i18n.test.js` | Checks that every text in `app.js` and `index.html` has a Norwegian version |
| `robots.txt`, `sitemap.xml`, `icons/preview.png` | For Google and for link previews (see Languages and Google) |
| `test/e2e.mjs` | Playwright browser test |
| `screenshots/` | The README's pictures (phones 390×844, iPad 1180×820 and 820×1180 as a touch device): a 7-a-side match at 7:12 with English position names, light and dark. Made by `test/screenshots.mjs` (`npm run screenshots`), which also makes `icons/preview.png`. Run it when the look changes |
| `test/screenshots.mjs` | Plays a made-up match (team in localStorage, start, move `runningSince` back 5 min, Done, 2:12 more) and saves the README screenshots and the link preview |
| `PLAN.md` | The original plan, plus a dated log of every decision since |

## How it works

### Rules (decided by the user)
- "Players on the field" **includes** the goalkeeper. Outfield starters = fieldSize − 1.
- The goalkeeper is never substituted automatically. They can be swapped ad hoc (the incoming player becomes GK), or changed via "Make goalkeeper".
- **Fairness is a rotation** (changed 2026-10-13; it used to be total time): the players who come off are the ones who've been **on the field longest since they last came on** (tie-break: most total field time, then roster order). The players who come on are the ones who've **waited longest on the bench** (tie-break: least total field time, then roster order). This way a player who was goalkeeper for a long time isn't taken off again and again once they're back on the field. See `rankOff`, `rankOn` and `pickSubstitution`. The swap popup's "Who comes off?" list uses the same order.
- The number of players swapped each time is min(perSub, outfield on the field, bench). If the bench is empty, the timer restarts with a toast and no popup.
- The suggested swaps can be edited, added or removed in the popup before confirming.
- Ad-hoc swaps (the Swap button, or tapping a player) do **not** reset the countdown. An injured player goes to status `out`.
- **Next match's starters** still use total minutes: when a match ends, each player's minutes are saved as `team.lastMinutes`. Match setup then ticks the players who played least as starters (`suggestStarters`). The goalkeeper is still chosen by hand, and players who weren't in the last match count as 0 minutes. The suggestion updates when the GK or field size changes, until the coach ticks or unticks someone (`autoStarters` becomes false). The "Suggest starters from last match" link turns it back on.
- The match is open-ended with Pause. There's one team, and no history: the end-of-match summary is shown once, then the match is deleted (only the minutes are kept, for suggesting the next starters).
- **Renaming:** tap a name in the team list (it's a plain-looking `button.rename`), or "Rename" in the player options during a match. `renamePlayer()` opens `ask()` with the name filled in and updates both the team and the match copy.

### Positions (optional, decided 2026-10-13)
- "Give players positions" in match setup. The coach types a name for each outfield spot (empty → "Position N") and picks which starter plays there (picking someone who already has a spot swaps the two; `assignSpots`). The setup pickers use `playerPicker()` with no match time, so they show names only.
- On the match screen, field players show a green position tag and are listed in position order.
- The player coming on **takes the spot of who went off**. "Change position with…" (tap a field player) swaps two spots (`swapPositions`). The old goalkeeper takes the new goalkeeper's spot (`makeGoalkeeper`).
- `fillSpots()` (called by `applySwaps`, `makeGoalkeeper` and `change()`) moves the spot of anyone no longer on the field to `lastPos` (or `'gk'` for the goalkeeper) and gives a free spot to field players without one.
- Bench players show their last position as a grey outlined tag (`lastPositionName`). `tags(p)` in `app.js` makes the GK / position / last-position tags for the match list and both pickers, so the swap popup's lists show positions too (for substituting by position).
- Positions don't affect who comes off or on.

### Field view (optional, decided 2026-10-13)
- With positions on, "Field view" in the Positions box (`team.settings.fieldView`) adds a second page to the match screen: swipe left from the list. It's native CSS scroll snapping (`.pages` with two `.page`s), with dots in `#page-dots` that show the page and can be tapped. `show()` always opens the match screen on the list.
- The page has a compact copy of the clock (`#field-clock`, `.clock.mini`; `updateClock` updates both clocks), a drawn field (`#pitch`, inline SVG lines in a 200×260 viewBox matching `aspect-ratio: 10 / 13`, own goal at the bottom) with a marker per position (position name + who plays there, GK included), the bench as a row of chips below it, and a tip about the long press (`#field-tip`).
- The field is tinted glass with real blur; the markers are deep-green glass with white text and fake the blur, to save battery. Tapping a marker or bench player opens the player options.
- **Arranging, iPhone-style:** pressing and holding a marker (450 ms, `markerDown()`) starts arranging. All markers wiggle (`.pitch.arranging`, off with reduced motion), and any marker can then be dragged straight away (`startDrag()`: pointer events plus a non-passive `touchmove` that stops page scrolling while dragging). **Done** (`#field-done`) or a tap on an empty part of the field stops it (`setArranging()`). Moving the finger more than 10px before the hold is up counts as a swipe. `.pages.locked` stops swiping while arranging, and the `dragging` flag stops the tap that ends a drag from opening the player options.
- Places are fractions of the field's size (y 0 is the far end the team attacks), saved in `team.settings.layout` `{gk: {x, y}, spots: [{x, y, name}]}` and remembered for later matches. Only dragged spots are saved (`placeSpot()`), each with the position's name at the time; `layoutFor()` ignores a saved spot whose name has changed, so a renamed position gets a fresh guess. (Spots saved before 2026-10-14 have no name and are ignored: the old code saved every spot on any drag.)
- Spots not placed yet are guessed from the position names (`guessPlace()` / `guessLayout()` in `match.js`, owner's wish 2026-10-14): a depth (back, defensive mid, mid, attacking mid, wing, front) from English and Norwegian words found anywhere in the name ("spiss", "midtstopper", "venstreback", "wingback"...; the word list is checked in order, so more specific words come first), and a side (left/venstre, right/høyre/høgre). Short codes work on their own or after a side letter: LB, CM, ST, CDM, VB, HK, HS, VV... (L/V left, R/H right, C centre). Æ/Ø/Å and accents are folded first. Unknown names go in the middle row; spots that would land on the same place in a row are spread evenly across it. If no name gives any hint, it's `defaultLayout()` (rows of up to three, from the back). Kept deliberately simple: no formations, it's for 3–7 players.
- **Sport and colour** (owner's wish 2026-10-14): `team.settings.sport` (football, bandy, handball, icehockey, floorball, futsal: the order they're offered, owner's choice; default football) and `team.settings.pitchColor` (green, blue, ice, wood, red, purple, grey, or null for the sport's own colour). Picking a sport sets `pitchColor` back to null, so the colour follows the sport until the coach picks one. Chosen with the app's own dropdown (`playerPicker()` with the sports as the list, on one line with its label, owner's wish) and round swatches (`renderFieldStyle()`), in setup and the cog popup, only while the field view is on. Every sport is drawn in the same 200×260 box, not to scale, so the positions stay put when the sport changes. Sports without a goalkeeper (basketball) are left out on purpose. Bandy's lines are red, and ice hockey's red with blue lines and centre circle (`red`/`blue` classes, `--line-red`/`--line-blue`), but only on the ice colour; on other colours they're the usual white so they never clash. The colour swatches share one row (a 7-column grid, up to 40px each), so they fit on any phone.
- Colours: `#field-page` gets `data-pitch-color`, and `[data-pitch-color="…"]` rules in `style.css` override `--pitch`, `--chip`, `--chip-pos` (and `--pitch-line` for ice, whose light version is pale with blue lines) in all three colour sets. Green is the base set. Dark versions are see-through and muted; ice stays dim in dark mode on purpose. The swatches use the same attribute, with the colour layered so it shows clearly on a popup.
- The sport also changes what position names mean: `SPORT_WORDS` / `SPORT_CODES` in `match.js` are checked before the general lists (handball: back = middle, fløy/wing and strek/pivot = front; ice hockey: C/centre and wings = forwards, D = defence; floorball: centre = middle; futsal: fixo, ala, pivot; bandy: halv = holding midfield).
- The two pages share one scrolling box, which is as tall as the longer page (the list). On the field page `fitPages()` sets the box to the field page's height, so the screen ends after the bench. The box scrolls only sideways (`overflow-y: hidden`, and `fitPages()` resets `scrollTop`): it used to slide up and down inside itself, hiding the clock and leaving a gap under the field.

### Match settings (the cog, decided 2026-10-14)
- A ⚙ in the top bar (`#settings-btn`, shown only on the match screen by `show()`) opens `#settings-dialog`: minutes between substitutions, players per substitution, positions on/off with their names, and the field view with its sport and colour. Changes apply at once (no Save) through `change()`, and are copied into `team.settings` for the next match. Half-typed numbers are ignored until valid.
- **Cancel and Done** (owner's wish 2026-10-14) sit side by side at the bottom and always stay in view: the dialog is a flex column whose `.dialog-body` scrolls. `openSettings()` keeps `structuredClone` copies of `team` and `match` in `settingsBefore`; Cancel puts them back, saves and re-renders. The phone's back button (the dialog's own close) keeps the changes, as before.
- **Kept short** so it fits a 390×844 phone without scrolling: number settings are `label.field.inline` (words left, a 72px box right, also used in setup); the minutes label is "Minutes between subs" in the popup (one line), with a two-line note under it ("From the next substitution." / "↻ starts it now."), where `[data-restart-icon]` swaps the ↻ character for a copy of the clock button's SVG at start-up. Positions on/off is a checkbox on the fieldset's heading (`legend.choices.toggle`, the long wording is its `aria-label`). Position names go two to a row only while every name is 12 letters or fewer (`allShort()`); the same rule puts the setup's goalkeeper and starter lists in two columns (`.two-col`), so long names never wrap or get cut.
- A new interval waits for the next substitution (`setIntervalMin()`); ↻ applies it at once. Switching positions on mid-match (`setPositions()`) gives everyone on the field a spot; switching off only removes `settings.positions`, so players keep `pos` and get their spots back if it's switched on again (`fillSpots` tidies up). `renamePosition()` falls back to "Position N" when a name is emptied.
- Left out on purpose: players on the field (would mean taking someone off or putting someone on) and the goalkeeper (already in the player options).
- The substitution popup waits while the settings are open. The dialog's heading takes focus, so the keyboard doesn't pop up.
- To make room, the theme button is plain (no background) and shows only its icon on the match screen.

### Languages and Google (decided 2026-10-14)
- The app is in English and Norwegian (bokmål), owner's wish. **Every new text must go through `tr('English text')` in `app.js`, or carry `data-t` / `data-t-html` / `data-t-label` / `data-t-placeholder` in `index.html`, and get a Norwegian entry in `NO` in `js/i18n.js`.** `test/i18n.test.js` fails otherwise. `t` is already used for time in `app.js`, hence the name `tr`.
- The language: `?lang=no` / `?lang=en` in the address wins (and is saved), then the saved choice (`substitutor.lang`), then the phone's language (nb/nn/no → Norwegian). Changing it reloads on that language's address. The switch is one small round flag in the top bar (`#lang-toggle`, drawn SVG in `FLAGS`, not emoji, so it looks the same everywhere, with a glass sheen and rim from `.flag::after`; flag, cog and theme icon are all about 22px) showing the current language; tapping it switches to the other. It's hidden on the match screen to leave room for the cog (owner's choice: round, top right, only the current language). Nothing else is translated after load.
- Stored data stays language-neutral: default position names are saved as "Position 2" and shown through `posLabel()` ("Posisjon 2"); GK shows as "MV" in Norwegian. Coach-typed names are never translated.
- For Google: a title and description (English in the HTML, swapped to Norwegian by `translatePage()`), canonical, hreflang (en → `/`, nb → `/?lang=no`, x-default → `/`), Open Graph/Twitter tags with `icons/preview.png` (1200×630, made from the README screenshots with a Playwright page), `robots.txt` and `sitemap.xml`. The team screen shows a short intro (`.intro`) until players are added, so there's readable text. The owner adds the site to Google Search Console (a DNS TXT record at Domeneshop) and submits the sitemap.
- The service worker matches cached pages with `ignoreSearch`, so `?lang=` works offline.
- At the bottom of the team screen, a small grey link to the GitHub repo (`.source-link`, owner's wish 2026-10-14) so people know where to contribute. No visitor statistics: the owner chose to skip them (Search Console only covers Google searches).

### On-screen keyboard (2026-10-14)
- The viewport tag (and the tablet script, which rewrites it) has `interactive-widget=resizes-content`: Chrome on Android then shrinks the page above the keyboard, so popups with a text box (renaming, adding a player) are centred in the visible part instead of behind the keyboard. Safari ignores it; iPhones scroll the focused box into view themselves. The test browser has no keyboard, so check this on a real phone.

### Tablets (decided 2026-10-14)
- **Size:** an inline script in `index.html`'s head sets the viewport `width` narrower than the window on tablets (shortest side ≥ 700px), so the browser scales the whole page up. Coordinates for taps and dragging stay consistent, unlike CSS `zoom`. Scale = `min(1.15, height / 844)`: never so big that fewer rows fit than on a phone (owner's wish). So an iPad upright is about 15% bigger (layout ~713×1026), and sideways normal size (820 tall is already shorter than a phone). It reads the real window size from `visualViewport` (width × scale), so split screen works, and it re-fits on `resize`, except while an input has focus (the keyboard would change the size). Phones keep `width=device-width`; desktop browsers ignore the viewport tag.
- **Layout:** `@media (min-width: 600px)` widens the column to 680px. `@media (min-width: 860px) and (min-height: 560px) and (orientation: landscape)` turns the match screen's two `.pages` into a grid, list 5fr and field 6fr (owner: the field a bit wider), while `body.with-field` is set (`sideBySide()` in `app.js`: match screen and field view both showing). The page itself doesn't scroll (body is 100dvh, a flex column, one grid row of `minmax(0, 1fr)` with `align-items: stretch`): the header, the clock, its buttons and the field stay put, and only `.match-scroll` (players, bench, help text, End match, Move to another phone) scrolls. The clock becomes one grid row there (label and match time left, a 76px countdown and ↻ right, the bar below), about half the height. The field's mini clock, the page dots and its bench are hidden (the list shows them), and the pitch's width is capped by the screen height so the whole field fits. Phones sideways are too short for it (min-height), so they keep swiping.
- The e2e test runs iPad sizes upright and sideways as a touch device, and checks the scale, the side-by-side field, a drag, and that a phone keeps the normal size.

### Time
- Everything is **match time** in ms, meaning time the clock has run excluding pauses: `elapsed = clockMs + (now − runningSince)`. `runningSince` is null while paused.
- Timing uses timestamps, never tick counting, so it stays correct when the screen is locked, the tab is in the background, or the page reloads.
- Each player has `fieldMs` / `benchMs` plus `since` (the match time of their last status change). `setStatus()` settles the elapsed time into the old status before switching. Never change `status` directly.
- `nextSubAt` is the match time of the next substitution. While the popup waits, the clock keeps running and players keep accruing minutes. Done or Skip calls `scheduleNext()`, so the next interval starts from the moment of confirmation.
- Players on the field also show a small grey **stint time** (`.stint`, time since they last came on: `t − since`), updated in `updateClock`. It's left blank while it equals their total (first time on), so starters only get it after they've been off once.
- The ↻ button in the corner of the clock (`#restart-countdown`) calls `scheduleNext()` straight away, with no swap and no confirm, and shows a toast. It works while paused too.
- The alarm beeps and vibrates every 5 s until the popup is answered. A scheduled popup can't be dismissed with Escape or the back button.

### State (localStorage)
- `substitutor.team`: `{ v: 1, players: [{id, name}], settings: {fieldSize, intervalMin, perSub, gkId, starterIds, autoStarters, usePositions, positions: [name], posIds: [id by spot], fieldView, layout, sport, pitchColor}, lastMinutes?: {[id]: ms} }`. Saved on every edit.
- `substitutor.match`: `{ v: 1, settings: {fieldSize, intervalMs, perSub, positions?: [name]}, players: [{id, name, status: 'gk'|'field'|'bench'|'out', fieldMs, benchMs, since, pos?, lastPos?}], clockMs, runningSince, nextSubAt }`. Saved after every change. If present on load, the app goes straight back to the match screen.
  `positions`, `pos` (index into `positions`, null when not in a spot) and `lastPos` (last spot, or `'gk'`) only exist when positions are switched on.
- `substitutor.theme`: `'light'` or `'dark'`, a plain string. If it's missing, the app follows the phone (Auto). The theme button in the top bar cycles Auto → Light → Dark (`applyTheme` in `app.js`).
- `substitutor.lang`: `'en'` or `'no'`, once chosen (or opened with `?lang=`).
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
- **When you add, rename or remove a file the app loads, update `FILES` in `sw.js`**, or it will be missing offline. Because the worker is network-first, you don't need to bump `CACHE` for normal changes. GitHub Pages sends `cache-control: max-age=600`, so the worker fetches files (not page loads) with `cache: 'no-cache'`; otherwise a phone could get a new `index.html` with a 10-minute-old `style.css`.
- Sound needs a user gesture first, so `unlockAudio()` runs on every pointerdown and click. iPhones play no sound in silent mode, and iOS ignores `navigator.vibrate`.
- Wake Lock needs HTTPS or localhost and is released when the page is hidden, so it's re-requested on `visibilitychange`.
- `crypto.randomUUID` needs a secure context. `newId()` has a fallback for testing over a LAN on http.

## Ideas not built yet
- A QR code for share links (needs a hand-written QR generator, as there are no outside libraries)
- Several teams
- Match history
- Showing bench waiting time (the bench is already sorted by it)
