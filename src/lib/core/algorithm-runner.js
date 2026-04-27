// Runs a sequence of moves with optional per-move animation, awaited in order.
// Used by Scramble (no animation, instant) and by manual replay (animated).

import { parseAlgorithm } from './move-parser.js';
import { applyMove } from './apply-move.js';

export async function runInstant(cubies, algorithmString) {
    const moves = parseAlgorithm(algorithmString);
    for (const m of moves) {
        applyMove(cubies, m);
    }
    return moves;
}

export async function runAnimated(algorithmString, animateMoveFn) {
    const moves = parseAlgorithm(algorithmString);
    for (const m of moves) {
        await animateMoveFn(m);
    }
    return moves;
}
