# Rubik's Cube 3D Web UX Research Report

**Report Date:** 2026-04-27  
**Target Stack:** Vite + Svelte 5 + Three.js  
**Focus:** Drag-to-rotate-face gesture, keyboard controls, accessibility polish.

---

## 1. Drag-to-Rotate-Face Gesture: Core Algorithm

**Problem:** User clicks a sticker, drags finger/mouse, cube face rotates intuitively. Canonical solution uses raycast hit detection + screen-space drag projection + rotation axis locking.

### Algorithm Steps

**On `pointerdown`:**
1. Raycast from camera through pointer position into scene.
2. Check intersections; if hit cube geometry, extract hit face normal + position.
3. Map face normal to face identity (Up, Down, Left, Right, Front, Back).
4. Store `hitPoint`, `faceNormal`, `pointerDownScreenPos`.
5. Initialize `dragDelta = (0, 0)`, `axisLocked = false`, `selectedAxis = null`.

**On first `pointermove` (after ~6–10px dead-zone):**
1. Compute `screenDragDelta = (currentPos.x - downPos.x, currentPos.y - downPos.y)`.
2. Project delta onto the tangent plane of hit face using face normal.
3. Compute two in-plane axes: `axis1 = cross(faceNormal, cameraUp)`, `axis2 = faceNormal × axis1`.
4. Project drag onto both axes; pick axis with larger magnitude → `selectedAxis`.
5. Lock `axisLocked = true`, record which rotation axis (X, Y, or Z in world space).

**On repeated `pointermove`:**
1. Recompute `dragDelta` along `selectedAxis` only.
2. Map distance to rotation angle: `angle = dragDelta / screenPixelsPerRotation` (tunable, ~2–4 px per degree).
3. Clamp angle: `angle = clamp(angle, -90°, 90°)` to prevent multi-rotation in one drag.
4. **Live update:** Rotate the layer group around the locked rotation axis by `angle`.

**On `pointerup`:**
1. Snap `angle` to nearest multiple of 90° (or 0 if too small, e.g., < 22.5°).
2. Animate from current rotation to snapped target (200–300ms ease-out).
3. Commit the move to cube state (e.g., call `rotateFace('R')` if front-right face rotated +90°).
4. Re-enable `OrbitControls`.

### Pseudocode

```javascript
// Simplified drag-to-rotate core
const hitResult = raycaster.intersectObjects([cube.geometry]);
if (hitResult.length === 0) return; // Empty space; enable orbit

const hit = hitResult[0];
const faceNormal = hit.face.normal.transformDirection(hit.object.matrixWorld);
const screenDragDelta = new Vector2(e.pageX - downX, e.pageY - downY);

// Project drag onto tangent plane
const axis1 = cameraDirection.cross(faceNormal).normalize();
const axis2 = faceNormal.cross(axis1).normalize();
const proj1 = screenDragDelta.dot(axis1);
const proj2 = screenDragDelta.dot(axis2);

if (!axisLocked) {
  selectedAxis = Math.abs(proj1) > Math.abs(proj2) ? axis1 : axis2;
  axisLocked = true;
}

const dragAlongAxis = selectedAxis === axis1 ? proj1 : proj2;
const rotationAngle = (dragAlongAxis / pixelsPerDegree) * (Math.PI / 180);
const clampedAngle = Math.min(Math.max(rotationAngle, -π/2), π/2);

// Rotate layer group around locked axis
layerGroup.rotation.setFromAxisAngle(selectedAxis, clampedAngle);
```

### Key Math Insight

**Face normal × screen-space drag = rotation axis.** The hit face normal defines a plane; the two in-plane axes span rotations. Project pointer delta onto these axes to decide which layer (X, Y, or Z) rotates.

---

## 2. Empty-Space Drag = Orbit Camera

**Pattern:** Raycast misses cube → fall through to `OrbitControls`.

**Implementation:**
- **Disable `OrbitControls`** on `pointerdown` if cube hit detected.
- **Enable `OrbitControls`** on `pointerup` after any face rotation.
- **Alternatively,** let `OrbitControls` handle all non-sticker rays natively; it auto-disables on cube geometry hit if configured with `enableDamping=true` + `autoRotate=false`.

**Three.js Note:** `OrbitControls` respects pointer events; bind it to the same canvas and it will ignore events during face drag if you call `controls.enabled = false` on drag start, `= true` on drag end.

