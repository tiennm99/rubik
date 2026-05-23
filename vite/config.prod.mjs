import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    base: '/rubik/',
    plugins: [svelte()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rolldownOptions: {
            // Preserve cubejs's top-level `Cube.initSolver = ...` static-method
            // assignments. Dropping them (aggressive tree-shake) produces
            // `t.initSolver is not a function` at runtime.
            // Vite 8 (Rolldown) uses rolldownOptions; treeshake:false = no tree-shaking.
            treeshake: false
        }
    }
});
