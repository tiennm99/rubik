import { describe, it, expect } from 'vitest';
import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { runInstant, runAnimated } from '../src/lib/core/algorithm-runner.js';
import { isSolved } from '../src/lib/core/solved-check.js';

describe('algorithm-runner', () => {
    it('runInstant applies all moves and returns the spec list', async () => {
        const c = createSolvedCube();
        const moves = await runInstant(c, "R U R' U'");
        expect(moves.map((m) => m.name)).toEqual(['R', 'U', "R'", "U'"]);
        expect(isSolved(c)).toBe(false);
    });

    it('runAnimated awaits each animation in order', async () => {
        const order = [];
        const fakeAnimate = (m) => {
            order.push(m.name);
            return Promise.resolve();
        };
        const moves = await runAnimated('R U2 F', fakeAnimate);
        expect(order).toEqual(['R', 'U2', 'F']);
        expect(moves).toHaveLength(3);
    });
});