---

## 3. Touch vs. Mouse: Unified Pointer Events

**Use `PointerEvent` API** (not `mousedown/touchstart` separately).

**Key bindings:**
- `pointerdown` → raycast, check hit, store state.
- `pointermove` → update drag delta, rotate if locked.
- `pointerup` → snap, animate, commit.

**Prevent default:**
```javascript
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault(); // Stop page scroll on touch.
  handlePointerDown(e);
});
```

**Touch multi-touch (optional):**
- Single-finger drag: face rotate (existing).
- Two-finger pinch: zoom camera (via `OrbitControls.maxDistance` + `minDistance`).

**Hover state (desktop only):**
```javascript
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    // Highlight hovered sticker; hide on touch.
    highlightSticker(raycastHit);
  }
});
```

---

## 4. Keyboard Input: Standard Speedcubing Notation

**Core bindings** (all popular simulators use these):

| Key | Action | Shift | W-Modifier |
|-----|--------|-------|-----------|
| R | Right face CW | R' (CCW) | Rw (wide) |
| L | Left face CW | L' (CCW) | Lw |
| U | Up face CW | U' (CCW) | Uw |
| D | Down face CW | D' (CCW) | Dw |
| F | Front face CW | F' (CCW) | Fw |
| B | Back face CW | B' (CCW) | Bw |
| Space | Scramble (auto-generate 25–30 random moves) | | |
| Esc | Reset camera to home view | | |
| Z | Undo last move | | |
| Ctrl+Z | Undo all (reset to solved) | | |

