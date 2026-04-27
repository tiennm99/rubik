// A cubie is "home" if its current position equals its initial position
// AND its orientation is a multiple of identity (q ~ +/-(0,0,0,1)).
// The cube is solved iff every cubie is home.

const POS_EPS = 0.05;
const QUAT_EPS = 0.05;

export function isSolved(cubies) {
    for (const c of cubies) {
        if (!isHome(c)) return false;
    }
    return true;
}

function isHome(cubie) {
    for (let i = 0; i < 3; i++) {
        if (Math.abs(cubie.position[i] - cubie.home[i]) > POS_EPS) return false;
    }
    const [qx, qy, qz, qw] = cubie.quaternion;
    const axisLen = Math.abs(qx) + Math.abs(qy) + Math.abs(qz);
    const wOk = Math.abs(Math.abs(qw) - 1) < QUAT_EPS;
    return axisLen < QUAT_EPS && wOk;
}
