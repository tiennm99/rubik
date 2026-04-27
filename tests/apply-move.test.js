import { describe, it, expect } from 'vitest';
import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { applyMove } from '../src/lib/core/apply-move.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';
import { isSolved } from '../src/lib/core/solved-check.js';

function run(cubies, algo) {
    for (const m of parseAlgorithm(algo)) applyMove(cubies, m);
}

describe('apply-move', () => {
    it('a quarter turn breaks the solved state', () => {
        const c = createSolvedCube();
        run(c, 'R');
        expect(isSolved(c)).toBe(false);
    });

    it('any face turn 4× returns to solved', () => {
        for (const face of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S']) {
            const c = createSolvedCube();
            run(c, `${face} ${face} ${face} ${face}`);
            expect(isSolved(c), `4×${face}`).toBe(true);
        }
    });

    it('a move and its inverse cancel', () => {
        for (const move of ['R', "R'", 'U2', "F'", 'L', 'M', 'x', 'y']) {
            const c = createSolvedCube();
            run(c, move);
            const inv = move.endsWith('2') ? move : move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
            run(c, inv);
            expect(isSolved(c), `${move} ${inv}`).toBe(true);
        }
    });

    it('whole-cube rotation x preserves the solved state', () => {
        const c = createSolvedCube();
        run(c, 'x');
        expect(isSolved(c)).toBe(true);
    });

    it('the sune (R U R\' U R U2 R\') has order 6', () => {
        const c = createSolvedCube();
        for (let i = 0; i < 6; i++) run(c, "R U R' U R U2 R'");
        expect(isSolved(c)).toBe(true);
    });

    it('a sexy-move (R U R\' U\') has order 6', () => {
        const c = createSolvedCube();
        for (let i = 0; i < 6; i++) run(c, "R U R' U'");
        expect(isSolved(c)).toBe(true);
    });

    it('R2 equals R R', () => {
        const a = createSolvedCube();
        const b = createSolvedCube();
        run(a, 'R2');
        run(b, 'R R');
        for (let i = 0; i < 27; i++) {
            expect(a[i].position).toEqual(b[i].position);
        }
    });
});
