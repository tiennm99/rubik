// Pointer-based drag-to-rotate-face gesture.
//
// State machine: IDLE -> PROBING (after pointerdown hits the cube) ->
// DRAGGING (after pointer travels past dead-zone, axis is locked) -> IDLE
// (on pointerup, after snap animation).
//
// While DRAGGING, OrbitControls is disabled and the layer is reparented into
// a Group whose rotation tracks the pointer.

import { Raycaster, Vector2, Vector3, Group } from 'three';
import { snapAndAnimate } from '../render/animate-move.js';
import { HALF_PI } from '../core/apply-move.js';
import {
    AXIS_INDEX,
    makeProjectToScreen,
    chooseRotationAxis,
    classifyFaceAxis,
    specToName
} from './gesture-math.js';

const DEAD_ZONE_PX = 8;
const PIXELS_PER_QUARTER_TURN = 90;

const STATE_IDLE = 0;
const STATE_PROBING = 1;
const STATE_DRAGGING = 2;

export function setupPointerGesture({ canvas, camera, controls, parentGroup, meshes, cubies, onMoveCommitted, isBusy, setBusy }) {
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const projectToScreen = makeProjectToScreen(camera, canvas);

    let state = STATE_IDLE;
    let pointerId = null;
    let downX = 0, downY = 0;
    let hitMesh = null;
    let hitFaceAxis = null;
    let pivot = null;
    let pivotAxis = null;
    let layerIndex = 0;
    let signMul = 1;
    let pixelsAxis = new Vector2();
    let curAngle = 0;
    // Track whether *we* set the busy flag; only release it on cleanup if so.
    // Without this, a busy-during-PROBING bail would clear a busy flag set by
    // an unrelated keyboard-driven animation that's still in flight.
    let ownedBusy = false;

    function getNDC(e) {
        const rect = canvas.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(e) {
        if (state !== STATE_IDLE) return;
        if (isBusy && isBusy()) return;
        getNDC(e);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length === 0) return;
        const hit = hits[0];
        const normal = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);
        hitFaceAxis = classifyFaceAxis(normal);
        hitMesh = hit.object;
        downX = e.clientX;
        downY = e.clientY;
        pointerId = e.pointerId;
        canvas.setPointerCapture(pointerId);
        controls.enabled = false;
        state = STATE_PROBING;
        e.preventDefault();
    }

    function lockAxis(dx, dy) {
        if (isBusy && isBusy()) {
            // Keyboard animation started during PROBING. We never owned busy,
            // so abort this gesture without clearing it.
            endGesture();
            return;
        }
        const hitWorldPos = hitMesh.getWorldPosition(new Vector3());
        if (typeof globalThis !== 'undefined' && globalThis.RUBIK_DEBUG) {
            const cubie = hitMesh.userData.cubie;
            console.log('[HIT]', {
                hitFaceAxis,
                hitWorldPos: [hitWorldPos.x.toFixed(3), hitWorldPos.y.toFixed(3), hitWorldPos.z.toFixed(3)],
                cubieHome: cubie.home,
                cubiePosition: cubie.position
            });
        }
        const decision = chooseRotationAxis({
            hitFaceAxis,
            hitWorldPos,
            dx, dy,
            projectFn: projectToScreen
        });
        pivotAxis = decision.rotAxis;
        signMul = decision.signMul;
        pixelsAxis.copy(decision.screenDragDir);
        layerIndex = Math.round(hitMesh.userData.cubie.position[AXIS_INDEX[pivotAxis]]);

        pivot = new Group();
        parentGroup.add(pivot);
        for (const mesh of meshes) {
            if (Math.round(mesh.userData.cubie.position[AXIS_INDEX[pivotAxis]]) === layerIndex) {
                pivot.attach(mesh);
            }
        }
        curAngle = 0;
        state = STATE_DRAGGING;
        // We now own the busy gate — block keyboard, scramble, undo, etc.
        setBusy?.(true);
        ownedBusy = true;
    }

    function onPointerMove(e) {
        if (state === STATE_IDLE) return;
        if (e.pointerId !== pointerId) return;
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        if (state === STATE_PROBING) {
            if (Math.hypot(dx, dy) < DEAD_ZONE_PX) return;
            lockAxis(dx, dy);
            return;
        }
        const dragPx = pixelsAxis.x * dx + pixelsAxis.y * dy;
        const angle = (dragPx / PIXELS_PER_QUARTER_TURN) * HALF_PI * signMul;
        curAngle = clamp(angle, -HALF_PI, HALF_PI);
        pivot.rotation[pivotAxis] = curAngle;
    }

    function onPointerUp(e) {
        if (e.pointerId !== pointerId) return;
        if (state !== STATE_DRAGGING) {
            endGesture();
            return;
        }
        const turns = Math.round(curAngle / HALF_PI);
        const targetAngle = turns * HALF_PI;

        if (turns === 0) {
            const dummy = { axis: pivotAxis, layer: layerIndex, sign: 1, count: 0, name: '' };
            snapAndAnimate({
                parentGroup, pivot, meshes, cubies,
                spec: dummy,
                fromAngle: curAngle, toAngle: 0, durationMs: 100
            }).then(() => endGesture());
            return;
        }

        const sign = turns > 0 ? 1 : -1;
        const count = Math.abs(turns) === 2 ? 2 : 1;
        const spec = { axis: pivotAxis, layer: layerIndex, sign, count, name: '' };
        if (typeof globalThis !== 'undefined' && globalThis.RUBIK_DEBUG) {
            console.log('[COMMIT]', { curAngle: curAngle.toFixed(3), turns, spec, name: specToName(spec) });
        }
        snapAndAnimate({
            parentGroup, pivot, meshes, cubies, spec,
            fromAngle: curAngle, toAngle: targetAngle, durationMs: 120
        }).then(() => {
            onMoveCommitted?.(specToName(spec));
            endGesture();
        });
    }

    // Single teardown path. Releases pointer capture + restores OrbitControls,
    // and releases the busy gate iff *this* gesture had taken it.
    function endGesture() {
        if (pointerId !== null) {
            try { canvas.releasePointerCapture(pointerId); } catch {}
            pointerId = null;
        }
        controls.enabled = true;
        state = STATE_IDLE;
        pivot = null;
        hitMesh = null;
        if (ownedBusy) {
            setBusy?.(false);
            ownedBusy = false;
        }
    }

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return {
        dispose() {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            // If unmount happens mid-drag, release busy so the parent isn't
            // permanently locked. Safe even if !ownedBusy (no-op).
            endGesture();
        }
    };
}
