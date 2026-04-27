import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = env.CODESERVER_HOST;
    const port = Number(env.CODESERVER_PORT || 8080);

    if (!host) {
        throw new Error('CODESERVER_HOST is required (set it in .env.local)');
    }

    const base = `/absproxy/${port}/`;

    return {
        base,
        plugins: [svelte()],
        server: {
            port,
            host: true,
            allowedHosts: [host],
            hmr: {
                host,
                protocol: 'wss',
                clientPort: 443,
                path: base
            }
        }
    };
});
