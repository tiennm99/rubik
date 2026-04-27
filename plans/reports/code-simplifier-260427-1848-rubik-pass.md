# Code Simplifier Pass — Rubik 3x3

Date: 2026-04-27
Tests: 41/41 pass before & after. `npm run build` succeeds.

## Changes

### `src/lib/render/animate-move.js` (96 → 80 LOC)
- Extracted shared `tweenPivot()` helper. `animateMove` now builds the pivot
  + populates moving meshes, `snapAndAnimate` accepts a pre-populated pivot.
  Both delegate the tween + bake-back to one body.
- Dropped unused `Quaternion, Vector3` imports.
- Eliminated docblock about `applyMoveFn` (param was renamed earlier).

### `src/lib/controls/pointer-gesture.js` (205 → 190 LOC)
- Collapsed `abortGesture` + `finishGesture` + dispose's busy-release into
  one idempotent `endGesture()`. The `ownedBusy` guard already gives correct
  per-gesture semantics (only the gesture that took busy releases it), so the
  three teardown paths were structurally identical except for the busy line.
- `dispose` now always calls `endGesture` (no-op when state is IDLE).

### `src/views/App.svelte` (113 → 105 LOC)
- Removed the `solving` $state flag. It was true for one extra microtask
  beyond `busy` and otherwise redundant.
- `runSolveStep` simplified to a fire-and-forget `controller?.solveStep()`.

### `src/views/ControlsPanel.svelte`
- `solving` derived locally as `busy && !solveActive` (i.e. busy with no plan
  materialized yet = cubejs lazy-load + table init phase). Same observable
  label transitions as before.
- Solve button `disabled={solving || busy}` simplified to `disabled={busy}`
  (since solving implies busy).

### `src/views/CubeView.svelte` (172 → 184 LOC, but cleaner)
- Dropped the early-return guard inside `clearSolvePlan` — two assignments
  don't need a guard.
- Inlined scramble's `parseAlgorithm` loop.
- Split `solveStep`'s try/catch+finally into a separate `computeSolvePlan`
  helper that returns `[]` on solver failure. Reads top-to-bottom now.
- File grew slightly (added helper) but the long async block is now scannable.

## Left Alone
- `src/views/ControlsPanel.svelte` style block (>200 total but ~30 script LOC).
- `src/lib/render/cubie-meshes.js` — `disposeCubieMeshes` is fine as-is.
- `src/lib/render/scene-setup.js`, `keyboard.js`, `gesture-math.js`, `core/*` — no
  duplication found worth touching.
- Comments preserved where they explain non-obvious "why" (busy-ownership,
  v25 tween group semantics, the cubejs gating window).

## Unresolved Qs
- None.
