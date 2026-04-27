// Animates a layer rotation: temporarily reparent moving meshes into a
// THREE.Group, tween group.rotation around the move axis, then bake world
// transforms back into the parent group and update the model.
//
// `applyMoveFn` is called at the end so the cubie model reflects the new state.

import { Group, Quaternion, Vector3 } from 'three';
import { Tween, Easing, update as tweenUpdate } from '@tweenjs/tween.js';
import { applyMove, HALF_PI } from '../core/apply-move.js';
import { syncMeshes } from './cubie-meshes.js';

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

export function tickTweens() {
    tweenUpdate(performance.now());
}

export function animateMove({ parentGroup, meshes, cubies, spec, durationMs = 200 }) {
    return new Promise((resolve) => {
        const idx = AXIS_INDEX[spec.axis];
        const moving = meshes.filter((m) => {
            if (spec.layer === null) return true;
            return Math.round(m.userData.cubie.position[idx]) === spec.layer;
        });

        const pivot = new Group();
        parentGroup.add(pivot);
        for (const mesh of moving) {
            pivot.attach(mesh);
        }

        const targetAngle = spec.sign * HALF_PI * spec.count;
        const state = { a: 0 };

        new Tween(state)
            .to({ a: targetAngle }, durationMs)
            .easing(Easing.Cubic.Out)
            .onUpdate(() => {
                pivot.rotation[spec.axis] = state.a;
            })
            .onComplete(() => {
                pivot.rotation[spec.axis] = targetAngle;
                pivot.updateMatrixWorld(true);
                for (const mesh of moving) {
                    parentGroup.attach(mesh);
                }
                parentGroup.remove(pivot);
                applyMove(cubies, spec);
                syncMeshes(meshes);
                resolve();
            })
            .start();
    });
}

export function snapAndAnimate({ parentGroup, pivot, meshes, cubies, spec, fromAngle, toAngle, durationMs = 120 }) {
    return new Promise((resolve) => {
        const state = { a: fromAngle };
        new Tween(state)
            .to({ a: toAngle }, durationMs)
            .easing(Easing.Cubic.Out)
            .onUpdate(() => { pivot.rotation[spec.axis] = state.a; })
            .onComplete(() => {
                pivot.rotation[spec.axis] = toAngle;
                pivot.updateMatrixWorld(true);
                for (const mesh of [...pivot.children]) {
                    parentGroup.attach(mesh);
                }
                parentGroup.remove(pivot);
                if (Math.abs(toAngle) > 1e-3) {
                    applyMove(cubies, spec);
                }
                syncMeshes(meshes);
                resolve(Math.abs(toAngle) > 1e-3);
            })
            .start();
    });
}
