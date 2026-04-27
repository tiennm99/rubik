// Convert authoritative 27-cubie 3D model to a 54-character facelet string in
// cubejs / Kociemba URFDLB order. Used as input to the Kociemba two-phase solver.
//
// Sticker color at world-outward direction `dir` for the cubie at slot position
// is determined by the cubie's quaternion: rotate `dir` by the inverse rotation
// to get the cubie-local axis whose face is now pointing in `dir`; the sign of
// that axis fixes the original color (R/L = ±X, U/D = ±Y, F/B = ±Z).

const FACES = [
    { dir: [0, 1, 0], slots: [
        [-1, 1, -1], [0, 1, -1], [1, 1, -1],
        [-1, 1,  0], [0, 1,  0], [1, 1,  0],
        [-1, 1,  1], [0, 1,  1], [1, 1,  1]
    ]},
    { dir: [1, 0, 0], slots: [
        [1, 1,  1], [1, 1,  0], [1, 1, -1],
        [1, 0,  1], [1, 0,  0], [1, 0, -1],
        [1,-1,  1], [1,-1,  0], [1,-1, -1]
    ]},
    { dir: [0, 0, 1], slots: [
        [-1, 1,  1], [0, 1,  1], [1, 1,  1],
        [-1, 0,  1], [0, 0,  1], [1, 0,  1],
        [-1,-1,  1], [0,-1,  1], [1,-1,  1]
    ]},
    { dir: [0, -1, 0], slots: [
        [-1,-1,  1], [0,-1,  1], [1,-1,  1],
        [-1,-1,  0], [0,-1,  0], [1,-1,  0],
        [-1,-1, -1], [0,-1, -1], [1,-1, -1]
    ]},
    { dir: [-1, 0, 0], slots: [
        [-1, 1, -1], [-1, 1, 0], [-1, 1,  1],
        [-1, 0, -1], [-1, 0, 0], [-1, 0,  1],
        [-1,-1, -1], [-1,-1, 0], [-1,-1,  1]
    ]},
    { dir: [0, 0, -1], slots: [
        [ 1, 1, -1], [0, 1, -1], [-1, 1, -1],
        [ 1, 0, -1], [0, 0, -1], [-1, 0, -1],
        [ 1,-1, -1], [0,-1, -1], [-1,-1, -1]
    ]}
];

const AXIS_CHAR = [
    { plus: 'R', minus: 'L' },
    { plus: 'U', minus: 'D' },
    { plus: 'F', minus: 'B' }
];

export function cubeToFacelets(cubies) {
    const byPos = new Map();
    for (const c of cubies) byPos.set(posKey(c.position), c);

    let out = '';
    for (const face of FACES) {
        for (const slot of face.slots) {
            const cubie = byPos.get(posKey(slot));
            if (!cubie) throw new Error(`No cubie at slot ${slot.join(',')}`);
            out += stickerColor(cubie, face.dir);
        }
    }
    return out;
}

function posKey([x, y, z]) {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

function stickerColor(cubie, worldDir) {
    const [lx, ly, lz] = rotateByQuatInverse(worldDir, cubie.quaternion);
    const ax = Math.abs(lx), ay = Math.abs(ly), az = Math.abs(lz);
    let i, sign;
    if (ax >= ay && ax >= az) { i = 0; sign = lx >= 0; }
    else if (ay >= az)        { i = 1; sign = ly >= 0; }
    else                       { i = 2; sign = lz >= 0; }
    return sign ? AXIS_CHAR[i].plus : AXIS_CHAR[i].minus;
}

// v' = q⁻¹ · v · q, using inverse = conjugate for unit quaternions.
function rotateByQuatInverse(v, q) {
    return rotateByQuat(v, [-q[0], -q[1], -q[2], q[3]]);
}

function rotateByQuat(v, q) {
    const [qx, qy, qz, qw] = q;
    const [vx, vy, vz] = v;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    return [
        vx + qw * tx + (qy * tz - qz * ty),
        vy + qw * ty + (qz * tx - qx * tz),
        vz + qw * tz + (qx * ty - qy * tx)
    ];
}
