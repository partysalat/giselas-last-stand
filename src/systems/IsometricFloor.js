import { worldToScreen, TILE_WIDTH, TILE_HEIGHT } from '../utils/CoordinateTransform.js';

/**
 * Renders isometric floor tiles
 */
export class IsometricFloor {
    constructor(scene) {
        this.scene = scene;
        this.tiles = [];
    }

    /**
     * Create the isometric floor
     * @param {number} tilesX - Number of tiles in X direction
     * @param {number} tilesY - Number of tiles in Y direction
     * @param {number} centerWorldX - Center of floor in world space
     * @param {number} centerWorldY - Center of floor in world space
     */
    create(tilesX = 30, tilesY = 25, centerWorldX = 15, centerWorldY = 12) {
        const startX = centerWorldX - tilesX / 2;
        const startY = centerWorldY - tilesY / 2;

        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const worldX = startX + x;
                const worldY = startY + y;

                // Convert to screen space
                const { screenX, screenY } = worldToScreen(worldX, worldY, 0);

                // Create tile sprite
                const tile = this.scene.add.image(screenX, screenY, 'iso-floor-tile');
                tile.setDepth(0); // Floor is at depth 0

                // Add slight variation for visual interest
                const tint = 0xffffff - Math.random() * 0x111111;
                tile.setTint(tint);

                this.tiles.push(tile);
            }
        }
    }

    /**
     * Clean up all tiles
     */
    destroy() {
        this.tiles.forEach(tile => tile.destroy());
        this.tiles = [];
    }
}
