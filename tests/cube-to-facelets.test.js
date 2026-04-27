import { describe, it, expect } from 'vitest';
import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { applyMove } from '../src/lib/core/apply-move.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';
import { cubeToFacelets } from '../src/lib/core/cube-to-facelets.js';

const SOLVED =
    'UUUUUUUUU' +
    'RRRRRRRRR' +
    'FFFFFFFFF' +
    'DDDDDDDDD' +
    'LLLLLLLLL' +
    'BBBBBBBBB';

function run(cubies, algo) {
    for (const m of parseAlgorithm(algo)) applyMove(cubies, m);
}

describe('cube-to-facelets', () => {
    it('a solved cube produces the canonical Kociemba string', () => {
        expect(cubeToFacelets(createSolvedCube())).toBe(SOLVED);
    });

    it('every face center stays the same after any single face move', () => {
        for (const move of ['R', 'L', 'U', 'D', 'F', 'B']) {
            const c = createSolvedCube();
            run(c, move);
            const f = cubeToFacelets(c);
            // Face center indices: 4, 13, 22, 31, 40, 49 (URFDLB)
            expect(f[4]).toBe('U');
            expect(f[13]).toBe('R');
            expect(f[22]).toBe('F');
            expect(f[31]).toBe('D');
            expect(f[40]).toBe('L');
            expect(f[49]).toBe('B');
        }
    });

    it('produces 54 chars made only of URFDLB', () => {
        const c = createSolvedCube();
        run(c, "R U R' U' F2 B M' x");
        const f = cubeToFacelets(c);
        expect(f).toHaveLength(54);
        expect(/^[URFDLB]{54}$/.test(f)).toBe(true);
    });

    it('exactly 9 stickers of each color, regardless of state', () => {
        const c = createSolvedCube();
        run(c, "R U2 F' L D B' M E S");
        const f = cubeToFacelets(c);
        const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
        for (const ch of f) counts[ch]++;
        expect(counts).toEqual({ U: 9, R: 9, F: 9, D: 9, L: 9, B: 9 });
    });

    it('R move produces the expected Singmaster facelet pattern', () => {
        const c = createSolvedCube();
        run(c, 'R');
        const f = cubeToFacelets(c);
        // After R: U-right column becomes F (was U), F-right column becomes D,
        // D-right column becomes B, B-left column becomes U.
        // Verify a few distinctive stickers:
        expect(f[2]).toBe('F'); // U3 (top-right-back of U) → F color
        expect(f[5]).toBe('F'); // U6
        expect(f[8]).toBe('F'); // U9
        // F-right column → D color
        expect(f[20]).toBe('D'); // F3
        expect(f[23]).toBe('D'); // F6
        expect(f[26]).toBe('D'); // F9
    });
});
