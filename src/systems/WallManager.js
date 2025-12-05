/**
 * WallManager
 * Manages the decorative saloon back wall that creates atmosphere
 * This is purely visual - no collision, just a background image at the top
 */
export class WallManager {
    constructor(scene) {
        this.scene = scene;
        this.backWall = null;
    }

    /**
     * Create the decorative saloon back wall
     * This is a visual element only - shows the back wall with mirrors, bottles, decorations
     */
    createWalls() {
        // Game dimensions
        const gameWidth = 1920;

        // Create the decorative back wall image at the top of the screen
        // Centered horizontally, positioned at the top
        this.backWall = this.scene.add.image(gameWidth / 2, 150, 'backwall');
        this.backWall.setOrigin(0.5, 0.5);

        // Set depth to render above floor but below players/enemies
        // Floor is 0, this is 1, players/enemies are 10+
        this.backWall.setDepth(1);
    }

    /**
     * Setup player collisions - no-op since this is decorative only
     * Kept for compatibility with existing GameScene code
     */
    setupPlayerCollisions(playerManager) {
        // No collision - this is purely decorative
    }

    /**
     * Get walls - returns empty array since there are no collision walls
     * Kept for compatibility with existing code
     */
    getWalls() {
        return [];
    }

    /**
     * Get doorway positions for enemy spawning
     * Returns screen edge positions since there are no physical doorways
     */
    getDoorwayPositions() {
        return {
            bottom: { x: 1920 / 2, y: 1000 },
            left: { x: 50, y: 1080 / 2 },
            right: { x: 1870, y: 1080 / 2 }
        };
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.backWall) {
            this.backWall.destroy();
            this.backWall = null;
        }
    }
}
