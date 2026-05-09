import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    base: '/rubik/',
    plugins: [svelte()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            // 'smallest' drops cubejs's top-level `Cube.initSolver = ...` static-method
            // assignments, producing `t.initSolver is not a function` at runtime.
            // 'safest' (Rollup default) preserves these side-effectful writes.
            treeshake: 'safest'
        }
    }
});
