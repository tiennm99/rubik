# Phase 3 — Move Animation

**Priority:** high
**Status:** pending
**LOC budget:** ~120 in 1 file
**Depends on:** Phase 2

## Goal

Animate a layer rotation visually while keeping the model authoritative. After the animation, model state is updated and meshes are re-baked.

## File

### `src/lib/render/animate-move.js` (~120 LOC)

Public API:
```js
animateMove(scene, parentGroup, meshByIndex, cubies, moveSpec, durationMs = 200) → Promise<void>
```

Algorithm:
1. **Select moving meshes** — same predicate as `apply-move.js`: cubies whose `Math.round(position[axisIdx]) === moveSpec.layer` (or all if `layer === null`).
2. **Reparent** — create temporary `THREE.Group`. For each moving mesh, attach to group via `group.attach(mesh)` (preserves world transform).
3. **Add group to scene** at the cube's parent's transform.
4. **Tween** — `new TWEEN.Tween({ a: 0 }).to({ a: targetAngle }, durationMs).easing(Cubic.Out).onUpdate(o => group.rotation[axisChar] = o.a)`.
5. **On complete** — for each moving mesh: `parentGroup.attach(mesh)` (bakes the transform back), update underlying cubie's `position` and `quaternion` from the mesh's current world transform (or just call `applyMove(cubies, moveSpec)` and `syncMeshes`).
6. Remove the temp group, resolve promise.

Tween loop must be ticked from the render loop (in `scene-setup.render()`):
```js
import { update as tweenUpdate } from '@tweenjs/tween.js';
tweenUpdate(performance.now());
```

## Concurrency

- Reject overlapping animations: keep an `isAnimating` flag in the controller; queue subsequent moves or drop them. For the pointer gesture, the gesture itself acts as the animation source — we only call `animateMove` for keyboard/scramble.

## Acceptance

- Calling `animateMove(..., R)` rotates the right face 90° smoothly over 200ms.
- After animation, the cubie model matches the visual state (re-applying moves continues to work).
- Six R rotations return the cube to solved both visually and in state.
