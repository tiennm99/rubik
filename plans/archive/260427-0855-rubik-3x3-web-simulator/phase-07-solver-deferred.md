# Phase 7 — Solver (Deferred Post-MVP)

**Priority:** low (nice-to-have)
**Status:** deferred
**LOC budget:** ~120 in 1 file + UI button

## Goal

"Solve" button generates an optimal-ish solution and animates it. Use cubejs (Kociemba two-phase, ~80 KB gz, 4–5 s init, 22-move max).

## Why deferred

- Adds 80 KB to bundle.
- 4–5 s init blocks first interaction unless lazily loaded behind a Web Worker.
- Not needed for casual play; user can solve manually.

## When to revisit

- After the MVP ships and user feedback requests it.
- Or as a "training mode" with step-by-step (CFOP) hints, which is a different (smaller) implementation.

## Implementation sketch

1. Convert authoritative cubie 3D model → 54-character sticker string in face order URFDLB.
2. `import Cube from 'cubejs'` (lazy `import()` triggered on first Solve click).
3. Initialize tables in a Web Worker if init time is intolerable on main thread.
4. `solution = cube.solve(stickerStr)` returns notation string.
5. Run via `algorithm-runner` to animate.

See `research/researcher-260427-0855-rubik-model-and-solver.md` § 6.
