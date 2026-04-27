# Code Review — Rubik 3x3 Web Simulator (Full Pass)

**Date:** 2026-04-27
**Reviewer:** code-reviewer
**Scope:** `src/lib/core/`, `src/lib/render/`, `src/lib/controls/`, `src/views/`
**Status:** DONE_WITH_CONCERNS

## Summary

Code is small, well-structured, mostly idiomatic Svelte 5 + Three.js. Cubie/quaternion math is sound. Two **Critical** correctness bugs around the busy/solving gate, one **High** memory/promise leak on unmount, several **High/Medium** UX and a11y gaps. One file over the 200-LOC budget.

---

## Critical

### C1. Solver compute window is unguarded — drag/keyboard can mutate cubies mid-solve
**Files:** `src/views/CubeView.svelte:115-133`, `src/views/App.svelte:17-25`
- `solveStep` does `await import(...)` + `await solveCubies(cubies)` (4–5 s on first call) WITHOUT setting `busy = true`. App-level `solving` flag is set, but pointer-gesture (`pointer-gesture.js:53`) and `triggerMove` (`CubeView.svelte:69`) gate only on local `busy`.
- Outcome: during the table-init wait the user can drag a face, scramble, type R/U/F. Solver returns an algorithm computed against the *original* state and we play it back on the *new* state → cube ends in garbage, no error surfaced.
- **Fix:** at the top of `solveStep`, set `busy = true` before `await import`; clear it after `solveQueue` is populated (or in a `try/finally`). One-line edit, no new file needed.

### C2. `lockAxis` unblocks busy mid-animation
**File:** `src/lib/controls/pointer-gesture.js:71-76`
- If a keyboard move fires while pointer is in `STATE_PROBING`, `triggerMove` sets `busy=true` and starts an animation. Pointer crosses dead-zone, `lockAxis` sees `isBusy()===true` and calls `cleanup()` → `setBusy(false)` while the keyboard-driven animation is still running.
- Now another op can race the in-flight animation — second `applyMove` against half-rotated state. Result: silent state corruption.
- **Fix:** in the busy-during-PROBING branch don't call `cleanup()`; do a local-only reset that does NOT touch `setBusy`. Equivalently: factor out `localCleanup()` that skips `setBusy(false)` and call it here.

---

## High

### H1. `animateMove` softlocks if `onComplete` throws before `resolve()`
**File:** `src/lib/render/animate-move.js:46-57`, `61-83`
- `onComplete` runs `pivot.updateMatrixWorld`, mesh reattach loop, `applyMove`, `syncMeshes`, then `resolve()`. Any throw before line 55/79 leaves the Promise pending forever; awaiter (`triggerMove`/`animateAndCommit`/`solveStep`) leaves `busy=true`.
- **Fix:** wrap onComplete body in `try { ... } finally { resolve(); }` (or pass `(value)` and resolve in finally with a status flag).

### H2. Three.js geometry/materials never disposed on unmount → GPU leak
**Files:** `src/lib/render/scene-setup.js:60-64`, `src/lib/render/cubie-meshes.js:29-51`
- `sceneCtx.dispose()` calls `renderer.dispose()` only. Per-cubie `MeshStandardMaterial` instances (≈108 unique) and the singleton `RoundedBoxGeometry` are not disposed. `renderer.dispose()` only frees the GL context state, not geometry/material GPU buffers.
- HMR or any re-mount accumulates GPU memory and inflates handle counts; long-lived dev sessions OOM the WebGL context.
- **Fix:** in `cubie-meshes.js` export a `disposeCubieMeshes(meshes)` that traverses meshes, disposes each material array entry (dedup-safe with a `Set`) and disposes `geometrySingleton` (then `geometrySingleton = null`). Call it from CubeView’s cleanup before `sceneCtx.dispose()`. Stays under 200 LOC easily (~12 lines).

### H3. Pending tweens leak across unmount; orphaned `onComplete` runs against stale scene
**File:** `src/lib/render/animate-move.js:17-21`, `src/views/CubeView.svelte:155-160`
- `TWEENS` is a module-scoped `TweenGroup`. Cleanup cancels the RAF (so `tickTweens` no longer fires) but does NOT remove in-flight tweens. On a quick unmount→remount, leftover tweens still live in the group; on the next `tickTweens()` they finish, calling `parentGroup.attach(...)` on the OLD parentGroup (orphan tree) → silent corruption of the new mount.
- **Fix:** export `clearTweens()` that calls `TWEENS.removeAll()` and call from CubeView dispose.

### H4. `move-log` keyed with `Math.random()` defeats reconciliation
**File:** `src/views/ControlsPanel.svelte:73`
- `{#each visibleLog as move (move + Math.random())}` regenerates every key every render → full subtree teardown/rebuild on every move. Cheap today (40 nodes max) but pure anti-pattern; will surprise future code that adds animations or focus state.
- **Fix:** drop the key (`{#each visibleLog as move, i}`) — order matters here, no identity, key not needed.

