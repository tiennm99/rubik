# Phase 4 — Drag-to-Rotate Gesture

**Priority:** high (the killer feature)
**Status:** pending
**LOC budget:** ~180 in 1 file
**Depends on:** Phase 2, Phase 3

## Goal

User clicks a sticker, drags, and the right face rotates intuitively in real time. Release snaps to nearest 90°.

## File

### `src/lib/controls/pointer-gesture.js` (~180 LOC)

Public API:
```js
setupPointerGesture({ canvas, scene, camera, controls, parentGroup, meshByIndex, cubies, onMoveCommitted }) → { dispose }
```

State machine:
- `IDLE` — listening for `pointerdown`.
- `PROBING` — pointerdown hit cube, awaiting first move past dead-zone.
- `DRAGGING` — axis is locked, layer is reparented to a temp Group, rotating live.

### Pointerdown
1. Compute NDC `(x, y)` from canvas-relative pointer.
2. `Raycaster.setFromCamera(ndc, camera)`, `intersectObjects(cubieMeshes)`.
3. If no hit → leave `OrbitControls` enabled, ignore. Else:
   - Disable `controls.enabled = false`.
   - Save `hitFace` = world-space normal of hit triangle = `intersection.face.normal.clone().transformDirection(intersection.object.matrixWorld).round()` (snap to ±x/±y/±z).
   - Save `hitCubieIndex` (which mesh).
   - Save `screenDownPos` and `pointerId`.
   - Capture pointer (`canvas.setPointerCapture(e.pointerId)`).
   - State → `PROBING`.

### Pointermove (PROBING)
- If `|delta| < DEAD_ZONE_PX` (8 px) → keep probing.
- Else, lock axis:
  1. Compute the two in-plane unit axes on the hit face. The face has a normal `n` (axis-aligned, e.g., `+x`). The two in-plane axes are the other two world axes: e.g., for face `+x`, in-plane = `+y` and `+z`.
  2. Project each in-plane axis to screen space: `screenAxisY = projectToScreen(hitPoint + axisY) - projectToScreen(hitPoint)`. Same for axisZ.
  3. The drag direction in screen space chooses which in-plane axis it aligns most with. The selected in-plane axis × hit-face normal = the **rotation axis** in world space.
  4. The selected in-plane axis also determines which **layer index** rotates: it's the layer whose normal equals the *other* in-plane axis (the one we did NOT pick) — because dragging in direction A on face N rotates around B = N × A, and that B-axis layer is the one containing the hit cubie (use cubie's coord on B-axis as the layer index).
  5. Reparent the 9 cubies in that layer to a `tempGroup`. State → `DRAGGING`.

### Pointermove (DRAGGING)
- Compute drag distance along the locked screen axis.
- `angle = clamp((dragPx / PIXELS_PER_QUARTER_TURN) * (π/2), -π/2, π/2)`. (PIXELS_PER_QUARTER_TURN ≈ 100.)
- Apply sign correction so right-hand rule matches drag direction. Set `tempGroup.rotation[axisChar] = angle`.

### Pointerup
- If state was `IDLE` or `PROBING` → re-enable controls, exit.
- If `DRAGGING`:
  - Snap `angle` to nearest of `{-π/2, 0, +π/2}` using `Math.round(angle / (π/2))`. (Threshold = 45°.)
  - If snapped to 0 → animate temp group back to 0 (~100ms ease-out), then unparent, no move committed.
  - Else → animate temp group from current angle to snapped target (~100ms), then unparent + bake. Construct the corresponding `moveSpec`, call `applyMove(cubies, spec)` (model already matches visuals after bake), call `onMoveCommitted(specName)` for UI logging.
- Re-enable `controls.enabled = true`.

### Anti-jank guards
- Single active gesture only. If pointer cancel/leave during DRAGGING → snap to 0.
- Prevent default on `pointerdown` to stop touch scroll.
- Use `pointerType` to skip hover effects on touch.

## Acceptance

- Drag a corner sticker rightward → the right face rotates +90° smoothly.
- Drag the same sticker upward → the top face rotates instead (in-plane axis selection).
- Drag empty space → camera orbits.
- Drag less than 45° → snaps back to 0, no move logged.
- Touch on mobile produces identical behavior.
