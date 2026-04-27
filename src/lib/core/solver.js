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
        })();
    }
    return initPromise;
}

export async function solve(cubies) {
    const Cube = await initSolver();
    const facelets = cubeToFacelets(cubies);
    const cube = Cube.fromString(facelets);
    return cube.solve();
}
