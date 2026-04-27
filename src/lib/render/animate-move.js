// Animates a layer rotation: temporarily reparent moving meshes into a
// THREE.Group, tween group.rotation around the move axis, then bake world
// transforms back into the parent group and update the model.
//
// `applyMoveFn` is called at the end so the cubie model reflects the new state.

import { Group, Quaternion, Vector3 } from 'three';
import { Tween, Easing, Group as TweenGroup } from '@tweenjs/tween.js';
import { applyMove, HALF_PI } from '../core/apply-move.js';
import { syncMeshes } from './cubie-meshes.js';

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

// In tween.js v25 tweens are no longer auto-registered to a default group;
// the module-level update() does not advance them. Use an explicit Group and
// hand every new Tween a reference to it.
const TWEENS = new TweenGroup();

export function tickTweens() {
    TWEENS.update(performance.now());
}

// Cancel every in-flight tween. Call on CubeView unmount so leftover
// onComplete callbacks don't reattach meshes onto an orphaned scene tree.
export function clearTweens() {
    TWEENS.removeAll();
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

        new Tween(state, TWEENS)
            .to({ a: targetAngle }, durationMs)
            .easing(Easing.Cubic.Out)
            .onUpdate(() => {
                pivot.rotation[spec.axis] = state.a;
            })
            .onComplete(() => {
                try {
                    pivot.rotation[spec.axis] = targetAngle;
                    pivot.updateMatrixWorld(true);
                    for (const mesh of moving) {
                        parentGroup.attach(mesh);
                    }
                    parentGroup.remove(pivot);
                    applyMove(cubies, spec);
                    syncMeshes(meshes);
                } finally {
                    // Resolve even on failure so the awaiter never deadlocks
                    // with busy=true.
                    resolve();
                }
            })
            .start();
    });
}

export function snapAndAnimate({ parentGroup, pivot, meshes, cubies, spec, fromAngle, toAngle, durationMs = 120 }) {
    return new Promise((resolve) => {
        const state = { a: fromAngle };
        const wantApply = Math.abs(toAngle) > 1e-3;
        new Tween(state, TWEENS)
            .to({ a: toAngle }, durationMs)
            .easing(Easing.Cubic.Out)
            .onUpdate(() => { pivot.rotation[spec.axis] = state.a; })
            .onComplete(() => {
                try {
                    pivot.rotation[spec.axis] = toAngle;
                    pivot.updateMatrixWorld(true);
                    for (const mesh of [...pivot.children]) {
                        parentGroup.attach(mesh);
                    }
                    parentGroup.remove(pivot);
                    if (wantApply) applyMove(cubies, spec);
                    syncMeshes(meshes);
                } finally {
                    resolve(wantApply);
                }
            })
            .start();
    });
}
