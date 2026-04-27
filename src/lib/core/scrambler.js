// WCA-style random-move scramble. Avoids two consecutive moves on the same
// face and avoids redundant parallel-axis sandwiches (R L R type sequences).

import { FACE_MOVES } from './move-definitions.js';

const MODIFIERS = ['', "'", '2'];
const OPPOSITES = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

export function generateScramble(length = 20) {
    const moves = [];
    let lastFace = null;
    let secondLastFace = null;
    while (moves.length < length) {
        const face = FACE_MOVES[Math.floor(Math.random() * FACE_MOVES.length)];
        if (face === lastFace) continue;
        if (OPPOSITES[face] === lastFace && face === secondLastFace) continue;
        const mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
        moves.push(face + mod);
        secondLastFace = lastFace;
        lastFace = face;
    }
    return moves.join(' ');
}
