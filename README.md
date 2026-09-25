# Substitutor

A phone-friendly web app for fair substitutions in kids' football matches.

1. Add your team.
2. Set up the match: players on the field (including the goalkeeper), the goalkeeper, the starting players, minutes between substitutions, and players per substitution.
3. Start the match. When it's time, the phone beeps and vibrates and shows who goes off and who comes on. You can change the suggestion, then press **Done** to restart the timer.

Players with the most minutes come off first, and players with the fewest minutes come on first, so playing time evens out over the match. The goalkeeper is never substituted automatically. Tap a player for ad-hoc swaps, injuries, or a goalkeeper change.

Everything is saved in the browser, so an accidental reload doesn't lose the match.

## Run locally

```sh
npm start        # then open http://localhost:8000
npm test         # tests for the substitution logic
```

## Deploy

Push to GitHub, then choose Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
