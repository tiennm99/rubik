// Animates a layer rotation: temporarily reparent moving meshes into a
// THREE.Group, tween group.rotation around the move axis, then bake world
// transforms back into the parent group and update the model.

import { Group } from 'three';
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

// Core tween. Caller supplies an already-populated pivot Group plus
// from/to angles; we tween, then bake meshes back to parentGroup and
// optionally apply the move spec to the cubie model.
function tweenPivot({ parentGroup, pivot, meshes, cubies, spec, fromAngle, toAngle, durationMs, applyToModel }) {
    return new Promise((resolve) => {
        const state = { a: fromAngle };
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
                    if (applyToModel) applyMove(cubies, spec);
                    syncMeshes(meshes);
                } finally {
                    // Resolve even on failure so the awaiter never deadlocks
                    // with busy=true.
                    resolve(applyToModel);
                }
            })
            .start();
    });
}

export function animateMove({ parentGroup, meshes, cubies, spec, durationMs = 200 }) {
    const idx = AXIS_INDEX[spec.axis];
    const pivot = new Group();
    parentGroup.add(pivot);
    for (const mesh of meshes) {
        if (spec.layer === null || Math.round(mesh.userData.cubie.position[idx]) === spec.layer) {
            pivot.attach(mesh);
        }
    }
    const targetAngle = spec.sign * HALF_PI * spec.count;
    return tweenPivot({
        parentGroup, pivot, meshes, cubies, spec,
        fromAngle: 0, toAngle: targetAngle,
        durationMs, applyToModel: true
    });
}

export function snapAndAnimate({ parentGroup, pivot, meshes, cubies, spec, fromAngle, toAngle, durationMs = 120 }) {
    return tweenPivot({
        parentGroup, pivot, meshes, cubies, spec,
        fromAngle, toAngle, durationMs,
        applyToModel: Math.abs(toAngle) > 1e-3
    });
}
