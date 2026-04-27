// Three.js scene boilerplate. Owns camera, renderer, lights, OrbitControls.
// Returns a small handle the rest of the app uses to render frames and
// dispose resources cleanly on unmount.

import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    Color
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initScene(canvas) {
    const scene = new Scene();
    scene.background = new Color(0x101015);

    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(4, 4, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambient = new AmbientLight(0xffffff, 0.65);
    const directional = new DirectionalLight(0xffffff, 0.85);
    directional.position.set(5, 10, 7);
    scene.add(ambient, directional);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 14;
    controls.rotateSpeed = 0.8;

    function resize() {
        const w = canvas.clientWidth || 1;
        const h = canvas.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function render() {
        controls.update();
        renderer.render(scene, camera);
    }

    function dispose() {
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
    }

    return { scene, camera, renderer, controls, render, dispose };
}
