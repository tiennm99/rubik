// Kociemba two-phase solver wrapped around cubejs. Lazy-loaded so the ~80 KB
// solver bundle and ~4–5 s table init do not block first paint.

import { cubeToFacelets } from './cube-to-facelets.js';

let modulePromise = null;
let initPromise = null;

async function loadCube() {
    if (!modulePromise) {
        modulePromise = import('cubejs').then((m) => m.default ?? m);
    }
    return modulePromise;
}

export async function initSolver() {
    if (!initPromise) {
        initPromise = (async () => {
            const Cube = await loadCube();
            Cube.initSolver();
            return Cube;
        })().catch((err) => {
            // Reset so a future caller can retry instead of getting the same
            // rejection forever (e.g. transient OOM during table build).
            initPromise = null;
            throw err;
        });
    }
    return initPromise;
}

export async function solve(cubies) {
    const Cube = await initSolver();
    const facelets = cubeToFacelets(cubies);
    const cube = Cube.fromString(facelets);
    return cube.solve();
}
