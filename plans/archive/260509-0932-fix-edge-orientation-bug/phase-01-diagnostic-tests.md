---
phase: 1
title: "Focused regression test"
status: pending
priority: P1
effort: "45m"
dependencies: []
---

# Phase 1: Focused regression test

## Overview

Write a single targeted test for `chooseRotationAxis` that proves the H4/H5 invariant: **`signMul` must depend only on (hitFaceAxis, dragAxis, drag) — not on which cubie on the face was clicked.** Any face-center, edge, or corner cubie on the same face producing the same drag must yield the same signMul.

This test will FAIL on current code and PASS after the Phase-2 fix. It locks in the fix.

## Requirements

**Functional**
- Test exercises `chooseRotationAxis` for face-center vs edge vs corner cubies on each of the 6 faces.
- For each face × drag direction, asserts signMul is identical regardless of which cubie position on that face is clicked.
- Uses a simple deterministic projection function (no real Three.js camera needed).

**Non-functional**
- Test file ≤120 LOC.
- Runs under Vitest in <500ms.
- Independent of dev server / WebGL.

## Architecture

One new test file, no source changes:
```
tests/
  gesture-math.test.js    (new) — H4/H5 invariant test
```

The test uses a hand-rolled `projectFn` that maps a 3D world point to a 2D screen point via a simple tilted-projection (e.g., isometric: `screen.x = world.x - 0.5*world.z`, `screen.y = -(world.y - 0.5*world.z)`). This is enough to make ALL three world axes have non-zero screen projection, exposing the β-leakage bug.

## Related code files

- **Create:** `tests/gesture-math.test.js`
- **Read for context:** `src/lib/controls/gesture-math.js`

## Implementation steps

### Step 1.1 — Build a deterministic isometric projectFn

```js
function makeIsoProject() {
    return (worldVec) => new Vector2(
        worldVec.x - 0.5 * worldVec.z,
        -(worldVec.y - 0.5 * worldVec.z)
    );
}
```

This non-degenerate projection guarantees all 3 axes contribute to screen — exactly the condition under which the β-leakage bug surfaces.

### Step 1.2 — Define cubie sample positions per face

For each face (`+x, -x, +y, -y, +z, -z`):
- Face center: e.g., `(1, 0, 0)` for +x.
- 4 edge cubies on that face: e.g., `(1, ±1, 0)` and `(1, 0, ±1)` for +x.
- 4 corner cubies on that face: e.g., `(1, ±1, ±1)` for +x.

### Step 1.3 — Assert signMul invariant

For each face × cardinal drag direction `(dx, dy) ∈ {(+10, 0), (-10, 0), (0, +10), (0, -10)}`:
1. Compute `signMul_center` from `chooseRotationAxis({hitFaceAxis, hitWorldPos: faceCenter, dx, dy, projectFn})`.
2. For each edge and corner position on that face, compute `signMul_edge`.
3. Assert `signMul_edge === signMul_center` AND `rotAxis_edge === rotAxis_center` (axis must also be face-invariant).

This is the exact H4/H5 invariant. **Fails on current code; passes after Phase 2.**

### Step 1.4 — Add a smoke test pinning expected signMul values for face centers

Hard-code expected `(rotAxis, signMul)` for all 6 faces × 4 cardinal drags. This catches accidental sign-convention regressions in either the math or the projection.

### Step 1.5 — Run

```bash
npm test 2>&1 | tee plans/260509-0932-fix-edge-orientation-bug/baseline-test.log
```

Confirm test FAILS on edge/corner cases (that's expected — proves the bug).

## Todo list

- [ ] 1.1 Add isometric `projectFn` helper inside the test file
- [ ] 1.2 Tabulate face × cubie-position samples
- [ ] 1.3 Implement face-invariance assertion loop (~6 faces × 4 drags × ~9 positions)
- [ ] 1.4 Add 24-row table of expected face-center (rotAxis, signMul)
- [ ] 1.5 Run; capture baseline.log showing failures on edges/corners

## Success criteria

- [ ] `tests/gesture-math.test.js` exists and runs under Vitest.
- [ ] Test FAILS on current code (proves bug exists in the form predicted).
- [ ] Failure message clearly identifies which (face, drag, cubiePos) combination diverges from face-center signMul.

## Risk assessment

- **Risk:** Test passes on current code (bug isn't H4/H5 after all).
  **Mitigation:** If test passes, the algebraic proof was wrong; revisit hypotheses (loop back to brainstorm). Don't apply Phase-2 fix in that case.
- **Risk:** Test's isometric projection doesn't match any real camera angle, so the bug it exposes is theoretical.
  **Mitigation:** The math says β-leakage occurs at *any* camera where face normal and drag axis both have non-zero screen projection — that's most of the orbit camera's range. The isometric projection is representative.

## Next steps

→ Phase 2 (apply faceAnchor fix in `gesture-math.js`).
