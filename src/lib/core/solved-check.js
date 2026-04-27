// Solved iff each of the 6 facelet groups (9 stickers per face) is uniform.
// This is the WCA / Kociemba definition: orientation of the cube as a whole
// (whole-cube `x`/`y`/`z` rotations) does not unsolve the cube; invisible
// center spins do not matter; only sticker correctness counts.

import { cubeToFacelets } from './cube-to-facelets.js';

export function isSolved(cubies) {
    const f = cubeToFacelets(cubies);
    for (let face = 0; face < 6; face++) {
        const start = face * 9;
        const color = f[start];
        for (let i = 1; i < 9; i++) {
            if (f[start + i] !== color) return false;
        }
    }
    return true;
}
