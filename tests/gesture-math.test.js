// Face-invariance regression test for chooseRotationAxis.
//
// Bug: motionWorld = R̂ × hitWorldPos leaks a face-normal component (β·F̂)
// for edge/corner cubies. Under a tilted projection, this leakage can flip
// signMul, causing drag-to-rotate to go the OPPOSITE direction.
//
// Invariant: signMul and rotAxis must depend only on (hitFaceAxis, drag),
// not on which cubie on the face was clicked. Face-center, edge, and corner
// cubies on the same face MUST agree.
//
// See: plans/reports/brainstorm-260509-0954-edge-rotation-reverse-direction.md

import { describe, it, expect } from 'vitest';
import { Vector2, Vector3 } from 'three';
import { chooseRotationAxis } from '../src/lib/controls/gesture-math.js';

// Affine isometric-ish projection. Every world axis maps to a non-zero
// screen component, exposing β-leakage. (If F̂ projected to zero on screen,
// the bug would be invisible — but real orbit cameras tilt this way.)
function isoProject(worldVec) {
    return new Vector2(
        worldVec.x - 0.5 * worldVec.z,
        -(worldVec.y - 0.5 * worldVec.z)
    );
}

const FACE_AXES = ['x', 'y', 'z'];
const SIDES = [-1, 1];

// Build cubie positions on a given face: center, 4 edges, 4 corners.
function cubiesOnFace(faceAxis, faceSign) {
    const inFaceAxes = FACE_AXES.filter((a) => a !== faceAxis);
    const out = [];
    const center = vecOnFace(faceAxis, faceSign, {});
    out.push({ pos: center, kind: 'center' });
    for (const a of inFaceAxes) {
        for (const s of SIDES) {
            out.push({ pos: vecOnFace(faceAxis, faceSign, { [a]: s }), kind: `edge±${a}` });
        }
    }
    const [a, b] = inFaceAxes;
    for (const sa of SIDES) {
        for (const sb of SIDES) {
            out.push({ pos: vecOnFace(faceAxis, faceSign, { [a]: sa, [b]: sb }), kind: `corner` });
        }
    }
    return out;
}

function vecOnFace(faceAxis, faceSign, others) {
    const o = { x: 0, y: 0, z: 0, ...others };
    o[faceAxis] = faceSign;
    return [o.x, o.y, o.z];
}

const DRAGS = [
    { dx: 10, dy: 0, name: 'right' },
    { dx: -10, dy: 0, name: 'left' },
    { dx: 0, dy: 10, name: 'down' },
    { dx: 0, dy: -10, name: 'up' }
];

function callChoose(faceAxis, pos, drag) {
    return chooseRotationAxis({
        hitFaceAxis: faceAxis,
        hitWorldPos: new Vector3(...pos),
        dx: drag.dx,
        dy: drag.dy,
        projectFn: isoProject
    });
}

describe('chooseRotationAxis face-invariance: edges and corners agree with face-center', () => {
    for (const faceAxis of FACE_AXES) {
        for (const faceSign of SIDES) {
            const sideName = `${faceSign > 0 ? '+' : '-'}${faceAxis}`;
            const cubies = cubiesOnFace(faceAxis, faceSign);
            const center = cubies[0];

            for (const drag of DRAGS) {
                it(`${sideName} face, drag ${drag.name}: 8 non-center cubies match center`, () => {
                    const c = callChoose(faceAxis, center.pos, drag);
                    for (const cubie of cubies.slice(1)) {
                        const r = callChoose(faceAxis, cubie.pos, drag);
                        const ctx = `${cubie.kind} @ (${cubie.pos.join(',')})`;
                        expect(r.rotAxis, `rotAxis mismatch for ${ctx}`).toBe(c.rotAxis);
                        expect(r.signMul, `signMul mismatch for ${ctx}`).toBe(c.signMul);
                    }
                });
            }
        }
    }
});

describe('chooseRotationAxis: face-center sign convention smoke test', () => {
    // Pin expected rotAxis for each face × cardinal drag at the face center.
    // Locks in the convention so a future refactor of signMul math doesn't
    // silently flip rotation direction.
    const cases = [
        ['x',  1, 'right', 'y'], ['x',  1, 'up',   'z'],
        ['x', -1, 'right', 'y'], ['x', -1, 'up',   'z'],
        ['y',  1, 'right', 'z'], ['y',  1, 'up',   'x'],
        ['y', -1, 'right', 'z'], ['y', -1, 'up',   'x'],
        ['z',  1, 'right', 'y'], ['z',  1, 'up',   'x'],
        ['z', -1, 'right', 'y'], ['z', -1, 'up',   'x']
    ];
    for (const [faceAxis, faceSign, dragName, expectedRotAxis] of cases) {
        it(`${faceSign > 0 ? '+' : '-'}${faceAxis} face, drag ${dragName} → rotAxis=${expectedRotAxis}`, () => {
            const drag = DRAGS.find((d) => d.name === dragName);
            const r = callChoose(faceAxis, vecOnFace(faceAxis, faceSign, {}), drag);
            expect(r.rotAxis).toBe(expectedRotAxis);
        });
    }
});