**Source:** [cstimer.net](https://cstimer.net/), [ruwix simulator](https://ruwix.com/online-puzzle-simulators/), speedsolving convention.

---

## 5. Anti-Patterns to Avoid

1. **Single-delta jitter:** Don't rotate based on a single `pointermove` delta; accumulate or use dead-zone first (6–10px). Single deltas jump ~5–50 px per frame.

2. **Unclamped rotation:** Allowing angle > 90° in one drag enables unintended multi-face flicks. Clamp to ±90° or explicitly support 180° via two-axis detection.

3. **Axis flip mid-drag:** Once axis locked, **never change it**. If drag direction swaps, keep the original axis locked for the duration of the pointer; user can release and re-drag if intent changes.

4. **Ignoring camera transform:** If camera is rotated (not looking down +Z), pointer delta must be transformed into world space before projecting onto face normal. Use `cameraMatrix.inverse` or store `cameraWorldPos` at drag start.

5. **No snap animation:** Snapping instantly (0ms) feels mechanical. 200–300ms ease-out makes the action feel intentional. Use `gsap.to()` or Three.js `TWEEN.js`.

6. **Forgetting to disable OrbitControls:** Dual-mode input (face rotate + orbit) without disabling orbit during face drag causes jerky camera jumps on pointer release.

---

## 6. Reference Implementations & Patterns

### [cubing.js (Lucas Garron, Twizzle)](https://github.com/cubing/cubing.js)
- **Approach:** Web components + Three.js. Unified interaction layer via `<twisty-player>` element.
- **Pattern:** Gesture detection at component level; cube rotation abstracted from pointer API.
- **Strength:** Separation of concerns; reusable across projects.
- **Limitation:** Steeper learning curve; less direct control over low-level raycast.

### [foo123/Rubik3](https://github.com/foo123/Rubik3)
- **Approach:** Pure JavaScript, intuitive drag-to-face detection.
- **Pattern:** Direct raycaster integration; immediate visual feedback on drag.
- **Strength:** Responsive, minimal overhead.
- **Note:** Small project (archived); use as reference, not production baseline.

### [kroffo/CubeSimulator](https://github.com/kroffo/CubeSimulator)
- **Approach:** Three.js drag rotation + keyboard notation.
- **Pattern:** Hybrid: keyboard for deterministic moves, mouse for exploratory turns.
- **Strength:** Clear separation of input modes; easy to understand.
- **Limitation:** No explicit dead-zone or axis-locking logic visible in early commits.

### [cstimer.net (GitHub: samuelfang)](https://cstimer.net/)
- **Industry standard:** Most competitive speedcubers use this.
- **Pattern:** Drag face + keyboard + timer + stats.
- **Strength:** Battle-tested; known good UX for professionals.
- **Access:** Partially open-source; full source available on GitHub.

### [AnimCubeJS](https://animcubejs.cubing.net/animcubejs.html)
- **Approach:** Focus on animation sequences (algs).
- **Pattern:** Keyboard or notation string input; less emphasis on freeform drag.
- **Use case:** Teaching, not playing.

---

## 7. Accessibility & UX Polish: Top 5 Must-Haves

1. **Move Log + Notation Display**
   - Show last 5–10 moves as text (e.g., "R U R' U'").
   - Helps players recall sequence; essential for learning.
   - Implement: `<div id="moveLog">${moves.join(' ')}</div>`.

2. **Undo Last Move**
   - Single button or hotkey (Z) to revert last rotation.
   - Critical for casual play (typos happen).
   - Store move history in state; reverse-apply on undo.

3. **Reset Button**
   - Return cube to solved state + camera to home orientation.
   - Keyboard: Ctrl+Z or dedicated reset button.

4. **Scramble Button**
   - Auto-generate 25–30 random notation moves; apply silently.
   - Display scramble sequence in move log so user can verify.

5. **Timer (Start on First Move, Stop on Solve)**
   - Start on first meaningful drag/key input after scramble.
   - Stop when cube reaches solved state.
   - Display elapsed time; optional: show splits or best times.

### Optional but Friendly

- **Notation Overlay:** Hover over face to show which layer it is (R, L, U, etc.).
- **Hint Mode:** Toggle arrows showing face normals; helps new players understand cube structure.
- **Accessibility:** Ensure color-blind mode (sticker outlines or textures, not color alone). Keyboard-only play fully functional.

---

## 8. Svelte 5 + Vite + Three.js Architecture Notes

**Recommended Structure:**
```
src/
  components/
    RubikCube.svelte        # Main cube wrapper
    CubeInteraction.svelte  # Drag logic (separate for testability)
    MoveLog.svelte          # Display
    ControlPanel.svelte     # Buttons + timer
  lib/
    cube.ts                 # State (moves, scramble)
    gestures.ts             # Pointer event handling
    geometry.ts             # Sticker geometry + raycasting
    notation.ts             # Keyboard + move notation
```

**Key Decisions:**
- Use **reactive stores** (`$state` in Svelte 5) for cube state + move history.
- Keep **Three.js scene initialization in an `onMount` hook** (not reactive).
- **Debounce pointer events** at 16ms (60 FPS) to avoid jitter.
- Use **CSS custom properties** for sticker colors; toggle via class for dark mode.

---

## Unresolved Questions

1. **Multi-touch rotations:** Should pinch-zoom be enabled, and if so, should it zoom cube or camera? (Not covered in popular simulators; user preference varies.)

2. **Drag speed sensitivity per-device:** Touch devices have different DPI + pointer event frequency. Should sensitivity auto-adjust, or expose a user-tunable multiplier?

3. **Layer selection ambiguity:** When dragging middle layer from edge sticker, which of two possible axes is intended? (E.g., drag M layer from U face edge.) Most simulators require the sticker to belong to the layer; unclear if edge dragging should be supported.

4. **Accessibility: keyboard solo play:** Should user be able to solve cube via keyboard alone, or is drag-based interaction non-negotiable? (Affects tutorial scope.)

5. **Performance target:** Tested on low-end mobile (2 GB RAM, Snapdragon 410)? Raycasting + live rotation updates can cause frame drops; LOD or rendering optimizations may be needed.

---

## Sources

- [csTimer - Professional Rubik's Cube Timer](https://cstimer.net/)
- [GitHub: cubing/cubing.js](https://github.com/cubing/cubing.js/)
- [GitHub: foo123/Rubik3](https://github.com/foo123/Rubik3)
- [GitHub: kroffo/CubeSimulator](https://github.com/kroffo/CubeSimulator)
- [Three.js Raycaster Documentation](https://threejs.org/docs/pages/Raycaster.html)
- [Rubik's Cube Notation Guide - Ruwix](https://ruwix.com/the-rubiks-cube/notation/)
- [Speedsolving Wiki: 3x3x3 Notation](https://speedsolving.com/wiki/index.php/3x3x3_notation)
- [Online Rubik's Cube Simulators - Ruwix](https://ruwix.com/online-puzzle-simulators/)
