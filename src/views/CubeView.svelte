<script>
    import { onMount } from 'svelte';
    import { initScene } from '../lib/render/scene-setup.js';
    import { buildCubieMeshes, syncMeshes } from '../lib/render/cubie-meshes.js';
    import { animateMove, tickTweens } from '../lib/render/animate-move.js';
    import { setupPointerGesture } from '../lib/controls/pointer-gesture.js';
    import { setupKeyboard } from '../lib/controls/keyboard.js';
    import { getMoveSpec, inverseMove } from '../lib/core/move-definitions.js';
    import { applyMove } from '../lib/core/apply-move.js';
    import { resetCubies } from '../lib/core/cubie-model.js';
    import { generateScramble } from '../lib/core/scrambler.js';
    import { parseAlgorithm } from '../lib/core/move-parser.js';
    import { isSolved } from '../lib/core/solved-check.js';

    let {
        cubies,
        onMove,
        onSolved,
        controller = $bindable(null),
        solveQueue = $bindable([]),
        solveCursor = $bindable(0)
    } = $props();

    let canvas;
    let busy = false;
    let history = [];

    onMount(() => {
        const sceneCtx = initScene(canvas);
        const { group, meshes } = buildCubieMeshes(cubies);
        sceneCtx.scene.add(group);

        const gesture = setupPointerGesture({
            canvas,
            camera: sceneCtx.camera,
            controls: sceneCtx.controls,
            parentGroup: group,
            meshes,
            cubies,
            isBusy: () => busy,
            setBusy: (v) => { busy = v; },
            onMoveCommitted: (name) => {
                history.push(name);
                clearSolvePlan();
                onMove?.(name);
                checkSolved();
            }
        });

        const kb = setupKeyboard({
            onMove: (name) => triggerMove(name),
            onScramble: () => scramble(),
            onReset: () => reset(),
            onUndo: () => undo()
        });

        // Animate one move and append to history. Used by both manual input
        // (triggerMove) and the step-by-step solver (solveStep).
        async function animateAndCommit(name) {
            const spec = getMoveSpec(name);
            busy = true;
            await animateMove({ parentGroup: group, meshes, cubies, spec });
            busy = false;
            history.push(name);
            onMove?.(name);
        }

        async function triggerMove(name) {
            if (busy) return;
            clearSolvePlan();
            await animateAndCommit(name);
            checkSolved();
        }

        async function scramble() {
            if (busy) return;
            clearSolvePlan();
            busy = true;
            const alg = generateScramble(20);
            const moves = parseAlgorithm(alg);
            for (const m of moves) {
                applyMove(cubies, m);
            }
            syncMeshes(meshes);
            history = []; // scramble clears history
            onMove?.(`[scramble] ${alg}`);
            busy = false;
        }

        async function undo() {
            if (busy || history.length === 0) return;
            const lastName = history.pop();
            if (lastName.startsWith('[')) return; // cannot undo a scramble
            const spec = inverseMove(getMoveSpec(lastName));
            busy = true;
            await animateMove({ parentGroup: group, meshes, cubies, spec });
            busy = false;
            // Step the solve cursor back so the same move can be replayed.
            if (solveCursor > 0) solveCursor -= 1;
            checkSolved();
        }

        function reset() {
            if (busy) return false;
            clearSolvePlan();
            resetCubies(cubies);
            syncMeshes(meshes);
            history = [];
            return true;
        }

        // Step-by-step solver. First click computes the solution and animates
        // move #1; each subsequent click advances one move. Cursor exposed
        // via $bindable so ControlsPanel can show progress + remaining moves.
        async function solveStep() {
            if (busy) return;
            if (solveQueue.length === 0) {
                const { solve: solveCubies } = await import('../lib/core/solver.js');
                const algorithm = await solveCubies(cubies);
                const moves = parseAlgorithm(algorithm).map((m) => m.name);
                if (moves.length === 0) return; // already solved
                solveQueue = moves;
                solveCursor = 0;
            }
            if (solveCursor >= solveQueue.length) {
                clearSolvePlan();
                return;
            }
            await animateAndCommit(solveQueue[solveCursor]);
            solveCursor += 1;
            if (solveCursor >= solveQueue.length) clearSolvePlan();
            checkSolved();
        }

        function clearSolvePlan() {
            if (solveQueue.length === 0 && solveCursor === 0) return;
            solveQueue = [];
            solveCursor = 0;
        }

        function checkSolved() {
            if (isSolved(cubies)) onSolved?.();
        }

        controller = { scramble, reset, undo, triggerMove, solveStep };

        let rafId = 0;
        const loop = () => {
            tickTweens();
            sceneCtx.render();
            rafId = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            cancelAnimationFrame(rafId);
            gesture.dispose();
            kb.dispose();
            sceneCtx.dispose();
        };
    });
</script>

<canvas bind:this={canvas}></canvas>

<style>
    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }
</style>
