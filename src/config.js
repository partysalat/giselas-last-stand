export const gameConfig = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#2d2d2d',
    input: {
        gamepad: true
    }
};

// Difficulty level multipliers
export const DIFFICULTY_SETTINGS = {
    EASY: {
        id: 'easy',
        name: 'Easy',
        description: 'For new players - reduced enemy health and damage',
        enemyHealthMultiplier: 0.7,
        enemyDamageMultiplier: 0.7,
        enemyCountMultiplier: 0.8,
        subWaveConfig: {
            startWave: 7,  // Sub-waves start at wave 7
            minSubWaves: 1,
            maxSubWaves: 2
        },
        color: 0x00ff00
    },
    MEDIUM: {
        id: 'medium',
        name: 'Medium',
        description: 'Balanced experience - intended difficulty',
        enemyHealthMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
        enemyCountMultiplier: 1.0,
        subWaveConfig: {
            startWave: 4,  // Sub-waves start at wave 4
            minSubWaves: 2,
            maxSubWaves: 3
        },
        color: 0xffff00
    },
    HARD: {
        id: 'hard',
        name: 'Hard',
        description: 'For experts - increased challenge and aggression',
        enemyHealthMultiplier: 1.3,
        enemyDamageMultiplier: 1.3,
        enemyCountMultiplier: 1.2,
        subWaveConfig: {
            startWave: 3,  // Sub-waves start at wave 3
            minSubWaves: 3,
            maxSubWaves: 4
        },
        color: 0xff0000
    }
};

// Default difficulty
export const DEFAULT_DIFFICULTY = DIFFICULTY_SETTINGS.MEDIUM;

// Isometric coordinate system configuration
export const ISOMETRIC_CONFIG = {
    // Tile dimensions for isometric projection
    TILE_WIDTH: 64,
    TILE_HEIGHT: 32,

    // World space configuration
    WORLD_UNITS_PER_SCREEN_PIXEL: 0.1, // How movement feels

    // Height configuration
    GRAVITY: 800,              // Downward acceleration for jumping (pixels/sec²)
    JUMP_VELOCITY: -600,       // Initial upward velocity when jumping (increased for higher jumps)
    MAX_JUMP_HEIGHT: 150,      // Maximum height player can reach

    // Collision configuration
    PLAYER_HEIGHT: 40,         // Player's physical height in world units
    PLAYER_RADIUS: 20,         // Player's ground collision radius

    // Obstacle height categories (for jumping)
    LOW_OBSTACLE: 30,          // Can jump over (barrels, chairs)
    MEDIUM_OBSTACLE: 60,       // Hard to jump over (tables)
    HIGH_OBSTACLE: 100,        // Cannot jump over (walls, counters)
};
