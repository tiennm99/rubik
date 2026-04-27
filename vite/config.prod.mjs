import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    base: '/rubik/',
    plugins: [svelte()],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            treeshake: 'smallest'
        }
    },
    root: '.'
});