### H5. cubejs solver errors swallowed, no user feedback
**Files:** `src/lib/core/solver.js:27-32`, `src/views/App.svelte:17-25`, `src/views/CubeView.svelte:118-124`
- `cube.solve()` throws on invalid permutation/parity (cube state corrupted by some bug, e.g. C1/C2 above). App's `try/finally` clears `solving` but lets the rejection escape unhandled → console error only; UI stays in "Solve step-by-step" with no toast.
- **Fix:** wrap the inner await in `solveStep` in `try { ... } catch (e) { console.error(e); /* best-effort: alert or noop */ }`. Cheap one-screen fix; consider exposing a small status string later if needed.

---

## Medium

### M1. `pointer-gesture` doesn't filter foreign pointerIds
**File:** `src/lib/controls/pointer-gesture.js:103-116`, `118-146`
- `onPointerMove`/`onPointerUp` don't check `e.pointerId === pointerId`. A second touch on the canvas during a drag (multitouch laptop trackpad, two-finger scroll) feeds garbage `dx/dy` into the angle math.
- **Fix:** early-return when `e.pointerId !== pointerId` in both move and up handlers.

### M2. ControlsPanel exceeds 200-LOC budget
**File:** `src/views/ControlsPanel.svelte` (222 LOC)
- Mostly CSS (lines 90–222). Project rule says "Markdown, plain text, bash scripts, configuration files… do not modularize" — CSS-in-component arguably similar, but rule lists code files. Pragmatically CSS bulk doesn't hurt.
- **Fix (light):** move the `<style>` block to `src/views/controls-panel.css` and `import` it from `<script>` (Svelte supports global CSS via `import`). Or accept and document the deviation. Don't split logic — there's barely any.

### M3. Action buttons have no disabled state during animation
**File:** `src/views/ControlsPanel.svelte:42-49`, `src/views/App.svelte:65-83`
- Scramble/Undo/Reset are clickable while `busy`. CubeView no-ops them silently. User sees nothing — feels broken.
- **Fix:** lift `busy` from CubeView via a `$bindable` (mirror `solveQueue` pattern) and pass to ControlsPanel; bind `disabled={busy || solving}` on the three buttons. ~6 LOC.

### M4. Undo of `[scramble]` log entry is dead code
**File:** `src/views/CubeView.svelte:90-101`
- `scramble()` resets `history = []` (line 85), so `history` never contains a `[scramble]` token. The `lastName.startsWith('[')` guard at line 93 is unreachable. Either remove (DRY) or document why kept.
- **Fix:** delete lines 92–93's bracket guard; `history` only ever holds bare move names.

### M5. `gesture-math.chooseRotationAxis` divides by zero when projected drag is degenerate
**File:** `src/lib/controls/gesture-math.js:32-49`
- `screenDirs[i].sub(screenOrigin).normalize()` on a near-zero vector returns (0,0). Then both `projs` are ~0; tie-break picks index 0 arbitrarily. `motionScreen.dot(drag)` could be 0; `signMul` = 1.
- Edge case: camera looking exactly along an axis and pointing-down face. Rare but reproducible by dragging on the U sticker after `y` rotations bring it directly under the camera.
- **Fix:** if `Math.abs(projs[0]) + Math.abs(projs[1]) < 1e-3`, fall back to `dragAxis = inPlane[Math.abs(dx) > Math.abs(dy) ? 0 : 1]` based on raw screen delta.

### M6. `App.svelte:49 export function onSolved` is dead
**File:** `src/views/App.svelte:49-51`
- Module-scoped `export function onSolved()` is never imported anywhere; the prop on `<CubeView>` uses inline `stopTimer`. YAGNI — delete.

---

## Low

### L1. RAF in App startTimer never cancelled on unmount
**File:** `src/views/App.svelte:34-43`
- App is root → only HMR triggers unmount. Acceptable but not strictly clean.
- **Fix:** track `rafId`, cancel in an `onDestroy`. Skip if not worth it.

### L2. Canvas missing `role`/`aria-label`
**File:** `src/views/CubeView.svelte:164`
- Screen readers see nothing for the cube. Add `aria-label="Rubik's cube, drag stickers to rotate faces"`.

### L3. ControlsPanel solving label not announced via `aria-live`
**File:** `src/views/ControlsPanel.svelte:42-49`
- Disabled state + label change ("Solving…") may not announce to AT users. Wrap the button label change in `<span aria-live="polite">` if accessibility matters.

### L4. `solver.js` init failure is sticky forever
**File:** `src/lib/core/solver.js:16-25`
- If `Cube.initSolver()` throws once, `initPromise` stays rejected; future calls reject with the same error with no retry path.
- **Fix:** on rejection, reset `initPromise = null` so a future call retries. ~3 LOC.

### L5. cubies array ($state proxy) mutated 27× per move
**File:** `src/views/App.svelte:6`, `src/lib/core/apply-move.js:21-26`
- `$state(createSolvedCube())` makes a deep proxy. Each `apply-move` reassigns `position` and `quaternion` arrays on every cubie, going through Svelte 5 proxy traps. Nothing in template reads it reactively → no observable cost today, but a future reader (e.g. inspector panel) iterating cubies would trigger fine-grained subscriptions on every move.
- **Fix:** if perf becomes a concern, hold cubies as a `$state.raw([...])` since they're only consumed imperatively. Skip until proven.

