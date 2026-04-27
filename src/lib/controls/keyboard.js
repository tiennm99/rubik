// Maps keyboard input to cube actions. Letter = quarter turn,
// Shift+letter = inverse. Space = scramble, Esc = reset, Z = undo.
// Ignored when typing in form fields.

const MOVE_KEYS = new Set(['r', 'l', 'u', 'd', 'f', 'b', 'm', 'e', 's', 'x', 'y', 'z']);

export function setupKeyboard({ onMove, onScramble, onReset, onUndo }) {
    function handler(event) {
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        if (event.key === ' ') {
            event.preventDefault();
            onScramble?.();
            return;
        }
        if (event.key === 'Escape') {
            onReset?.();
            return;
        }
        const lower = event.key.toLowerCase();
        if (lower === 'z' && !event.shiftKey) {
            onUndo?.();
            return;
        }
        if (MOVE_KEYS.has(lower)) {
            const base = upperFor(lower);
            const name = event.shiftKey && !isRotation(lower) ? base + "'" : base;
            onMove?.(name);
        }
    }

    function upperFor(lower) {
        // x/y/z stay lowercase (cube rotations); others are uppercase faces/slices.
        return isRotation(lower) ? lower : lower.toUpperCase();
    }

    function isRotation(lower) {
        return lower === 'x' || lower === 'y' || lower === 'z';
    }

    window.addEventListener('keydown', handler);
    return {
        dispose() { window.removeEventListener('keydown', handler); }
    };
}
