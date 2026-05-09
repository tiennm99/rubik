---
phase: 2
title: "faceAnchor fix"
status: pending
priority: P1
effort: "15m"
dependencies: [1]
---

# Phase 2: faceAnchor fix

## Overview

Apply the algebraically-derived fix in `chooseRotationAxis`: project `hitWorldPos` onto the face-normal axis before the cross product, eliminating β-leakage that flips signMul on edge/corner cubies.

## Requirements

**Functional**
- Phase-1 test passes (face-invariance of signMul holds).
- All existing tests still pass.
- Manual repro: drag any edge/corner sticker, rotation matches drag direction.

**Non-functional**
- Single file modified: `src/lib/controls/gesture-math.js`.
- ~5-line diff in `chooseRotationAxis`.
- No new exports, no new dependencies.

## Architecture

Replace the motionWorld computation in `chooseRotationAxis`:

```js
// BEFORE (β leakage on edges/corners)
const motionWorld = new Vector3()
    .crossVectors(AXIS_VECS[rotAxis], hitWorldPos)
    .normalize();

// AFTER (face-anchored, no leakage)
const faceAnchor = new Vector3();
faceAnchor[hitFaceAxis] = hitWorldPos[hitFaceAxis]; // ±1
const motionWorld = new Vector3()
    .crossVectors(AXIS_VECS[rotAxis], faceAnchor)
    .normalize();
```

Why this works: `faceAnchor = αF̂` (only the face-normal component of hitWorldPos). Then `motionWorld = R̂ × αF̂ = -αD̂` — pure tangential. β term vanishes. signMul becomes determined solely by `(hitFaceAxis, rotAxis, dragAxis)` and the camera projection of `D̂`, not by which cubie on the face was clicked.

## Related code files

- **Modify:** `src/lib/controls/gesture-math.js` (lines 50-56)
- **No other changes.**

## Implementation steps

1. Open `src/lib/controls/gesture-math.js`.
2. In `chooseRotationAxis`, locate the `motionWorld` declaration (around line 52).
3. Insert `faceAnchor` construction:
   ```js
   const faceAnchor = new Vector3();
   faceAnchor[hitFaceAxis] = hitWorldPos[hitFaceAxis];
   ```
4. Replace `hitWorldPos` with `faceAnchor` in the `crossVectors` call.
5. Run `npm test` — Phase-1 test must turn green; existing tests must stay green.
6. Run `npm run dev` — manual repro: drag every edge piece on every face from 4 different camera angles. Verify rotation direction matches drag every single time.

## Todo list

- [ ] Edit `gesture-math.js:chooseRotationAxis` — insert faceAnchor, swap arg in crossVectors
- [ ] `npm test` — all green (Phase-1 + existing)
- [ ] Manual repro — 24+ drag combinations succeed
- [ ] If any manual repro fails, capture (face, sticker, drag, expected, actual) and reopen brainstorm — likely a missed sign convention

## Success criteria

- [ ] Phase-1 test passes.
- [ ] `npm test` exits 0.
- [ ] Manual repro: every edge piece × every face × cardinal drag directions × 4 camera azimuths produces correct rotation direction.
- [ ] Diff is ≤8 lines added, ≤3 removed in a single file.

## Risk assessment

- **Risk:** Fix changes behavior for face-center cubies (which currently work).
  **Mitigation:** Algebraically, faceAnchor for face centers is identical to hitWorldPos (β=γ=0 for centers). No change. Phase-1 test's smoke-row covers this — face-center signMul values must remain unchanged.
- **Risk:** Corner cubies (γ≠0) regress.
  **Mitigation:** γ component is along R̂; `R̂ × γR̂ = 0`, contributes nothing to motionWorld. Removing γ from the cross-product input has no effect for corners — the fix is an identity transformation for them too. Phase-1 test covers corners.
- **Risk:** Manual repro still fails despite green tests.
  **Mitigation:** Means the test missed a case. Capture the failing camera+drag+sticker, add to Phase-1 test, repeat fix iteration.

## Security considerations

None — pure client-side gesture math.

## Next steps

→ Phase 3 — keep Phase-1 test in CI as the regression guard.
