# Rubik's 3x3 Web Simulator — Implementation Plan

**Created:** 2026-04-27
**Repo:** `tiennm99/rubik` → `https://tiennm99.github.io/rubik/`
**Stack:** Vite + Svelte 5 (runes) + Three.js + Tween.js, plain JS

## Goal

Browser-based interactive 3x3 Rubik's cube. Three.js rendering, drag-to-rotate face gestures, keyboard notation, scramble + timer + undo + move log. Deployable to GitHub Pages.

## Architectural Pillars

1. **3D coordinates as source of truth** — each of 27 cubies = `{position, quaternion, initialPosition}`. Solver-friendly permutation indices derived only when needed (deferred).
2. **Move pipeline** — notation string → move spec `{axis, layer, sign, count}` → rotate cubies in layer + snap to integer grid → optional animation via temporary `THREE.Group` reparent + Tween + bake.
3. **Input layering** — Pointer raycast → tangent-plane axis lock → drag-to-angle. Misses fall through to OrbitControls. Keyboard always active.
4. **File size discipline** — every code file < 200 LOC. Split aggressively.

## Phase Status

| # | Phase | Status | LOC actual |
|---|-------|--------|-----------|
| 0 | [Project scaffold](./phase-00-project-scaffold.md) | done | scaffolded (Vite + Svelte 5 + Three.js + Tween) |
| 1 | [Cube model + move logic](./phase-01-cube-model.md) | done | 272 (core/) |
| 2 | [Three.js scene + cubie meshes](./phase-02-rendering.md) | done | 163 (scene+meshes) |
| 3 | [Move animation (Group reparent + Tween)](./phase-03-animation.md) | done | 78 (animate-move) |
| 4 | [Drag-to-rotate gesture](./phase-04-interaction.md) | done | 252 (gesture-math + pointer-gesture) |
| 5 | [Keyboard + Svelte UI shell](./phase-05-ui-shell.md) | done | 399 (views/ + keyboard) |
| 6 | [Polish, build, GH Pages deploy](./phase-06-polish-deploy.md) | done | dist=550 KB (144 KB gz); CI workflow live |
| 7 | [Solver (cubejs) — deferred post-MVP](./phase-07-solver-deferred.md) | done | 116 (cube-to-facelets + solver) + Solve button; lazy-loaded chunk |
| T | Vitest unit tests for core | done | 9 specs, 39 tests, ~3 s |

## Research

- [Rendering (Three.js)](./research/researcher-260427-0856-rubik-rendering-threejs.md)
- [Cube model + solver](./research/researcher-260427-0855-rubik-model-and-solver.md)
- [Interaction UX](./research/researcher-260427-0857-rubik-interaction-ux.md)

## Key Dependencies

- `three` (~155 KB gz) + addons `OrbitControls`, `RoundedBoxGeometry`
- `@tweenjs/tween.js` (~6 KB gz)
- `svelte` 5, `vite` 6, `@sveltejs/vite-plugin-svelte`

## Out of Scope (v1)

- Auto-solver (cubejs) — phase 7 (deferred)
- Mobile-first multi-touch (pinch zoom)
- Color-blind palette
- Persistent stats / best times
- Tutorial / step-by-step solve guide
