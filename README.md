# Substitutor

A phone-friendly web app for fair substitutions in kids' sports matches. It works for any sport with a goalkeeper and rolling substitutions.

**Open it:** https://substitutor.no

The app used to live at dbugger85.github.io/substitutor, which now sends you to substitutor.no. The new address starts with an empty team, so add your players again.

**Install it as an app** (opens full screen from your home screen, and works with no signal). The easiest way is the **Install** button at the bottom of the Team screen. Or do it by hand:
- **iPhone:** open the link in Safari, tap the Share button, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap the ⋮ menu, then **Install app** (or **Add to Home screen**).

On iPhone, the installed app keeps its own saved team, separate from Safari, so add your players in the installed app.

## 1. Team

Add your players. The list is saved on the phone.
- **Tap a name** to fix its spelling.
- **✕** removes a player.

## 2. Match setup

- **Players on the field**, including the goalkeeper
- **Goalkeeper**
- **Starting players.** After your first match, the players who played least last time are ticked for you. "Suggest starters from last match" ticks them again if you've changed them.
- **Minutes between substitutions**
- **Players per substitution**
- **Positions** (optional): tick "Give players positions", type a name for each spot (like Left back or Forward), and choose who starts where. Picking a player who already has a spot swaps the two.
- **Field view** (optional, needs positions): adds a picture of the field to the match screen.

Your setup is remembered for the next match.

## 3. During the match

**The clock.** The big countdown shows the time to the next substitution, with the match time underneath.
- **↻** (top-right of the clock) restarts the countdown from the full time, without swapping anyone.
- **Pause** for half-time.

**Substitutions.** When it's time, the phone beeps and vibrates and shows who goes **off** and who comes **on**.
- Tap a name to pick someone else. **✕** removes a pair, and **+ Add another swap** adds one.
- **Done** makes the swaps and restarts the countdown. **Skip** restarts it without changes.

**Other buttons and options:**
- **Swap** swaps players at any time, without changing the countdown.
- **Tap a player** to substitute them now, take them off injured, make them goalkeeper, change position, rename them, or remove them from the match.
- **Add player** is for a late arrival, who comes on at the next substitution.
- **End match** shows the minutes each player played.
- **Move to another phone** (see below).

**What the times mean:**
- The time on the right of each player is their total time on the field.
- For players on the field who have been off before, a small grey time shows how long they've been on since they last came on.

**Positions** (if switched on):
- Each player on the field has a green position tag.
- The player who comes on takes the position of the player who went off.
- To swap two players' positions, tap a player and choose **Change position with…**.
- Bench players show where they last played in a grey tag. The swap lists show positions too, so you can bring on someone for a particular position.

**Field view** (if switched on): **swipe left** on the match screen to see a field with every position and who plays there, the bench below it, and a smaller clock. It's handy for showing the kids. Swipe right, or tap the dots at the top, to go back.
- **Press and hold** a position to arrange them. They wiggle like app icons on an iPhone, and you can drag any of them where you want.
- Tap **Done**, or an empty part of the field, when you've finished. The layout is remembered for the next match.

## How substitutions are chosen

Substitutions rotate:
- The player who has been **on the field longest since they last came on** goes off.
- The player who has **waited longest on the bench** comes on.

This means a player who was in goal for a long time isn't taken off again and again once they're back on the field. The goalkeeper is never substituted unless you choose to. Positions don't change who comes off or on; they only decide where the new player plays.

## Switching phones

To hand over to another coach or another phone in the middle of a match:
1. Tap **Move to another phone** at the bottom of the match screen. Before a match, use **Share team** on the Team screen instead.
2. Send the link (Messages, WhatsApp, AirDrop…).
3. Open the link on the other phone. The team, the setup and the match carry on there, clock and all.

If the other phone uses the installed app on iPhone, copy the link, open the app, and tap **Paste a shared link** on the Team screen instead. The installed app can't read links opened in Safari.

The first phone keeps its match until someone ends it there, so end it once the other phone has taken over.

## Tips

- The screen stays on during the match, and the timer stays correct if the phone locks or the page reloads.
- On iPhone, turn off silent mode to hear the beep. iPhones can't vibrate from a web page.
- Try a practice match with a 1-minute interval before match day.
- The button in the top-right corner switches between **Auto** (follows your phone's dark mode setting), **Light** and **Dark**. Light is easiest to read in bright sunlight.
- If the app looks out of date after an update, close it fully and open it again.

## Development

```sh
npm start        # run locally at http://localhost:8000
npm test         # tests for the substitution rules and share links
npm install      # once, for the browser test
npm run e2e      # browser test of a whole match
```

`git push` to `main` updates the live site in about a minute (GitHub Pages).

See [CLAUDE.md](CLAUDE.md) for how the code works and [PLAN.md](PLAN.md) for the original plan and every decision since.
