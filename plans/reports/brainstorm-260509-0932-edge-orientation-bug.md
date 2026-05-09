# Brainstorm — Edge orientation bug (drag-gesture path)

**Date:** 2026-05-09
**Repro path (confirmed by user):** mouse/touch drag-to-rotate face
**Approach (confirmed by user):** add diagnostic tests first to localize root cause before fixing

---

## Problem statement

Users report edges sometimes render in the wrong direction after dragging a face. Symptom is visual; trigger is the drag-gesture path, not keyboard moves.

## Code paths involved

| File | Role |
|------|------|
| `src/lib/controls/pointer-gesture.js` | State machine: PROBING → DRAGGING → snap. Builds `spec` from drag angle. |
| `src/lib/controls/gesture-math.js` | `chooseRotationAxis` (axis lock + `signMul`), `classifyFaceAxis`, `specToName`. |
| `src/lib/render/animate-move.js` | `snapAndAnimate` → `tweenPivot`: tweens pivot, attaches meshes back, calls `applyMove`, then `syncMeshes`. |
| `src/lib/core/apply-move.js` | `applyMove`, `quatFromAxis90`, `multiplyQuat`, `normalizeQuat`. |
| `src/lib/render/cubie-meshes.js` | `syncMeshes` (model→mesh), `readMeshIntoCubie` (mesh→model, currently UNUSED in drag path). |

## Key observation — two parallel state-update paths converge in `tweenPivot`

After the pivot tween completes (animate-move.js:37–46):

1. **Visual path:** `parentGroup.attach(mesh)` bakes the pivot's world rotation into each mesh's local quaternion.
2. **Logical path:** `applyMove(cubies, spec)` recomputes a new model quaternion via `multiplyQuat(quatFromAxis90, prev)`.
3. **Reconciliation:** `syncMeshes(meshes)` overwrites mesh quaternion from the model.

If step 1 and step 2 disagree by sign or by axis, step 3 produces a visible snap. The most plausible *visible* divergence sources, ranked:

| # | Source | Likelihood | Why |
|---|--------|-----------|-----|
| 1 | `signMul` mis-determination in `chooseRotationAxis` near ambiguous viewing angles | **High** | Edge pieces sit at corners of two face projections; small numerical edge cases flip the sign. |
| 2 | Wrong `layerIndex` when cubie position floats slightly off integer | Medium | `Math.round` covers most drift, but accumulation could push past 0.5. |
| 3 | Quaternion double-cover (`-q` vs `q`) producing different slerp paths on subsequent animations | Medium | Same final matrix, but mid-animation interpolation could *visually* go the long way. |
| 4 | `normalizeQuat` mutating in place but not enforcing canonical sign | Low (cosmetic) | Math is identical; doesn't visually surface alone. |
| 5 | Floating-point drift across many drag-snap cycles in mesh quaternion | Low | Render reads from model each tick; drift would have to come back via `readMeshIntoCubie` (not currently called). |

## Approaches considered

### A. Diagnostic-first → targeted fix (chosen)

Add focused tests + runtime asserts to pinpoint which divergence occurs in practice, then patch root cause.

- **Pros:** correctness-first, smallest possible final diff, surfaces invariant violations not just symptoms.
- **Cons:** two-step process; takes longer than guessing a fix.
- **Blast radius:** tiny — tests only, then a focused patch.

### B. Canonicalize quaternions globally (`w ≥ 0` after every `normalizeQuat`)

- **Pros:** one-line change.
- **Cons:** doesn't address the leading hypothesis (signMul bug); could mask a real bug.
- **Blast radius:** small; might invalidate a test that depends on raw quaternion shape.

### C. Refactor core to orientation-index 0..23 (cube rotation group)

- **Pros:** algebraically bullet-proof; impossible to accumulate FP drift.
- **Cons:** large diff; render layer still needs quaternion for tweening; YAGNI for this bug.
- **Blast radius:** large.

### D. Replace `applyMove` in `tweenPivot` with `readMeshIntoCubie` (visual is truth)

- **Pros:** single source of truth — mesh wins, model follows.
- **Cons:** model becomes lossy (non-canonical FP). Re-introduces drift over many gestures.
- **Blast radius:** medium.

## Recommended plan (matches user's "diagnostic first" choice)

### Phase 1 — Diagnostic tests (localize)

1. **Drag-axis sign tests** (`tests/gesture-math.test.js`): for each of 6 face hits + 4 cardinal drag directions × 8 representative camera angles, assert that `chooseRotationAxis` returns the rotation axis + signMul that, when fed to `applyMove`, produces the rotation a human would expect. Tabulate the matrix.
2. **Snap convergence test** (`tests/animate-move.test.js`, headless): simulate `snapAndAnimate` with a fake pivot/meshes, assert post-snap mesh quaternion equals the model quaternion to within 1e-9 (after canonicalization), for every (axis, sign, count) combo.
3. **Repeated-drag idempotency** (`tests/apply-move.test.js`): for each face, assert `M⁴`, `R⁴`, `U⁴`, etc., return cubies to identity quaternion AND `[0,0,0,1]` canonical form. Catches double-cover.
4. **Edge-piece specific**: for each of the 12 edge cubies, after applying every WCA face/slice move once, assert `(home, position, quaternion)` matches a hand-computed table.

### Phase 2 — Fix root cause (informed by Phase 1)

Likely candidates depending on which test fails:
- If (1) fails: fix sign computation in `chooseRotationAxis` for ambiguous viewing angles.
- If (2) fails: align `tweenPivot` final state with `applyMove` semantics.
- If (3) fails: enforce `w ≥ 0` canonical form in `normalizeQuat`.
- If (4) fails: fix specific `quatFromAxis90` / `rotatePosition90` entry.

### Phase 3 — Regression guard

- Keep all Phase-1 tests in CI.
- Add one E2E test that scripts a sequence of drag gestures via synthetic pointer events and verifies cube state matches a recorded golden.

## Success criteria

- All Phase-1 tests pass.
- Manual repro (drag any edge piece on each face from each camera angle) no longer shows wrong direction.
- No regressions in existing test suites (`apply-move.test.js`, `cube-to-facelets.test.js`, `solver.test.js`, `cubie-model.test.js`).

## Risks

- **Heisenbug risk:** the bug may only surface at specific camera azimuths. Phase-1 must enumerate camera angles, not test only the default view.
- **Test scaffolding for `chooseRotationAxis`** needs a fake camera with controlled projection — small but non-trivial helper.
- **No regression of keyboard moves**: Phase-2 fix must not break the keyboard path that already works.

## Unresolved questions

- Does the user have a recorded reproduction (specific camera angle + face + drag direction) that consistently triggers the bug? Would shortcut Phase-1 enumeration.
- Is there a target browser/device where the bug appears more often (touch vs mouse)?
- Is `readMeshIntoCubie` actually unused, or used by some path I missed (e.g., camera reset, scene re-init)?
