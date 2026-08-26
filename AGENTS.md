# AGENTS.md

## Overview

Asteroids clone in plain HTML5 Canvas + JavaScript. No frameworks, no bundler, no dependencies, no `package.json`.

## Running

Open `index.html` directly in a browser (works via `file://` — `game.js` is a plain script, not a module), or:

```bash
npx serve .
```

## Tooling

There is no build, lint, typecheck, or test setup. Do not run `npm install` or invent test commands. Verify changes by opening the game in a browser.

## Architecture

- All game logic lives in a single file, `game.js`, loaded by `index.html`.
- Canvas is fixed at 800×600, set in both `index.html` (canvas attributes) and `game.js` (`W`/`H` constants). Keep them in sync.
- Core structure: `update(dt)` / `draw()` called from a `requestAnimationFrame` loop; game state machine `state` ∈ `'playing' | 'dead' | 'gameover'`.
- Space is toroidal: all movement goes through `wrap(v, max)`.
- Input: `keys` (held) and `justPressed`/`pressed(code)` (single-shot, e.g. shooting). `pressed()` consumes the flag, so it must be called once per frame.
- Asteroid size/points data is in the `RADII`/`SPEEDS`/`POINTS` lookup arrays (index = size 1–3).

## Conventions

- Comments and all user-facing strings (HUD, overlays) are in Spanish. Match this.
- Style: single quotes, 2-space indent, semicolons, `const` by default.

## Known doc drift

`README.md` advertises power-ups and a "estrella fugaz" asteroid type that do not exist in the code. The code is the source of truth; don't treat the README feature list as a spec.
