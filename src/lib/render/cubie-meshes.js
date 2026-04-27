// Builds 27 cubie meshes from the cube model. Each cubie is a single
// RoundedBoxGeometry with a 6-material array. Outward-facing faces get
// sticker colors; inner faces stay black so visible gaps look like the
// real cube body.
//
// Material face order in BoxGeometry: [+x, -x, +y, -y, +z, -z]

import {
    Mesh,
    Group,
    MeshStandardMaterial,
    Quaternion,
    Vector3
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const COLORS = {
    plusX:  0xb71c1c, // R: red
    minusX: 0xef6c00, // L: orange
    plusY:  0xf5f5f5, // U: white
    minusY: 0xfbc02d, // D: yellow
    plusZ:  0x2e7d32, // F: green
    minusZ: 0x1565c0, // B: blue
    inner:  0x111114
};

const CUBIE_SIZE = 0.94;

let geometrySingleton = null;
function getGeometry() {
    if (!geometrySingleton) {
        geometrySingleton = new RoundedBoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE, 4, 0.08);
    }
    return geometrySingleton;
}

function makeMat(color) {
    return new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
}

function buildMaterials(home) {
    const inner = makeMat(COLORS.inner);
    return [
        home[0] === 1  ? makeMat(COLORS.plusX)  : inner,
        home[0] === -1 ? makeMat(COLORS.minusX) : inner,
        home[1] === 1  ? makeMat(COLORS.plusY)  : inner,
        home[1] === -1 ? makeMat(COLORS.minusY) : inner,
        home[2] === 1  ? makeMat(COLORS.plusZ)  : inner,
        home[2] === -1 ? makeMat(COLORS.minusZ) : inner
    ];
}

export function buildCubieMeshes(cubies) {
    const group = new Group();
    group.name = 'cube';
    const meshes = [];
    for (const cubie of cubies) {
        const mesh = new Mesh(getGeometry(), buildMaterials(cubie.home));
        mesh.userData.cubie = cubie;
        mesh.position.set(cubie.position[0], cubie.position[1], cubie.position[2]);
        const q = cubie.quaternion;
        mesh.quaternion.set(q[0], q[1], q[2], q[3]);
        group.add(mesh);
        meshes.push(mesh);
    }
    return { group, meshes };
}

const tmpVec = new Vector3();
const tmpQuat = new Quaternion();

export function syncMeshes(meshes) {
    for (const mesh of meshes) {
        const cubie = mesh.userData.cubie;
        tmpVec.set(cubie.position[0], cubie.position[1], cubie.position[2]);
        mesh.position.copy(tmpVec);
        const q = cubie.quaternion;
        tmpQuat.set(q[0], q[1], q[2], q[3]);
        mesh.quaternion.copy(tmpQuat);
    }
}

export function readMeshIntoCubie(mesh) {
    const cubie = mesh.userData.cubie;
    cubie.position = [
        Math.round(mesh.position.x),
        Math.round(mesh.position.y),
        Math.round(mesh.position.z)
    ];
    cubie.quaternion = [
        mesh.quaternion.x,
        mesh.quaternion.y,
        mesh.quaternion.z,
        mesh.quaternion.w
    ];
}
