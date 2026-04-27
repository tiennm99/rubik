// Mutates cubies by applying a move spec.
// Strategy: for each cubie on the moving layer, rotate its position by 90deg
// (or 180deg for double turns) around the move axis, then multiply its
// quaternion by the move quaternion. Positions are snapped to integers.

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

export const HALF_PI = Math.PI / 2;

export function applyMove(cubies, spec) {
    const turns = spec.count; // number of 90deg turns
    for (let i = 0; i < turns; i++) {
        applyQuarterTurn(cubies, spec.axis, spec.layer, spec.sign);
    }
}

function applyQuarterTurn(cubies, axis, layer, sign) {
    const idx = AXIS_INDEX[axis];
    for (const cubie of cubies) {
        if (layer !== null && Math.round(cubie.position[idx]) !== layer) continue;
        cubie.position = rotatePosition90(cubie.position, axis, sign);
        cubie.quaternion = multiplyQuat(
            quatFromAxis90(axis, sign),
            cubie.quaternion
        );
        normalizeQuat(cubie.quaternion);
    }
}

// Hardcoded 90deg permutations on integer positions {-1,0,1}^3.
// Verified: R = sign +1 around x maps (1,0,1) -> (1,-1,0); F sign -1 around z
// maps (0,1,1) -> (1,0,1); etc. See plan phase-01 for derivation.
function rotatePosition90([x, y, z], axis, sign) {
    if (axis === 'x') {
        return sign > 0 ? [x, -z,  y] : [x,  z, -y];
    }
    if (axis === 'y') {
        return sign > 0 ? [ z, y, -x] : [-z, y,  x];
    }
    // axis === 'z'
    return sign > 0 ? [-y,  x, z] : [ y, -x, z];
}

const SQRT_HALF = Math.SQRT1_2;

function quatFromAxis90(axis, sign) {
    // q = (axis * sin(45deg), cos(45deg)) for a 90deg rotation
    const s = sign * SQRT_HALF;
    if (axis === 'x') return [s, 0, 0, SQRT_HALF];
    if (axis === 'y') return [0, s, 0, SQRT_HALF];
    return [0, 0, s, SQRT_HALF];
}

// Hamilton product: returns a * b
export function multiplyQuat(a, b) {
    const [ax, ay, az, aw] = a;
    const [bx, by, bz, bw] = b;
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz
    ];
}

export function normalizeQuat(q) {
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    if (len > 0) {
        q[0] /= len;
        q[1] /= len;
        q[2] /= len;
        q[3] /= len;
    }
    return q;
}
