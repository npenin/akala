import { defineConfig } from 'vite';
import webui from '@akala/web-ui/vite';

export default defineConfig({
    build: {
        // generate .vite/manifest.json in outDir
        manifest: true,
        outDir: '../dist'
    },
    esbuild: {
        supported: {
            'top-level-await': true //browsers can handle top-level-await features
        },
    },
    plugins: [
        webui(),
    ],
});
