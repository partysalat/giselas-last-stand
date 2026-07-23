import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    // Sprite/audio files live here and are loaded at runtime via Phaser's
    // loader (not statically imported), so they're copied as-is into dist/
    // rather than processed as JS-module assets.
    publicDir: fileURLToPath(new URL('./assets', import.meta.url)),
    resolve: {
        // Prefer Phaser's ESM build over its CJS "browser" build so Rollup can
        // tree-shake and minify it properly (the CJS build is a giant UMD
        // wrapper that defeats esbuild's whitespace minification).
        mainFields: ['module', 'main']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: {
            entry: fileURLToPath(new URL('./src/embed/mountGame.js', import.meta.url)),
            name: 'GiselasLastStand',
            fileName: (format) => `giselas-last-stand.${format}.js`,
            formats: ['es', 'umd']
        }
    }
});
