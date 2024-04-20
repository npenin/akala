import { plugin as akala } from '@akala/vite';

export default {
    build: {
        // generate .vite/manifest.json in outDir
        manifest: true,
    },
    plugins: [
        akala({
            auth: {
                path: '@akala/authentication/commands.json',
                init: ['file', null, 'my-very-secret-key']
            }
        })
    ],
} as import('vite').UserConfig