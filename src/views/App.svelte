<script>
    import CubeView from './CubeView.svelte';
    import ControlsPanel from './ControlsPanel.svelte';
    import { createSolvedCube } from '../lib/core/cubie-model.js';

    let cubies = $state(createSolvedCube());
    let moveLog = $state([]);
    let isAnimating = $state(false);
    let timerMs = $state(0);
    let timerRunning = $state(false);
    let solving = $state(false);
    let solveQueue = $state([]);
    let solveCursor = $state(0);

    let controller = $state(null);

    async function runSolveStep() {
        if (solving || !controller) return;
        solving = true;
        try {
            await controller.solveStep();
        } finally {
            solving = false;
        }
    }

    function commitMove(name) {
        moveLog = [...moveLog, name];
        if (!timerRunning && moveLog.length > 0) {
            startTimer();
        }
    }

    function startTimer() {
        timerRunning = true;
        const start = performance.now();
        const tick = () => {
            if (!timerRunning) return;
            timerMs = performance.now() - start;
            requestAnimationFrame(tick);
        };
        tick();
    }

    function stopTimer() {
        timerRunning = false;
    }

    export function onSolved() {
        stopTimer();
    }
</script>

<main>
    <section class="cube-pane">
        <CubeView
            bind:controller
            bind:solveQueue
            bind:solveCursor
            {cubies}
            onMove={commitMove}
            onSolved={stopTimer}
        />
    </section>
    <aside class="panel-pane">
        <ControlsPanel
            {moveLog}
            {timerMs}
            {timerRunning}
            {solving}
            {solveQueue}
            {solveCursor}
            onScramble={() => controller?.scramble()}
            onReset={() => {
                if (controller?.reset()) {
                    moveLog = [];
                    timerMs = 0;
                    stopTimer();
                }
            }}
            onUndo={() => controller?.undo()}
            onSolve={runSolveStep}
        />
    </aside>
</main>

<style>
    main {
        display: grid;
        grid-template-columns: 1fr 320px;
        width: 100%;
        height: 100%;
    }
    .cube-pane {
        position: relative;
        background: radial-gradient(ellipse at center, #1c1c20 0%, #050507 100%);
    }
    .panel-pane {
        background: #0a0a0c;
        border-left: 1px solid #222;
        padding: 16px;
        overflow-y: auto;
    }
    @media (max-width: 720px) {
        main {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
        }
        .panel-pane {
            border-left: none;
            border-top: 1px solid #222;
            max-height: 40vh;
        }
    }
</style>