### L6. `animateMove` allocates new `Group` per move
**File:** `src/lib/render/animate-move.js:31`
- Cheap but allocates 60+ Groups during a 60-move solve. Acceptable.

---

## Nit

### N1. `multiplyQuat` and `normalizeQuat` exported but only used in this module
**File:** `src/lib/core/apply-move.js:55, 66`
- Test files pull them. Fine — keep.

### N2. `algorithm-runner.js` only imported by a test
**File:** `src/lib/core/algorithm-runner.js`
- Production code uses inline `for/await` loops. Either delete (YAGNI) or wire it into scramble/solve. Currently dead in production.

### N3. `App.svelte:30` timer starts on `[scramble]` log entry
**File:** `src/views/App.svelte:27-32`
- Cosmetic UX: timer should arguably start on first user move *after* scramble. Skip unless asked.

---

## Edge Cases (scout findings)

- **EC1 (verified, see C1):** dynamic-import + table-init window for cubejs is open territory; user input not gated.
- **EC2 (verified, see C2/H1):** busy-flag handoff between gesture/keyboard/animation has no FSM — three independent booleans (`busy` local, `solving` in App, `state` in gesture) — every cross-edge is a potential desync.
- **EC3 (verified, see H3):** module-scoped `TweenGroup` outlives component lifecycle.
- **EC4 (verified, see H2):** geometry singleton + per-cubie materials never traversed for dispose.
- **EC5 (M5):** projection degeneracy on axis-aligned camera.
- **EC6 (negative):** integer position invariant — `apply-move.js:33-42` swaps components without arithmetic, so positions stay exactly in {-1,0,1}. After 10 000 moves no drift. Quaternion drift bounded by per-move `normalizeQuat`. Sticker classification in `cube-to-facelets.js` uses dominant-component selection on near-unit vectors → robust to ε-level jitter. **No drift bug.**
- **EC7 (negative):** `solver.js` already-solved input → cubejs returns "" → `parseAlgorithm("")` → `[]` → `solveStep` returns early. Handled.

---

## Positive Observations

- Clean separation: model / render / controls / views. Each module has a clear single responsibility.
- Quaternion-as-source-of-truth (rather than face-permutation arrays) is an honest, debuggable approach. Sticker derivation in `cube-to-facelets.js` is the right inverse.
- Lazy-loaded cubejs keeps first paint fast (~80 KB off the critical path).
- `pointer-gesture` FSM is documented in-source. State enum + early returns make it readable.
- Tests cover all pure logic modules.
- Comments explain *why* (e.g. tween v25 group registration, sign convention) not just *what*.

---

## Recommended Actions (priority order)

1. **C1** — wrap `solveStep` compute in `busy = true / finally`. (~3 LOC)
2. **C2** — split `cleanup()` so the busy-during-PROBING path doesn't release `setBusy`. (~6 LOC)
3. **H1** — `try/finally` resolve in animate-move onComplete. (~4 LOC ×2)
4. **H2/H3** — add `disposeCubieMeshes` + `clearTweens`, call from CubeView cleanup. (~15 LOC total)
5. **H4** — drop `Math.random()` key in ControlsPanel.
6. **H5** — try/catch in `solveStep` around the solver await.
7. **M1** — pointerId filtering in pointer-gesture.
8. **M3** — pipe `busy` to ControlsPanel for button disabled states.
9. **M4/M6** — delete dead code.
10. **M2** — extract ControlsPanel CSS to a sibling file (or accept).

---

## Metrics

- LOC: 1462 in scope; one file (ControlsPanel 222) over budget; CubeView (172) and pointer-gesture (175) tight.
- Type coverage: N/A (pure JS).
- Linting: not run (no script).
- Test coverage: 41 vitest tests cited; pure-logic modules covered, view layer not.

---

## Unresolved Questions

1. **Q1:** Is the `algorithm-runner.js` module intended for future use, or safe to delete? (Currently only a test imports it.)
2. **Q2:** What's the desired timer-start semantic — first user move, or first move including scramble? Affects whether the scramble log entry should bypass `commitMove`'s timer trigger.
3. **Q3:** Should `solveStep` errors surface visually (toast/error chip) or stay console-only? Affects whether ControlsPanel needs an `errorMsg` prop.
4. **Q4:** Is HMR-clean unmount a target (single-page web app rarely unmounts) or only "good hygiene"? Determines urgency of H2/H3.
5. **Q5:** Is the 200-LOC budget on `.svelte` files measured including `<style>` blocks? If style is excluded, ControlsPanel is well within budget.

**Status:** DONE_WITH_CONCERNS
**Summary:** Two critical busy-gate races (solver compute window, gesture-during-keyboard handoff), one high-severity dispose leak (geometries/materials/tweens not freed on unmount), one anti-pattern key in move log, plus minor UX/a11y gaps. All proposed fixes are small and respect the 200-LOC budget.
**Concerns/Blockers:** Q1–Q5 above need answers before landing fixes.
