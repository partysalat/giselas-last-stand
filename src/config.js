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

    // Movement tuning (ADJUST THESE after testing)
    PLAYER_SPEED: 8.0,         // World units per second (tune this!)
    ENEMY_SPEED_MULTIPLIER: 0.8, // Enemies slightly slower than players
    BULLET_SPEED: 20.0,        // Bullet speed in world units/sec

    // World space configuration
    WORLD_UNITS_PER_SCREEN_PIXEL: 0.1, // How movement feels

    // World space bounds (matches isometric floor: 30x25 tiles centered at 15,12)
    WORLD_MIN_X: 0,
    WORLD_MAX_X: 30,
    WORLD_MIN_Y: -0.5,
    WORLD_MAX_Y: 24.5,

    // Height configuration
    GRAVITY: -1200,            // Downward acceleration (tune for jump feel)
    JUMP_VELOCITY: 500,        // Initial upward velocity (tune for height)
    MAX_JUMP_HEIGHT: 100,

    // Collision configuration
    PLAYER_HEIGHT: 0.8,        // Player's physical height in world units (~40 pixels)
    PLAYER_RADIUS: 0.4,        // Player's ground collision radius (~20 pixels)

    // Obstacle height categories
    LOW_OBSTACLE: 0.7,         // Can jump over (~35 pixels)
    MEDIUM_OBSTACLE: 1.2,      // Can barely jump over (~60 pixels)
    HIGH_OBSTACLE: 2.0,        // Cannot jump over (~100 pixels)
};
