// Authoritative cube state: 27 cubies in {-1, 0, 1}^3.
// Each cubie tracks its home (initial) position, current integer position,
// and current orientation as a quaternion [x, y, z, w].
// All other modules treat this array as the single source of truth.

export function createCubie(x, y, z) {
    return {
        home: [x, y, z],
        position: [x, y, z],
        // Identity quaternion (no rotation).
        quaternion: [0, 0, 0, 1]
    };
}

export function createSolvedCube() {
    const cubies = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                cubies.push(createCubie(x, y, z));
            }
        }
    }
    return cubies;
}

export function cloneCubies(cubies) {
    return cubies.map((c) => ({
        home: [...c.home],
        position: [...c.position],
        quaternion: [...c.quaternion]
    }));
}

export function resetCubies(cubies) {
    for (const c of cubies) {
        c.position = [...c.home];
        c.quaternion = [0, 0, 0, 1];
    }
}
