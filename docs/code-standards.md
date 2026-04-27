# Code Standards

## Language & Toolchain

- ES modules, modern JS (no TypeScript).
- Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`).
- Three.js for WebGL. Tween.js for animation.
- Vite as build tool. Dev: `npm run dev`. Prod: `npm run build`.

## Naming

- Plain JS files: **kebab-case** with descriptive names (`apply-move.js`, `pointer-gesture.js`).
- Svelte components: **PascalCase.svelte** per ecosystem convention (`CubeView.svelte`).
- Functions and variables: camelCase. Constants: UPPER_SNAKE for module-level tuning knobs (`DEAD_ZONE_PX`, `PIXELS_PER_QUARTER_TURN`).

## File Size

- Code files must stay under 200 lines of code.
- Refactor when a file exceeds the limit; split by concern (e.g., `pointer-gesture.js` + `gesture-math.js`).

## Architecture Rules

- **Core** (`src/lib/core/`) is pure JS. No Svelte, no Three.js imports. Authoritative cube state, move algebra, parser, scrambler, solved check. Unit-testable from Node.
- **Render** (`src/lib/render/`) is the Three.js layer. Owns scene/camera/renderer, mesh construction, animation. May import from `core/` but never the other way around.
- **Controls** (`src/lib/controls/`) handles user input. Imports from `render/` and `core/` as needed.
- **Views** (`src/views/`) are Svelte components. Each owns layout + Svelte state. May call into the other layers but never the inverse.
- The Three.js cube model and the JS cube state are kept in sync explicitly via `applyMove` + `syncMeshes` (or, post-animation, via `pivot.attach` baking).

## Style

- Prefer composition over inheritance.
- Fail loudly during development (throw on unknown move tokens), fail gracefully at runtime.
- Comments: short, explain *why*, not *what*. File headers give a one-sentence purpose.

## Git / Commits

- Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- Never commit dotenv files, build artifacts, or secrets.
- Run `npm run build` before pushing to catch compile errors.

## Testing Strategy

- Pure-JS smoke test at `scripts/smoke-test-core.mjs` covers the cube algebra.
- No automated UI tests yet (matches sokoban). Manual smoke test: scramble → undo until solved → confirm timer stops.
