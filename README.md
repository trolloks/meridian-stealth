# meridian-stealth

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/trolloks/meridian-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/trolloks/meridian-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

NIGHTGLASS is an original top-down 3D museum heist: read the guards' vision cones, slip behind cover, take three Meridian relics and reach the exit unseen.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. The game itself is plain static files under `game/`; any static server pointed at that folder works, and no network request leaves the page.

## The heist

Three wings — the Atrium, the Long Gallery and the Vault — each with its own patrols, cover and security cameras. Guards carry flashlight cones stopped by walls and cover. Crouching shrinks your silhouette, quiets your footsteps and lets a low crate hide you; tall plinths, shelves and display cases hide you standing. A thrown noise lure pulls a patrol off its round to investigate, and the field readout tracks detection, noise, lures and the guards' state. If a cone fills, the alarm spreads: break line of sight, wait for the search to cool, and the patrols return to their rounds.

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move |
| `Shift` | Sneak |
| `E` | Take a relic, or enter the exit |
| `Q` | Throw a noise lure (three per wing) |
| `Esc` | Pause |
| `R` | Restart the wing |

Take all three relics in a wing to unlock its exit. Alarm-raising guards, cameras and the search state are all live on the security plan in the top right.

## Layout

- `game/index.html`, `game/styles.css` — the page and the HUD.
- `game/src/level-data.js` — three heists as data: walls, cover, relics, patrol routes, cameras.
- `game/src/level.js`, `vision.js`, `guard.js`, `player.js` — geometry, line-of-sight cones, patrol/alarm behaviour and movement.
- `game/src/models.js`, `materials.js` — every wall, figure, relic and texture, built from code.
- `game/src/lures.js` — the thrown noise lure and its ping.
- `game/src/hud.js`, `effects.js`, `audio.js`, `camera.js` — overlay, feedback, WebAudio and the isometric camera.
- `game/src/main.js`, `shots.js` — screen flow, fixed-step loop and the screenshot staging.
- `game/vendor/` — three.js, vendored and minified, so the game runs offline.
- `screenshots/` — four real renders of the game (the first is the cover).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output folder and writes `dossier.json` with make.fun's builder.

The game is original: its names, museum, art direction, character designs, level layouts and synthesised sound are all made for this entry. three.js is used as a rendering library under its MIT licence; see `game/vendor/` and `THIRD_PARTY_NOTICES.md`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=22pw7tmq&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
