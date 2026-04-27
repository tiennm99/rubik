<script>
    let {
        moveLog, timerMs, timerRunning,
        onScramble, onReset, onUndo, onSolve,
        solveQueue = [],
        solveCursor = 0,
        busy = false
    } = $props();

    function pad2(n) { return n.toString().padStart(2, '0'); }
    function formatTime(ms) {
        const totalCs = Math.floor(ms / 10);
        const cs = totalCs % 100;
        const totalSec = Math.floor(totalCs / 100);
        const sec = totalSec % 60;
        const min = Math.floor(totalSec / 60);
        return `${pad2(min)}:${pad2(sec)}.${pad2(cs)}`;
    }

    let visibleLog = $derived(moveLog.slice(-40));
    let solveActive = $derived(solveQueue.length > 0);
    let nextMove = $derived(solveActive ? solveQueue[solveCursor] : null);
    // "Solving…" is shown during the cubejs lazy-load + table init: busy is
    // true but no plan has materialized yet.
    let solving = $derived(busy && !solveActive);
    let solveLabel = $derived(
        solving
            ? 'Solving…'
            : solveActive
                ? `Next: ${nextMove}  (${solveCursor + 1}/${solveQueue.length})`
                : 'Solve step-by-step'
    );
</script>

<header>
    <h1>Rubik 3x3</h1>
    <p class="hint">Drag a sticker to turn the face. Drag empty space to orbit.</p>
</header>

<section class="timer">
    <div class="time" class:running={timerRunning}>{formatTime(timerMs)}</div>
</section>

<section class="actions">
    <button onclick={onScramble} disabled={busy}>Scramble (Space)</button>
    <button onclick={onSolve} disabled={busy} class:solve-active={solveActive}>
        {solveLabel}
    </button>
    <button onclick={onUndo} disabled={busy}>Undo (Z)</button>
    <button onclick={onReset} disabled={busy}>Reset (Esc)</button>
</section>

{#if solveActive}
    <section class="plan">
        <h2>Solve plan</h2>
        <p class="plan-hint">Click <b>{nextMove}</b> next. Undo to step back.</p>
        <div class="plan-body">
            {#each solveQueue as move, i}
                <span
                    class="move"
                    class:done={i < solveCursor}
                    class:next={i === solveCursor}
                >{move}</span>
            {/each}
        </div>
    </section>
{/if}

<section class="log">
    <h2>Moves</h2>
    <div class="log-body">
        {#if visibleLog.length === 0}
            <span class="placeholder">No moves yet.</span>
        {:else}
            {#each visibleLog as move, i (i)}
                <span class="move">{move}</span>
            {/each}
        {/if}
    </div>
</section>

<section class="legend">
    <h2>Notation</h2>
    <ul>
        <li><b>R L U D F B</b> — face turns</li>
        <li><b>M E S</b> — slice turns</li>
        <li><b>x y z</b> — whole-cube rotations</li>
        <li><kbd>Shift</kbd> + letter — inverse</li>
    </ul>
</section>

<style>
    header h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0.04em;
    }
    .hint {
        margin: 6px 0 14px;
        font-size: 12px;
        color: #888;
    }
    .timer {
        margin-bottom: 14px;
    }
    .time {
        font-family: 'Menlo', 'Consolas', monospace;
        font-size: 28px;
        font-weight: 600;
        color: #aaa;
        text-align: center;
        padding: 8px;
        background: #15151a;
        border-radius: 6px;
        border: 1px solid #2a2a32;
    }
    .time.running {
        color: #facc15;
    }
    .actions {
        display: grid;
        gap: 6px;
        margin-bottom: 18px;
    }
    .actions button {
        padding: 9px 12px;
        background: #1d1d24;
        color: #e6e6e6;
        border: 1px solid #2c2c36;
        border-radius: 4px;
        font-size: 13px;
        text-align: left;
    }
    .actions button:hover:not(:disabled) {
        background: #25252e;
        border-color: #3a3a46;
    }
    .actions button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .actions button.solve-active {
        background: #1f2a18;
        border-color: #4d6a3a;
        color: #d8efb6;
    }
    .actions button.solve-active:hover {
        background: #283520;
        border-color: #5e7f48;
    }
    .plan {
        margin-bottom: 18px;
        padding: 10px;
        background: #15171a;
        border: 1px solid #2a3424;
        border-radius: 4px;
    }
    .plan h2 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #98c66f;
        margin: 0 0 6px;
    }
    .plan-hint {
        margin: 0 0 8px;
        font-size: 12px;
        color: #889a78;
    }
    .plan-hint b { color: #d8efb6; }
    .plan-body {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 6px;
        font-family: 'Menlo', 'Consolas', monospace;
        font-size: 12px;
        max-height: 110px;
        overflow-y: auto;
    }
    .plan .move.done { color: #4a5546; text-decoration: line-through; }
    .plan .move.next {
        color: #0a0a0c;
        background: #cfe39c;
        padding: 1px 5px;
        border-radius: 3px;
        font-weight: 700;
    }
    .log h2, .legend h2 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #777;
        margin: 0 0 8px;
    }
    .log-body {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 6px;
        font-family: 'Menlo', 'Consolas', monospace;
        font-size: 12px;
        max-height: 140px;
        overflow-y: auto;
        padding: 8px;
        background: #15151a;
        border-radius: 4px;
        border: 1px solid #25252e;
    }
    .move { color: #cbd5e1; }
    .placeholder { color: #555; font-style: italic; }
    .legend { margin-top: 18px; }
    .legend ul {
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 12px;
        color: #aaa;
        line-height: 1.7;
    }
    .legend b { color: #e6e6e6; }
    kbd {
        background: #1d1d24;
        border: 1px solid #333;
        border-radius: 3px;
        padding: 1px 5px;
        font-size: 11px;
        font-family: inherit;
    }
</style>
