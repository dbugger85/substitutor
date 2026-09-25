# Substitutor ⚽

A phone-friendly web app for fair substitutions in kids' football matches.

**Open it:** https://dbugger85.github.io/substitutor/. On your phone, choose "Add to Home Screen" so it works like an app.

## Using it

1. **Team:** add your players. The list is saved on the phone.
2. **Match setup:**
   - players on the field (including the goalkeeper)
   - the goalkeeper
   - the starting players
   - minutes between substitutions
   - players per substitution
3. **Match:**
   - When it's time, the phone beeps and vibrates and shows who goes **off** and who comes **on**. You can change the suggestion, then press **Done** to restart the timer. **Skip** restarts it without changes.
   - **Swap** or tapping a player: swap anyone at any time, take off an injured player, change the goalkeeper, or remove a player.
   - **Pause** for half-time. **Add player** is for a late arrival, who comes on at the next substitution.
   - **End match** shows the minutes each player played.

Players with the most minutes come off first, and players with the fewest come on first, so playing time evens out over the match. The goalkeeper is never substituted unless you choose to.

The screen stays on during the match, and the timer stays correct if the phone locks or the page reloads.

**Tips:**
- On iPhone, turn off silent mode to hear the beep. iPhones can't vibrate from a web page.
- Try a practice match with a 1-minute interval before match day.

## Development

```sh
npm start        # run locally at http://localhost:8000
npm test         # tests for the substitution rules
npm install      # once, for the browser test
npm run e2e      # browser test of a whole match
```

`git push` to `main` updates the live site in about a minute (GitHub Pages).

See [CLAUDE.md](CLAUDE.md) for how the code works and [PLAN.md](PLAN.md) for the original plan and decisions.
