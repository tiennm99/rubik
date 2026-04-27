# Phase 5 — Keyboard + Svelte UI Shell

**Priority:** high
**Status:** pending
**LOC budget:** ~250 across 4 files
**Depends on:** Phase 1, 2, 3, 4

## Goal

Wire the cube into a Svelte 5 UI: top-level App with a canvas pane and a controls panel containing scramble, reset, undo, timer, and a live move log.

## Files

### `src/lib/controls/keyboard.js` (~70 LOC)
- `setupKeyboard({ onMove, onScramble, onReset, onUndo })` → `{ dispose }`.
- Bindings: `r/R/l/L/u/U/d/D/f/F/b/B/m/M/e/E/s/S/x/y/z` letters trigger move; Shift adds prime; pressing the key followed quickly by `2` (or holding alt?) — keep it simple: just letter + Shift for prime, no double-turn keyboard binding in MVP. Space = scramble. Escape = reset. Z (no shift) = undo. Ignore if focus is in input.

### `src/views/App.svelte` (~50 LOC)
- Two-pane layout: cube canvas (flex 1), controls panel (320px sidebar). Use CSS grid.
- Owns the cube state via `$state` runes: `cubies`, `moveLog`, `isAnimating`, `timer`.

### `src/views/CubeView.svelte` (~80 LOC)
- Renders `<canvas>`. `onMount`: call `initScene`, `buildCubieMeshes`, `setupPointerGesture`, `setupKeyboard`. Start render loop with `requestAnimationFrame`.
- Receives a `commitMove(name)` callback prop that updates `moveLog` in App.
- Cleans up on unmount (dispose scene, cancel rAF).

### `src/views/ControlsPanel.svelte` (~80 LOC)
- Buttons: Scramble (calls `applyAlgorithm(scrambleString)`), Reset, Undo. 
- Timer: starts on first move post-scramble, stops when `isSolved(cubies)`. Displays `mm:ss.cc`.
- Move log: scrollable, shows last ~30 moves separated by space.
- Button styles minimal — black/white for now.

## Cross-cutting helpers

### `src/lib/core/algorithm-runner.js` (~50 LOC, optional)
- `runAlgorithm(name => animateAndCommit(name), names, gapMs = 0)` — sequentially applies a move list with animations. Used by Scramble button.

## Acceptance

- Click Scramble → 20 moves play out with animation, ending in a scrambled cube.
- Press R on keyboard → right face rotates with animation.
- Drag a face → move is logged.
- Timer starts on first move after Scramble, stops at solved.
- Reset clears state and timer; cube returns to solved instantly (no animation needed).

## Notes

- Svelte 5 runes only (`$state`, `$derived`, `$effect`); no stores.
- The Three.js objects live outside Svelte reactivity (in `onMount` closures); changes to cubies are imperative and we call `syncMeshes` only when needed (post-animation it's already correct).
