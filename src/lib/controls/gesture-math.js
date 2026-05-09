// Pure helpers used by the pointer-gesture state machine.
// Kept separate so pointer-gesture.js stays under the 200-LOC limit.

import { Vector2, Vector3 } from 'three';

const AXIS_VECS = {
    x: new Vector3(1, 0, 0),
    y: new Vector3(0, 1, 0),
    z: new Vector3(0, 0, 1)
};
export { AXIS_VECS };

export const AXIS_INDEX = { x: 0, y: 1, z: 2 };

export function makeProjectToScreen(camera, canvas) {
    return function projectWorldToScreen(worldVec) {
        const v = worldVec.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        return new Vector2(
            (v.x * 0.5 + 0.5) * rect.width,
            (-v.y * 0.5 + 0.5) * rect.height
        );
    };
}

// Given a hit on a face whose normal points along `hitFaceAxis`, decide which
// rotation axis to lock in based on the user's screen-space drag direction.
// Returns { rotAxis, dragAxis, screenDragDir, signMul }.
export function chooseRotationAxis({ hitFaceAxis, hitWorldPos, dx, dy, projectFn }) {
    const inPlane = ['x', 'y', 'z'].filter((a) => a !== hitFaceAxis);
    const screenOrigin = projectFn(hitWorldPos);
    const screenDirs = inPlane.map((axis) => {
        const tip = hitWorldPos.clone().add(AXIS_VECS[axis]);
        return projectFn(tip).sub(screenOrigin).normalize();
    });

    const drag = new Vector2(dx, dy);
    const projs = screenDirs.map((dir) => dir.dot(drag));
    let dragAxisIdx;
    if (Math.abs(projs[0]) + Math.abs(projs[1]) < 1e-3) {
        // Both in-plane axes project nearly to a point on screen (camera looks
        // straight down the face normal). Fall back to raw screen drag axes.
        dragAxisIdx = Math.abs(dx) >= Math.abs(dy) ? 0 : 1;
    } else {
        dragAxisIdx = Math.abs(projs[0]) > Math.abs(projs[1]) ? 0 : 1;
    }
    const dragAxis = inPlane[dragAxisIdx];
    const rotAxis = inPlane[1 - dragAxisIdx];

    // Determine sign so that positive screen-drag along screenDirs[dragAxisIdx]
    // produces a rotation whose induced motion at hitWorldPos points the same way.
    //
    // Anchor the cross product to the face-normal axis only (drop in-plane
    // components of hitWorldPos). For edge/corner cubies the in-plane
    // components leak into motionWorld as a face-normal velocity (β·F̂),
    // which projects onto screen and can flip signMul under tilted cameras —
    // making drag-to-rotate go the OPPOSITE direction. Face-anchored motion
    // is purely tangential, so signMul is identical for every cubie on the
    // same face (the physically correct invariant).
    const faceAnchor = new Vector3();
    faceAnchor[hitFaceAxis] = hitWorldPos[hitFaceAxis];
    const motionWorld = new Vector3()
        .crossVectors(AXIS_VECS[rotAxis], faceAnchor)
        .normalize();
    const motionScreen = projectFn(hitWorldPos.clone().add(motionWorld)).sub(screenOrigin);
    const signMul = motionScreen.dot(drag) >= 0 ? 1 : -1;

    return {
        rotAxis,
        dragAxis,
        screenDragDir: screenDirs[dragAxisIdx],
        signMul
    };
}

// Map an axis-aligned world normal to one of 'x'|'y'|'z' (taking the largest
// component magnitude — the face is always axis-aligned in our cube).
export function classifyFaceAxis(normalVec) {
    const ax = Math.abs(normalVec.x);
    const ay = Math.abs(normalVec.y);
    const az = Math.abs(normalVec.z);
    if (ax >= ay && ax >= az) return 'x';
    if (ay >= az) return 'y';
    return 'z';
}

// Convert a committed move spec back into WCA notation for the move log.
// Each face/slice has a canonical sign defined by move-definitions; if the
// user produced the opposite sign, append a prime.
const FACE_BY_AXIS_LAYER = {
    'x:1': 'R', 'x:-1': 'L',
    'y:1': 'U', 'y:-1': 'D',
    'z:1': 'F', 'z:-1': 'B',
    'x:0': 'M', 'y:0': 'E', 'z:0': 'S'
};
const BASE_SIGN = { R: -1, L: 1, U: -1, D: 1, F: -1, B: 1, M: 1, E: 1, S: -1 };

export function specToName(spec) {
    const face = FACE_BY_AXIS_LAYER[`${spec.axis}:${spec.layer}`] || 'R';
    if (spec.count === 2) return face + '2';
    const isPrime = spec.sign !== BASE_SIGN[face];
    return face + (isPrime ? "'" : '');
}
