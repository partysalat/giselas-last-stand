// Two fixups applied to Vite's raw `dist/` output:
//
// 1. Vite's `publicDir` copies the *contents* of `assets/` to the root of
//    `dist/` (so `assets/sprites/...` becomes `dist/sprites/...`), but the
//    game code loads everything relative to an `assets/` prefix (e.g.
//    `assets/sprites/player/...` in PreloadScene.js) to match the standalone
//    dev setup (index.html at the project root, which already has an
//    `assets/` folder). Re-nest the copied files under `dist/assets/` so
//    those paths resolve for the embedded/bundled build too.
//
// 2. Vite's built-in minifier doesn't fully collapse whitespace on the
//    bundled Phaser output (it's a large pre-bundled webpack artifact under
//    the hood), leaving dist/*.js several times larger than necessary.
//    Re-minifying the already-built output with esbuild directly shrinks it
//    back down.
import { build } from 'esbuild';
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

const assetsDir = path.join(distDir, 'assets');
mkdirSync(assetsDir, { recursive: true });
for (const entry of readdirSync(distDir)) {
    if (entry === 'assets' || entry.endsWith('.js')) continue;
    renameSync(path.join(distDir, entry), path.join(assetsDir, entry));
}

for (const file of readdirSync(distDir)) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(distDir, file);
    await build({
        entryPoints: [filePath],
        outfile: filePath,
        allowOverwrite: true,
        minify: true,
        format: file.includes('.es.') ? 'esm' : undefined,
        logLevel: 'warning'
    });
}
