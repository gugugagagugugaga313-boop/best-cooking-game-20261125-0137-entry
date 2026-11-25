# Dapur Purnama — Moonlit Warung Kitchen

[![make.fun](https://make.fun/badge/competition/best-cooking-game-20261125-0137)](https://make.fun/c/best-cooking-game-20261125-0137)
[![make.fun](https://make.fun/badge/submissions/best-cooking-game-20261125-0137)](https://make.fun/c/best-cooking-game-20261125-0137)
[![make.fun](https://make.fun/badge/entrant/dimasadicahya)](https://make.fun/c/best-cooking-game-20261125-0137)

A complete, original cooking game for [make.fun](https://make.fun)'s best-cooking-game bounty. Run a moonlit Indonesian warung kitchen: tickets land on the order board, you grab ingredients from the crates, chop them, wok them, plate them, and serve them before the patience bar runs out.

## How to play

Serve the whole shift (150 seconds) in a desktop browser — keyboard and mouse, no network, no build step:

- **WASD / arrow keys** — walk the cook. Click anywhere to walk there; click a station to use it.
- **E** — interact with the nearest station (hold E to chop).
- **1–6** — grab an ingredient from the crates.
- **Q** — bin what you are holding. **P** — pause. **M** — mute.

The loop: grab a base (nasi / mie / ayam) → chop ayam, sayur and cabai on the board → add everything to the wok → start cooking and pull it out in the green zone (too late and it burns) → plate it → carry the plate to the serve window. A plate that matches a ticket pays its price plus a tip for remaining patience; three serves in a row without a lost ticket pay a combo bonus. Five recipes unlock as you serve; tickets get less patient as the shift goes on, so the rush builds without adding chores.

## Play it locally

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot states for the entry's images: `?shot=start`, `?shot=play`, `?shot=serve`, `?shot=end` (with `?seed=` for a fixed kitchen).

## Layout

- `game/index.html` — canvas page, loads the game.
- `game/src/main.js` — game loop and state machine.
- `game/src/data.js` — ingredients, recipes, difficulty curves.
- `game/src/kitchen.js` — station layout, movement, chop / wok / plate rules.
- `game/src/orders.js` — tickets, patience, scoring and combos.
- `game/src/render.js` — all canvas drawing (every sprite is drawn code, no image files).
- `game/src/audio.js` — synthesized WebAudio soundboard, no audio files.
- `game/src/input.js` — keyboard and mouse.
- `game/src/particles.js` — steam, sparkles, floating score text.
- `game/src/shots.js` — deterministic staged states for screenshots.
- `game/src/random.js` — seeded RNG.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier builder, unchanged.

## License

MIT — see `LICENSE`.
