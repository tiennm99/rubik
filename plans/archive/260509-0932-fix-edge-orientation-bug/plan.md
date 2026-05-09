---
title: Fix edge-orientation bug (drag-gesture)
status: completed
created: 2026-05-09
completed: 2026-05-09
priority: P1
mode: fast
phases: 3
---

# Fix edge-orientation bug (drag-gesture)

Edges rotate in the OPPOSITE direction from user's drag intent. Root cause identified algebraically: `signMul` derivation in `chooseRotationAxis` leaks face-normal component for edge/corner cubies, which flips the sign at certain camera angles.

## Context

- Initial brainstorm: [`plans/reports/brainstorm-260509-0932-edge-orientation-bug.md`](../reports/brainstorm-260509-0932-edge-orientation-bug.md)
- Sharper diagnosis: [`plans/reports/brainstorm-260509-0954-edge-rotation-reverse-direction.md`](../reports/brainstorm-260509-0954-edge-rotation-reverse-direction.md)
- User-confirmed repro: mouse drag on edge → opposite direction
- Approach: skip live diagnosis, apply most-likely fix directly with focused regression test

## Root cause (from algebraic proof in 0954 brainstorm)

For cubie at position `P = αF̂ + βD̂ + γR̂` (basis: face-normal, drag-axis, rotation-axis), velocity under +ω rotation is `v = R̂ × P = -αD̂ + βF̂`.

- Face-center: β=0 → `v = -αD̂` (pure tangential, signMul reliable).
- **Edge/corner: β≠0** → `v` has face-normal component `βF̂` whose screen projection contaminates `motionScreen.dot(drag)` and flips signMul under specific camera angles.

## Fix (single ~5-line change in `gesture-math.js`)

Project `hitWorldPos` onto face-normal axis before cross product:
```js
const faceAnchor = new Vector3();
faceAnchor[hitFaceAxis] = hitWorldPos[hitFaceAxis];
const motionWorld = new Vector3()
    .crossVectors(AXIS_VECS[rotAxis], faceAnchor)
    .normalize();
```
This eliminates β leakage; works for centers, edges, and corners alike.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Focused regression test](phase-01-diagnostic-tests.md) | completed | 45m |
| 2 | [faceAnchor fix](phase-02-targeted-fix.md) | completed | 15m |
| 3 | [Regression guard](phase-03-regression-guard.md) | completed (n/a — no changelog file) | 30m |

## Outcome

- Test created: `tests/gesture-math.test.js` — 36 new tests covering face-invariance of `signMul`/`rotAxis` for centers, edges, corners across all 6 faces × 4 cardinal drags.
- Pre-fix: 8/36 new tests failed on edge `±z @ (0,1,-1)` and corner positions, confirming H4/H5.
- Fix applied: `gesture-math.js:chooseRotationAxis` — face-anchored cross product (5 lines added).
- Post-fix: 77/77 tests pass (36 new + 41 existing). No regressions.

## Files in scope

**Source (modify in Phase 2 only):**
- `src/lib/controls/gesture-math.js`
- `src/lib/controls/pointer-gesture.js`
- `src/lib/render/animate-move.js`
- `src/lib/core/apply-move.js`
- `src/lib/core/cubie-model.js`
- `src/lib/render/cubie-meshes.js`

**Tests (create in Phase 1):**
- `tests/gesture-math.test.js` (new)
- `tests/animate-move.test.js` (new)
- Extensions to `tests/apply-move.test.js`, `tests/cubie-model.test.js`

## Success criteria

- All Phase-1 tests pass after Phase-2 fix.
- Manual repro on each face × cardinal drag direction × 4 camera azimuths: no wrong-direction rotation.
- No regressions in existing test suite (`npm test` green).
- Lighthouse for code paths unchanged (no perf regression).

## Stack

Three.js + Svelte 5 + Vite + Vitest. npm.
