# Substitutor – Implementation Plan

> **Status (2026-10-14):** built and live at https://substitutor.no/ (the old github.io address redirects there). This file records the original plan, the user's first decisions (section 8) and every decision since (section 10). Where they differ, section 10 wins: for example, substitutions now rotate instead of evening out total minutes (section 3). For how the code actually works, see [CLAUDE.md](CLAUDE.md). The final file layout differs slightly: `js/match.js` holds both the timer and the substitution logic, and `js/app.js` holds the UI.

## 1. Tech stack
Plain HTML + CSS + JavaScript (ES modules). No framework, no build step. It deploys to GitHub Pages as-is and is simple for a beginner. `node --test` is used only to test the substitution algorithm.

## 2. Screens (mobile-first, large tap targets)
1. **Team**: add and remove players. Saved automatically.
2. **Match setup**: goalkeeper, outfield players on the field, starting players (exactly N), substitution interval (minutes), players per substitution. "Start match" stays disabled until the setup is valid.
3. **Match**: big countdown to the next substitution, total match clock, "On field" and "Bench" lists with minutes, and GK shown separately. Buttons: Pause/Resume, Sub now, Add player, tap a player to remove (injured) or move them, End match.
   - **Substitution prompt**: pairs like "Anna → Carl", with **Done** (apply and restart timer) and **Skip**.
   - **End summary**: minutes played per player.

## 3. Substitution algorithm (fair playing time)
- k = min(players per sub, on-field count, bench size). If the bench is empty, there is no substitution.
- **Off**: outfield players with the most total field minutes (tie-break: longest current stint).
- **On**: bench players with the fewest total field minutes (tie-break: longest bench wait).
- The GK is never substituted and is not counted as one of the "players on field".
- Late arrivals join the bench with 0 minutes, so they come on at the next substitution.
- An injured player is removed, and the app suggests the best bench replacement. If the injured player is the GK, the user picks a new GK.

## 4. Timer
- Timestamp-based, so it stays accurate when the screen locks or the tab is in the background.
- While the prompt waits, the match clock keeps running. The next countdown starts when "Done" is pressed.
- Time-up alert: vibration plus a repeating beep until confirmed. Screen Wake Lock keeps the screen on.

## 5. Saving (localStorage)
- The roster is saved on every edit.
- The match in progress is saved on every change, so the app offers "Resume match?" after an accidental reload.

## 6. Files
```
index.html, style.css, README.md, package.json, .gitignore
js/main.js, state.js, substitution.js, timer.js, ui.js, alerts.js
test/substitution.test.js
```

## 7. Deploy
Create a public GitHub repo, then choose Settings → Pages → branch `main` / root. The app will be at `https://<user>.github.io/substitutor/`. Add it to the phone's home screen.

## 8. Decisions (confirmed by user)
1. "Players on field" **includes** the goalkeeper.
2. The clock keeps running while the prompt waits. The next countdown starts on "Done".
3. Fairness means equal total minutes over the whole match.
4. The suggested swaps can be edited before confirming, and **ad-hoc swaps** (e.g. injury) are possible at any time.
5. Matches are open-ended, with Pause.
6. One team.
7. No history. The summary is shown once at the end.

## 9. Build order
Skeleton → Roster → Match setup → Algorithm + tests → Match screen + timer → Substitution prompt → Alerts + wake lock → Match persistence → Edge cases → Deploy → Nice-to-haves (summary, edit pairs, installable app).

## 10. Decisions since (newest last)
All confirmed by the user. For how each one works in the code, see [CLAUDE.md](CLAUDE.md).

**2026-09-26 to 2026-10-10**
- The starters for the next match are suggested from the minutes played in the last one: the players who played least start.
- A glass look styled after the owner's PrimeTime app, with Auto/Light/Dark themes. The app is worded for any sport, not just football.
- The app's own popups replace the browser's (no `alert`/`confirm`/`prompt` or dropdowns).
- An Install button on the Players screen, with step-by-step help on iPhone.

**2026-10-13**
- **Move to another phone:** a link carries the team, the setup and the match in progress, and the clock keeps running. "Paste a shared link" exists for the installed iPhone app. The first phone keeps its match until someone ends it. A QR code was left out (it would need outside code).
- **Time since coming on:** a small grey time next to each field player's total, shown once they've been off at least once.
- **Restart countdown:** a round ↻ button on the clock restarts the countdown without a swap or a confirm.
- **Substitutions rotate** (replaces section 3's rule): whoever has been on the field longest since they last came on goes off, and whoever has waited longest on the bench comes on. Total time only breaks ties. The reason: a player who'd been goalkeeper for a half kept being taken off.
- **Positions** (optional, in setup): the coach types the position names; the player coming on takes the spot of who went off; "Change position with…" swaps two; positions are shown as tags in the list (not a pitch drawing). Bench players show where they last played, and the swap lists show positions so you can substitute by position. Positions don't change who comes off or on.
- **Rename players** by tapping their name (team list) or from the player options (during a match), without adding clutter.
- **Field view** (optional, needs positions): swipe left on the match screen for a field with every position and who plays there, the bench below and a small clock. Simple field lines (outline, halfway line, centre circle, a box at each end). Arrange the positions by pressing and holding one, iPhone-style with wiggling. The layout is remembered. Since 2026-10-14 the positions start where their names suggest (English and Norwegian words and short forms like "spiss", "høyre back", LB, ST), with no formations, as it's for 3–7 players. The field view also ends after the bench instead of scrolling as far as the list.
- **Match settings during a match** (2026-10-14): a ⚙ next to the theme button opens minutes between substitutions, players per substitution, positions (on/off and names) and the field view. Not the number of players or the goalkeeper. Both header buttons are plain, with no background.
- **Sports and colours for the field view** (2026-10-14): Football (default), Bandy, Handball, Ice hockey, Floorball and Futsal, in that order, each with its own lines and default colour (green, ice, blue, ice, blue, wood). Bandy has red lines and ice hockey red and blue ones, shown in colour on ice only. The swatches fit on one row. Seven colour swatches instead of a free colour wheel, so it always stays readable, each with a light and a dark version; ice is kept dim in dark mode. Position names are read the way each sport uses them.
- **Norwegian and Google** (2026-10-14): the whole app in English and Norwegian (bokmål), following the phone, with one small round flag in the top-right corner showing the current language (tap to switch; hidden during a match); each language has its own address (`?lang=no`). A description, link previews, `robots.txt`, a sitemap and a short intro on the first screen, so Google can list it. Norwegian goalkeeper badge: MV.
- **Android bottom strip** (2026-10-14): the installed app's colours in the manifest are the dark navy, so Android's bottom navigation strip is dark with a light handle in both modes (Android can't follow light/dark there). Same in PrimeTime.
- **GitHub page** (2026-10-14): a description, topics, the substitutor.no link and five screenshots in the README (English position names). A small link to the GitHub page at the bottom of the app's front page, so people know where to contribute.
- **Tablets** (2026-10-14): upright, one wide column a little bigger than on a phone (at most 15%, never fewer rows than a phone); sideways, the match list and the field side by side, the field a bit wider and without its bench; only the player list scrolls, under a compact one-row clock (with ↻) and its buttons, which stay put. Same for Android tablets and wide computer windows.
- **No visitor statistics** (2026-10-14): the owner chose to skip them. Google Search Console (set up by the owner, with a DNS TXT record at Domeneshop) only covers Google searches.
- **Domain:** substitutor.no, bought at Domeneshop, with ".no" after the name in the header like PrimeTime's ".re". Phones don't need their saved team moved to the new address. Live since 2026-10-14, with HTTPS.
