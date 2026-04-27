import { describe, it, expect } from 'vitest';
import {
    createSolvedCube,
    cloneCubies,
    resetCubies
} from '../src/lib/core/cubie-model.js';

describe('cubie-model', () => {
    it('createSolvedCube returns 27 cubies at integer positions in {-1,0,1}^3', () => {
        const cubies = createSolvedCube();
        expect(cubies).toHaveLength(27);
        for (const c of cubies) {
            for (const v of c.position) expect([-1, 0, 1]).toContain(v);
            expect(c.position).toEqual(c.home);
            expect(c.quaternion).toEqual([0, 0, 0, 1]);
        }
        const keys = new Set(cubies.map((c) => c.position.join(',')));
        expect(keys.size).toBe(27);
    });

    it('cloneCubies produces independent deep copies', () => {
        const a = createSolvedCube();
        const b = cloneCubies(a);
        b[0].position[0] = 999;
        b[0].quaternion[3] = 0;
        expect(a[0].position[0]).not.toBe(999);
        expect(a[0].quaternion[3]).toBe(1);
    });

    it('resetCubies restores positions and identity quaternions', () => {
        const cubies = createSolvedCube();
        for (const c of cubies) {
            c.position = [9, 9, 9];
            c.quaternion = [1, 0, 0, 0];
        }
        resetCubies(cubies);
        for (const c of cubies) {
            expect(c.position).toEqual(c.home);
            expect(c.quaternion).toEqual([0, 0, 0, 1]);
        }
    });
});
