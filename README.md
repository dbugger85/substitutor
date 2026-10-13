# Substitutor

A phone-friendly web app for fair substitutions in kids' sports matches.

**Open it:** https://dbugger85.github.io/substitutor/

**Install it as an app** (opens full screen from your home screen, and works with no signal). The easiest way is the **Install** button at the bottom of the Team screen. Or do it by hand:
- **iPhone:** open the link in Safari, tap the Share button, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap the ⋮ menu, then **Install app** (or **Add to Home screen**).

On iPhone, the installed app keeps its own saved team, separate from Safari, so add your players in the installed app.

## Using it

1. **Team:** add your players. The list is saved on the phone. Tap a name to fix its spelling.
2. **Match setup:**
   - players on the field (including the goalkeeper)
   - the goalkeeper
   - the starting players (after your first match, the players who played least last time are ticked for you)
   - minutes between substitutions
   - players per substitution
   - **positions** (optional): tick "Give players positions", type a name for each spot (like Left back or Forward), and choose who starts where
3. **Match:**
   - When it's time, the phone beeps and vibrates and shows who goes **off** and who comes **on**. You can change the suggestion, then press **Done** to restart the timer. **Skip** restarts it without changes.
   - **Swap** or tapping a player: swap anyone at any time, take off an injured player, change the goalkeeper, or remove a player.
   - **↻** (top-right of the clock) restarts the countdown to the next substitution from the full time, without swapping anyone.
   - With positions on, each player on the field shows their position. Whoever comes on takes the position of who went off. Tap a player and choose **Change position with…** to swap two players. Bench players show where they last played in a grey tag, and the swap lists show positions too, so you can bring on a player for a particular position.
   - **Pause** for half-time. **Add player** is for a late arrival, who comes on at the next substitution.
   - **Move to another phone** sends a link with the team and the match. Open it on the other phone and the match carries on there, clock and all.
   - **End match** shows the minutes each player played.

**Switching phones:** tap **Move to another phone** during a match, or **Share team** on the Team screen, and send the link (Messages, WhatsApp, AirDrop…). If the other phone uses the installed app on iPhone, copy the link, open the app, and tap **Paste a shared link** on the Team screen instead (the installed app can't read links opened in Safari).

Each player shows their total minutes. Players on the field who have been off before also show, in small grey, how long they've been on since they last came on.

Substitutions rotate: the player who has been on the field longest since they last came on goes off, and the player who has waited longest on the bench comes on. A player who was in goal for a long time isn't taken off again and again once they're back on the field. The goalkeeper is never substituted unless you choose to.

The screen stays on during the match, and the timer stays correct if the phone locks or the page reloads.

**Tips:**
- On iPhone, turn off silent mode to hear the beep. iPhones can't vibrate from a web page.
- Try a practice match with a 1-minute interval before match day.
- The button in the top-right corner switches between **Auto** (follows your phone's dark mode setting), **Light** and **Dark**. Light is easiest to read in bright sunlight.

## Development

```sh
npm start        # run locally at http://localhost:8000
npm test         # tests for the substitution rules
npm install      # once, for the browser test
npm run e2e      # browser test of a whole match
```

`git push` to `main` updates the live site in about a minute (GitHub Pages).

See [CLAUDE.md](CLAUDE.md) for how the code works and [PLAN.md](PLAN.md) for the original plan and decisions.
