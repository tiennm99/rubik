<script>
    import { onMount } from 'svelte';
    import { initScene } from '../lib/render/scene-setup.js';
    import { buildCubieMeshes, syncMeshes, disposeCubieMeshes } from '../lib/render/cubie-meshes.js';
    import { animateMove, tickTweens, clearTweens } from '../lib/render/animate-move.js';
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
        solveCursor = $bindable(0),
        busy = $bindable(false)
    } = $props();

    let canvas;
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

        function clearSolvePlan() {
            solveQueue = [];
            solveCursor = 0;
        }

        function checkSolved() {
            if (isSolved(cubies)) onSolved?.();
        }

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
            for (const m of parseAlgorithm(alg)) applyMove(cubies, m);
            syncMeshes(meshes);
            history = []; // scramble clears history
            onMove?.(`[scramble] ${alg}`);
            busy = false;
        }

        async function undo() {
            if (busy || history.length === 0) return;
            const spec = inverseMove(getMoveSpec(history.pop()));
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

        // Lazy-load cubejs and compute the full solution. Returns the move
        // names array, or [] if already solved / on failure.
        async function computeSolvePlan() {
            try {
                const { solve: solveCubies } = await import('../lib/core/solver.js');
                const algorithm = await solveCubies(cubies);
                return parseAlgorithm(algorithm).map((m) => m.name);
            } catch (e) {
                console.error('Solver failed:', e);
                return [];
            }
        }

        // Step-by-step solver. First click computes the solution and animates
        // move #1; each subsequent click advances one move. Cursor exposed
        // via $bindable so ControlsPanel can show progress + remaining moves.
        async function solveStep() {
            if (busy) return;
            if (solveQueue.length === 0) {
                // Gate input through `busy` while we lazy-load cubejs and run
                // the 4–5 s table init + solve, otherwise the user could mutate
                // cubies under our feet and we'd play a stale algorithm.
                busy = true;
                const moves = await computeSolvePlan();
                busy = false;
                if (moves.length === 0) return;
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
            clearTweens();
            disposeCubieMeshes(meshes);
            sceneCtx.dispose();
        };
    });
</script>

<canvas bind:this={canvas} aria-label="Rubik's cube — drag a sticker to rotate that face, drag empty space to orbit"></canvas>

<style>
    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }
</style>
