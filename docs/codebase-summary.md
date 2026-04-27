# Codebase Summary

```
src/
  main.js                          mounts App.svelte to #app
  app.css                          base reset + fullscreen layout
  views/
    App.svelte                     top-level: cube pane + controls pane, owns moveLog/timer state
    CubeView.svelte                canvas host. onMount: scene + meshes + gestures + render loop
    ControlsPanel.svelte           buttons + timer display + scrolling move log
  lib/
    core/                          [pure JS, no DOM, no Three.js]
      cubie-model.js               createSolvedCube(); 27 cubies in {-1,0,1}^3
      move-definitions.js          MOVE table + getMoveSpec("R'") parsing
      apply-move.js                applyMove(cubies, spec); rotates positions + quaternions, snaps
      move-parser.js               parseAlgorithm("R U R' U' x2") → [spec, ...]
      scrambler.js                 generateScramble(n) → notation string
      solved-check.js              isSolved(cubies) → bool
      algorithm-runner.js          runs a move list with or without animation
    render/                        [Three.js]
      scene-setup.js               initScene(canvas) → {scene, camera, controls, render, dispose}
      cubie-meshes.js              buildCubieMeshes(cubies) → {group, meshes}; syncMeshes; readMeshIntoCubie
      animate-move.js              animateMove (full move) and snapAndAnimate (gesture release)
    controls/                      [user input]
      pointer-gesture.js           drag-to-rotate state machine (IDLE/PROBING/DRAGGING)
      gesture-math.js              screen projection + axis selection helpers
      keyboard.js                  R/L/U/D/F/B/M/E/S/x/y/z + Shift for prime, Space/Esc/Z

scripts/
  smoke-test-core.mjs              node script verifying cube algebra correctness

vite/
  config.dev.mjs                   localhost:8080
  config.codeserver.mjs            wss/HMR through code-server proxy
  config.prod.mjs                  base=/rubik/ for GitHub Pages

plans/
  260427-0855-rubik-3x3-web-simulator/
    plan.md                        overview + phase index
    phase-00-...07-...md           seven phase files
    research/                      three deep-research reports
```

## Data Flow

```
[user input]                       [cube state]                [rendered]
 keyboard ──┐                       cubies (array of 27,         ╭────────────╮
 pointer ───┤── triggerMove(spec) ─►  position + quaternion) ─►  │ Three.js   │
 buttons ───┘                       │  authoritative           │ │ Group of   │
                                    │  ↑                       │ │ 27 meshes  │
                                    └─ applyMove() in core ────┘ ╰────────────╯
                              syncMeshes(meshes) on every commit
```

The core cubie array is the single source of truth. Three.js meshes are an
ephemeral view of that state — every committed move runs through `applyMove`
and then `syncMeshes` (or the `pivot.attach` bake which is equivalent).

## Lines of Code

| Layer    | LOC | Files |
|----------|-----|-------|
| core     | 252 | 7     |
| render   | 241 | 3     |
| controls | 299 | 3     |
| views    | 352 | 3     |
| boot     | 36  | 2     |
| **total** | **~1180** | **18** |
