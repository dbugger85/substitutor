# Substitutor – Implementation Plan

> **Status (2026-09-26):** built and live at https://dbugger85.github.io/substitutor/. This file records the original plan and the user's decisions (section 8). For how the code actually works, see [CLAUDE.md](CLAUDE.md). The final file layout differs slightly: `js/match.js` holds both the timer and the substitution logic, and `js/app.js` holds the UI.

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
