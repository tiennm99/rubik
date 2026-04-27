import { describe, it, expect } from 'vitest';
import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { applyMove } from '../src/lib/core/apply-move.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';
import { isSolved } from '../src/lib/core/solved-check.js';
import { solve } from '../src/lib/core/solver.js';

function run(cubies, algo) {
    for (const m of parseAlgorithm(algo)) applyMove(cubies, m);
}

describe('solver', () => {
    // 4–5 s init for cubejs Kociemba tables on first call. Set a generous bound.
    it('returns an algorithm that brings a scrambled cube to solved', async () => {
        const scramble = "R U R' F' R U R' U' R' F R2 U' R'";
        const c = createSolvedCube();
        run(c, scramble);
        expect(isSolved(c)).toBe(false);

        const solution = await solve(c);
        expect(typeof solution).toBe('string');
        expect(solution.length).toBeGreaterThan(0);

        run(c, solution);
        expect(isSolved(c)).toBe(true);
    }, 30000);

    it('solves a deeper scramble', async () => {
        const scramble = "F R U' B2 D L' F' U R2 D' B U L' F2 D B' R U2 L'";
        const c = createSolvedCube();
        run(c, scramble);

        const solution = await solve(c);
        run(c, solution);
        expect(isSolved(c)).toBe(true);
    }, 30000);

    it('returns a solution that keeps an already-solved cube solved', async () => {
        // cubejs does not always return '' for solved input — it can return
        // a non-trivial identity-equivalent algorithm. Verify by applying.
        const c = createSolvedCube();
        const solution = await solve(c);
        run(c, solution);
        expect(isSolved(c)).toBe(true);
    }, 30000);
});
