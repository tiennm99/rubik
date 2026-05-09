# Brainstorm — Edge rotation reverses direction (sharpened)

**Date:** 2026-05-09 09:54
**Repro (user):** mouse-drag on edge piece rotates cube in OPPOSITE direction from intent
**Approach (user):** skip live diagnosis, propose most-likely fix; update existing plan to reflect sharper diagnosis

Builds on: [`brainstorm-260509-0932-edge-orientation-bug.md`](./brainstorm-260509-0932-edge-orientation-bug.md)

---

## Problem statement (refined)

Pure sign-flip on edge cubies. No quaternion drift, no double-cover. The rotation goes the wrong way — model and visual agree on direction, but both are inverted from user expectation.

## Hypothesis verdict

| H | Verdict | Reason |
|---|---------|--------|
| H1: classifyFaceAxis loses sign info | ✗ Eliminated | hitFaceAxis only used in `filter()`, sign irrelevant. |
| H2: stale hitWorldPos after prior moves | ✗ Eliminated | `getWorldPosition()` always current. |
| H3: normalized vs raw screen vector mismatch | ✗ Provably wrong | `Math.sign(a·b)` invariant to positive scaling. |
| H4/H5: edge cubie velocity has face-normal leakage that flips signMul | ✓ **Most likely** | See algebraic proof below. |

## Algebraic proof of H4/H5

For cubie at position `P`, instantaneous velocity under +ω rotation around `R̂` is

```
v = R̂ × P
```

Decompose `P` along basis `(F̂, D̂, R̂)` where `F̂` = face normal, `D̂` = in-face drag axis, `R̂` = rotation axis (right-handed: `F̂ × D̂ = R̂`):

```
P = αF̂ + βD̂ + γR̂
```

Then:

```
v = R̂ × P = α(R̂ × F̂) + β(R̂ × D̂) + γ(R̂ × R̂)
           = α(-D̂) + β(F̂) + 0
           = -αD̂ + βF̂
```

- `-αD̂` is the in-face tangential component (proportional to face-normal coordinate `α`).
- `βF̂` is the face-normal component (proportional to in-face drag-axis coordinate `β`).

For **face-center cubies**, `β = 0` (the cubie sits on the face normal axis). So `v = -αD̂` — pure tangential. Screen projection of `v` projects cleanly onto `screenDirs[D̂]` direction, signMul is reliable.

For **edge cubies**, `β ≠ 0` (e.g., (1, 0, 1) has α=1 along x̂, β=1 along ẑ). So `v = -αD̂ + βF̂` — has a face-normal component. The screen projection of `βF̂` is NOT zero in general (face normal usually has a screen component except when looking square-on to face). At certain camera angles, `screen(βF̂)` can dominate `screen(-αD̂)`, flipping the sign of `motionScreen.dot(drag)`.

**This is the bug.** The signMul derivation works for face-center cubies (where β=0) but fails for edge/corner cubies (where β≠0).

## Proposed fix

In `gesture-math.js:chooseRotationAxis`, replace `hitWorldPos` with its projection onto the face-normal axis before the cross product:

```js
// BEFORE: motionWorld depends on full cubie position (β leakage on edges)
const motionWorld = new Vector3()
    .crossVectors(AXIS_VECS[rotAxis], hitWorldPos)
    .normalize();

// AFTER: motionWorld uses only face-normal coordinate (β = 0, no leakage)
const faceAnchor = new Vector3();
faceAnchor[hitFaceAxis] = hitWorldPos[hitFaceAxis]; // ±1 (or ±2 for big cube)
const motionWorld = new Vector3()
    .crossVectors(AXIS_VECS[rotAxis], faceAnchor)
    .normalize();
```

**Why this works:** `faceAnchor` is `αF̂` (only the face-normal component of `P`). Cross product with `R̂` gives `R̂ × αF̂ = -αD̂` — pure tangential. No face-normal leakage. signMul becomes reliable for *all* cubies on a face: center, edge, and corner.

**Diff size:** ~5 lines in one file. No other code changes needed.

## Alternative fixes considered

| Approach | Verdict |
|----------|---------|
| Tiebreak when `||projs[0]| - |projs[1]|| < ε` | Treats symptom only — doesn't fix cubies where the wrong axis is *strongly* picked. |
| Use `screenDirs[dragAxisIdx]` as motionWorld proxy | Loses the rotation-direction info; can't determine signMul. |
| Refactor signMul derivation to use scalar triple product | Equivalent algebraically; same diff. |
| Patch motionScreen to subtract face-normal component | Possible, but more code; the faceAnchor fix is simpler. |

The faceAnchor fix is **algebraically minimal** — one substitution, eliminates the bug class.

## Plan update (replaces phase-01-diagnostic-tests.md)

- **Drop** the 96-case signMul matrix.
- **Add** a focused targeted test: 12 edge cubies × 6 face stickers each (where applicable) × 4 cardinal drag directions × 1 default camera. ~50 cases. The test asserts `signMul` from `chooseRotationAxis` produces a `spec` whose `applyMove` rotates the cubie in the screen direction matching the drag, AND that the returned signMul is identical to what a face-center cubie on the same face/drag would produce (the H4/H5 invariant: signMul depends on face, not on which cubie).
- **Phase 2** applies the faceAnchor fix.

## Success criteria

- All edge cubies produce correct `signMul` for all face/drag combos (matches face-center invariant).
- Manual repro: drag any edge piece, rotation matches drag direction.
- No regression on existing tests.

## Risks

- **Risk:** faceAnchor fix breaks corner cubie behavior.
  **Check:** Corner cubies have α≠0, β≠0, γ≠0. Same proof applies — `v = -αD̂ + βF̂` regardless of γ. Fix removes β leakage; γ is along `R̂` and contributes 0 to `v`. So corners get same fix benefit. ✓
- **Risk:** faceAnchor fix changes face-center cubie behavior.
  **Check:** Face-center has β=0 already. Replacing `hitWorldPos = αF̂ + 0·D̂ + 0·R̂` with `faceAnchor = αF̂` gives identical result. No change. ✓

## Unresolved questions

- Are there hand-tested camera angles where the bug *doesn't* reproduce? Would let us validate the fix's coverage.
- Does the bug affect corner cubies too? The proof says yes (same β≠0 pattern), but user's report mentions edges specifically.
