// All game scenes reference the global `Phaser` object (they're written to run
// against the CDN <script> tag used by the standalone index.html). This file
// makes the npm-installed Phaser available as that same global so the exact
// same scene code works when bundled for embedding. Must be imported before
// any scene file.
import * as Phaser from 'phaser';

if (typeof window !== 'undefined' && !window.Phaser) {
    window.Phaser = Phaser;
}

export default Phaser;
