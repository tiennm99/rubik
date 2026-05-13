# Rubik's 3x3 — Web Simulator

Interactive 3D Rubik's cube in the browser. Three.js rendering, drag-to-rotate face gestures, keyboard notation, scramble + timer + undo.

Live: <https://tiennm99.github.io/rubik/>

## Stack

- Three.js (WebGL rendering)
- Svelte 5 with runes (UI shell)
- Tween.js (move animation)
- Vite (build)

## Dev

```bash
pnpm install
pnpm dev          # http://localhost:8080
pnpm dev:codeserver  # behind code-server proxy (set CODESERVER_HOST in .env.local)
pnpm build        # → ../dist
```

## Controls

| Input | Action |
|-------|--------|
| Drag a sticker | Rotate that face |
| Drag empty space | Orbit camera |
| `R L U D F B M E S` | Quarter-turn moves |
| Shift + letter | Inverse (prime) |
| `x y z` | Cube rotations |
| Space | Scramble |
| `Z` | Undo |
| Esc | Reset |

## Project Layout

```
src/
  main.js
  app.css
  views/             Svelte components (UI)
  lib/
    core/            Pure JS — cube state, moves, scramble, parser
    render/          Three.js scene + cubie meshes + animation
    controls/        Pointer gesture + keyboard
plans/               Implementation plans + research reports
docs/                Project documentation
vite/                Per-environment Vite configs
```

## License

Apache-2.0
