// Move spec: { axis: 'x'|'y'|'z', layer: -1|0|1|null, sign: +1|-1, count: 1|2 }
// `layer` is the integer coordinate on `axis` of the cubies that rotate.
// `layer === null` means the whole cube rotates (x/y/z whole-cube rotations).
// `sign` is the sign of the rotation angle around the +axis (right-hand rule).
// Convention chosen so that the visual result matches WCA notation:
//   R/U/F = -90deg around +x/+y/+z
//   L/D/B = +90deg around +x/+y/+z (opposite layer, opposite spin)

const BASE = {
    R: { axis: 'x', layer: 1,  sign: -1 },
    L: { axis: 'x', layer: -1, sign:  1 },
    U: { axis: 'y', layer: 1,  sign: -1 },
    D: { axis: 'y', layer: -1, sign:  1 },
    F: { axis: 'z', layer: 1,  sign: -1 },
    B: { axis: 'z', layer: -1, sign:  1 },
    M: { axis: 'x', layer: 0,  sign:  1 }, // follows L
    E: { axis: 'y', layer: 0,  sign:  1 }, // follows D
    S: { axis: 'z', layer: 0,  sign: -1 }, // follows F
    x: { axis: 'x', layer: null, sign: -1 }, // whole cube, R-direction
    y: { axis: 'y', layer: null, sign: -1 }, // whole cube, U-direction
    z: { axis: 'z', layer: null, sign: -1 }  // whole cube, F-direction
};

export const FACE_MOVES = ['U', 'D', 'R', 'L', 'F', 'B'];

export function getMoveSpec(name) {
    if (typeof name !== 'string' || name.length === 0) {
        throw new Error(`Invalid move: ${name}`);
    }
    const baseChar = name[0];
    const base = BASE[baseChar];
    if (!base) throw new Error(`Unknown move: ${name}`);

    let sign = base.sign;
    let count = 1;
    const suffix = name.slice(1);
    if (suffix === "'") {
        sign = -sign;
    } else if (suffix === '2') {
        count = 2;
    } else if (suffix !== '') {
        throw new Error(`Unknown move suffix: ${name}`);
    }

    return { axis: base.axis, layer: base.layer, sign, count, name };
}

export function inverseMove(spec) {
    return {
        axis: spec.axis,
        layer: spec.layer,
        sign: spec.count === 2 ? spec.sign : -spec.sign,
        count: spec.count,
        name: invertName(spec.name)
    };
}

function invertName(name) {
    if (!name) return name;
    if (name.endsWith('2')) return name;
    if (name.endsWith("'")) return name.slice(0, -1);
    return name + "'";
}
