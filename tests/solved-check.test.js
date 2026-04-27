import { describe, it, expect } from 'vitest';
import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { applyMove } from '../src/lib/core/apply-move.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';
import { isSolved } from '../src/lib/core/solved-check.js';

describe('solved-check', () => {
    it('a fresh cube is solved', () => {
        expect(isSolved(createSolvedCube())).toBe(true);
    });

    it('a cube with one move applied is not solved', () => {
        const c = createSolvedCube();
        applyMove(c, parseAlgorithm('R')[0]);
        expect(isSolved(c)).toBe(false);
    });

    it('R then R\' is solved', () => {
        const c = createSolvedCube();
        for (const m of parseAlgorithm("R R'")) applyMove(c, m);
        expect(isSolved(c)).toBe(true);
    });

    it('an x rotation keeps the cube solved (faces still uniform)', () => {
        const c = createSolvedCube();
        applyMove(c, parseAlgorithm('x')[0]);
        expect(isSolved(c)).toBe(true);
    });

    it('a single twisted corner breaks face uniformity', () => {
        const c = createSolvedCube();
        // Find the (1,1,1) corner cubie and rotate it 120° around its own
        // body diagonal — this permutes its 3 visible stickers and breaks
        // uniformity of all three of its faces.
        const corner = c.find(
            (k) => k.home[0] === 1 && k.home[1] === 1 && k.home[2] === 1
        );
        // 120° around (1,1,1)/√3 → q = (sin60°/√3) * (1,1,1) + cos60° = (½, ½, ½, ½)
        corner.quaternion = [0.5, 0.5, 0.5, 0.5];
        expect(isSolved(c)).toBe(false);
    });
});
