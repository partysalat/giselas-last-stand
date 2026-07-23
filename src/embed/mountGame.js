import Phaser from './phaser-global.js';
import { gameConfig } from '../config.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { StartScene } from '../scenes/StartScene.js';
import { DifficultySelectScene } from '../scenes/DifficultySelectScene.js';
import { GameScene } from '../scenes/GameScene.js';

/**
 * Mounts the game into a host page/app.
 *
 * @param {HTMLElement|string} container - element (or element id) to render into
 * @param {Object} [options]
 * @param {(result: {players: number, difficulty: string}) => void} [options.onGameWin]
 * @param {string} [options.assetBase] - URL prefix the sprite loader should use,
 *   e.g. '/game-assets/'. Needed whenever the copied `assets/` folder isn't
 *   served relative to the host page's own URL.
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {Phaser.Game}
 */
export function mountGame(container, options = {}) {
    const { onGameWin, assetBase, width, height } = options;

    const config = {
        ...gameConfig,
        parent: container,
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        scene: [PreloadScene, StartScene, DifficultySelectScene, GameScene]
    };

    const game = new Phaser.Game(config);

    game.registry.set('onGameWin', onGameWin || null);
    game.registry.set('assetBase', assetBase || '');

    return game;
}
