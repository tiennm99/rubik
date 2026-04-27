# Phase 2 — Three.js Rendering

**Priority:** blocker
**Status:** pending
**LOC budget:** ~200 across 2 files
**Depends on:** Phase 1

## Goal

Initialize a Three.js scene that renders the 27-cubie model from Phase 1. No animation or interaction yet — just a static colored cube.

## Files

### `src/lib/render/scene-setup.js` (~100 LOC)
- `initScene(canvas)` → `{ scene, camera, renderer, controls, dispose, render }`.
- PerspectiveCamera 45° FOV, position `(4, 4, 4)`, target origin.
- WebGLRenderer with `antialias: true`, set size to canvas.clientWidth/Height, listen for resize.
- AmbientLight (0.6) + DirectionalLight at `(5, 10, 5)` intensity 0.8. No shadows.
- OrbitControls with `enableDamping`, `enablePan = false`, `minDistance: 3`, `maxDistance: 12`.
- `render()` ticks Tween + controls + renderer.render.
- `dispose()` removes listeners and disposes renderer.

### `src/lib/render/cubie-meshes.js` (~100 LOC)
- `buildCubieMeshes(cubies)` → `{ group, meshByIndex }`.
- For each cubie:
  - Geometry: `RoundedBoxGeometry(0.94, 0.94, 0.94, 4, 0.08)` (cached singleton — same geometry shared across all 27).
  - Materials: 6-material array. For each face direction, if the cubie sits on that face of the cube (e.g., face +x material is colored only when `cubie.initialPosition[0] === 1`), assign sticker color; otherwise black.
  - Mesh placed at `cubie.position`, applied `cubie.quaternion`.
  - Push to a parent `THREE.Group` so we can rotate the whole cube as one.
- Sticker palette (WCA convention): U=white, D=yellow, R=red, L=orange, F=green, B=blue.
- `syncMeshes(meshes, cubies)` re-applies position/quaternion from model state (used after non-animated moves).

## Acceptance

- Scene shows a 3x3 colored cube at origin, three faces visible at default camera.
- Drag with OrbitControls orbits camera; no jank.
- Resize window → renderer resizes correctly.
- Hot reload doesn't double-init the scene.

## Notes

- Materials and geometries are shared singletons to keep memory + GPU upload minimal.
- Cubies that face inside the cube get black on those faces — gives the "real cube" look when gaps show during a turn.
