# System Architecture

## Layering

```
┌─────────────────────────────────────────────────────────┐
│ views/ (Svelte 5)                                        │
│   App  · CubeView  · ControlsPanel                       │
│   - holds reactive moveLog, timerMs                      │
│   - subscribes to commitMove callbacks                   │
└────────┬────────────────────────────────────────────────┘
         │  triggerMove / scramble / reset / undo
         ▼
┌─────────────────────────────────────────────────────────┐
│ controls/                                                │
│   pointer-gesture.js   drag → snap → commit             │
│   keyboard.js          letter+shift → spec              │
│   gesture-math.js      screen projection + axis lock    │
└────────┬───────────────────────────────────┬────────────┘
         │ animateMove                        │ getMoveSpec
         ▼                                    ▼
┌──────────────────────────┐  ┌─────────────────────────────┐
│ render/ (Three.js)       │  │ core/ (pure JS)             │
│   scene-setup.js         │  │   cubie-model.js            │
│   cubie-meshes.js        │  │   move-definitions.js       │
│   animate-move.js        │  │   apply-move.js             │
│                          │  │   move-parser.js            │
│   draws + animates       │  │   scrambler.js              │
│                          │  │   solved-check.js           │
└──────────────────────────┘  └─────────────────────────────┘
```

Strict dependency direction: `views → controls → render → core`. Lower
layers never import from higher layers. `core` has no DOM and no Three.js
imports — it can be `node`-tested.

## Cube State Model

Each cubie:

```
{
  home:        [x, y, z]    // initial integer position in {-1,0,1}^3
  position:    [x, y, z]    // current integer position
  quaternion:  [x, y, z, w] // current orientation (identity at solved state)
}
```

A cube is **solved** iff every cubie has `position === home` and `quaternion ≈ ±(0,0,0,1)`.

A move spec:

```
{ axis: 'x'|'y'|'z', layer: -1|0|1|null, sign: +1|-1, count: 1|2 }
```

`layer = null` rotates the entire cube (whole-cube rotations x/y/z).
`count = 2` means a 180° turn.

## Move Application

`applyMove(cubies, spec)` runs `count` quarter turns in a loop. Each quarter
turn:

1. Filter cubies on the target layer (`Math.round(c.position[axisIdx]) === spec.layer`, or all cubies if layer is null).
2. Permute each cubie's `position` by a hardcoded ±90° axis-aligned rotation (lookup table).
3. Multiply each cubie's `quaternion` by a precomputed ±90° axis quaternion.
4. Renormalize quaternion (drift guard).

Positions stay on integer coordinates by construction (no float operations
on positions).

## Rendering Pipeline

Each cubie becomes a single Three.js `Mesh` with a shared `RoundedBoxGeometry` and a 6-material array (5 sticker faces + 1 black inner face per cubie depending on its home position). The 27 meshes belong to one parent `Group` we call the cube group.

For animated moves:

1. Create a temporary `pivot` Group inside the cube group.
2. `pivot.attach(mesh)` for each cubie in the moving layer (preserves world transform).
3. Tween `pivot.rotation[axis]` from 0 to ±π/2 (or ±π for doubles) over 200ms with cubic-out easing.
4. On complete: `cubeGroup.attach(mesh)` for each moving mesh (bakes the transform), remove the pivot, run `applyMove(cubies, spec)` on the model, and `syncMeshes(meshes)` to clamp visuals to the discrete model state. This eliminates floating-point drift across many turns.

## Drag-to-Rotate Gesture

State machine in `pointer-gesture.js`:

- **IDLE**: listening for pointerdown.
- **PROBING**: pointer hit a sticker; waiting for ≥ 8 px pointer travel.
- **DRAGGING**: rotation axis is locked; layer is reparented into a pivot Group; rotation angle tracks pointer.

Axis lock decision (`gesture-math.chooseRotationAxis`): project the two
in-plane axes of the hit face into screen space, pick the one whose screen
direction better matches the drag vector. The *other* in-plane axis is the
rotation axis. Sign is chosen so positive screen drag corresponds to the
visually correct rotation direction.

On pointerup we round the live angle to the nearest multiple of 90°
(threshold = 45°). If that rounds to 0, animate back without committing;
otherwise animate to the snap target and call `applyMove` + emit the move
name to the move log.

OrbitControls is disabled the moment a sticker is hit and re-enabled on
pointerup (or if we never hit a sticker, OrbitControls handles the gesture
natively). This avoids dual-handling.
